import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

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
      const mimeType = mimeMatch ? mimeMatch[1] : asset.mime_type || "application/octet-stream";
      const buffer = Buffer.from(base64Data, "base64");

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // If it is a remote URL, redirect to it
    return NextResponse.redirect(asset.file_url);
  } catch (err: any) {
    return new NextResponse(err.message || "Server Error", { status: 500 });
  }
}
