import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { canAccessClassroom } from "@/app/lib/liveClassroom/authorization";
import { getClassroomMedia } from "@/app/lib/classroomMediaStore";

export const dynamic = "force-dynamic";

function cleanMimeType(mime?: string | null): string {
  if (!mime) return "audio/webm";
  const primary = mime.split(";")[0].trim().toLowerCase();
  if (primary.includes("webm")) return "audio/webm";
  if (primary.includes("mp4")) return "audio/mp4";
  if (primary.includes("aac")) return "audio/aac";
  if (primary.includes("ogg")) return "audio/ogg";
  if (primary.includes("wav")) return "audio/wav";
  if (primary.includes("mpeg") || primary.includes("mp3")) return "audio/mpeg";
  if (primary.includes("png")) return "image/png";
  if (primary.includes("jpeg") || primary.includes("jpg")) return "image/jpeg";
  if (primary.includes("webp")) return "image/webp";
  if (primary.includes("svg")) return "image/svg+xml";
  return primary;
}

const CORS_HEADERS: Record<string, string> = {
  "Vary": "Cookie, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function serveBuffer(buffer: Buffer, rawMime: string, request: NextRequest) {
  const totalSize = buffer.length;
  const mimeType = cleanMimeType(rawMime);
  const range = request.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10) || 0;
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    const chunkSize = end - start + 1;
    const chunk = buffer.subarray(start, end + 1);

    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...CORS_HEADERS,
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": mimeType,
      "Content-Length": totalSize.toString(),
      "Accept-Ranges": "bytes",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return new NextResponse("Asset ID required", { status: 400, headers: CORS_HEADERS });
    }

    const user = await getUserFromRequest(request);
    if (!user) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "private, no-store" } });
    const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    // 1. Check in-memory fast media cache; every asset is bound to a class.
    const cached = getClassroomMedia(id);
    if (cached) {
      if (!cached.classId || !(await canAccessClassroom(user, cached.classId, bearerToken))) {
        return new NextResponse("Forbidden", { status: 403, headers: { "Cache-Control": "private, no-store" } });
      }
      return serveBuffer(cached.buffer, cached.mimeType, request);
    }

    // 2. Fallback to Supabase audio_assets table. Legacy assets without a
    // class binding fail closed rather than becoming public through this route.
    const supabase = getSupabaseServerClient();
    const { data: asset, error } = await supabase
      .from("audio_assets")
      .select("file_url, storage_path, mime_type, title, metadata")
      .eq("id", id)
      .maybeSingle();

    if (error || !asset || !asset.file_url) {
      return new NextResponse("Media asset not found", { status: 404, headers: CORS_HEADERS });
    }

    const metadata = asset.metadata && typeof asset.metadata === "object" ? asset.metadata as Record<string, unknown> : {};
    const classId = typeof metadata.class_id === "string" ? metadata.class_id : null;
    if (!classId || !(await canAccessClassroom(user, classId, bearerToken))) {
      return new NextResponse("Forbidden", { status: 403, headers: { "Cache-Control": "private, no-store" } });
    }

    // Handle base64 data URIs
    if (asset.file_url.startsWith("data:")) {
      const commaIndex = asset.file_url.indexOf(",");
      const meta = asset.file_url.substring(0, commaIndex);
      const base64Data = asset.file_url.substring(commaIndex + 1);

      const mimeMatch = meta.match(/data:(.*?);base64/);
      const mimeType = mimeMatch ? mimeMatch[1] : asset.mime_type || "audio/webm";
      const buffer = Buffer.from(base64Data, "base64");

      return serveBuffer(buffer, mimeType, request);
    }

    // Deliver storage objects through short-lived signed URLs only after the
    // caller has passed the class admission check above.
    if (asset.storage_path) {
      const { data: signed, error: signError } = await supabase.storage
        .from("learning-content-media")
        .createSignedUrl(asset.storage_path, 60);
      if (signError || !signed?.signedUrl) {
        return new NextResponse("Media temporarily unavailable", { status: 503, headers: { "Cache-Control": "private, no-store" } });
      }
      return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
    }
    // Legacy external URLs are allowed only after class authorization.
    return NextResponse.redirect(asset.file_url, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err: unknown) {
    return new NextResponse((err instanceof Error ? err.message : String(err)) || "Server Error", {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return GET(request, { params });
}
