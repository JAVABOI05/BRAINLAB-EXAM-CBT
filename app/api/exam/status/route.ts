import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId")?.trim();
    const token = searchParams.get("token")?.trim();

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "missing_session_id", message: "Session ID is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Check session in exam_sessions
    let query = supabase
      .from("exam_sessions")
      .select("id, status, score, total, candidate_name, phone, subject, deadline_at, time_left_seconds")
      .eq("id", sessionId);

    if (token) {
      query = query.eq("attempt_token", token);
    }

    const { data: sessionRow, error: sessionErr } = await query.maybeSingle();

    if (sessionErr || !sessionRow) {
      return NextResponse.json(
        { ok: false, error: "session_not_found", message: "Examination session not found." },
        { status: 404 }
      );
    }

    // 2. Check if results exist
    const { data: resultRow } = await supabase
      .from("results")
      .select("id, score, total, created_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    const isSubmitted =
      sessionRow.status === "submitted" ||
      sessionRow.status === "finished" ||
      sessionRow.status === "expired" ||
      Boolean(resultRow);

    return NextResponse.json({
      ok: true,
      sessionId: sessionRow.id,
      status: sessionRow.status,
      isSubmitted,
      resultId: resultRow?.id || null,
      score: resultRow?.score ?? sessionRow.score ?? null,
      total: resultRow?.total ?? sessionRow.total ?? 400,
    });
  } catch (err) {
    console.error("[api/exam/status] Error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Failed to verify examination status." },
      { status: 500 }
    );
  }
}
