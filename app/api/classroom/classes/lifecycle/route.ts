import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { logAdminAction } from "@/app/lib/platformConfig";

const ADMIN_ROLES = ["super_admin", "platform_admin"];

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const classId = String(body.classId || "");
    const action = String(body.action || "");
    if (!classId || !["start", "end", "cancel", "reschedule", "assign_tutors"].includes(action)) {
      return NextResponse.json({ error: "classId and a valid action are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: roleRow } = await supabase.from("admin_user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = roleRow?.role || "";
    const isAdmin = ADMIN_ROLES.includes(role);
    const { data: liveClass, error: classError } = await supabase.from("live_classes").select("*").eq("id", classId).maybeSingle();
    if (classError || !liveClass) return NextResponse.json({ error: "Live class not found." }, { status: 404 });

    const { data: extraAssignments } = await supabase.from("live_class_tutors").select("assignment_role").eq("class_id", classId).eq("tutor_id", user.id);
    const isAssignedTutor = liveClass.tutor_id === user.id || Boolean(extraAssignments?.length);
    if (!isAdmin && !isAssignedTutor) return NextResponse.json({ error: "Only the assigned tutor(s) or an authorised administrator can control this class." }, { status: 403 });

    const now = new Date().toISOString();
    let updates: Record<string, unknown> = { updated_at: now };
    let eventType = "";
    let eventDetails: Record<string, unknown> = {};

    if (action === "start") {
      if (!["scheduled", "open"].includes(liveClass.status)) {
        return NextResponse.json({ error: "Only a scheduled class can be started. This class may already be live or has ended." }, { status: 409 });
      }
      if (new Date(liveClass.scheduled_start_at).getTime() > Date.now()) {
        return NextResponse.json({ error: "This class is not scheduled to start yet.", startsAt: liveClass.scheduled_start_at }, { status: 409 });
      }
      updates = { ...updates, status: "live", actual_start_at: now, actual_end_at: null };
      eventType = "started";
    } else if (action === "end") {
      if (liveClass.status !== "live") return NextResponse.json({ error: "Only a live class can be ended." }, { status: 409 });
      updates = { ...updates, status: "ended", actual_end_at: now, ended_by: user.id };
      eventType = "ended";
    } else if (action === "cancel") {
      if (["live", "ended", "completed", "cancelled"].includes(liveClass.status)) {
        return NextResponse.json({ error: "A live or already closed class cannot be cancelled. End a live session instead." }, { status: 409 });
      }
      updates = { ...updates, status: "cancelled", actual_end_at: now };
      eventType = "cancelled";
    } else if (action === "reschedule") {
      if (["live", "ended", "completed", "cancelled"].includes(liveClass.status)) {
        return NextResponse.json({ error: "Only a class that has not started can be rescheduled." }, { status: 409 });
      }
      const start = new Date(body.scheduled_start_at);
      const end = new Date(body.scheduled_end_at);
      if (!body.scheduled_start_at || !body.scheduled_end_at || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || start <= new Date()) {
        return NextResponse.json({ error: "Provide a future start time and an end time after the start." }, { status: 400 });
      }
      updates = { ...updates, status: "scheduled", scheduled_start_at: start.toISOString(), scheduled_end_at: end.toISOString() };
      eventType = "rescheduled";
      eventDetails = { scheduled_start_at: start.toISOString(), scheduled_end_at: end.toISOString() };
    } else if (action === "assign_tutors") {
      if (role !== "super_admin") return NextResponse.json({ error: "Only the Super Admin can change class tutor assignments." }, { status: 403 });
      const tutorIds = Array.isArray(body.tutor_ids) ? [...new Set(body.tutor_ids.map(String))] : [];
      if (!tutorIds.includes(liveClass.tutor_id)) {
        return NextResponse.json({ error: "The lead tutor must remain assigned as the class owner." }, { status: 400 });
      }
      const { data: tutors } = await supabase.from("admin_user_roles").select("user_id, role").in("user_id", tutorIds);
      if (!tutors || tutorIds.some((id: string) => !tutors.some((t: {user_id:string;role:string}) => t.user_id === id && t.role === "teacher"))) {
        return NextResponse.json({ error: "Every assigned tutor must have a tutor role granted by Super Admin." }, { status: 400 });
      }
      await supabase.from("live_class_tutors").delete().eq("class_id", classId);
      const { error: insertError } = await supabase.from("live_class_tutors").insert(tutorIds.filter((id: string) => id !== liveClass.tutor_id).map((tutor_id: string) => ({ class_id: classId, tutor_id, assignment_role: "co_tutor", assigned_by: user.id })));
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
      eventType = "tutor_assigned";
      eventDetails = { tutor_ids: tutorIds };
    }

    if (action !== "assign_tutors") {
      const { data: updated, error: updateError } = await supabase.from("live_classes").update(updates).eq("id", classId).eq("status", liveClass.status).select("*").maybeSingle();
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      if (!updated) return NextResponse.json({ error: "The class changed in another request. Refresh and try again." }, { status: 409 });
      if (action === "reschedule") {
        await supabase.from("calendar_events").update({ start_time: updates.scheduled_start_at, end_time: updates.scheduled_end_at, status: "rescheduled" }).eq("class_id", classId);
      }
      if (action === "cancel") await supabase.from("calendar_events").update({ status: "cancelled" }).eq("class_id", classId);
    }

    await supabase.from("live_class_events").insert({ class_id: classId, actor_id: user.id, event_type: eventType, details: eventDetails });
    await logAdminAction({
      admin_id: user.id,
      admin_email: user.email || "classroom-user",
      entity_type: "classroom",
      entity_id: classId,
      action: eventType,
      new_value: { action, ...eventDetails },
      change_reason: `Live classroom lifecycle action: ${action}`,
    });

    return NextResponse.json({ success: true, action, status: action === "start" ? "live" : action === "end" ? "ended" : action === "cancel" ? "cancelled" : action === "reschedule" ? "scheduled" : undefined });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
