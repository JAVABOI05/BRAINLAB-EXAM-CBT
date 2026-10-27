import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const classId = (formData.get("classId") as string) || "live-session";
    const mediaType = (formData.get("mediaType") as string) || "audio"; // "audio" | "image"
    const durationSeconds = parseFloat((formData.get("duration") as string) || "0");

    if (!file) {
      return NextResponse.json({ error: "No media file provided." }, { status: 400 });
    }

    // Limit to 8MB
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 8MB limit." }, { status: 400 });
    }

    const mimeType = file.type || (mediaType === "audio" ? "audio/webm" : "image/jpeg");
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;

    const supabase = getSupabaseServerClient();
    const userId = user?.id || "guest_learner";

    try {
      // Store in audio_assets table (holds binary payloads with mime_type)
      const { data: asset, error: insertError } = await supabase
        .from("audio_assets")
        .insert({
          user_id: user ? user.id : undefined,
          asset_type: mediaType === "audio" ? "tutor_voice_note" : "lesson_audio",
          title: file.name || `Classroom ${mediaType} ${new Date().toLocaleTimeString()}`,
          file_url: base64Data,
          duration_seconds: durationSeconds,
          file_size_bytes: file.size,
          mime_type: mimeType,
          metadata: {
            class_id: classId,
            media_type: mediaType,
            original_filename: file.name,
            uploader_id: userId,
          },
        })
        .select("id")
        .maybeSingle();

      if (asset && !insertError) {
        return NextResponse.json({
          success: true,
          assetId: asset.id,
          url: `/api/classroom/media/${asset.id}`,
          mediaType,
          duration: durationSeconds,
        });
      }
    } catch {
      // ignore insert error and use base64Data fallback
    }

    // Fallback: return universal base64 data URI so all clients can play it directly
    return NextResponse.json({
      success: true,
      url: base64Data,
      mediaType,
      duration: durationSeconds,
    });
  } catch (error: unknown) {
    console.error("[classroom/upload] Error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Upload failed." }, { status: 500 });
  }
}
