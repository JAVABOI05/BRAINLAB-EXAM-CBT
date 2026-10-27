import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const classId = String(body.classId || body.roomId || "");
    if (!classId) return NextResponse.json({ error: "Missing required classId." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data: roleRow } = await supabase.from("admin_user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const isAdmin = ["super_admin", "platform_admin"].includes(roleRow?.role || "");
    const { data: liveClass, error: classError } = await supabase.from("live_classes").select("*").eq("id", classId).maybeSingle();
    if (classError || !liveClass) {
      return NextResponse.json({ error: "A scheduled class must exist before it can be broadcast. Create the class in the timetable first." }, { status: 404 });
    }

    const { data: coTutor } = await supabase.from("live_class_tutors").select("id").eq("class_id", classId).eq("tutor_id", user.id).maybeSingle();
    if (!isAdmin && liveClass.tutor_id !== user.id && !coTutor) {
      return NextResponse.json({ error: "Only the assigned tutor(s) can start this classroom." }, { status: 403 });
    }
    if (!["scheduled", "open"].includes(liveClass.status)) {
      return NextResponse.json({ error: "This class is already live or is no longer startable.", status: liveClass.status }, { status: 409 });
    }
    if (new Date(liveClass.scheduled_start_at).getTime() > Date.now()) {
      return NextResponse.json({ error: "The class cannot be started before its scheduled time.", startsAt: liveClass.scheduled_start_at }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data: started, error: startError } = await supabase.from("live_classes")
      .update({ status: "live", actual_start_at: now, actual_end_at: null, updated_at: now })
      .eq("id", classId)
      .eq("status", liveClass.status)
      .select("id,title,description,scheduled_start_at,scheduled_end_at")
      .maybeSingle();
    if (startError) return NextResponse.json({ error: startError.message }, { status: 500 });
    if (!started) return NextResponse.json({ error: "Another request changed the class state. Refresh and try again." }, { status: 409 });

    await supabase.from("live_class_events").insert({ class_id: classId, actor_id: user.id, event_type: "started", details: { source: "broadcast" } });

    // Notify learners attached to the class subject, not every user on the platform.
    const targetUserIds = new Set<string>();
    if (liveClass.subject_id) {
      const { data: learners } = await supabase.from("learning_subject_memberships").select("user_id").eq("subject_id", liveClass.subject_id).limit(500);
      for (const learner of learners || []) if (learner.user_id && learner.user_id !== user.id) targetUserIds.add(learner.user_id);
    }
    if (liveClass.course_id) {
      const { data: enrolments } = await supabase.from("course_enrollments").select("user_id").eq("course_id", liveClass.course_id).eq("status", "active").limit(500);
      for (const enrolment of enrolments || []) if (enrolment.user_id && enrolment.user_id !== user.id) targetUserIds.add(enrolment.user_id);
    }
    const notifications = [...targetUserIds].map((uid) => ({
      user_id: uid,
      title: `🔴 Live Class: ${started.title}`,
      message: "Your assigned tutor has started the scheduled class. Join now to participate.",
      type: "live_class",
      link_url: `/classroom/${classId}`,
      is_read: false,
      created_at: now,
    }));
    if (notifications.length) await supabase.from("notifications").insert(notifications);

    return NextResponse.json({ success: true, classId, status: "live", notifiedCount: notifications.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
