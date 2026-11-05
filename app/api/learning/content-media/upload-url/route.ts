import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

const BUCKET = "learning-content-media";
const MEDIA_TYPES: Record<string, Set<string>> = {
  audio: new Set(["audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav"]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime"]),
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  document: new Set(["application/pdf"]),
};

function safeFilename(value: unknown) {
  return String(value || "learning-resource")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-100) || "learning-resource";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Sign in to upload learning media." }, { status: 401 });

    const body = await request.json();
    const topicId = String(body?.topic_id || "");
    const mediaType = String(body?.media_type || "");
    const contentType = String(body?.content_type || "");
    const filename = safeFilename(body?.filename);

    if (!topicId || !MEDIA_TYPES[mediaType]?.has(contentType)) {
      return NextResponse.json({ error: "Unsupported file type for this content block." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: topic, error: topicError } = await supabase
      .from("learning_topics")
      .select("id, subject_id")
      .eq("id", topicId)
      .maybeSingle();
    if (topicError || !topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });

    const { data: membership } = await supabase
      .from("learning_subject_memberships")
      .select("membership_role")
      .eq("subject_id", topic.subject_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: adminRole } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const canManageAll = Boolean(adminRole && ["super_admin", "platform_admin", "ai_learning_admin"].includes(adminRole.role));
    const canTutor = membership?.membership_role === "tutor";
    if (!canTutor && !canManageAll) {
      return NextResponse.json({ error: "You need tutor access to this subject to upload its learning media." }, { status: 403 });
    }

    const path = `${topic.subject_id}/${topic.id}/${user.id}/${Date.now()}-${filename}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) {
      return NextResponse.json({ error: "Could not prepare a secure upload. Apply the learning media storage migration first." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bucket: BUCKET,
      path: data.path || path,
      token: data.token,
      content_type: contentType,
      media_type: mediaType,
    });
  } catch {
    return NextResponse.json({ error: "Could not prepare learning media upload." }, { status: 500 });
  }
}
