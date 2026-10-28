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

    if (typeof sessionId !== "string" || typeof token !== "string" || !sessionId.trim() || !token.trim()) {
      return NextResponse.json(
        { ok: false, error: "invalid_request", message: "Missing session ID or token." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
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

    // This server client may use the service-role key, so fallback queries must
    // independently verify the session/token pair instead of relying on RLS.
    const { data: sessionRow, error: sessionError } = await supabase
      .from("exam_sessions")
      .select("id, status, score, total, result_id")
      .eq("id", sessionId)
      .eq("attempt_token", token)
      .maybeSingle();

    if (sessionError) {
      console.error("[api/exam/submit] Session recovery lookup failed:", sessionError.message);
      return NextResponse.json(
        { ok: false, error: "submit_failed", message: "Could not verify the exam submission. Please retry." },
        { status: 500 }
      );
    }

    if (!sessionRow) {
      return NextResponse.json(
        { ok: false, error: "invalid_session", message: "The exam session or attempt token is invalid." },
        { status: 401 }
      );
    }

    // Idempotent recovery is allowed only for a verified, finalized attempt.
    if (sessionRow.status === "submitted" || sessionRow.status === "expired") {
      const { data: existingResult, error: resultError } = await supabase
        .from("results")
        .select("id, score, total, subject_scores, created_at")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (resultError) {
        console.error("[api/exam/submit] Result recovery lookup failed:", resultError.message);
        return NextResponse.json(
          { ok: false, error: "submit_failed", message: "Your submission was received, but the result could not be retrieved. Please retry later." },
          { status: 500 }
        );
      }

      if (existingResult) {
        return NextResponse.json({
          ok: true,
          finished: true,
          status: sessionRow.status,
          result_id: existingResult.id,
          score: existingResult.score,
          total: existingResult.total,
          subject_scores: existingResult.subject_scores || {},
          show_results: true,
        });
      }

      return NextResponse.json({
        ok: true,
        finished: true,
        status: sessionRow.status,
        result_id: sessionRow.result_id || sessionRow.id,
        score: sessionRow.score || 0,
        total: sessionRow.total || 400,
        subject_scores: {},
        show_results: true,
      });
    }

    const errorMessage =
      rpcError?.message ||
      (rpcData as { message?: string } | null)?.message ||
      "Could not complete examination submission.";
    console.error("[api/exam/submit] RPC submission failed:", errorMessage);
    return NextResponse.json(
      { ok: false, error: "submit_failed", message: "Could not complete the submission. Please retry." },
      { status: 500 }
    );
  } catch (err) {
    console.error(
      "[api/exam/submit] Unexpected error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Exam submission failed. Please retry." },
      { status: 500 }
    );
  }
}
