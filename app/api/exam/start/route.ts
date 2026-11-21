import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "../../../lib/supabaseServer";
import crypto from "crypto";
import { generateExamPaper, freezeAttemptSnapshot, resolveUtme4Subjects, isAcademicSubject } from "../../../lib/examEngine";
import { getMaintenanceModeConfig } from "../../../lib/platformConfig";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { code = "", name = "", phone = "", elective = "", subjects = [] } = body;

    const supabase = getSupabaseServerClient();
    // Exposure history is keyed only from a verified Supabase user, never a client-supplied ID.
    const registeredUser = await getUserFromRequest(request);

    // Maintenance Mode Guard
    const maintenance = await getMaintenanceModeConfig().catch(() => null);
    if (maintenance?.cbt_maintenance_enabled) {
      let bypass = false;
      if (maintenance.allow_admin_bypass && registeredUser) {
        try {
          const { resolveAdminRole } = await import("../../../lib/supabaseServer");
          const adminRole = await resolveAdminRole(registeredUser.id);
          if (adminRole) bypass = true;
        } catch {}
      }

      if (!bypass) {
        return NextResponse.json(
          {
            ok: false,
            error: "cbt_maintenance",
            title: maintenance.title || "CBT Examination Engine Maintenance",
            message: maintenance.message || "The CBT Examination Engine is currently undergoing scheduled maintenance.",
            estimated_resumption: maintenance.estimated_resumption,
          },
          { status: 503 }
        );
      }
    }

    const cleanCode = String(code || "").trim().toUpperCase();
    const cleanName = String(name || "").trim() || "Candidate";
    const cleanPhone = String(phone || "").trim() || "08000000000";
    const sessionCode = cleanCode || "OPEN-CBT";

    // Recovery takes precedence over access-code consumption. A candidate who
    // re-enters the same phone + PIN must receive the existing active attempt,
    // never a newly generated paper or a reset timer.
    const { data: existingSession, error: existingSessionError } = await supabase
      .from("exam_sessions")
      .select("id, attempt_token, status, deadline_at, last_saved_at, phone, access_code")
      .eq("phone", cleanPhone)
      .eq("access_code", sessionCode)
      .eq("status", "started")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSessionError) {
      console.error("[exam/start] Could not inspect an existing candidate attempt:", existingSessionError.message);
      return NextResponse.json(
        { ok: false, error: "recovery_lookup_failed", message: "We could not verify your previous examination. Please try again." },
        { status: 503 }
      );
    }

    if (existingSession) {
      const { data: recovered, error: recoveryError } = await supabase.rpc("resume_exam", {
        p_session: existingSession.id,
        p_token: existingSession.attempt_token,
      });

      if (recoveryError || !recovered || recovered.ok === false) {
        console.error("[exam/start] Existing attempt recovery failed:", recoveryError?.message || recovered?.message);
        return NextResponse.json(
          { ok: false, error: recovered?.error || "recovery_failed", message: recovered?.message || "Your previous examination could not be restored. Please contact the invigilator." },
          { status: 409 }
        );
      }

      if (recovered.finished) {
        return NextResponse.json({ ...recovered, resumed: true, last_saved_at: existingSession.last_saved_at });
      }

      const recoveredQuestions = Array.isArray(recovered.questions) ? recovered.questions : [];
      if (recoveredQuestions.length === 0) {
        return NextResponse.json(
          { ok: false, error: "recovery_paper_unavailable", message: "Your saved examination was found, but its question paper could not be loaded. Please contact the invigilator; do not start a new attempt." },
          { status: 503 }
        );
      }

      return NextResponse.json({
        ...recovered,
        resumed: true,
        last_saved_at: existingSession.last_saved_at,
        subjects: [...new Set(recoveredQuestions.map((question: { subject?: string }) => question.subject).filter(Boolean))],
      });
    }

    // 1. Check access code if required
    let isMasterCode = false;
    let preconfiguredSubject: string | null = null;
    let codeRecordId: string | null = null;

    if (cleanCode) {
      // Check master code in exam_config
      const { data: masterRow } = await supabase
        .from("exam_config")
        .select("config_value")
        .eq("config_key", "master_access_code")
        .maybeSingle();

      const masterCode = String(masterRow?.config_value || "STAGING-MASTER-TEST-001").trim().toUpperCase();

      if (cleanCode === masterCode) {
        isMasterCode = true;
      } else {
        // Check normal access codes
        const { data: codeRecord } = await supabase
          .from("access_codes")
          .select("id, code, subject, is_used, used_by")
          .eq("code", cleanCode)
          .maybeSingle();

        if (!codeRecord) {
          return NextResponse.json({ ok: false, error: "invalid_code", message: "Invalid access code." }, { status: 400 });
        }
        if (codeRecord.is_used) {
          return NextResponse.json(
            { ok: false, error: "code_used", message: "This access code has already been used." },
            { status: 400 }
          );
        }
        codeRecordId = codeRecord.id;
        if (codeRecord.subject && isAcademicSubject(codeRecord.subject)) {
          preconfiguredSubject = codeRecord.subject;
        }
      }
    }

    // 2. Authoritatively resolve examination subjects (English + 3 electives = exactly 4 subjects)
    const selectedSubjects = resolveUtme4Subjects({
      candidateSubjects: Array.isArray(subjects) ? subjects : undefined,
      primaryElective: typeof elective === "string" ? elective : undefined,
      preconfiguredSubject: preconfiguredSubject,
    });

    // 3. Generate exam paper. Registered candidates receive unseen questions first.
    // Anonymous/open-code attempts retain the existing random-selection behaviour.
    let masteredQuestionIds: number[] = [];
    let previouslySeenQuestionIds: number[] = [];
    if (registeredUser) {
      const { data: seenRows, error: seenError } = await supabase
        .from("question_exposure_history")
        .select("question_id, is_correct")
        .eq("user_id", registeredUser.id)
        .eq("surface", "full_mock");
      if (!seenError && seenRows) {
        masteredQuestionIds = [...new Set(seenRows
          .filter((row: { is_correct: boolean | null }) => row.is_correct === true)
          .map((row: { question_id: number }) => Number(row.question_id))
          .filter(Number.isFinite))];
        previouslySeenQuestionIds = [...new Set(seenRows
          .filter((row: { is_correct: boolean | null }) => row.is_correct !== true)
          .map((row: { question_id: number }) => Number(row.question_id))
          .filter(Number.isFinite))];
      } else if (seenError) {
        // Fail closed for registered candidates: without verified history, the
        // engine cannot guarantee that correctly mastered questions stay excluded.
        console.error("Unable to load learner question exposure history:", seenError.message);
        return NextResponse.json(
          {
            ok: false,
            error: "rotation_history_unavailable",
            message: "We could not verify your mock-exam question history. Please try again shortly.",
          },
          { status: 503 }
        );
      }
    }
    const attemptToken = crypto.randomUUID();
    const durationSeconds = 7200; // 2 hours
    const provisionalSessionId = crypto.randomUUID();

    const generated = await generateExamPaper({
      sessionId: provisionalSessionId,
      token: attemptToken,
      subjects: selectedSubjects,
      durationSeconds,
      excludeQuestionIds: masteredQuestionIds,
      previouslySeenQuestionIds,
    });

    if (!generated.success || generated.paperIds.length !== 180 || generated.clientQuestions.length !== 180) {
      return NextResponse.json(
        {
          ok: false,
          error: "incomplete_paper",
          message: generated.errors.join(" ") || "The question bank cannot currently produce the complete 180-question UTME paper. Please contact the administrator.",
          expected_questions: 180,
          generated_questions: generated.paperIds.length,
          subjects: selectedSubjects,
        },
        { status: 422 }
      );
    }

    let paperIds = generated.paperIds;

    // Fallback safeguard if bank had temporary network or query issue
    if (!paperIds || paperIds.length === 0) {
      const { data: fallbackQ } = await supabase
        .from("questions")
        .select("id")
        .eq("is_active", true)
        .limit(180);
      if (fallbackQ && fallbackQ.length > 0) {
        paperIds = fallbackQ.map((q) => q.id);
      }
    }

    if (!paperIds || paperIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no_questions", message: "No active questions found in the question bank." },
        { status: 400 }
      );
    }

    // 4. Consume a normal access code exactly once before creating the session.
    // A failed session insert restores the code so candidates are not charged for a failed launch.
    let consumedCodeId: string | null = null;
    if (cleanCode && !isMasterCode) {
      const { data: consumed, error: consumeError } = await supabase
        .from("access_codes")
        .update({ is_used: true, used_by: cleanPhone })
        .eq("code", cleanCode)
        .eq("is_used", false)
        .select("id")
        .maybeSingle();

      if (consumeError || !consumed?.id) {
        return NextResponse.json(
          { ok: false, error: "code_used", message: "This access code has already been used or could not be reserved. Please contact the administrator if you believe this is an error." },
          { status: 409 }
        );
      }
      consumedCodeId = consumed.id;
    }

    // 5. Create the exam session in public.exam_sessions
    const { data: sessionRow, error: sessionErr } = await supabase
      .from("exam_sessions")
      .insert({
        candidate_name: cleanName,
        phone: cleanPhone,
        subject: selectedSubjects.join(", "),
        access_code: cleanCode || "OPEN-CBT",
        status: "started",
        paper_ids: paperIds,
        time_left_seconds: durationSeconds,
        duration_seconds: durationSeconds,
        deadline_at: new Date(Date.now() + durationSeconds * 1000).toISOString(),
        attempt_token: attemptToken,
        is_master_code: isMasterCode,
        elective: selectedSubjects[selectedSubjects.length - 1] || "",
      })
      .select()
      .single();

    if (sessionErr || !sessionRow) {
      if (consumedCodeId) {
        await supabase.from("access_codes")
          .update({ is_used: false, used_by: null })
          .eq("id", consumedCodeId)
          .eq("used_by", cleanPhone);
      }
      return NextResponse.json(
        { ok: false, error: "session_failed", message: `Could not initialize examination session: ${sessionErr?.message}` },
        { status: 500 }
      );
    }

    // 5. ATOMIC ACCESS CODE CONSUMPTION: Mark access code as used (if voucher and not master code)
    if (!isMasterCode && cleanCode && cleanCode !== "OPEN-CBT") {
      const usedByString = cleanPhone && cleanPhone !== "08000000000"
        ? `${cleanName} (${cleanPhone})`
        : cleanName;

      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("mark_access_code_used", {
          p_code: cleanCode,
          p_used_by: usedByString,
          p_session_id: sessionRow.id,
        });

        if (rpcErr || (rpcRes && typeof rpcRes === "object" && (rpcRes as { ok?: boolean }).ok === false)) {
          // Direct table update fallback
          const updatePayload: Record<string, unknown> = {
            is_used: true,
            used_by: usedByString,
            used_at: new Date().toISOString(),
            exam_session_id: sessionRow.id,
          };
          const { error: updateErr } = await supabase
            .from("access_codes")
            .update(updatePayload)
            .eq("code", cleanCode);

          if (updateErr) {
            // Safe fallback if used_at or exam_session_id column does not exist yet
            await supabase
              .from("access_codes")
              .update({ is_used: true, used_by: usedByString })
              .eq("code", cleanCode);
          }
        }
      } catch (err) {
        console.warn("[exam/start] Error updating access code:", err);
        try {
          await supabase
            .from("access_codes")
            .update({ is_used: true, used_by: usedByString })
            .eq("code", cleanCode);
        } catch {}
      }
    }

    // Record question exposure for this registered candidate only after the session exists.
    if (registeredUser && paperIds.length) {
      const exposureRows = [...new Set(paperIds)].map((question_id) => ({
        user_id: registeredUser.id,
        question_id,
        surface: "full_mock",
        attempt_id: sessionRow.id,
      }));
      const { error: exposureError } = await supabase
        .from("question_exposure_history")
        .upsert(exposureRows, { onConflict: "user_id,question_id,surface,attempt_id", ignoreDuplicates: true });
      if (exposureError) {
        console.error("Unable to record full-mock question exposure:", exposureError.message);
      }
    }

    // 6. Freeze immutable attempt snapshot using actual session ID
    if (generated.snapshot?.questions_snapshot) {
      void freezeAttemptSnapshot(
        sessionRow.id,
        generated.snapshot.blueprint_id || "jamb_utme_full_mock",
        generated.snapshot.blueprint_version || 1,
        paperIds,
        selectedSubjects,
        generated.snapshot.questions_snapshot,
        "english_90_to_100"
      );
    }

    // 7. Use clientQuestions from engine (already includes option_e, stripped of correct_answer/explanation)
    let questionsPayload = generated.clientQuestions || [];

    if (!questionsPayload || questionsPayload.length === 0) {
      // Fallback query via _paper_json RPC or questions table
      const { data: questionsJson } = await supabase.rpc("_paper_json", {
        p_ids: paperIds,
      });

      if (questionsJson && questionsJson.length > 0) {
        questionsPayload = questionsJson;
      } else {
        const { data: rawQ } = await supabase
          .from("questions")
          .select(
            "id, subject, section, category, passage_id, passage_title, passage_text, question, question_image_url, question_image_alt, option_a, option_a_image_url, option_a_image_alt, option_b, option_b_image_url, option_b_image_alt, option_c, option_c_image_url, option_c_image_alt, option_d, option_d_image_url, option_d_image_alt, option_e, option_e_image_url, option_e_image_alt, marks"
          )
          .in("id", paperIds);
        questionsPayload = (rawQ || []) as typeof questionsPayload;
      }
    }

    return NextResponse.json({
      ok: true,
      session_id: sessionRow.id,
      token: attemptToken,
      duration_seconds: durationSeconds,
      time_left_seconds: durationSeconds,
      tab_switch_count: 0,
      elective: selectedSubjects[selectedSubjects.length - 1] || "",
      subjects: selectedSubjects,
      questions: questionsPayload,
      answers: {},
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "unexpected_error", message: err instanceof Error ? err.message : "Exam launch failed." },
      { status: 500 }
    );
  }
}
