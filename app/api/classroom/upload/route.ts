import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { storeClassroomMedia } from "@/app/lib/classroomMediaStore";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const classId = (formData.get("classId") as string) || "live-session";
    const mediaType = (formData.get("mediaType") as string) || "audio"; // "audio" | "image" | "document"
    const durationSeconds = parseFloat((formData.get("duration") as string) || "0");

    if (!file) {
      return NextResponse.json({ error: "No media file provided." }, { status: 400 });
    }

    // Limit to 25MB for presentation decks/documents, 10MB for audio/images
    const maxSizeBytes = mediaType === "document" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File exceeds limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.` },
        { status: 400 }
      );
    }

    const mimeType = file.type || (mediaType === "audio" ? "audio/webm" : mediaType === "image" ? "image/jpeg" : "application/octet-stream");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = `data:${mimeType};base64,${buffer.toString("base64")}`;
    const assetId = crypto.randomUUID();

    // 1. Immediately store in fast in-memory media cache
    storeClassroomMedia(assetId, buffer, mimeType, durationSeconds, file.name);

    const supabase = getSupabaseServerClient();
    const userId = user?.id || "guest_learner";

    // 2. Also persist in database if table available
    try {
      await supabase
        .from("audio_assets")
        .insert({
          id: assetId,
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
        });
    } catch {
      // Ignore database insert issues; in-memory store serves immediately
    }

    return NextResponse.json({
      success: true,
      assetId,
      url: `/api/classroom/media/${assetId}`,
      fileName: file.name,
      fileSize: file.size,
      mediaType,
      duration: durationSeconds,
    });
  } catch (error: unknown) {
    console.error("[classroom/upload] Error:", error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || "Upload failed." },
      { status: 500 }
    );
  }
}
