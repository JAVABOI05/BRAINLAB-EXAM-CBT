import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { canManageClassroom, resolveClassroomStaffAccess } from "@/app/lib/liveClassroom/authorization";

export const dynamic = "force-dynamic";

const BUCKET = "live-class-recordings";
const ALLOWED_TYPES = new Set(["video/webm", "video/mp4", "video/quicktime"]);

function safeFilename(value: unknown) {
  const name = String(value || "class-recording.webm")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-100);
  return name || "class-recording.webm";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Sign in before recording a class." }, { status: 401 });

    const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
    const staffAccess = await resolveClassroomStaffAccess(user, token);
    if (!staffAccess.isStaff) {
      return NextResponse.json({ error: "Only verified teaching staff can upload scheduled-class recordings." }, { status: 403 });
    }

    const body = await request.json();
    const classId = String(body?.class_id || "");
    const contentType = String(body?.content_type || "video/webm");
    const filename = safeFilename(body?.filename);
    if (!classId) return NextResponse.json({ error: "Missing class ID." }, { status: 400 });
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Use a WebM or MP4 classroom recording." }, { status: 415 });
    }

    const supabase = getSupabaseServerClient();
    const { data: liveClass, error: classError } = await supabase
      .from("live_classes")
      .select("id, title, tutor_id, is_recording_enabled")
      .eq("id", classId)
      .maybeSingle();

    if (classError || !liveClass) {
      return NextResponse.json({ error: "This recording flow is available for scheduled classroom sessions." }, { status: 404 });
    }
    if (!(await canManageClassroom(user, classId, token))) {
      return NextResponse.json({ error: "Only the assigned tutor or an authorized platform administrator can record this class." }, { status: 403 });
    }
    if (!liveClass.is_recording_enabled) {
      return NextResponse.json({ error: "Recording is disabled for this class. Contact the platform administrator." }, { status: 403 });
    }

    const path = `${liveClass.id}/${user.id}/${Date.now()}-${filename}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) {
      return NextResponse.json({ error: "Could not prepare secure recording upload." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bucket: BUCKET,
      path: data.path || path,
      token: data.token,
      title: liveClass.title,
    });
  } catch {
    return NextResponse.json({ error: "Could not prepare recording upload." }, { status: 500 });
  }
}
