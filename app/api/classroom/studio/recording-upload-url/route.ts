import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { resolveClassroomStaffAccess } from "@/app/lib/liveClassroom/authorization";

export const dynamic = "force-dynamic";

const BUCKET = "live-class-recordings";
const ALLOWED_TYPES = new Set(["video/webm", "video/mp4", "video/quicktime"]);

function safeFilename(value: unknown) {
  const name = String(value || "studio-recording.webm")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-100);
  return name || "studio-recording.webm";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Sign in before saving a Studio recording." }, { status: 401 });

    const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
    const staff = await resolveClassroomStaffAccess(user, token);
    if (!staff.isStaff) {
      return NextResponse.json({ error: "Only verified teaching staff can upload Studio recordings." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const lessonId = String(body?.lesson_id || "");
    const contentType = String(body?.content_type || "video/webm");
    const filename = safeFilename(body?.filename);
    if (!lessonId) return NextResponse.json({ error: "A saved Studio lesson is required." }, { status: 400 });
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Use a WebM or MP4 Studio recording." }, { status: 415 });
    }

    // Verify lesson ownership with the caller-scoped client before using the
    // service role to mint a narrowly scoped, single-object upload token.
    const userClient = getSupabaseServerClient(token);
    const { data: lesson, error: lessonError } = await userClient
      .from("classroom_lessons")
      .select("id")
      .eq("id", lessonId)
      .eq("tutor_id", user.id)
      .maybeSingle();
    if (lessonError || !lesson) {
      return NextResponse.json({ error: "The Studio lesson was not found or is not owned by this tutor." }, { status: 403 });
    }

    const path = `studio-lessons/${user.id}/${Date.now()}-${filename}`;
    const storageAdmin = getSupabaseServerClient();
    const { data, error } = await storageAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) {
      return NextResponse.json({ error: "Could not prepare secure Studio recording upload." }, { status: 503 });
    }

    return NextResponse.json({ success: true, bucket: BUCKET, path: data.path || path, token: data.token });
  } catch {
    return NextResponse.json({ error: "Could not prepare secure Studio recording upload." }, { status: 500 });
  }
}
