import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { resolveClassroomStaffAccess } from "@/app/lib/liveClassroom/authorization";
import { getLiveClassroomConfig, saveLiveClassroomParticipantGrant, saveLiveClassroomRoomConfig } from "@/app/lib/platformConfig";
import { getVideoProvider } from "@/app/lib/liveClassroom/provider";
import type { ParticipantRole, RoomPermissions, VideoProviderType } from "@/app/lib/liveClassroom/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to join this live class." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { classId, entryCode } = body;

    if (!classId) {
      return NextResponse.json({ error: "Missing required classId parameter." }, { status: 400 });
    }

    const normalizedClassId = String(classId).trim().toUpperCase();
    const isOpenStage =
      normalizedClassId === "BL-LIVE-101" ||
      normalizedClassId === "DEMO-CLASS" ||
      normalizedClassId === "GENERAL-STAGE" ||
      normalizedClassId.startsWith("BL-ROOM-") ||
      normalizedClassId.startsWith("BL-LIVE-") ||
      normalizedClassId.startsWith("BL-STAGE-");

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabase = getSupabaseServerClient(token);
    const config = await getLiveClassroomConfig();
    const roomConfig = config.room_configs?.[classId] || config.room_configs?.[normalizedClassId];

    // 1. Resolve staff access from authoritative platform roles, approved tutor
    // profiles, or the explicitly configured individual tutor allowlist.
    const staffAccess = await resolveClassroomStaffAccess(user, token);
    const isPlatformStaff = staffAccess.isPlatformAdmin;


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
      let stageTitle = "BrainLab Live Academic Stage";
      if (normalizedClassId === "BL-LIVE-101") {
        stageTitle = "BrainLab Live Academic Stage (BL-LIVE-101)";
      } else if (normalizedClassId.startsWith("BL-ROOM-")) {
        stageTitle = `BrainLab Private Classroom (${normalizedClassId})`;
      } else {
        stageTitle = `BrainLab Live Stage (${normalizedClassId})`;
      }

      liveClass = {
        id: classId,
        title: stageTitle,
        description: "Interactive revision, instant in-chat polls, multimedia pictures, audio notes, and live questions.",
        tutor_id: roomConfig?.active_host_id || "brainlab-official-host",
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
        return NextResponse.json({ error: "Live class not found." }, { status: 404 });
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
    const isBuiltInPublicStage = normalizedClassId === "BL-LIVE-101" ||
      normalizedClassId === "DEMO-CLASS" || normalizedClassId === "GENERAL-STAGE";
    // Prefixes are identifiers, not proof that a room exists. Only the
    // built-in public stages or rooms explicitly provisioned by an admin
    // may receive virtual-stage tokens.
    if (isOpenStage && !isBuiltInPublicStage && !roomConfig) {
      return NextResponse.json({ error: "This virtual classroom has not been configured." }, { status: 404 });
    }
    const isHost = isPlatformStaff ||
      (!isOpenStage && liveClass.tutor_id === user.id) ||
      (isOpenStage && staffAccess.isStaff &&
        (!roomConfig?.active_host_id || roomConfig.active_host_id === user.id));

    if (isHost) {
      liveClass.tutor_id = user.id;
    }

    // 4. Student Host Restriction: Students are never allowed to enter as host or start the class
    if (!isHost) {
      const isRoomActive =
        isOpenStage ||
        (roomConfig?.is_active ?? true) ||
        liveClass.status === "live";

      if (!isRoomActive) {
        return NextResponse.json(
          {
            error: "The tutor has not started this live class session yet. Please wait for the host to launch the stage.",
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

      // 4b. Subscription Tier & Feature Entitlement Verification (Staff and Open Stages are exempt)
      if (!isOpenStage && !isHost) {
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

      if (isMasterclass && !isHost) {
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

          // Persist a short-lived server-side grant so the participant can use
          // class-scoped message/media APIs without resending the entry code.
          const updatedRooms = { ...(config.room_configs || {}) };
          const currentRoom = updatedRooms[classId] || roomConfig;
          const now = Date.now();
          const activeGrants = Object.fromEntries(
            Object.entries(currentRoom.participant_access || {}).filter(([, expiresAt]) => Number(expiresAt) > now)
          ) as Record<string, number>;
          activeGrants[user.id] = now + (config.default_duration_minutes || 60) * 60 * 1000;
          updatedRooms[classId] = { ...currentRoom, participant_access: activeGrants };
          const savedGrant = await saveLiveClassroomParticipantGrant(updatedRooms);
          if (!savedGrant) {
            return NextResponse.json({ error: "Unable to establish secure classroom access. Please retry." }, { status: 503 });
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
      if (roomConfig && (!roomConfig.is_active || !roomConfig.active_host_id)) {
        const savedHostAssignment = await saveLiveClassroomRoomConfig(
          classId,
          {
            is_active: true,
            active_host_id: user.id,
            active_host_name: user.user_metadata?.full_name || user.email || "Tutor",
            started_at: new Date().toISOString(),
          },
          `Verified tutor launched live stage for class ${classId}`
        );
        if (!savedHostAssignment) {
          return NextResponse.json({ error: "Unable to activate this classroom safely. Please retry." }, { status: 503 });
        }
      }
    }

    // 6. Enforce Enrollment & Entitlement Verification (Staff and Hosts are always enrolled)
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
      canPublishAudio: isHost || liveClass.student_mic_enabled,
      canPublishVideo: isHost || liveClass.student_camera_enabled,
      canPublishScreen: isHost || liveClass.student_screenshare_enabled,
      canChat: liveClass.student_chat_enabled || isHost,
    };

    // 8. Generate Provider-Specific Access Token (WebRTC, LiveKit, Agora, Daily)
    const providerType: VideoProviderType = (config.provider as VideoProviderType)
      ? (config.provider as VideoProviderType)
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
        role,
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
