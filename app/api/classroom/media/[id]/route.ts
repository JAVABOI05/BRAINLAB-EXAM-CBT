import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getClassroomMedia } from "@/app/lib/classroomMediaStore";

export const dynamic = "force-dynamic";

function serveBuffer(buffer: Buffer, mimeType: string, request: NextRequest) {
  const totalSize = buffer.length;
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
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": totalSize.toString(),
      "Accept-Ranges": "bytes",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
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
      return new NextResponse("Asset ID required", { status: 400 });
    }

    // 1. Check in-memory fast media cache first
    const cached = getClassroomMedia(id);
    if (cached) {
      return serveBuffer(cached.buffer, cached.mimeType, request);
    }

    // 2. Fallback to Supabase audio_assets table
    const supabase = getSupabaseServerClient();
    const { data: asset, error } = await supabase
      .from("audio_assets")
      .select("file_url, mime_type, title")
      .eq("id", id)
      .maybeSingle();

    if (error || !asset || !asset.file_url) {
      return new NextResponse("Media asset not found", { status: 404 });
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

    // If it is a remote URL, redirect to it
    return NextResponse.redirect(asset.file_url);
  } catch (err: unknown) {
    return new NextResponse((err instanceof Error ? err.message : String(err)) || "Server Error", { status: 500 });
  }
}
