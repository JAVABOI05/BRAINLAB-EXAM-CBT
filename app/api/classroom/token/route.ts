import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getLiveClassroomConfig } from "@/app/lib/platformConfig";
import { getVideoProvider } from "@/app/lib/liveClassroom/provider";
import type { ParticipantRole, RoomPermissions } from "@/app/lib/liveClassroom/types";

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
    const { classId } = body;

    if (!classId) {
      return NextResponse.json({ error: "Missing required classId parameter." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch class details or provision demo/interactive session fallback
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

    if (classId === "demo-class" || classId === "general-stage") {
      liveClass = {
        id: classId,
        title: "BrainLab Live Academic Masterclass & Interactive Stage",
        description: "Interactive revision, instant in-chat polls, multimedia pictures, audio notes, and live questions.",
        tutor_id: user.id,
        status: "live",
        class_format: "interactive",
        course_id: null,
        scheduled_start_at: new Date().toISOString(),
        duration_minutes: 90,
        student_mic_enabled: true,
        student_camera_enabled: true,
        student_screenshare_enabled: true,
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
        // Fallback for custom session or teacher-created classroom IDs
        liveClass = {
          id: classId,
          title: `BrainLab Live Class Session (${classId.slice(0, 10)})`,
          description: "Interactive revision, instant in-chat polls, multimedia pictures, audio notes, and live questions.",
          tutor_id: user.id,
          status: "live",
          class_format: "interactive",
          course_id: null,
          scheduled_start_at: new Date().toISOString(),
          duration_minutes: 90,
          student_mic_enabled: true,
          student_camera_enabled: true,
          student_screenshare_enabled: true,
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

    // 2. Determine User Role & Admin status
    const isTutor = liveClass.tutor_id === user.id;
    let isAdmin = false;
    const { data: adminRole } = await supabase
      .from("admin_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminRole && ["super_admin", "platform_admin", "cbt_admin", "teacher"].includes(adminRole.role)) {
      isAdmin = true;
    }

    // 3. Enforce Enrollment & Entitlement Verification
    let isEnrolled = false;
    if (isTutor || isAdmin) {
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

    // 4. Determine Participant Permissions based on Class Format & Role
    const config = await getLiveClassroomConfig();
    const isHost = isTutor || isAdmin;

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

    // 5. Generate Room Token using Selected Provider
    const providerType = liveClass.provider || config.provider || "webrtc";
    const provider = getVideoProvider(providerType);

    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Learner";

    const tokenResponse = await provider.generateRoomToken({
      roomId: liveClass.id,
      roomName: liveClass.room_name || `room_${liveClass.id.slice(0, 8)}`,
      userId: user.id,
      userName,
      role,
      permissions,
      durationSeconds: (config.default_duration_minutes || 60) * 60,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...tokenResponse,
        classDetails: {
          id: liveClass.id,
          title: liveClass.title,
          description: liveClass.description,
          status: liveClass.status,
          scheduled_start_at: liveClass.scheduled_start_at,
          scheduled_end_at: liveClass.scheduled_end_at,
          format: liveClass.class_format,
          isRecording: liveClass.is_recording_enabled,
          waitingRoom: liveClass.waiting_room_enabled,
          tutorId: liveClass.tutor_id,
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
