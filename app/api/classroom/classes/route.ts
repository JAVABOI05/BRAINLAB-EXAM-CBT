import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { resolveClassroomStaffAccess } from "@/app/lib/liveClassroom/authorization";
import { getLiveClassroomConfig, logAdminAction } from "@/app/lib/platformConfig";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const status = searchParams.get("status");
    const tutorId = searchParams.get("tutorId");

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("live_classes")
      .select("id, title, description, status, scheduled_start_at, scheduled_end_at, class_format, course_id, subject_id, courses(title, slug), learning_subjects(name, slug)")
      .order("scheduled_start_at", { ascending: true });

    if (courseId) query = query.eq("course_id", courseId);
    if (status) query = query.eq("status", status);
    if (tutorId) query = query.eq("tutor_id", tutorId);

    const { data: classes, error } = await query;
    if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });

    return NextResponse.json({ success: true, classes: classes ?? [] });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    const body = await request.json();
    const {
      title,
      description,
      course_id,
      subject_id,
      class_format = "interactive",
      scheduled_start_at,
      scheduled_end_at,
      max_capacity,
      provider = "webrtc",
      is_recording_enabled = true,
      waiting_room_enabled = false,
      student_mic_enabled = true,
      student_camera_enabled = false,
      student_chat_enabled = true,
      student_screenshare_enabled = false,
    } = body;

    if (!title || !scheduled_start_at || !scheduled_end_at) {
      return NextResponse.json(
        { error: "title, scheduled_start_at, and scheduled_end_at are required." },
        { status: 400 }
      );
    }

    const staffAccess = await resolveClassroomStaffAccess(user);
    const isPlatformAdmin = staffAccess.isPlatformAdmin;
    const { data: tutorMembership } = subject_id
      ? await supabase
          .from("learning_subject_memberships")
          .select("subject_id")
          .eq("user_id", user.id)
          .eq("subject_id", subject_id)
          .eq("membership_role", "tutor")
          .maybeSingle()
      : { data: null };

    if (!isPlatformAdmin && (!staffAccess.isStaff || !tutorMembership)) {
      return NextResponse.json(
        { error: "Forbidden. Only platform administrators or tutors assigned to the selected subject can create this class." },
        { status: 403 }
      );
    }

    const config = await getLiveClassroomConfig();
    const capacity = max_capacity || config.max_capacity_default || 100;
    const roomName = `bl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const selectedProvider = body.provider || config.provider || "livekit";

    const { data: liveClass, error: insertError } = await supabase
      .from("live_classes")
      .insert({
        title,
        description,
        course_id: course_id || null,
        subject_id: subject_id || null,
        tutor_id: user.id,
        class_format,
        status: "scheduled",
        scheduled_start_at,
        scheduled_end_at,
        max_capacity: capacity,
        room_name: roomName,
        provider: selectedProvider,
        is_recording_enabled,
        waiting_room_enabled,
        student_mic_enabled,
        student_camera_enabled,
        student_chat_enabled,
        student_screenshare_enabled,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabase.from("calendar_events").insert({
      user_id: user.id,
      course_id: course_id || null,
      class_id: liveClass.id,
      title: `Live Class: ${title}`,
      description: description || "Interactive BrainLab live classroom session",
      event_type: "class",
      start_time: scheduled_start_at,
      end_time: scheduled_end_at,
      status: "scheduled",
      location_url: `/classroom/${liveClass.id}`,
    });

    await logAdminAction({
      admin_id: user.id,
      admin_email: user.email || "tutor@brainlabacademy.com",
      entity_type: "classroom",
      entity_id: liveClass.id,
      action: "created",
      new_value: { title, scheduled_start_at, class_format },
      change_reason: `Scheduled live class: ${title}`,
    });

    return NextResponse.json({ success: true, liveClass });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { classId, status, scheduled_start_at, scheduled_end_at, title, description } = body;

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: existingClass, error: fetchErr } = await supabase
      .from("live_classes")
      .select("*")
      .eq("id", classId)
      .single();

    if (fetchErr || !existingClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 });
    }

    const isTutor = existingClass.tutor_id === user.id;
    const staffAccess = await resolveClassroomStaffAccess(user);
    const isAdmin = staffAccess.isPlatformAdmin;

    if (!isTutor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) {
      updates.status = status;
      if (status === "live" && !existingClass.actual_start_at) {
        updates.actual_start_at = new Date().toISOString();
      }
      if (status === "completed" && !existingClass.actual_end_at) {
        updates.actual_end_at = new Date().toISOString();
      }
    }
    if (scheduled_start_at) updates.scheduled_start_at = scheduled_start_at;
    if (scheduled_end_at) updates.scheduled_end_at = scheduled_end_at;
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;

    const { data: updatedClass, error: updateErr } = await supabase
      .from("live_classes")
      .update(updates)
      .eq("id", classId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const calendarUpdates: Record<string, unknown> = {};
    if (title) calendarUpdates.title = `Live Class: ${title}`;
    if (description) calendarUpdates.description = description;
    if (scheduled_start_at) calendarUpdates.start_time = scheduled_start_at;
    if (scheduled_end_at) calendarUpdates.end_time = scheduled_end_at;
    if (status === "cancelled") calendarUpdates.status = "cancelled";
    if (status === "completed") calendarUpdates.status = "completed";

    if (Object.keys(calendarUpdates).length > 0) {
      await supabase
        .from("calendar_events")
        .update(calendarUpdates)
        .eq("class_id", classId);
    }

    // When host/tutor marks session as live, notify students
    if (status === "live") {
      try {
        const { data: learners } = await supabase
          .from("learning_subject_memberships")
          .select("user_id")
          .limit(100);

        const targetUserIds = new Set<string>();
        for (const l of learners || []) {
          if (l.user_id && l.user_id !== user.id) targetUserIds.add(l.user_id);
        }

        const { data: presences } = await supabase
          .from("user_presence")
          .select("user_id")
          .limit(50);
        for (const p of presences || []) {
          if (p.user_id && p.user_id !== user.id) targetUserIds.add(p.user_id);
        }

        const notifs = Array.from(targetUserIds).map((uid) => ({
          user_id: uid,
          title: `🔴 Live Class: ${updatedClass.title || "Interactive Session"}`,
          message: `Your tutor has started the live classroom session. Join now to participate!`,
          type: "class",
          link_url: `/classroom/${classId}`,
          is_read: false,
          created_at: new Date().toISOString(),
        }));

        if (notifs.length > 0) {
          await supabase.from("notifications").insert(notifs);
        }
      } catch (notifErr) {
        console.warn("Could not dispatch live class notifications:", notifErr);
      }
    }

    return NextResponse.json({ success: true, liveClass: updatedClass });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
