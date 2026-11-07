import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { canAccessClassroom, canManageClassroom, resolveClassroomStaffAccess } from "@/app/lib/liveClassroom/authorization";
import { storeClassroomMedia } from "@/app/lib/classroomMediaStore";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Sign in before uploading classroom media." }, { status: 401 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const classId = (formData.get("classId") as string) || "classroom-assets";
    const mediaType = (formData.get("mediaType") as string) || "image"; // "audio" | "image" | "document"
    const durationSeconds = parseFloat((formData.get("duration") as string) || "0");

    if (!["audio", "image", "document"].includes(mediaType)) {
      return NextResponse.json({ error: "Unsupported classroom media type." }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No media file provided." }, { status: 400 });
    }

    // Uploads tied to a class require active participant admission; teaching
    // resources remain tutor/admin-only.
    if (classId === "classroom-assets") {
      const staff = await resolveClassroomStaffAccess(user, token);
      if (!staff.isStaff) {
        return NextResponse.json({ error: "Only verified teaching staff can upload shared classroom assets." }, { status: 403 });
      }
    } else if (!(await canAccessClassroom(user, classId, token))) {
      return NextResponse.json({ error: "You are not admitted to this classroom." }, { status: 403 });
    }
    if (mediaType === "document" && !(await canManageClassroom(user, classId, token))) {
      return NextResponse.json({ error: "Only the assigned tutor or a platform administrator can upload classroom documents." }, { status: 403 });
    }

    // Limit to 50MB for presentation decks/documents, 25MB for audio/images.
    const maxSizeBytes = mediaType === "document" ? 50 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File exceeds limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.` },
        { status: 400 }
      );
    }

    const mimeType = (file.type || "").split(";")[0].trim().toLowerCase();
    const allowedMimeTypes: Record<string, string[]> = {
      audio: ["audio/webm", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav", "audio/mpeg"],
      image: ["image/png", "image/jpeg", "image/webp", "image/gif"],
      document: ["application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"],
    };
    if (!allowedMimeTypes[mediaType].includes(mimeType)) {
      return NextResponse.json({ error: "This file type is not supported for classroom uploads." }, { status: 415 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const assetId = crypto.randomUUID();

    // 1. Store in fast in-memory media cache for instant fallback
    storeClassroomMedia(assetId, buffer, mimeType, durationSeconds, file.name, classId);

    const supabase = getSupabaseServerClient(token);
    const userId = user.id;

    // 2. Upload file to Supabase Storage: 'learning-content-media'
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const safeClassId = String(classId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
    const storagePath = `classroom-assets/${safeClassId}/${assetId}-${safeName}`;
    let finalUrl = `/api/classroom/media/${assetId}`;
    let storageUploaded = false;

    try {
      const { error: uploadError } = await supabase.storage
        .from("learning-content-media")
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadError) {
        storageUploaded = true;
        if (mediaType === "audio") {
          // Audio is persisted with class metadata and delivered through the
          // authenticated media proxy using a short-lived signed URL.
          finalUrl = `/api/classroom/media/${assetId}`;
        } else {
          // Existing image/document viewers consume direct storage URLs.
          // A private-bucket migration is needed before proxying these formats.
          const { data: publicUrlData } = supabase.storage
            .from("learning-content-media")
            .getPublicUrl(storagePath);
          if (publicUrlData?.publicUrl) finalUrl = publicUrlData.publicUrl;
        }
      } else {
        console.warn("[classroom/upload] Storage bucket upload warning:", uploadError.message);
      }
    } catch (storageErr) {
      console.warn("[classroom/upload] Storage upload exception, falling back to media route:", storageErr);
    }

    // Audio is only proxied across serverless instances when the durable
    // Storage object exists; never register a broken media reference.
    if (mediaType === "audio" && !storageUploaded) {
      return NextResponse.json({ error: "Audio storage is temporarily unavailable. Please retry." }, { status: 503 });
    }

    // 3. Persist asset record if audio
    if (mediaType === "audio" && user) {
      const { error: assetInsertError } = await supabase
          .from("audio_assets")
          .insert({
            id: assetId,
            user_id: user.id,
            asset_type: "tutor_voice_note",
            title: file.name || `Classroom Voice Note ${new Date().toLocaleTimeString()}`,
            file_url: finalUrl,
            storage_path: storagePath,
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
      if (assetInsertError) {
        console.error("[classroom/upload] Audio metadata persistence failed:", assetInsertError.message);
        return NextResponse.json({ error: "The audio was uploaded but could not be registered securely. Please retry." }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      assetId,
      url: finalUrl,
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
