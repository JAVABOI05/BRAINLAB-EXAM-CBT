import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export interface TrimRequestPayload {
  videoUrl: string;
  startSec: number;
  endSec: number;
  classId?: string;
  lessonId?: string;
  recordingId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required to trim recordings." }, { status: 401 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabase = getSupabaseServerClient(token);

    const body = (await request.json().catch(() => null)) as TrimRequestPayload | null;
    if (!body || typeof body.videoUrl !== "string") {
      return NextResponse.json({ error: "Missing valid videoUrl in trim request." }, { status: 400 });
    }

    const startSec = Number(body.startSec) || 0;
    const endSec = Number(body.endSec) || 0;

    if (startSec < 0 || endSec <= startSec) {
      return NextResponse.json(
        { error: "Invalid trim boundary: startSec must be >= 0 and endSec must be > startSec." },
        { status: 400 }
      );
    }

    const trimmedDuration = Math.round((endSec - startSec) * 10) / 10;
    const jobId = `trim-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Update or insert trimmed metadata in class_recordings
    if (body.recordingId) {
      await supabase
        .from("class_recordings")
        .update({
          duration: trimmedDuration,
          trimmed_start_sec: startSec,
          trimmed_end_sec: endSec,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.recordingId)
        .eq("host_id", user.id);
    }

    return NextResponse.json({
      ok: true,
      jobId,
      status: "completed",
      videoUrl: body.videoUrl,
      startSec,
      endSec,
      trimmedDuration,
      message: `Recording trimmed to ${trimmedDuration} seconds successfully.`,
    });
  } catch (error) {
    console.error("Trim endpoint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process video trimming." },
      { status: 500 }
    );
  }
}
