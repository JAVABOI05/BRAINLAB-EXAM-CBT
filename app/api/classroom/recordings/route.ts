import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { canAccessClassroom, canManageClassroom, resolveClassroomStaffAccess } from "@/app/lib/liveClassroom/authorization";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabase = getSupabaseServerClient(token);

    const { data: recordings, error } = await supabase
      .from("class_recordings")
      .select("*, live_classes(id, tutor_id, course_id)")
      .or(`created_by.eq.${user.id},is_visible_to_students.eq.true`)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[classroom/recordings/GET] Warning:", error.message);
      return NextResponse.json({ recordings: [] });
    }

    // A visible flag is not global authorization. Replays use durable course
    // enrolment or recorded attendance, not temporary live-room entry-code grants.
    const visibleRecordings = await Promise.all((recordings || []).map(async (recording) => {
      const ownsClass = recording.live_classes?.tutor_id === user.id;
      if (recording.created_by === user.id || ownsClass) return recording;
      if (!recording.is_visible_to_students || recording.processing_status !== "ready") return null;
      if (recording.access_policy === "public") return recording;
      if (recording.access_policy !== "enrolled_only" || !recording.class_id) return null;

      const courseId = recording.course_id || recording.live_classes?.course_id;
      if (courseId) {
        const { data: enrollment } = await supabase
          .from("course_enrollments")
          .select("id, expires_at")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        if (enrollment && (!enrollment.expires_at || new Date(enrollment.expires_at).getTime() > Date.now())) {
          return recording;
        }
        const { data: subscription } = await supabase
          .from("subscription_records")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        return subscription ? recording : null;
      }

      const { data: attendance } = await supabase
        .from("class_attendance_records")
        .select("id")
        .eq("class_id", recording.class_id)
        .eq("user_id", user.id)
        .in("attendance_status", ["present", "partial", "manual_verified"])
        .limit(1)
        .maybeSingle();
      return attendance ? recording : null;
    }));

    // Mint short-lived playback URLs only after the caller's visibility and
    // class-admission checks. Never return the long-lived URL saved by a client.
    const storageAdmin = getSupabaseServerClient();
    const playableRecordings = await Promise.all(visibleRecordings.filter(Boolean).map(async (recording) => {
      if (!recording.storage_path) return recording;
      const { data: signed, error: signError } = await storageAdmin.storage
        .from("live-class-recordings")
        .createSignedUrl(recording.storage_path, 60 * 60);
      return { ...recording, video_url: signError ? "" : (signed?.signedUrl || "") };
    }));

    return NextResponse.json({ success: true, recordings: playableRecordings });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load recordings." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabase = getSupabaseServerClient(token);
    const body = await request.json().catch(() => ({}));

    const {
      classId,
      lessonId,
      title,
      subject,
      topic,
      description,
      videoUrl,
      storagePath,
      durationSeconds,
      fileSizeBytes,
      recordingSource = "lesson_studio",
      isVisibleToStudents = false,
      resolution = "1080p",
      aspectRatio = "16 / 9",
    } = body;

    if (!videoUrl && !storagePath) {
      return NextResponse.json({ error: "A recording storage path or HTTPS video URL is required." }, { status: 400 });
    }

    // Recording metadata must only be created by verified teaching staff
    // managing the associated class. Client-supplied flags never grant access.
    const staffAccess = await resolveClassroomStaffAccess(user, token);
    if (!staffAccess.isStaff) {
      return NextResponse.json({ error: "Forbidden. Only verified instructors can save classroom recordings." }, { status: 403 });
    }
    if (classId && !(await canManageClassroom(user, String(classId), token))) {
      return NextResponse.json({ error: "Forbidden. You cannot save a recording for another instructor's class." }, { status: 403 });
    }
    if (!classId && !lessonId) {
      return NextResponse.json({ error: "A scheduled class or an owned Studio lesson is required." }, { status: 400 });
    }
    if (lessonId) {
      const { data: lesson, error: lessonError } = await supabase
        .from("classroom_lessons")
        .select("id")
        .eq("id", String(lessonId))
        .eq("tutor_id", user.id)
        .maybeSingle();
      if (lessonError || !lesson) {
        return NextResponse.json({ error: "The Studio lesson was not found or is not owned by this tutor." }, { status: 403 });
      }
    }
    if (storagePath) {
      const expectedPrefix = classId
        ? `${String(classId)}/${user.id}/`
        : `studio-lessons/${user.id}/`;
      if (typeof storagePath !== "string" || !storagePath.startsWith(expectedPrefix) || storagePath.includes("..")) {
        return NextResponse.json({ error: "The recording storage path is not owned by this tutor and lesson/class." }, { status: 403 });
      }
    } else {
      try {
        if (new URL(String(videoUrl)).protocol !== "https:") throw new Error("HTTPS required");
      } catch {
        return NextResponse.json({ error: "Use a valid HTTPS video URL." }, { status: 400 });
      }
    }

    const payload = {
      class_id: classId || null,
      lesson_id: lessonId || null,
      title: title || "Recorded Video Lesson",
      subject: subject || null,
      topic: topic || null,
      description: description || null,
      // Store the private object path, never a client-minted signed URL.
      video_url: storagePath || videoUrl,
      storage_path: storagePath || null,
      duration_seconds: Math.round(Number(durationSeconds) || 0),
      file_size_bytes: Number(fileSizeBytes) || 0,
      recording_source: recordingSource,
      is_visible_to_students: Boolean(isVisibleToStudents),
      processing_status: "ready",
      created_by: user.id,
      resolution,
      aspect_ratio: aspectRatio,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // All authorization checks above use the caller-scoped client. Use the
    // server client only for the final insert so Studio-only recordings with
    // class_id=NULL can be persisted despite the legacy class-only INSERT RLS.
    const storageAdmin = getSupabaseServerClient();
    const { data, error } = await storageAdmin
      .from("class_recordings")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, recording: data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save recording metadata." },
      { status: 500 }
    );
  }
}
