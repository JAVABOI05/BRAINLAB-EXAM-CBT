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
      const currentDeadline = session.deadline_at ? new Date(session.deadline_at).getTime() : Date.now();
      const newDeadlineMs = Math.max(currentDeadline, Date.now()) + additionalSeconds * 1000;
      const newDeadlineAt = new Date(newDeadlineMs).toISOString();
      const newSeconds = Math.ceil((newDeadlineMs - Date.now()) / 1000);

      const { error: timeUpdateError } = await supabase
        .from("exam_sessions")
        .update({ deadline_at: newDeadlineAt, time_left_seconds: newSeconds })
        .eq("id", sessionId)
        .eq("status", "started");
      if (timeUpdateError) {
        return NextResponse.json({ ok: false, error: "time_extension_failed", message: timeUpdateError.message }, { status: 500 });
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

    // 2. SYNC / INSPECT SERVER-SAVED SESSION STATE. This cannot retrieve data from
    // a disconnected candidate browser; it verifies the authoritative server copy.
    if (action === "sync_session") {
      const { data: syncResult, error: syncError } = await supabase.rpc("resume_exam", {
        p_session: sessionId,
        p_token: session.attempt_token,
      });
      if (syncError || !syncResult || syncResult.ok === false) {
        return NextResponse.json({ ok: false, error: syncResult?.error || "sync_failed", message: syncResult?.message || syncError?.message || "Could not verify the examination session." }, { status: 409 });
      }
      const savedAnswers = session.draft_answers && typeof session.draft_answers === "object" ? session.draft_answers : {};
      return NextResponse.json({
        ok: true,
        finished: Boolean(syncResult.finished),
        status: syncResult.finished ? "submitted" : session.status,
        questionsAnswered: Object.keys(savedAnswers).length,
        totalQuestions: Array.isArray(session.paper_ids) ? session.paper_ids.length : 0,
        timeLeftSeconds: syncResult.finished ? 0 : Math.max(0, Math.ceil((new Date(session.deadline_at).getTime() - Date.now()) / 1000)),
        lastSavedAt: session.last_saved_at || null,
        message: syncResult.finished ? "The server confirms this examination is already finished." : "Server-side progress verified. The candidate must re-enter using the original phone number and access PIN to resume on their device.",
      });
    }

    // 3. RESTORE / ALLOW RESUME. Keep `started` as the only active database state.
    if (action === "restore_session" || action === "unlock") {
      if (session.status !== "started") {
        return NextResponse.json({ ok: false, error: "session_not_recoverable", message: "This session is " + session.status + " and cannot be restored as an active examination." }, { status: 409 });
      }
      const { data: restoreResult, error: restoreError } = await supabase.rpc("resume_exam", {
        p_session: sessionId,
        p_token: session.attempt_token,
      });
      if (restoreError || !restoreResult || restoreResult.ok === false || restoreResult.finished) {
        return NextResponse.json({ ok: false, error: restoreResult?.error || "session_expired", message: restoreResult?.message || "The examination could not be restored. Check its deadline and submission status." }, { status: 409 });
      }

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_session",
        entity_id: sessionId,
        action: "updated",
        new_value: { status: "started", recovery_authorized: true },
        change_reason: "Admin authorised candidate session recovery for " + (session.candidate_name || sessionId),
      });

      return NextResponse.json({ ok: true, resumeReady: true, timeLeftSeconds: restoreResult.time_left_seconds, message: "Session verified. The candidate can re-enter using the original phone number and access PIN; their original paper and deadline are preserved." });
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
