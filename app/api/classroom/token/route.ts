import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getLiveClassroomConfig, saveLiveClassroomConfig } from "@/app/lib/platformConfig";
import { getVideoProvider } from "@/app/lib/liveClassroom/provider";
import type { ParticipantRole, RoomPermissions, VideoProviderType } from "@/app/lib/liveClassroom/types";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to join this live class." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { classId, entryCode } = body;

    if (!classId) {
      return NextResponse.json({ error: "Missing required classId parameter." }, { status: 400 });
    }

    const normalizedClassId = String(classId).trim().toUpperCase();
    const isOpenStage =
      normalizedClassId === "BL-LIVE-101" ||
      normalizedClassId === "DEMO-CLASS" ||
      normalizedClassId === "GENERAL-STAGE";

    const supabase = getSupabaseServerClient();
    const config = await getLiveClassroomConfig();

    // 1. Check if user is staff/tutor/admin
    let isStaff = false;
    const { data: adminRole } = await supabase
      .from("admin_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminRole && ["super_admin", "platform_admin", "cbt_admin", "teacher"].includes(adminRole.role)) {
      isStaff = true;
    }

    const isAllowedTutorByEmail = Boolean(
      user.email &&
      config.allowed_tutor_emails?.map((e) => e.toLowerCase()).includes(user.email.toLowerCase())
    );

    const isAuthorizedTutor = isStaff || isAllowedTutorByEmail;

    // 2. Fetch class details or provision session fallback
    type LiveClass = {
      id: string;
      tutor_id: string;
      title: string;
      description: string | null;
      status: string;
      class_format: string;
      course_id: string | null;
      scheduled_start_at: string | null;
      scheduled_end_at?: string | null;
      duration_minutes: number;
      student_mic_enabled: boolean;
      student_camera_enabled: boolean;
      student_screenshare_enabled: boolean;
      student_chat_enabled: boolean;
      is_recording_enabled: boolean;
      waiting_room_enabled: boolean;
      provider?: string | null;
      room_name?: string | null;
    };
    let liveClass: LiveClass | null = null;

    if (isOpenStage) {
      liveClass = {
        id: classId,
        title: normalizedClassId === "BL-LIVE-101" ? "BrainLab Live Academic Stage (BL-LIVE-101)" : "BrainLab Live Masterclass & Interactive Stage",
        description: "Interactive revision, instant in-chat polls, multimedia pictures, audio notes, and live questions.",
        tutor_id: isAuthorizedTutor ? user.id : "brainlab-official-host",
        status: "live",
        class_format: "interactive",
        course_id: null,
        scheduled_start_at: new Date().toISOString(),
        duration_minutes: 90,
        student_mic_enabled: true,
        student_camera_enabled: false,
        student_screenshare_enabled: false,
        student_chat_enabled: true,
        is_recording_enabled: false,
        waiting_room_enabled: false,
      };
    } else {
      const { data: dbClass } = await supabase
        .from("live_classes")
        .select("*, courses(*)")
        .eq("id", classId)
        .maybeSingle();

      if (dbClass) {
        liveClass = dbClass as LiveClass;
      } else {
        liveClass = {
          id: classId,
          title: `BrainLab Live Class Session (${classId.slice(0, 10)})`,
          description: "Interactive revision, instant in-chat polls, multimedia pictures, audio notes, and live questions.",
          tutor_id: isAuthorizedTutor ? user.id : "brainlab-official-host",
          status: "scheduled",
          class_format: "interactive",
          course_id: null,
          scheduled_start_at: new Date().toISOString(),
          duration_minutes: 90,
          student_mic_enabled: true,
          student_camera_enabled: false,
          student_screenshare_enabled: false,
          student_chat_enabled: true,
          is_recording_enabled: false,
          waiting_room_enabled: false,
        };
      }
    }

    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found." }, { status: 404 });
    }

    if (liveClass.status === "cancelled") {
      return NextResponse.json(
        { error: "This live class session has been cancelled." },
        { status: 400 }
      );
    }

    // 3. Check Room Configuration from Platform Config
    const roomConfig = config.room_configs?.[classId];
    const isTutor = isAuthorizedTutor || liveClass.tutor_id === user.id;
    const isHost = isTutor;

    // 4. Student Host Restriction: Students are never allowed to enter as host or start the class
    if (!isHost) {
      const isRoomActive =
        isOpenStage ||
        (roomConfig?.is_active ?? true) ||
        liveClass.status === "live";

      if (!isRoomActive) {
        return NextResponse.json(
          {
            error: "This live class has not been started yet. Only authorized tutors or administrators can launch this classroom. Please wait for your instructor to begin.",
            requiresHost: true,
            notStarted: true,
            classDetails: {
              id: liveClass.id,
              title: roomConfig?.title || liveClass.title,
              description: liveClass.description,
              status: "waiting_for_host",
              tutorId: liveClass.tutor_id,
            },
          },
          { status: 403 }
        );
      }

      // 4b. Subscription Tier & Feature Entitlement Verification (Open stages like BL-LIVE-101 are free for all learners)
      if (!isOpenStage) {
        const { getStudentSubscriptionAndEntitlements } = await import("@/app/lib/subscriptionEntitlements");
        const studentTier = await getStudentSubscriptionAndEntitlements(user.id);

        if (!studentTier.entitlements.classroom_access) {
          return NextResponse.json(
            {
              error: `Live Academic Classrooms require an active Premium Study, Plus, or Pro subscription. You are currently on the ${studentTier.planName} tier.`,
              requiresSubscription: true,
              currentPlan: studentTier.planName,
              requiredTier: "Premium Study",
              classDetails: {
                id: liveClass.id,
                title: roomConfig?.title || liveClass.title,
              },
            },
            { status: 403 }
          );
        }
      }

      // 5. Masterclass vs Open Class Admission Verification
      const isMasterclass =
        roomConfig?.class_type === "masterclass" ||
        Boolean(roomConfig?.entry_code) ||
        Boolean(roomConfig?.require_permission);

      if (isMasterclass) {
        // A. Code Entry verification (if configured on this masterclass)
        if (roomConfig?.entry_code && roomConfig.entry_code.trim()) {
          const submittedCode = String(entryCode || "").trim().toUpperCase();
          const expectedCode = roomConfig.entry_code.trim().toUpperCase();

          if (!submittedCode) {
            return NextResponse.json(
              {
                error: "This is a BrainLab Masterclass. A valid access code is required to enter.",
                requiresCode: true,
                isMasterclass: true,
                classDetails: {
                  id: liveClass.id,
                  title: roomConfig?.title || liveClass.title,
                  description: liveClass.description,
                  requiresPermission: Boolean(roomConfig?.require_permission),
                },
              },
              { status: 403 }
            );
          }

          if (submittedCode !== expectedCode) {
            return NextResponse.json(
              {
                error: "Invalid masterclass entry code. Please check your code and try again.",
                requiresCode: true,
                isMasterclass: true,
              },
              { status: 403 }
            );
          }
        }

        // B. Permission Granting / Host Approval verification
        if (roomConfig?.require_permission) {
          const isAdmitted = Boolean(roomConfig.admitted_students?.includes(user.id));
          if (!isAdmitted) {
            return NextResponse.json(
              {
                success: true,
                pendingApproval: true,
                isMasterclass: true,
                message: "Waiting for tutor permission to enter this Masterclass. Your admission request has been sent to the host.",
                classDetails: {
                  id: liveClass.id,
                  title: roomConfig?.title || liveClass.title,
                  description: liveClass.description,
                  tutorId: roomConfig?.active_host_id || liveClass.tutor_id,
                  requiresPermission: true,
                },
              },
              { status: 200 }
            );
          }
        }
      }
    } else {
      // Host / Tutor auto-activation: mark room active if needed
      if (roomConfig && !roomConfig.is_active) {
        const updatedRooms = { ...config.room_configs };
        updatedRooms[classId] = {
          ...roomConfig,
          is_active: true,
          active_host_id: user.id,
          active_host_name: user.user_metadata?.full_name || user.email || "Tutor",
          started_at: new Date().toISOString(),
        };
        void saveLiveClassroomConfig(
          { room_configs: updatedRooms },
          { id: user.id, email: user.email || "tutor@brainlabacademy.com.ng" },
          `Tutor launched live stage for class ${classId}`
        );
      }
    }

    // 6. Enforce Enrollment & Entitlement Verification (if class has a bound course)
    let isEnrolled = false;
    if (isHost) {
      isEnrolled = true;
    } else if (liveClass.course_id) {
      const { data: enrollment } = await supabase
        .from("course_enrollments")
        .select("id, status")
        .eq("course_id", liveClass.course_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (enrollment) {
        isEnrolled = true;
      } else {
        const { data: subscription } = await supabase
          .from("subscription_records")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (subscription) {
          isEnrolled = true;
        }
      }
    } else {
      isEnrolled = true;
    }

    if (!isEnrolled) {
      return NextResponse.json(
        {
          error: "Access denied. You are not enrolled in this course or your subscription has expired.",
          requiresEnrollment: true,
          courseId: liveClass.course_id,
        },
        { status: 403 }
      );
    }

    // 7. Determine Participant Permissions based on Class Format & Role
    let role: ParticipantRole = isHost ? "host" : "listener";
    if (!isHost && liveClass.class_format === "interactive") {
      role = "speaker";
    }

    const permissions: RoomPermissions = {
      isModerator: isHost,
      canPublishAudio: isHost ? true : (liveClass.student_mic_enabled && config.student_mic_default),
      canPublishVideo: isHost ? true : (liveClass.student_camera_enabled && config.student_cam_default),
      canPublishScreen: isHost ? true : (liveClass.student_screenshare_enabled && config.student_screenshare_default),
      canChat: liveClass.student_chat_enabled && config.student_chat_default,
    };

    // 8. Generate Room Token using Selected Provider
    const configuredProvider = liveClass.provider || config.provider || "webrtc";
    const providerTypes: VideoProviderType[] = ["webrtc", "livekit", "agora", "daily"];
    const providerType: VideoProviderType = providerTypes.includes(configuredProvider as VideoProviderType)
      ? configuredProvider as VideoProviderType
      : "webrtc";
    const provider = getVideoProvider(providerType, config.provider_credentials);

    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      (isHost ? "Instructor" : "Learner");

    const tokenResponse = await provider.generateRoomToken({
      roomId: liveClass.id,
      roomName: liveClass.room_name || `room_${liveClass.id.slice(0, 8)}`,
      userId: user.id,
      userName,
      role,
      permissions,
      durationSeconds: (config.default_duration_minutes || 60) * 60,
    });

    let attachments: unknown[] = [];
    try {
      const { data: lessonRec } = await supabase
        .from("classroom_lessons")
        .select("attachments")
        .eq("live_class_id", liveClass.id)
        .maybeSingle();
      if (lessonRec?.attachments && Array.isArray(lessonRec.attachments)) {
        attachments = lessonRec.attachments;
      }
    } catch {
      // Best-effort lookup; non-blocking
    }

    return NextResponse.json({
      success: true,
      data: {
        ...tokenResponse,
        classDetails: {
          id: liveClass.id,
          title: roomConfig?.title || liveClass.title,
          description: liveClass.description,
          status: liveClass.status,
          scheduled_start_at: liveClass.scheduled_start_at,
          scheduled_end_at: liveClass.scheduled_end_at,
          format: liveClass.class_format,
          isRecording: liveClass.is_recording_enabled,
          waitingRoom: Boolean(roomConfig?.require_permission || liveClass.waiting_room_enabled),
          tutorId: isHost ? user.id : (roomConfig?.active_host_id || liveClass.tutor_id),
          isMasterclass: roomConfig?.class_type === "masterclass",
          classType: roomConfig?.class_type || "open",
          attachments,
        },
      },
    });
  } catch (error: unknown) {
    console.error("[classroom/token] Error generating token:", error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || "Failed to issue live classroom credentials." },
      { status: 500 }
    );
  }
}
