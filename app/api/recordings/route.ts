/* eslint @typescript-eslint/no-explicit-any: "off" */
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "../../lib/supabaseServer";

const ADMIN_ROLES = ["super_admin", "platform_admin"];

async function isPlatformAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data && ADMIN_ROLES.includes(data.role));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Sign in to view class recordings." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const classId = searchParams.get("classId");
    const supabase = getSupabaseServerClient();
    const isAdmin = await isPlatformAdmin(supabase, user.id);

    let query = supabase
      .from("class_recordings")
      .select("*, live_classes(id, tutor_id, course_id, title, scheduled_start_at), courses(title, slug)")
      .order("created_at", { ascending: false });

    if (courseId) query = query.eq("course_id", courseId);
    if (classId) query = query.eq("class_id", classId);

    const { data: rows, error } = await query;
    if (error) return NextResponse.json({ error: "Could not load recordings." }, { status: 500 });

    const rowsList = rows ?? [];
    const courseIds = [...new Set(rowsList
      .filter((recording: any) => (recording.course_id || recording.live_classes?.course_id) && recording.is_visible_to_students && recording.processing_status === "ready")
      .map((recording: any) => recording.course_id || recording.live_classes?.course_id))] as string[];
    const { data: enrollments } = courseIds.length
      ? await supabase.from("course_enrollments").select("course_id, expires_at").eq("user_id", user.id).eq("status", "active").in("course_id", courseIds)
      : { data: [] };
    const enrolledCourseIds = new Set((enrollments ?? []).filter((item: any) => !item.expires_at || new Date(item.expires_at).getTime() > Date.now()).map((item: any) => item.course_id));


    const visibilityChecks = await Promise.all(rowsList.map(async (recording: any) => {
      const ownsClass = recording.live_classes?.tutor_id === user.id;
      if (isAdmin || ownsClass || recording.created_by === user.id) return true;
      if (!recording.is_visible_to_students || recording.processing_status !== "ready") return false;
      if (recording.access_policy === "tutors_only") return false;
      if (recording.access_policy === "public") return true;
      if (recording.access_policy !== "enrolled_only") return false;

      if (recording.class_id) {
        const linkedCourseId = recording.course_id || recording.live_classes?.course_id;
        if (linkedCourseId) {
          return enrolledCourseIds.has(linkedCourseId);
        }

        // Standalone classes without a course are limited to learners who
        // actually attended or were manually verified for that class. Do not
        // reuse live-room admission grants, which are intentionally temporary.
        const { data: attendance } = await supabase
          .from("class_attendance_records")
          .select("id")
          .eq("class_id", recording.class_id)
          .eq("user_id", user.id)
          .in("attendance_status", ["present", "partial", "manual_verified"])
          .limit(1)
          .maybeSingle();
        return Boolean(attendance);
      }
      if (recording.course_id) {
        return enrolledCourseIds.has(recording.course_id);
      }
      return false;
    }));
    const visibleToUser = rowsList.filter((_: any, index: number) => visibilityChecks[index]);

    const recordings = await Promise.all(visibleToUser.map(async (recording: any) => {
      let videoUrl = recording.video_url;
      if (recording.storage_path && recording.processing_status === "ready") {
        const { data: signed, error: signedError } = await supabase.storage
          .from("live-class-recordings")
          .createSignedUrl(recording.storage_path, 60 * 60 * 4);
        videoUrl = signedError ? "" : (signed?.signedUrl || "");
      }

      const ownsClass = recording.live_classes?.tutor_id === user.id;
      const ownsStudioLesson = !recording.class_id && recording.created_by === user.id && Boolean(recording.lesson_id);
      const canManage = isAdmin || ownsClass || ownsStudioLesson;
      return {
        ...recording,
        video_url: videoUrl,
        is_downloadable: false,
        canManage,
        canDownload: (ownsClass || ownsStudioLesson) && Boolean(recording.storage_path),
      };
    }));

    return NextResponse.json({ success: true, recordings });
  } catch {
    return NextResponse.json({ error: "Could not load recordings." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const {
      class_id,
      course_id,
      title,
      description,
      video_url,
      storage_path,
      duration_seconds = 0,
      transcript_text,
      is_visible_to_students = false,
    } = body ?? {};

    if (!class_id || !title || (!storage_path && !video_url)) {
      return NextResponse.json({ error: "Missing required recording fields." }, { status: 400 });
    }

    const isAdmin = await isPlatformAdmin(supabase, user.id);
    const { data: liveClass, error: classError } = await supabase
      .from("live_classes")
      .select("id, tutor_id, course_id")
      .eq("id", class_id)
      .maybeSingle();
    if (classError || !liveClass) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }
    if (liveClass.tutor_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Only the class tutor can save its recording." }, { status: 403 });
    }
    if (course_id && course_id !== liveClass.course_id) {
      return NextResponse.json({ error: "The selected course is not linked to this classroom." }, { status: 400 });
    }
    const recordingCourseId = liveClass.course_id || null;
    if (storage_path && !String(storage_path).startsWith(`${class_id}/${user.id}/`)) {
      return NextResponse.json({ error: "The recording storage path does not belong to this tutor and class." }, { status: 403 });
    }
    if (!storage_path && video_url) {
      try {
        if (new URL(String(video_url)).protocol !== "https:") throw new Error("HTTPS required");
      } catch {
        return NextResponse.json({ error: "Use a valid HTTPS video URL." }, { status: 400 });
      }
    }

    const { data: recording, error } = await supabase
      .from("class_recordings")
      .insert({
        class_id,
        course_id: recordingCourseId,
        title: String(title).trim().slice(0, 180),
        description: description ? String(description).slice(0, 2000) : null,
        video_url: storage_path || video_url,
        storage_path: storage_path || null,
        duration_seconds: Math.max(0, Math.floor(Number(duration_seconds) || 0)),
        file_size_bytes: Math.max(0, Math.floor(Number(body.file_size_bytes) || 0)),
        transcript_text: transcript_text || null,
        is_downloadable: false,
        is_visible_to_students: Boolean(is_visible_to_students),
        published_at: is_visible_to_students ? new Date().toISOString() : null,
        created_by: user.id,
        access_policy: "enrolled_only",
        processing_status: "ready",
      })
      .select("id, class_id, title, is_visible_to_students, created_at")
      .single();

    if (error) return NextResponse.json({ error: "Could not save the recording details." }, { status: 500 });
    return NextResponse.json({ success: true, recording });
  } catch {
    return NextResponse.json({ error: "Could not save recording." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const recordingId = body?.recording_id;
    const visible = body?.is_visible_to_students;
    if (!recordingId || typeof visible !== "boolean") {
      return NextResponse.json({ error: "A recording ID and visibility choice are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const isAdmin = await isPlatformAdmin(supabase, user.id);
    const { data: existing, error: lookupError } = await supabase
      .from("class_recordings")
      .select("id, class_id, live_classes(tutor_id)")
      .eq("id", recordingId)
      .maybeSingle();

    if (lookupError || !existing) return NextResponse.json({ error: "Recording not found." }, { status: 404 });
    const ownerId = (existing as any).live_classes?.tutor_id;
    if (!isAdmin && ownerId !== user.id) {
      return NextResponse.json({ error: "Only the class tutor can change recording visibility." }, { status: 403 });
    }

    const { error } = await supabase
      .from("class_recordings")
      .update({
        is_visible_to_students: visible,
        published_at: visible ? new Date().toISOString() : null,
        is_downloadable: false,
      })
      .eq("id", recordingId);

    if (error) return NextResponse.json({ error: "Could not update recording visibility." }, { status: 500 });
    return NextResponse.json({ success: true, is_visible_to_students: visible });
  } catch {
    return NextResponse.json({ error: "Could not update recording visibility." }, { status: 500 });
  }
}
