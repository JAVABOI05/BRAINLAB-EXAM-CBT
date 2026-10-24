import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const supabase = getSupabaseServerClient();
    const { data: recording, error } = await supabase
      .from("class_recordings")
      .select("id, title, storage_path, live_classes(tutor_id)")
      .eq("id", id)
      .maybeSingle();

    if (error || !recording) return NextResponse.json({ error: "Recording not found." }, { status: 404 });
    const tutorId = (recording as any).live_classes?.tutor_id;
    if (tutorId !== user.id) {
      return NextResponse.json({ error: "Only the class tutor can download the original recording." }, { status: 403 });
    }
    if (!recording.storage_path) {
      return NextResponse.json({ error: "This older recording is not stored in BrainLab's private recording storage." }, { status: 409 });
    }

    const safeTitle = String(recording.title || "brainlab-class-recording")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .slice(0, 100);
    const { data: signed, error: signedError } = await supabase.storage
      .from("live-class-recordings")
      .createSignedUrl(recording.storage_path, 60 * 10, { download: `${safeTitle}.webm` });

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not create a secure download link." }, { status: 500 });
    }
    return NextResponse.redirect(signed.signedUrl);
  } catch {
    return NextResponse.json({ error: "Could not download recording." }, { status: 500 });
  }
}
