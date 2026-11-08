import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  generateCompetitionAssessmentSnapshot,
  normalizeClientQuestion,
  CompetitionSelectionRules,
  QuestionSourceMode,
} from "@/app/lib/competitionEngine";
import { CompetitionQuestionItem } from "@/app/lib/competitionQuestionBank";

function logCompetitionDiagnostic(params: {
  correlationId: string;
  competitionId?: string;
  sessionId?: string;
  stage: string;
  status: number;
  message?: string;
  error?: unknown;
}) {
  const safeError =
    params.error instanceof Error
      ? params.error.message
      : params.error && typeof params.error === "object"
      ? JSON.stringify(params.error)
      : params.error
      ? String(params.error)
      : undefined;

  console.error(
    `[COMPETITION_ARENA_DIAGNOSTICS] [${params.correlationId}] Stage=${params.stage} Status=${params.status} Comp=${params.competitionId || "none"} Session=${params.sessionId || "none"}: ${params.message || ""} ${safeError ? `Error: ${safeError}` : ""}`.trim()
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const correlationId = crypto.randomUUID();

  try {
    const { id } = await context.params;

    // 1. Validate competition ID format
    if (!id || !UUID_REGEX.test(id)) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "validation",
        status: 400,
        message: "Invalid competition ID format",
      });
      return NextResponse.json({ error: "Invalid competition ID format." }, { status: 400 });
    }

    const user = await getUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const guestSessionId = body.guestSessionId || `guest_${Math.random().toString(36).substring(2, 9)}`;
    const displayName = body.displayName || (user?.email ? user.email.split("@")[0] : `Guest_${guestSessionId.slice(-4)}`);

    const supabase = getSupabaseServerClient();

    // 2. Query competition record with error check
    const { data: comp, error: compErr } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (compErr) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "fetch_competition",
        status: 500,
        error: compErr,
      });
      return NextResponse.json(
        { error: `Database error querying competition details: ${compErr.message}` },
        { status: 500 }
      );
    }

    if (!comp) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "fetch_competition",
        status: 404,
        message: "Competition not found",
      });
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    // 3. Boundary check: Private competition authentication requirement
    if (!user && comp.visibility === "private") {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "auth_guard",
        status: 401,
        message: "Private competition requires login",
      });
      return NextResponse.json(
        { error: "This is a private competition. Authentication is required to participate." },
        { status: 401 }
      );
    }

    // 4. Emergency controls check
    const { data: emergencyControls, error: emerErr } = await supabase
      .from("competition_emergency_controls")
      .select("target_id, is_paused, maintenance_mode")
      .eq("scope", "competition")
      .in("target_id", ["all", id]);

    if (emerErr) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "emergency_controls",
        status: 500,
        error: emerErr,
      });
    }

    const { data: globalControls, error: globalEmerErr } = await supabase
      .from("competition_emergency_controls")
      .select("is_paused, maintenance_mode")
      .eq("scope", "global")
      .eq("target_id", "all")
      .maybeSingle();

    if (globalEmerErr) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "global_emergency_controls",
        status: 500,
        error: globalEmerErr,
      });
    }

    if (
      globalControls?.is_paused ||
      globalControls?.maintenance_mode ||
      emergencyControls?.some((control) => control.is_paused || control.maintenance_mode)
    ) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "emergency_gate",
        status: 423,
        message: "Competition is paused by administration",
      });
      return NextResponse.json(
        { error: "This competition is temporarily paused by Arena administration." },
        { status: 423 }
      );
    }

    // 5. Status check
    if (comp.status !== "published" && comp.status !== "active") {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "status_check",
        status: 400,
        message: `Competition status is ${comp.status}`,
      });
      return NextResponse.json(
        { error: `Competition is not currently active (status: ${comp.status}).` },
        { status: 400 }
      );
    }

    // 6. Schedule window check
    const now = new Date();
    if (comp.start_time && new Date(comp.start_time) > now) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "schedule_check",
        status: 403,
        message: "Competition not started yet",
      });
      return NextResponse.json(
        { error: `This competition is scheduled to start at ${new Date(comp.start_time).toLocaleString("en-NG")}. Please check back then.` },
        { status: 403 }
      );
    }
    if (comp.end_time && new Date(comp.end_time) < now) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "schedule_check",
        status: 403,
        message: "Competition has already ended",
      });
      return NextResponse.json(
        { error: "This competition has already concluded." },
        { status: 403 }
      );
    }

    // 7. Check participant records & attempt limits
    const { data: existingAttempts, error: partErr } = await supabase
      .from("competition_participants")
      .select("id, status, joined_at")
      .eq("competition_id", id)
      .or(user ? `user_id.eq.${user.id}` : `guest_session_id.eq.${guestSessionId}`);

    if (partErr) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "fetch_participants",
        status: 500,
        error: partErr,
      });
      return NextResponse.json(
        { error: `Database error verifying candidate participation: ${partErr.message}` },
        { status: 500 }
      );
    }

    const finishedAttempts = (existingAttempts || []).filter(
      (a) => a.status === "submitted" || a.status === "disqualified"
    );

    const maxAttempts = Number(comp.rules?.attempt_limit) || 1;
    if (finishedAttempts.length >= maxAttempts) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        stage: "attempt_limit",
        status: 429,
        message: `Attempt limit ${maxAttempts} reached`,
      });
      return NextResponse.json(
        { error: `Attempt limit of ${maxAttempts} reached for this competition.` },
        { status: 429 }
      );
    }

    // 8. ATTEMPT RECOVERY: Reuse existing in-progress attempt to prevent duplication & answer loss
    const activeParticipant = (existingAttempts || []).find((a) => a.status === "active");
    if (activeParticipant) {
      const { data: existingSnapshot, error: snapFindErr } = await supabase
        .from("competition_attempt_snapshots")
        .select("*")
        .eq("competition_id", id)
        .or(user ? `user_id.eq.${user.id}` : `guest_session_id.eq.${guestSessionId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        !snapFindErr &&
        existingSnapshot &&
        Array.isArray(existingSnapshot.questions_snapshot) &&
        existingSnapshot.questions_snapshot.length > 0
      ) {
        const totalDuration =
          Number(existingSnapshot.scoring_rules?.duration_seconds) ||
          Number(comp.rules?.duration_seconds) ||
          300;
        const elapsed = Math.floor(
          (Date.now() - new Date(existingSnapshot.created_at).getTime()) / 1000
        );
        const remaining = Math.max(0, totalDuration - elapsed);

        if (remaining > 0) {
          logCompetitionDiagnostic({
            correlationId,
            competitionId: id,
            sessionId: existingSnapshot.session_id,
            stage: "attempt_recovery",
            status: 200,
            message: `Active attempt recovered successfully with ${remaining}s remaining.`,
          });

          const clientQuestions = (existingSnapshot.questions_snapshot as unknown[]).map(
            normalizeClientQuestion
          );

          return NextResponse.json({
            sessionId: existingSnapshot.session_id,
            competitionTitle: comp.title || "BrainLab Competition",
            competitionType: comp.competition_type || "arena",
            competitionCode: comp.code || "BL-ARENA",
            durationSeconds: remaining,
            isRecovered: true,
            questions: clientQuestions,
            totalQuestions: clientQuestions.length,
          });
        }
      }
    }

    // 9. Load questions based on question_source_mode
    let compQuestions: CompetitionQuestionItem[] = [];
    let mainQuestions: CompetitionQuestionItem[] = [];

    const sourceMode = (comp.question_source_mode || "competition_bank") as QuestionSourceMode;

    if (sourceMode === "competition_bank" || sourceMode === "combined") {
      if (comp.question_bank_id) {
        const { data: bq, error: bqErr } = await supabase
          .from("competition_questions")
          .select("*")
          .eq("bank_id", comp.question_bank_id)
          .eq("is_archived", false)
          .in("status", ["approved", "published"]);

        if (bqErr) {
          logCompetitionDiagnostic({
            correlationId,
            competitionId: id,
            stage: "load_competition_bank",
            status: 500,
            error: bqErr,
          });
          return NextResponse.json(
            { error: `Database error loading dedicated competition questions: ${bqErr.message}` },
            { status: 500 }
          );
        }

        compQuestions = (bq || []).filter(
          (row) =>
            typeof row.correct_answer === "string" &&
            ["A", "B", "C", "D", "E"].includes(row.correct_answer.trim().toUpperCase())
        ) as CompetitionQuestionItem[];
      }
    }

    if (sourceMode === "main_bank" || sourceMode === "combined") {
      const mainSubject = comp.main_bank_filters?.subject || "General";
      let mqQuery = supabase
        .from("questions")
        .select("*")
        .eq("is_archived", false)
        .eq("is_active", true);

      if (mainSubject !== "General") {
        mqQuery = mqQuery.ilike("subject", `%${mainSubject}%`);
      }

      const { data: mq, error: mqErr } = await mqQuery.limit(5000);

      if (mqErr) {
        logCompetitionDiagnostic({
          correlationId,
          competitionId: id,
          stage: "load_main_bank",
          status: 500,
          error: mqErr,
        });
        return NextResponse.json(
          { error: `Database error loading CBT examination questions: ${mqErr.message}` },
          { status: 500 }
        );
      }

      mainQuestions = (mq || [])
        .filter(
          (row) =>
            typeof row.correct_answer === "string" &&
            /^[A-E]$/i.test(row.correct_answer.trim())
        )
        .map((row) => ({
          id: `main_${row.id}`,
          bank_id: "main_cbt_bank",
          question: row.question,
          subject: row.subject,
          topic: row.topic || row.category,
          subtopic: row.subtopic,
          passage_id: row.passage_id,
          passage_title: row.passage_title,
          passage_text: row.passage_text,
          reading_text_id: row.reading_text_id,
          difficulty: (row.difficulty || "medium") as CompetitionQuestionItem["difficulty"],
          question_type: "multiple_choice",
          option_a: row.option_a,
          option_b: row.option_b,
          option_c: row.option_c,
          option_d: row.option_d,
          option_e: row.option_e,
          correct_answer: row.correct_answer.trim().toUpperCase(),
          explanation: row.explanation,
          marks: Number(row.marks) > 0 ? Number(row.marks) : 1.0,
          status: "published",
          created_by: "system_main",
        }));
    }

    // 10. Generate immutable assessment snapshot
    const sessionId = crypto.randomUUID();
    const rules = (comp.rules || {}) as CompetitionSelectionRules;

    const participantSeed = rules.identical_questions_for_all
      ? 42
      : Math.floor(Math.random() * 10000);

    const assessmentResult = generateCompetitionAssessmentSnapshot({
      sessionId,
      competitionId: id,
      userId: user?.id,
      guestSessionId: user ? undefined : guestSessionId,
      sourceMode,
      competitionBankQuestions: compQuestions,
      mainBankQuestions: mainQuestions,
      rules,
      combinedRatio: comp.combined_config
        ? {
            competitionBank: comp.combined_config.competition_bank_ratio || 0.5,
            mainBank: comp.combined_config.main_bank_ratio || 0.5,
          }
        : undefined,
      participantSeed,
    });

    if (!assessmentResult.ok) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        sessionId,
        stage: "snapshot_generation",
        status: 400,
        message: assessmentResult.error,
      });
      return NextResponse.json(
        { error: assessmentResult.error, shortage: assessmentResult.shortageDetails },
        { status: 400 }
      );
    }

    const snapshot = assessmentResult.snapshot;

    if (!snapshot.questions_snapshot || snapshot.questions_snapshot.length === 0) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        sessionId,
        stage: "empty_questions_check",
        status: 400,
        message: "No questions selected",
      });
      return NextResponse.json(
        { error: "No examination questions met the criteria for this competition." },
        { status: 400 }
      );
    }

    // 11. Save attempt snapshot with verified persistence
    const { error: snapInsertErr } = await supabase
      .from("competition_attempt_snapshots")
      .insert({
        session_id: sessionId,
        competition_id: id,
        user_id: user?.id || null,
        guest_session_id: user ? null : guestSessionId,
        question_source_mode: sourceMode,
        questions_snapshot: snapshot.questions_snapshot,
        answer_key_snapshot: snapshot.answer_key_snapshot,
        scoring_rules: snapshot.scoring_rules,
      });

    if (snapInsertErr) {
      logCompetitionDiagnostic({
        correlationId,
        competitionId: id,
        sessionId,
        stage: "snapshot_persistence",
        status: 500,
        error: snapInsertErr,
      });
      return NextResponse.json(
        { error: `Failed to persist immutable attempt snapshot: ${snapInsertErr.message}` },
        { status: 500 }
      );
    }

    // 12. Register or activate participant with rollback safety
    const existing = existingAttempts?.[0];
    if (existing) {
      const { error: partUpdateErr } = await supabase
        .from("competition_participants")
        .update({
          status: "active",
          display_name: displayName,
          joined_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (partUpdateErr) {
        await supabase.from("competition_attempt_snapshots").delete().eq("session_id", sessionId);
        logCompetitionDiagnostic({
          correlationId,
          competitionId: id,
          sessionId,
          stage: "participant_activation",
          status: 500,
          error: partUpdateErr,
        });
        return NextResponse.json(
          { error: `Failed to activate competition participant: ${partUpdateErr.message}` },
          { status: 500 }
        );
      }
    } else {
      const { error: partInsertErr } = await supabase
        .from("competition_participants")
        .insert({
          competition_id: id,
          user_id: user?.id || null,
          guest_session_id: user ? null : guestSessionId,
          display_name: displayName,
          is_guest: !user,
          status: "active",
          joined_at: new Date().toISOString(),
        });

      if (partInsertErr) {
        await supabase.from("competition_attempt_snapshots").delete().eq("session_id", sessionId);
        logCompetitionDiagnostic({
          correlationId,
          competitionId: id,
          sessionId,
          stage: "participant_registration",
          status: 500,
          error: partInsertErr,
        });
        return NextResponse.json(
          { error: `Failed to register competition participant: ${partInsertErr.message}` },
          { status: 500 }
        );
      }
    }

    // 13. Strip answer keys and normalize questions across array/object contracts
    const clientQuestions = (snapshot.questions_snapshot as unknown[]).map(normalizeClientQuestion);

    const durationSeconds =
      Number(snapshot.scoring_rules?.duration_seconds) ||
      Number(comp.rules?.duration_seconds) ||
      300;

    logCompetitionDiagnostic({
      correlationId,
      competitionId: id,
      sessionId,
      stage: "attempt_launched",
      status: 200,
      message: `Launched new exam attempt with ${clientQuestions.length} questions.`,
    });

    return NextResponse.json({
      sessionId,
      competitionTitle: comp.title || "BrainLab Competition",
      competitionType: comp.competition_type || "arena",
      competitionCode: comp.code || "BL-ARENA",
      durationSeconds,
      questions: clientQuestions,
      totalQuestions: clientQuestions.length,
    });
  } catch (err: unknown) {
    logCompetitionDiagnostic({
      correlationId,
      stage: "unhandled_exception",
      status: 500,
      error: err,
    });
    const message = err instanceof Error ? err.message : "Error starting competition attempt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
