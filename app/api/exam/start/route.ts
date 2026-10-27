import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import crypto from "crypto";
import { generateExamPaper, freezeAttemptSnapshot } from "../../../lib/examEngine";

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

    // 2. Determine examination subjects (4 subjects: English is always compulsory Subject 1)
    let selectedSubjects: string[] = [];

    if (preconfiguredSubject) {
      selectedSubjects = ["English", preconfiguredSubject];
    } else if (Array.isArray(subjects) && subjects.length > 0) {
      const nonEnglish = subjects
        .map((s) => String(s).trim())
        .filter((s) => Boolean(s) && !s.toLowerCase().includes("english"));
      selectedSubjects = ["English", ...nonEnglish.slice(0, 3)];
    } else if (elective) {
      selectedSubjects = ["English", "Mathematics", "Physics", elective];
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

    // 3. Generate exam paper using Master CBT Examination Engine
    // (Multi-stage English 60-question blueprint + 3 Electives 40 each, passage groups, high-yield quotas, topic coverage)
    const attemptToken = crypto.randomUUID();
    const durationSeconds = 7200; // 2 hours
    const provisionalSessionId = crypto.randomUUID();

    const generated = await generateExamPaper({
      sessionId: provisionalSessionId,
      token: attemptToken,
      subjects: selectedSubjects,
      durationSeconds,
    });

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

    // 4. Create the exam session in public.exam_sessions
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
      return NextResponse.json(
        { ok: false, error: "session_failed", message: `Could not initialize examination session: ${sessionErr?.message}` },
        { status: 500 }
      );
    }

    // 5. Freeze immutable attempt snapshot using actual session ID
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

    // 6. Use clientQuestions from engine (already includes option_e, stripped of correct_answer/explanation)
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
