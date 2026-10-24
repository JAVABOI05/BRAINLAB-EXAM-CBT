import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getLiveClassroomConfig, logAdminAction } from "@/app/lib/platformConfig";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { classId, action, joinTime, leaveTime, durationSeconds, providerSessionId } = body;

    if (!classId || !action) {
      return NextResponse.json({ error: "Missing classId or action." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const config = await getLiveClassroomConfig();

    if (action === "mark_present") {
      const participantIds = Array.isArray(body.participantIds)
        ? [...new Set(body.participantIds.filter((id: unknown) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id as string)))]
        : [];
      if (!participantIds.length || participantIds.length > 200) {
        return NextResponse.json({ error: "Provide between 1 and 200 valid connected student IDs." }, { status: 400 });
      }

      const { data: liveClass } = await supabase
        .from("live_classes")
        .select("id, tutor_id")
        .eq("id", classId)
        .maybeSingle();
      const { data: adminRole } = await supabase
        .from("admin_user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const isAssignedTutor = liveClass?.tutor_id === user.id;
      const isAuthorizedAdmin = ["super_admin", "platform_admin"].includes(adminRole?.role || "");
      if (!liveClass || (!isAssignedTutor && !isAuthorizedAdmin)) {
        return NextResponse.json({ error: "Only the assigned tutor or an authorized administrator can take attendance." }, { status: 403 });
      }

      const now = new Date().toISOString();
      let markedCount = 0;
      for (const participantId of participantIds as string[]) {
        if (participantId === liveClass.tutor_id) continue;
        const { data: activeRecord } = await supabase
          .from("class_attendance_records")
          .select("id")
          .eq("class_id", classId)
          .eq("user_id", participantId)
          .is("leave_time", null)
          .order("join_time", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeRecord) {
          markedCount += 1;
          continue;
        }
        const { error: insertError } = await supabase.from("class_attendance_records").insert({
          class_id: classId,
          user_id: participantId,
          join_time: now,
          attendance_status: "present",
          manual_correction_reason: "Tutor took attendance of connected learners",
          corrected_by: user.id,
          updated_at: now,
        });
        if (!insertError) markedCount += 1;
      }
      return NextResponse.json({ success: true, markedCount, message: `Attendance taken for ${markedCount} connected learners.` });
    }

    if (action === "join") {
      const now = new Date().toISOString();
      const { data: existing } = await supabase
        .from("class_attendance_records")
        .select("*")
        .eq("class_id", classId)
        .eq("user_id", user.id)
        .order("join_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && !existing.leave_time) {
        return NextResponse.json({ success: true, recordId: existing.id, status: "active" });
      }

      const { data: newRecord, error } = await supabase
        .from("class_attendance_records")
        .insert({
          class_id: classId,
          user_id: user.id,
          join_time: joinTime || now,
          attendance_status: "present",
          provider_session_id: providerSessionId || null,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          status: "in_class",
          current_class_id: classId,
          last_heartbeat_at: now,
          is_visible: true,
        });

      return NextResponse.json({ success: true, recordId: newRecord.id });
    }

    if (action === "leave" || action === "heartbeat") {
      const now = new Date().toISOString();
      const { data: activeRecord } = await supabase
        .from("class_attendance_records")
        .select("*")
        .eq("class_id", classId)
        .eq("user_id", user.id)
        .order("join_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeRecord) {
        const join = new Date(activeRecord.join_time).getTime();
        const current = new Date().getTime();
        const calculatedSeconds = Math.max(0, Math.floor((current - join) / 1000));
        const totalDuration = durationSeconds ?? calculatedSeconds;

        const durationMinutes = totalDuration / 60;
        const status = durationMinutes >= config.attendance_min_minutes ? "present" : "partial";

        await supabase
          .from("class_attendance_records")
          .update({
            leave_time: action === "leave" ? now : null,
            total_duration_seconds: totalDuration,
            attendance_status: status,
            updated_at: now,
          })
          .eq("id", activeRecord.id);

        if (action === "leave") {
          await supabase
            .from("user_presence")
            .upsert({
              user_id: user.id,
              status: "online",
              current_class_id: null,
              last_heartbeat_at: now,
              is_visible: true,
            });
        }

        return NextResponse.json({ success: true, durationSeconds: totalDuration, status });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[classroom/attendance] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { attendanceId, newStatus, correctionReason } = body;

    if (!attendanceId || !newStatus || !correctionReason) {
      return NextResponse.json(
        { error: "attendanceId, newStatus, and correctionReason are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    const { data: record, error: fetchError } = await supabase
      .from("class_attendance_records")
      .select("*, live_classes(*)")
      .eq("id", attendanceId)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const isTutor = record.live_classes?.tutor_id === user.id;
    const { data: adminRole } = await supabase
      .from("admin_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = adminRole && ["super_admin", "platform_admin", "teacher"].includes(adminRole.role);

    if (!isTutor && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. Only assigned tutors or administrators can modify attendance." },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabase
      .from("class_attendance_records")
      .update({
        attendance_status: newStatus,
        manual_correction_reason: correctionReason,
        corrected_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attendanceId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await logAdminAction({
      admin_id: user.id,
      admin_email: user.email || "tutor@brainlabacademy.com",
      entity_type: "classroom",
      entity_id: attendanceId,
      action: "updated",
      previous_value: record.attendance_status,
      new_value: newStatus,
      change_reason: `Manual attendance correction: ${correctionReason}`,
    });

    return NextResponse.json({ success: true, message: "Attendance corrected and logged in audit trail." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
