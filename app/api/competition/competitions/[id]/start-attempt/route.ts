import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  generateCompetitionAssessmentSnapshot,
  CompetitionSelectionRules,
  QuestionSourceMode,
} from "@/app/lib/competitionEngine";
import { CompetitionQuestionItem } from "@/app/lib/competitionQuestionBank";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const guestSessionId = body.guestSessionId || `guest_${Math.random().toString(36).substring(2, 9)}`;
    const displayName = body.displayName || (user?.email ? user.email.split("@")[0] : `Guest_${guestSessionId.slice(-4)}`);

    const supabase = getSupabaseServerClient();
    const { data: comp } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!comp) return NextResponse.json({ error: "Competition not found" }, { status: 404 });

    // Boundary check: Guest access must not weaken private competition security
    if (!user && comp.visibility === "private") {
      return NextResponse.json(
        { error: "This is a private competition. Authentication is required to participate." },
        { status: 401 }
      );
    }

    const { data: emergencyControls } = await supabase
      .from("competition_emergency_controls")
      .select("target_id, is_paused, maintenance_mode")
      .eq("scope", "competition")
      .in("target_id", ["all", id]);
    const { data: globalControls } = await supabase
      .from("competition_emergency_controls")
      .select("is_paused, maintenance_mode")
      .eq("scope", "global")
      .eq("target_id", "all")
      .maybeSingle();
    if (globalControls?.is_paused || globalControls?.maintenance_mode ||
        emergencyControls?.some((control) => control.is_paused || control.maintenance_mode)) {
      return NextResponse.json({ error: "This competition is temporarily paused by Arena administration." }, { status: 423 });
    }

    // Check status
    if (comp.status !== "published" && comp.status !== "active") {
      return NextResponse.json(
        { error: `Competition is not currently active (status: ${comp.status}).` },
        { status: 400 }
      );
    }

    // Check attempt limits
    const { data: existingAttempts } = await supabase
      .from("competition_participants")
      .select("id, status")
      .eq("competition_id", id)
      .or(user ? `user_id.eq.${user.id}` : `guest_session_id.eq.${guestSessionId}`);

    const maxAttempts = comp.rules?.attempt_limit || 1;
    if (existingAttempts && existingAttempts.length >= maxAttempts) {
      return NextResponse.json(
        { error: `Attempt limit of ${maxAttempts} reached for this competition.` },
        { status: 429 }
      );
    }

    // Load questions based on question_source_mode
    let compQuestions: CompetitionQuestionItem[] = [];
    let mainQuestions: CompetitionQuestionItem[] = [];

    const sourceMode = comp.question_source_mode as QuestionSourceMode;

    if (sourceMode === "competition_bank" || sourceMode === "combined") {
      if (comp.question_bank_id) {
        const { data: bq } = await supabase
          .from("competition_questions")
          .select("*")
          .eq("bank_id", comp.question_bank_id)
          .eq("is_archived", false)
          .in("status", ["approved", "published"]);
        compQuestions = (bq || []) as CompetitionQuestionItem[];
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

      // Load the full filtered source pool so passage groups are never silently truncated.
      const { data: mq } = await mqQuery.limit(5000);

      mainQuestions = (mq || [])
        // Never manufacture an answer key. Ignore malformed source rows instead
        // of silently treating option A as correct.
        .filter((row) => typeof row.correct_answer === "string" && /^[A-D]$/i.test(row.correct_answer.trim()))
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
          marks: row.marks > 0 ? row.marks : 1.0,
          status: "published",
          created_by: "system_main",
        }));
    }

    const sessionId = crypto.randomUUID();
    const rules = comp.rules as CompetitionSelectionRules;

    // Seed generation: For synchronized 1v1 battle, identical seed ensures identical question content and options
    const participantSeed = rules.identical_questions_for_all ? 42 : Math.floor(Math.random() * 10000);

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
      return NextResponse.json(
        { error: assessmentResult.error, shortage: assessmentResult.shortageDetails },
        { status: 400 }
      );
    }

    const snapshot = assessmentResult.snapshot;

    // Save attempt snapshot
    await supabase.from("competition_attempt_snapshots").insert({
      session_id: sessionId,
      competition_id: id,
      user_id: user?.id || null,
      guest_session_id: user ? null : guestSessionId,
      question_source_mode: sourceMode,
      questions_snapshot: snapshot.questions_snapshot,
      answer_key_snapshot: snapshot.answer_key_snapshot,
      scoring_rules: snapshot.scoring_rules,
    });

    // Register participant
    await supabase.from("competition_participants").insert({
      competition_id: id,
      user_id: user?.id || null,
      guest_session_id: user ? null : guestSessionId,
      display_name: displayName,
      is_guest: !user,
      status: "active",
      joined_at: new Date().toISOString(),
    });

    // Strip answers from returned payload to prevent client-side answer key leakage!
    const clientQuestions = snapshot.questions_snapshot.map((q) => ({
      id: q.id,
      subject: q.subject,
      topic: q.topic,
      passage_id: q.passage_id,
      passage_title: q.passage_title,
      passage_text: q.passage_text,
      reading_text_id: q.reading_text_id,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
      option_images: q.option_images,
      question_image_url: q.question_image_url,
      marks: q.marks,
    }));

    return NextResponse.json({
      sessionId,
      competitionTitle: comp.title,
      durationSeconds: snapshot.scoring_rules.duration_seconds,
      questions: clientQuestions,
      totalQuestions: clientQuestions.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error starting competition attempt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
