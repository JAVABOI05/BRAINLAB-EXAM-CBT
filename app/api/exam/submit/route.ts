import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = body.sessionId || body.p_session;
    const token = body.token || body.p_token;
    const answers = body.answers || body.p_answers || {};
    const auto = Boolean(body.auto || body.autoSubmitted || body.p_auto);
    const flagged = body.flagged || body.p_flagged || {};

    if (!sessionId || !token) {
      return NextResponse.json(
        { ok: false, error: "invalid_request", message: "Missing session ID or token." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Invoke the submit_exam RPC via high-speed server connection
    const { data: rpcData, error: rpcError } = await supabase.rpc("submit_exam", {
      p_session: sessionId,
      p_token: token,
      p_answers: answers,
      p_auto: auto,
      p_flagged: flagged,
    });

    if (!rpcError && rpcData && typeof rpcData === "object" && (rpcData as { ok?: boolean }).ok !== false) {
      return NextResponse.json(rpcData);
    }

    // 2. Resiliency recovery: If the exam was already submitted (e.g. from a prior auto-save or double click)
    // look up the existing result directly to prevent candidate lockout.
    const { data: existingResult } = await supabase
      .from("results")
      .select("id, score, total, subject_scores, created_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingResult) {
      return NextResponse.json({
        ok: true,
        finished: true,
        status: "submitted",
        result_id: existingResult.id,
        score: existingResult.score,
        total: existingResult.total,
        subject_scores: existingResult.subject_scores || {},
        show_results: true,
      });
    }

    // Check if session exists and is marked as finished/submitted
    const { data: sessionRow } = await supabase
      .from("exam_sessions")
      .select("id, status, score, total")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionRow && (sessionRow.status === "submitted" || sessionRow.status === "expired")) {
      return NextResponse.json({
        ok: true,
        finished: true,
        status: sessionRow.status,
        result_id: sessionRow.id,
        score: sessionRow.score || 0,
        total: sessionRow.total || 400,
        subject_scores: {},
        show_results: true,
      });
    }

    const errorMessage = rpcError?.message || (rpcData as { message?: string })?.message || "Could not complete examination submission.";
    return NextResponse.json(
      { ok: false, error: "submit_failed", message: errorMessage },
      { status: 500 }
    );
  } catch (err) {
    console.error("[api/exam/submit] Unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: err instanceof Error ? err.message : "Exam submission failed.",
      },
      { status: 500 }
    );
  }
}
