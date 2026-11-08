import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { resolveClassroomStaffAccess } from "@/app/lib/liveClassroom/authorization";
import { getLiveClassroomConfig, saveLiveClassroomConfig } from "@/app/lib/platformConfig";

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

    // Only platform administrators may override class ownership.
    const staffAccess = await resolveClassroomStaffAccess(user, token);
    const isPlatformAdmin = staffAccess.isPlatformAdmin;

    const { data: liveClass, error: fetchErr } = await supabase
      .from("live_classes")
      .select("*")
      .eq("id", classId)
      .maybeSingle();

    if (fetchErr || !liveClass) {
      const normalizedClassId = classId.trim().toUpperCase();
      const isVirtualStage =
        normalizedClassId === "BL-LIVE-101" ||
        normalizedClassId === "DEMO-CLASS" ||
        normalizedClassId === "GENERAL-STAGE" ||
        normalizedClassId.startsWith("BL-ROOM-") ||
        normalizedClassId.startsWith("BL-LIVE-") ||
        normalizedClassId.startsWith("BL-STAGE-");

      if (!isVirtualStage) {
        return NextResponse.json({ error: "Live class not found." }, { status: 404 });
      }

      const config = await getLiveClassroomConfig();
      const room = config.room_configs?.[classId];
      if (!room) {
        return NextResponse.json({ error: "Active virtual classroom not found." }, { status: 404 });
      }

      if (!isPlatformAdmin && room.active_host_id !== user.id) {
        return NextResponse.json(
          { error: "Forbidden. Only the active host or a platform administrator can end this stage." },
          { status: 403 }
        );
      }

      const updatedRooms = { ...(config.room_configs || {}) };
      updatedRooms[classId] = { ...room, is_active: false, active_host_id: undefined };
      await saveLiveClassroomConfig(
        { room_configs: updatedRooms },
        { id: user.id, email: user.email || "host@brainlabacademy.com.ng" },
        `Host ended virtual classroom stage ${classId}`
      );

      return NextResponse.json({
        success: true,
        summary: {
          classId,
          title: room.title || "BrainLab Live Session",
          endedAt: new Date().toISOString(),
          durationMinutes: 0,
          totalAttendees: 0,
        },
      });
    }

    if (!isPlatformAdmin && liveClass.tutor_id !== user.id) {
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
