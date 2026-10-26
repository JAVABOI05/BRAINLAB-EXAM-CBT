import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { code = "", name = "", phone = "", elective = "", subjects = [] } = body;

    const supabase = getSupabaseServerClient();

    const cleanCode = String(code || "").trim().toUpperCase();
    const cleanName = String(name || "").trim() || "Candidate";
    const cleanPhone = String(phone || "").trim() || "08000000000";

    // 1. Check access code if required
    let isMasterCode = false;
    let preconfiguredSubject: string | null = null;

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
          .select("id, code, subject, is_used")
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
        if (codeRecord.subject) {
          preconfiguredSubject = codeRecord.subject;
        }
      }
    }

    // 2. Preserve the existing subject-selection contract.
    let selectedSubjects: string[] = [];

    if (preconfiguredSubject) {
      selectedSubjects = ["English", preconfiguredSubject];
    } else if (Array.isArray(subjects) && subjects.length > 0) {
      const nonEnglish = subjects
        .map((s) => String(s).trim())
        .filter((s) => Boolean(s) && !s.toLowerCase().includes("english"));
      selectedSubjects = ["English", ...nonEnglish.slice(0, 3)];
    } else if (elective) {
      selectedSubjects = ["English", "Mathematics", "Physics", String(elective).trim()];
    } else {
      selectedSubjects = ["English", "Mathematics", "Physics", "Chemistry"];
    }

    if (selectedSubjects[0]?.toLowerCase() !== "english") {
      const remaining = selectedSubjects.filter((s) => !s.toLowerCase().includes("english"));
      selectedSubjects = ["English", ...remaining.slice(0, 3)];
    }

    const defaultFillers = ["Mathematics", "Physics", "Chemistry", "Biology"];
    while (selectedSubjects.length < 4) {
      const nextFiller = defaultFillers.find((f) => !selectedSubjects.includes(f)) || "Mathematics";
      selectedSubjects.push(nextFiller);
    }
    selectedSubjects = selectedSubjects.slice(0, 4);

    // The first UTME English blueprint supports the standard English + Chemistry +
    // Physics + (Biology or Mathematics) combination. Other existing subject choices
    // retain the legacy selection path until the builder supports arbitrary electives.
    const supportedElectives = ["Biology", "Mathematics"];
    const selectedElective = selectedSubjects.find((s) =>
      supportedElectives.some((allowed) => allowed.toLowerCase() === s.toLowerCase())
    );
    const blueprintEligible =
      selectedSubjects.length === 4 &&
      selectedSubjects.some((s) => s.toLowerCase() === "english") &&
      selectedSubjects.some((s) => s.toLowerCase() === "chemistry") &&
      selectedSubjects.some((s) => s.toLowerCase() === "physics") &&
      Boolean(selectedElective);

    let paperIds: number[] = [];
    let paperBlueprint: string | null = null;

    if (blueprintEligible && selectedElective) {
      selectedSubjects = ["English", "Chemistry", "Physics", selectedElective];
      const { data: builtPaper, error: buildError } = await supabase.rpc("_build_paper", {
        p_elective: selectedElective,
      });

      if (buildError || !Array.isArray(builtPaper) || builtPaper.length !== 180) {
        return NextResponse.json(
          {
            ok: false,
            error: "paper_not_ready",
            message: buildError?.message || "The required examination question pools are not ready. Please contact the administrator.",
          },
          { status: 503 }
        );
      }

      paperIds = builtPaper.map((id: number | string) => Number(id));
      if (paperIds.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(paperIds).size !== 180) {
        return NextResponse.json(
          { ok: false, error: "invalid_paper", message: "The examination paper could not be validated. Please contact the administrator." },
          { status: 503 }
        );
      }
      paperBlueprint = "utme_english_v1";
    } else {
      // Compatibility path for preconfigured and non-standard subject combinations.
      // Keep existing subject-selection behavior, but do not silently fill a failed
      // blueprint paper with unrelated questions.
      for (const subj of selectedSubjects) {
        const isEnglish = subj.toLowerCase() === "english";
        const targetCount = isEnglish ? 60 : 40;
        const { data: qRows, error: qError } = await supabase
          .from("questions")
          .select("id")
          .eq("is_active", true)
          .ilike("subject", subj)
          .limit(250);

        if (qError) {
          return NextResponse.json(
            { ok: false, error: "question_pool_error", message: "Could not load one of the selected subject pools. Please try again later." },
            { status: 503 }
          );
        }
        const shuffled = [...(qRows || [])].sort(() => Math.random() - 0.5).slice(0, targetCount);
        paperIds.push(...shuffled.map((q) => Number(q.id)));
      }

      if (paperIds.length < 180) {
        const needed = 180 - paperIds.length;
        const { data: fallbackQuestions, error: fallbackError } = await supabase
          .from("questions")
          .select("id")
          .eq("is_active", true)
          .not("id", "in", `(${paperIds.length ? paperIds.join(",") : "0"})`)
          .limit(needed);

        if (fallbackError) {
          return NextResponse.json(
            { ok: false, error: "question_pool_error", message: "Could not complete the selected question pools. Please try again later." },
            { status: 503 }
          );
        }
        paperIds.push(...(fallbackQuestions || []).map((q) => Number(q.id)));
      }

      if (paperIds.length !== 180 || paperIds.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(paperIds).size !== 180) {
        return NextResponse.json(
          { ok: false, error: "paper_not_ready", message: "There are not enough unique active questions for this subject combination. Please contact the administrator." },
          { status: 503 }
        );
      }
    }

    // 4. Create the exam session in public.exam_sessions
    const attemptToken = crypto.randomUUID();
    const durationSeconds = 7200; // 2 hours

    const { data: sessionRow, error: sessionErr } = await supabase
      .from("exam_sessions")
      .insert({
        candidate_name: cleanName,
        phone: cleanPhone,
        subject: selectedSubjects.join(", "),
        access_code: cleanCode || "OPEN-CBT",
        status: "started",
        paper_ids: paperIds,
        paper_blueprint: paperBlueprint,
        time_left_seconds: durationSeconds,
        duration_seconds: durationSeconds,
        // The server-side save/resume/submit RPCs calculate time from this deadline.
        // Without it, save_progress can return a null remaining time and the UI may auto-submit.
        deadline_at: new Date(Date.now() + durationSeconds * 1000).toISOString(),
        attempt_token: attemptToken,
        is_master_code: isMasterCode,
        elective: selectedSubjects[selectedSubjects.length - 1] || "",
      })
      .select()
      .single();

    if (sessionErr || !sessionRow) {
      return NextResponse.json(
        { ok: false, error: "session_failed", message: `Could not initialize examination session: ${sessionErr?.message}` },
        { status: 500 }
      );
    }

    // 5. Fetch and validate the question payload before returning a usable attempt.
    // Never treat an RPC error or a partial payload as a successful exam launch.
    const { data: questionsJson, error: paperErr } = await supabase.rpc("_paper_json", {
      p_ids: paperIds,
    });

    if (paperErr || !Array.isArray(questionsJson) || questionsJson.length !== paperIds.length) {
      // The session was created but cannot be safely presented. Mark it cancelled so
      // it cannot be resumed as a broken attempt; never fall back to a partial query.
      await supabase
        .from("exam_sessions")
        .update({ status: "cancelled" })
        .eq("id", sessionRow.id)
        .eq("attempt_token", attemptToken);

      return NextResponse.json(
        {
          ok: false,
          error: "paper_payload_failed",
          message: paperErr?.message || "The examination question payload was incomplete. Please try again later.",
        },
        { status: 503 }
      );
    }

    const questionsPayload = questionsJson;

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
