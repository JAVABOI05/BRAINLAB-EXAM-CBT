import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient, resolveAdminRole } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id: classId } = await context.params;
    if (!classId) {
      return NextResponse.json({ error: "Missing classId." }, { status: 400 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabase = getSupabaseServerClient(token);

    // 1. Verify user is tutor or administrator
    const resolvedRole = await resolveAdminRole(user.id);
    const isAdmin = Boolean(
      resolvedRole && ["super_admin", "platform_admin", "cbt_admin", "teacher"].includes(resolvedRole)
    );

    const { data: liveClass, error: fetchErr } = await supabase
      .from("live_classes")
      .select("*")
      .eq("id", classId)
      .maybeSingle();

    if (fetchErr || !liveClass) {
      // If it was a mock / open stage room (e.g. BL-LIVE-101)
      return NextResponse.json({
        success: true,
        summary: {
          classId,
          title: "BrainLab Live Session",
          endedAt: new Date().toISOString(),
          durationMinutes: 60,
          totalAttendees: 1,
        },
      });
    }

    if (!isAdmin && liveClass.tutor_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. Only the host tutor or administrator can end this class." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // 2. Mark class session as completed
    const { data: updatedClass, error: updateErr } = await supabase
      .from("live_classes")
      .update({
        status: "completed",
        actual_end_at: now,
        updated_at: now,
      })
      .eq("id", classId)
      .select()
      .single();

    if (updateErr) {
      console.warn("[classroom/end] Class update warning:", updateErr.message);
    }

    // 3. Finalize all open attendance records
    await supabase
      .from("class_attendance_records")
      .update({
        leave_time: now,
        updated_at: now,
      })
      .eq("class_id", classId)
      .is("leave_time", null);

    // 4. Close any open polls
    await supabase
      .from("classroom_polls")
      .update({
        is_open: false,
        closed_at: now,
      })
      .eq("class_id", classId)
      .eq("is_open", true);

    // 5. Aggregate attendee telemetry
    const { count: attendeeCount } = await supabase
      .from("class_attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId);

    const startTime = liveClass.actual_start_at ? new Date(liveClass.actual_start_at).getTime() : Date.now();
    const durationMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));

    return NextResponse.json({
      success: true,
      summary: {
        classId,
        title: updatedClass?.title || liveClass.title,
        startedAt: liveClass.actual_start_at,
        endedAt: now,
        durationMinutes,
        totalAttendees: attendeeCount || 1,
      },
    });
  } catch (error: unknown) {
    console.error("[classroom/end] Exception:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to finalize class session." },
      { status: 500 }
    );
  }
}
