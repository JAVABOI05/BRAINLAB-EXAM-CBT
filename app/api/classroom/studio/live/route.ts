import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in before starting a class." }, { status: 401 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = getSupabaseServerClient(token);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.lessonId !== "string") return NextResponse.json({ error: "Save the lesson before going live." }, { status: 400 });

  const { data: lesson, error: lessonError } = await supabase.from("classroom_lessons")
    .select("id,tutor_id,title,description,subject,status")
    .eq("id", body.lessonId).eq("tutor_id", user.id).maybeSingle();
  if (lessonError) return NextResponse.json({ error: "Unable to load the saved lesson. Confirm the Classroom Studio migration is applied." }, { status: 500 });
  if (!lesson) return NextResponse.json({ error: "Lesson not found or access denied." }, { status: 404 });

  const now = new Date();
  const end = new Date(now.getTime() + 90 * 60 * 1000);
  const roomName = `brainlab-${lesson.id.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: liveClass, error } = await supabase.from("live_classes").insert({
    tutor_id: user.id,
    title: lesson.title,
    description: lesson.description || lesson.subject || "BrainLab prepared lesson",
    class_format: "interactive",
    status: "live",
    scheduled_start_at: now.toISOString(),
    scheduled_end_at: end.toISOString(),
    actual_start_at: now.toISOString(),
    max_capacity: 100,
    room_name: roomName,
    provider: "webrtc",
    is_recording_enabled: true,
    waiting_room_enabled: false,
    student_mic_enabled: true,
    student_camera_enabled: false,
    student_chat_enabled: true,
    student_screenshare_enabled: false,
  }).select("id").single();

  if (error || !liveClass) return NextResponse.json({ error: "Could not create the live session. Please check your live_classes schema and retry; your saved lesson remains safe." }, { status: 500 });
  await supabase.from("classroom_lessons").update({ live_class_id: liveClass.id, status: "ready" }).eq("id", lesson.id).eq("tutor_id", user.id);
  return NextResponse.json({ liveClassId: liveClass.id, url: `/classroom/${liveClass.id}` });
}
