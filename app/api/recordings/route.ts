import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "../../lib/supabaseServer";

const ADMIN_ROLES = ["super_admin", "platform_admin"];

async function isPlatformAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admin_user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data && ADMIN_ROLES.includes(data.role));
}

async function canManageClass(supabase: any, classId: string, userId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const { data } = await supabase
    .from("live_classes")
    .select("id")
    .eq("id", classId)
    .eq("tutor_id", userId)
    .maybeSingle();
  return Boolean(data);
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
      .select("*, live_classes(id, tutor_id, title, scheduled_start_at), courses(title, slug)")
      .order("created_at", { ascending: false });

    if (courseId) query = query.eq("course_id", courseId);
    if (classId) query = query.eq("class_id", classId);

    const { data: rows, error } = await query;
    if (error) return NextResponse.json({ error: "Could not load recordings." }, { status: 500 });

    const visibleToUser = (rows ?? []).filter((recording: any) => {
      const ownsClass = recording.live_classes?.tutor_id === user.id;
      return isAdmin || ownsClass || (recording.is_visible_to_students === true && recording.processing_status === "ready");
    });

    const recordings = await Promise.all(visibleToUser.map(async (recording: any) => {
      let videoUrl = recording.video_url;
      if (recording.storage_path && recording.processing_status === "ready") {
        const { data: signed, error: signedError } = await supabase.storage
          .from("live-class-recordings")
          .createSignedUrl(recording.storage_path, 60 * 60 * 4);
        videoUrl = signedError ? "" : (signed?.signedUrl || "");
      }

      const canManage = isAdmin || recording.live_classes?.tutor_id === user.id;
      return {
        ...recording,
        video_url: videoUrl,
        is_downloadable: false,
        canManage,
        canDownload: canManage && Boolean(recording.storage_path),
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
    if (!(await canManageClass(supabase, class_id, user.id, isAdmin))) {
      return NextResponse.json({ error: "Only the class tutor can save its recording." }, { status: 403 });
    }
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
        course_id: course_id || null,
        title: String(title).trim().slice(0, 180),
        description: description ? String(description).slice(0, 2000) : null,
        video_url: storage_path || video_url,
        storage_path: storage_path || null,
        duration_seconds: Math.max(0, Math.floor(Number(duration_seconds) || 0)),
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
