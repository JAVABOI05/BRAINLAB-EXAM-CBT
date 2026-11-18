import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Admin credentials required" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch assessments
    const { data: assessments, error: assessErr } = await supabase
      .from("learning_assessments")
      .select("id, title, description, assessment_type, question_source, subjects, categories, question_count, duration_seconds, max_attempts, pass_percentage, shuffle_questions, starts_at, ends_at, access_code_required, result_release, is_published, status, custom_questions, created_at")
      .order("created_at", { ascending: false });

    if (assessErr) {
      console.error("[api/admin/assessments] Fetch error:", assessErr);
      return NextResponse.json({ ok: false, error: assessErr.message }, { status: 500 });
    }

    // 2. Fetch distinct subjects & categories from questions bank
    const { data: qRows, error: qErr } = await supabase
      .from("questions")
      .select("subject, category")
      .eq("is_active", true);

    const subjectStats: Record<string, { total: number; categories: Record<string, number> }> = {};

    if (!qErr && qRows) {
      for (const row of qRows) {
        const s = String(row.subject || "").trim();
        if (!s) continue;
        if (!subjectStats[s]) {
          subjectStats[s] = { total: 0, categories: {} };
        }
        subjectStats[s].total += 1;
        const c = String(row.category || "General").trim();
        subjectStats[s].categories[c] = (subjectStats[s].categories[c] || 0) + 1;
      }
    }

    // 3. Fetch attempt statistics per assessment
    const { data: attemptRows } = await supabase
      .from("learning_practice_attempts")
      .select("assessment_id, score, status");

    const attemptsMap: Record<string, { total: number; completed: number; avgScore: number }> = {};
    if (attemptRows) {
      const scoreSums: Record<string, { sum: number; count: number }> = {};
      for (const att of attemptRows) {
        if (!att.assessment_id) continue;
        const aId = att.assessment_id;
        if (!attemptsMap[aId]) {
          attemptsMap[aId] = { total: 0, completed: 0, avgScore: 0 };
          scoreSums[aId] = { sum: 0, count: 0 };
        }
        attemptsMap[aId].total += 1;
        if (att.status === "completed" || att.status === "graded") {
          attemptsMap[aId].completed += 1;
          if (typeof att.score === "number") {
            scoreSums[aId].sum += att.score;
            scoreSums[aId].count += 1;
          }
        }
      }
      for (const [id, s] of Object.entries(scoreSums)) {
        if (s.count > 0 && attemptsMap[id]) {
          attemptsMap[id].avgScore = Math.round(s.sum / s.count);
        }
      }
    }

    // Map assessments with computed stats
    const enrichedAssessments = (assessments || []).map((a) => {
      const stats = attemptsMap[a.id] || { total: 0, completed: 0, avgScore: 0 };
      const customQ = Array.isArray(a.custom_questions) ? a.custom_questions : [];
      return {
        ...a,
        customQuestionsCount: customQ.length,
        attemptsCount: stats.total,
        completedAttemptsCount: stats.completed,
        avgScore: stats.avgScore,
      };
    });

    return NextResponse.json({
      ok: true,
      assessments: enrichedAssessments,
      subjects: Object.keys(subjectStats).sort(),
      subjectStats,
    });
  } catch (err) {
    console.error("[api/admin/assessments] GET exception:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error loading assessments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Administrator privileges required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const title = String(body.title || "").trim();
    if (!title || title.length < 2) {
      return NextResponse.json({ ok: false, error: "Assessment title is required (minimum 2 characters)" }, { status: 400 });
    }

    const description = String(body.description || "").trim() || null;
    const instructions = String(body.instructions || "").trim() || null;
    const scopeType = String(body.scope_type || "single_subject");
    const assessmentType = String(body.assessment_type || "academic_quiz");
    const questionSource = String(body.question_source || "bank"); // bank | custom_builder | csv_import

    const rawSubjects = Array.isArray(body.subjects) ? body.subjects : [String(body.subject || "Mathematics")];
    const subjects = rawSubjects.map((s: string) => s.trim()).filter(Boolean);

    const rawCategories = Array.isArray(body.categories || body.topics) ? (body.categories || body.topics) : [];
    const categories = rawCategories.map((c: string) => c.trim()).filter(Boolean);

    const questionCount = Math.min(500, Math.max(1, parseInt(body.question_count || "20", 10)));
    const durationMinutes = body.duration_minutes !== null && body.duration_minutes !== undefined ? parseInt(body.duration_minutes, 10) : 30;
    const durationSeconds = durationMinutes && durationMinutes > 0 ? durationMinutes * 60 : null;

    const passPercentage = Math.min(100, Math.max(0, parseInt(body.pass_percentage || "70", 10)));
    const maxAttempts = Math.min(100, Math.max(1, parseInt(body.max_attempts || "1", 10)));
    const shuffleQuestions = body.shuffle_questions !== false;
    const accessCodeRequired = Boolean(body.access_code_required);
    const resultRelease = String(body.result_release || "after_submit");

    const startsAt = body.starts_at ? new Date(body.starts_at).toISOString() : null;
    const endsAt = body.ends_at ? new Date(body.ends_at).toISOString() : null;

    const status = String(body.status || "open"); // draft | open | closed
    const isPublished = status === "open";

    const customQuestions = Array.isArray(body.custom_questions) ? body.custom_questions : [];

    const supabase = getSupabaseServerClient();

    // Verify question availability if question_source is bank and marked open
    if (isPublished && (questionSource === "bank" || questionSource === "legacy_questions")) {
      if (subjects.length === 0) {
        return NextResponse.json({ ok: false, error: "Please select at least one subject for the question bank source." }, { status: 400 });
      }

      let qQuery = supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .in("subject", subjects);

      if (categories.length > 0) {
        qQuery = qQuery.in("category", categories);
      }

      const { count: availableCount } = await qQuery;
      if (typeof availableCount === "number" && availableCount < questionCount) {
        return NextResponse.json({
          ok: false,
          error: `Not enough active questions in question bank: found ${availableCount} questions, but ${questionCount} were requested. Please reduce question count or select more topics.`,
        }, { status: 400 });
      }
    }

    if (isPublished && (questionSource === "custom_builder" || questionSource === "csv_import")) {
      if (customQuestions.length === 0) {
        return NextResponse.json({
          ok: false,
          error: "Please add or import at least 1 question before opening this assessment.",
        }, { status: 400 });
      }
    }

    const payload = {
      title,
      description,
      instructions,
      assessment_type: assessmentType,
      question_source: questionSource === "bank" ? "legacy_questions" : questionSource,
      subjects,
      categories,
      question_count: questionSource === "bank" ? questionCount : Math.min(questionCount, Math.max(1, customQuestions.length)),
      duration_seconds: durationSeconds,
      max_attempts: maxAttempts,
      pass_percentage: passPercentage,
      shuffle_questions: shuffleQuestions,
      starts_at: startsAt,
      ends_at: endsAt,
      access_code_required: accessCodeRequired,
      result_release: resultRelease,
      is_published: isPublished,
      status,
      custom_questions: customQuestions,
    };

    const { data: created, error: insertError } = await supabase
      .from("learning_assessments")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      console.error("[api/admin/assessments] Insert error:", insertError);
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    // Optional: automatically provision examination access code if requested
    let createdCode: string | null = null;
    if (accessCodeRequired) {
      const rawCustom = body.custom_code ? String(body.custom_code).trim().toUpperCase() : null;
      const finalCode = rawCustom && rawCustom.length >= 4 && rawCustom.length <= 64
        ? rawCustom
        : `BLT-${require("crypto").randomBytes(4).toString("hex").toUpperCase()}`;

      const codeHash = require("crypto").createHash("sha256").update(finalCode).digest("hex");
      const maxRedemptions = Math.min(100000, Math.max(1, parseInt(body.max_redemptions || "500", 10)));
      const expiryDate = endsAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const { error: codeInsertErr } = await supabase.from("learning_access_codes").insert({
          code_hash: codeHash,
          code_hint: finalCode.slice(-4),
          scope_type: "assessment",
          assessment_id: created.id,
          organisation_id: created.organisation_id || null,
          max_questions: payload.question_count,
          permanent: false,
          expires_at: expiryDate,
          max_redemptions: maxRedemptions,
          redemption_count: 0,
          created_by: admin.id || null,
        });

        if (!codeInsertErr) {
          createdCode = finalCode;
        }
      } catch (e) {
        console.warn("[api/admin/assessments] Failed to auto-generate access code:", e);
      }
    }

    // Log configuration audit
    try {
      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "learning_assessment",
        entity_id: created.id,
        action: "created",
        new_value: {
          title,
          questionSource,
          subjects,
          questionCount: payload.question_count,
          status,
          accessCodeRequired,
          hasCode: Boolean(createdCode),
        },
        change_reason: `Admin created assessment "${title}" (${questionSource}, ${payload.question_count} questions)`,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      assessment: created,
      access_code: createdCode,
      message: createdCode
        ? `Assessment "${title}" created successfully as ${status.toUpperCase()} with examination code: ${createdCode}`
        : `Assessment "${title}" created successfully as ${status.toUpperCase()}!`,
    });
  } catch (err) {
    console.error("[api/admin/assessments] POST exception:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error creating assessment" },
      { status: 500 }
    );
  }
}
