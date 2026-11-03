import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

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
      .select("*")
      .or(`created_by.eq.${user.id},is_visible_to_students.eq.true`)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[classroom/recordings/GET] Warning:", error.message);
      return NextResponse.json({ recordings: [] });
    }

    return NextResponse.json({ success: true, recordings: recordings || [] });
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

    if (!videoUrl) {
      return NextResponse.json({ error: "Missing videoUrl parameter." }, { status: 400 });
    }

    const payload = {
      class_id: classId || null,
      lesson_id: lessonId || null,
      title: title || "Recorded Video Lesson",
      subject: subject || null,
      topic: topic || null,
      description: description || null,
      video_url: videoUrl,
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

    const { data, error } = await supabase
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
