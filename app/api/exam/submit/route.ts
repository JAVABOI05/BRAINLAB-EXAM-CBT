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

    // 2. Safe resiliency recovery: verify the same session/token pair through the
    // resume_exam RPC. Never return a result based on session ID alone; callers
    // must prove possession of the attempt token.
    const { data: resumedData, error: resumeError } = await supabase.rpc("resume_exam", {
      p_session: sessionId,
      p_token: token,
    });

    if (!resumeError && resumedData && typeof resumedData === "object") {
      const resumed = resumedData as {
        ok?: boolean;
        finished?: boolean;
        status?: string;
        result_id?: string;
        score?: number;
        total?: number;
        subject_scores?: Record<string, number>;
        show_results?: boolean;
      };
      if (resumed.ok === true && resumed.finished === true && resumed.result_id) {
        return NextResponse.json({
          ok: true,
          finished: true,
          status: resumed.status || "submitted",
          result_id: resumed.result_id,
          score: resumed.score ?? 0,
          total: resumed.total ?? 400,
          subject_scores: resumed.subject_scores || {},
          show_results: resumed.show_results === true,
        });
      }
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
