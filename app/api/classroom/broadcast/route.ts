import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Verify admin or teacher role
    const { data: adminRole } = await supabase
      .from("admin_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAuthorized =
      adminRole &&
      ["super_admin", "platform_admin", "teacher", "cbt_admin", "ai_learning_admin"].includes(
        adminRole.role
      );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: Only authorized instructors or admins can broadcast live sessions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roomId, title, topic } = body;

    if (!roomId) {
      return NextResponse.json({ error: "Missing required roomId." }, { status: 400 });
    }

    const liveTitle = title || "BrainLab Live Academic Masterclass";
    const liveTopic = topic || "Speed drills and exam preparation";
    const sessionUrl = `/classroom/${roomId}`;

    // 1. Ensure live_classes record exists and is marked 'live'
    const now = new Date().toISOString();
    const { error: upsertErr } = await supabase.from("live_classes").upsert(
      {
        id: roomId,
        title: liveTitle,
        description: liveTopic,
        tutor_id: user.id,
        status: "live",
        class_format: "interactive",
        scheduled_start_at: now,
        duration_minutes: 90,
        student_mic_enabled: true,
        student_camera_enabled: false,
        student_chat_enabled: true,
        student_screenshare_enabled: false,
        is_recording_enabled: true,
        waiting_room_enabled: false,
      },
      { onConflict: "id" }
    );

    if (upsertErr) {
      console.warn("Could not upsert live_classes:", upsertErr.message);
    }

    // 2. Query target learners to notify
    const targetUserIds = new Set<string>();

    // A. Users currently in presence
    const { data: presences } = await supabase
      .from("user_presence")
      .select("user_id")
      .limit(100);
    for (const p of presences || []) {
      if (p.user_id && p.user_id !== user.id) targetUserIds.add(p.user_id);
    }

    // B. Registered learners
    const { data: learners } = await supabase
      .from("learning_subject_memberships")
      .select("user_id")
      .limit(150);
    for (const l of learners || []) {
      if (l.user_id && l.user_id !== user.id) targetUserIds.add(l.user_id);
    }

    // 3. Batch insert notifications
    const notificationsToInsert = Array.from(targetUserIds).map((uid) => ({
      user_id: uid,
      title: `🔴 Live Class: ${liveTitle}`,
      message: `${liveTopic}. Tutor has opened the live stage. Click to join immediately.`,
      type: "live_class",
      link_url: sessionUrl,
      is_read: false,
      created_at: now,
    }));

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }

    return NextResponse.json({
      success: true,
      roomId,
      notifiedCount: notificationsToInsert.length,
      message: `Live class broadcasted successfully to ${notificationsToInsert.length} active learners!`,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to broadcast" }, { status: 500 });
  }
}
