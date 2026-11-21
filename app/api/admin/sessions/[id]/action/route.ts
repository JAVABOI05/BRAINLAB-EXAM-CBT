import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Session ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action; // add_time | unlock | force_submit | reset_switches

    const supabase = getSupabaseServerClient();

    // Verify session exists
    const { data: session, error: sessError } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessError || !session) {
      return NextResponse.json({ ok: false, error: "Exam session not found" }, { status: 404 });
    }

    // 1. ADD TIME EXTENSION. deadline_at is authoritative; changing only
    // time_left_seconds would be overwritten by the next server heartbeat.
    if (action === "add_time") {
      if (session.status !== "started") {
        return NextResponse.json({ ok: false, error: "session_not_active", message: "Only an active examination can receive a time extension." }, { status: 409 });
      }
      const requestedSeconds = Number.parseInt(String(body.seconds ?? "300"), 10);
      const additionalSeconds = Math.min(7200, Math.max(60, Number.isFinite(requestedSeconds) ? requestedSeconds : 300));
      const parsedDeadline = session.deadline_at ? new Date(session.deadline_at).getTime() : Number.NaN;
      const currentDeadline = Number.isFinite(parsedDeadline) ? parsedDeadline : Date.now();
      const newDeadlineMs = Math.max(currentDeadline, Date.now()) + additionalSeconds * 1000;
      const newDeadlineAt = new Date(newDeadlineMs).toISOString();
      const newSeconds = Math.ceil((newDeadlineMs - Date.now()) / 1000);

      const { data: updatedSession, error: timeUpdateError } = await supabase
        .from("exam_sessions")
        .update({ deadline_at: newDeadlineAt, time_left_seconds: newSeconds })
        .eq("id", sessionId)
        .eq("status", "started")
        .select("id")
        .maybeSingle();
      if (timeUpdateError || !updatedSession) {
        return NextResponse.json({ ok: false, error: "time_extension_failed", message: timeUpdateError?.message || "The session is no longer active." }, { status: timeUpdateError ? 500 : 409 });
      }

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_session",
        entity_id: sessionId,
        action: "updated",
        new_value: { added_seconds: additionalSeconds, new_total_seconds: newSeconds, deadline_at: newDeadlineAt },
        change_reason: `Admin invigilator extended time by ${Math.round(additionalSeconds / 60)} minutes for candidate ${session.candidate_name || sessionId}`,
      });

      return NextResponse.json({
        ok: true,
        message: `Added +${Math.round(additionalSeconds / 60)} minutes to exam session.`,
        newTimeLeftSeconds: newSeconds,
        deadlineAt: newDeadlineAt,
      });
    }

    // 2. SYNC / INSPECT SERVER-SAVED SESSION STATE.
    // This endpoint is deliberately read-only: do not call resume_exam here because
    // that RPC may finalize an attempt whose authoritative deadline has elapsed.
    if (action === "sync_session") {
      const savedAnswers = session.draft_answers && typeof session.draft_answers === "object" ? session.draft_answers : {};
      const parsedDeadline = session.deadline_at ? new Date(session.deadline_at).getTime() : Number.NaN;
      if (session.status === "started" && !Number.isFinite(parsedDeadline)) {
        return NextResponse.json({ ok: false, error: "invalid_deadline", message: "The active examination has no valid deadline. Contact the examination administrator." }, { status: 409 });
      }
      const verifiedTimeLeft = session.status === "started"
        ? Math.max(0, Math.ceil((parsedDeadline - Date.now()) / 1000))
        : 0;
      const deadlineElapsed = session.status === "started" && verifiedTimeLeft <= 0;
      const finished = session.status === "submitted" || session.status === "expired" || session.status === "cancelled";
      return NextResponse.json({
        ok: true,
        finished,
        status: session.status,
        deadlineElapsed,
        recoveryAvailable: session.status === "started" && !deadlineElapsed,
        questionsAnswered: Object.keys(savedAnswers).length,
        totalQuestions: Array.isArray(session.paper_ids) ? session.paper_ids.length : 0,
        timeLeftSeconds: verifiedTimeLeft,
        lastSavedAt: session.last_saved_at || null,
        message: finished
          ? "The server confirms this examination is no longer active."
          : deadlineElapsed
            ? "The examination deadline has elapsed. Sync did not alter or submit the candidate's paper."
            : "Server-side progress verified. Sync cannot retrieve unsent answers from a disconnected candidate device.",
      });
    }

    // 3. RESTORE / ALLOW RESUME. This is a verification + audit action, not a
    // database status change. The candidate still re-enters with the original PIN.
    if (action === "restore_session" || action === "unlock") {
      if (session.status !== "started") {
        return NextResponse.json({ ok: false, error: "session_not_recoverable", message: "This session is " + session.status + " and cannot be restored as an active examination." }, { status: 409 });
      }
      const parsedDeadline = session.deadline_at ? new Date(session.deadline_at).getTime() : Number.NaN;
      if (!Number.isFinite(parsedDeadline)) {
        return NextResponse.json({ ok: false, error: "invalid_deadline", message: "The examination deadline is missing or invalid. Contact the examination administrator." }, { status: 409 });
      }
      const timeLeftSeconds = Math.max(0, Math.ceil((parsedDeadline - Date.now()) / 1000));
      if (timeLeftSeconds <= 0) {
        return NextResponse.json({ ok: false, error: "session_expired", message: "The original examination deadline has elapsed. This session cannot be restored." }, { status: 409 });
      }
      if (!session.attempt_token || !Array.isArray(session.paper_ids) || session.paper_ids.length === 0) {
        return NextResponse.json({ ok: false, error: "recovery_data_missing", message: "The original examination paper or recovery credential is missing. Do not start a new attempt; contact support." }, { status: 409 });
      }

      const { error: auditError } = await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_session",
        entity_id: sessionId,
        action: "updated",
        new_value: { status: "started", recovery_authorized: true },
        change_reason: "Admin authorised candidate session recovery for " + (session.candidate_name || sessionId),
      });
      if (auditError) {
        return NextResponse.json({ ok: false, error: "recovery_audit_failed", message: "Recovery was not authorised because the audit record could not be saved. Please retry." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, resumeReady: true, timeLeftSeconds, message: "Session verified. The candidate can re-enter using the original phone number and access PIN; their original paper and deadline are preserved." });
    }

    // 4. FORCE SUBMIT
    if (action === "force_submit") {
      if (session.status !== "started") {
        return NextResponse.json({ ok: false, error: "session_not_active", message: "Only an active examination can be force-submitted." }, { status: 409 });
      }
      const { data: submitResult, error: submitError } = await supabase.rpc("submit_exam", {
        p_session: sessionId,
        p_token: session.attempt_token,
        p_answers: session.draft_answers || {},
        p_auto: true,
        p_flagged: {},
      });
      if (submitError || !submitResult || submitResult.ok === false) {
        return NextResponse.json({ ok: false, error: submitResult?.error || "force_submit_failed", message: submitResult?.message || submitError?.message || "Could not submit the examination." }, { status: 409 });
      }
      const submittedAt = new Date().toISOString();

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_session",
        entity_id: sessionId,
        action: "updated",
        new_value: { status: submitResult.status || "submitted", forced_by_admin: true, submitted_at: submittedAt },
        change_reason: `Invigilator force-submitted candidate exam for ${session.candidate_name || sessionId}`,
      });

      return NextResponse.json({
        ok: true,
        message: `Candidate examination session successfully force-submitted.`,
      });
    }

    // 4. RESET TAB SWITCH MALPRACTICE COUNTER
    if (action === "reset_switches") {
      await supabase
        .from("exam_sessions")
        .update({
          tab_switch_count: 0,
        })
        .eq("id", sessionId);

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_session",
        entity_id: sessionId,
        action: "updated",
        new_value: { tab_switch_count: 0, cleared: true },
        change_reason: `Admin cleared malpractice tab-switch flags for ${session.candidate_name || sessionId}`,
      });

      return NextResponse.json({
        ok: true,
        message: `Malpractice tab-switch counter cleared for session.`,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid invigilator action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to execute invigilator action" },
      { status: 500 }
    );
  }
}
