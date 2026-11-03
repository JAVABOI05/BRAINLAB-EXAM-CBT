import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/adminAuth";
import { adminHasPermission } from "../../../lib/adminRoles";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import {
  OFFICIAL_UTME_ENGLISH_BLUEPRINT,
  OFFICIAL_STANDARD_SUBJECT_BLUEPRINT,
  loadBlueprintForSubject,
  saveBlueprint,
  validateBlueprint,
} from "../../../lib/examEngine/blueprints";
import { ExamBlueprint } from "../../../lib/examEngine/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const [englishBlueprint, standardBlueprint] = await Promise.all([
      loadBlueprintForSubject("English"),
      loadBlueprintForSubject("General"),
    ]);

    // Also fetch reading text registry configuration
    const supabase = getSupabaseServerClient();
    const { data: readingTextCfg } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "reading_text_registry")
      .maybeSingle();

    const readingTexts = readingTextCfg?.config_value || [
      {
        id: "lekki_headmaster",
        title: "The Lekki Headmaster",
        author: "Kabir Alabi Garba",
        is_active: true,
        question_quota: 10,
        description: "Official prescribed novel for current UTME examination cycle.",
      },
      {
        id: "life_changer",
        title: "The Life Changer",
        author: "Khadija Abubakar Jalli",
        is_active: false,
        question_quota: 10,
        description: "Previous syllabus novel. Deferred from new paper generation.",
      },
    ];

    return NextResponse.json({
      ok: true,
      englishBlueprint,
      standardBlueprint,
      readingTexts,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load blueprints" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const canEdit =
      admin.role === "super_admin" ||
      admin.role === "platform_admin" ||
      admin.role === "cbt_admin" ||
      (await adminHasPermission("cbt.config.manage")) ||
      (await adminHasPermission("cbt.questions.manage"));

    if (!canEdit) {
      return NextResponse.json({ ok: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, englishBlueprint, standardBlueprint, readingTexts } = body;

    // Action 1: Reset to canonical JAMB UTME standard
    if (action === "reset") {
      await Promise.all([
        saveBlueprint(OFFICIAL_UTME_ENGLISH_BLUEPRINT),
        saveBlueprint(OFFICIAL_STANDARD_SUBJECT_BLUEPRINT),
      ]);

      const supabase = getSupabaseServerClient();
      try {
        await supabase.from("configuration_audit_logs").insert({
          admin_id: admin.id,
          admin_email: admin.email,
          action_type: "reset_blueprints_to_default",
          target_entity: "exam_blueprints",
          new_payload: { english: OFFICIAL_UTME_ENGLISH_BLUEPRINT, standard: OFFICIAL_STANDARD_SUBJECT_BLUEPRINT },
          change_reason: "Reset examination blueprints to canonical JAMB UTME standard",
        });
      } catch {}

      return NextResponse.json({
        ok: true,
        message: "Examination blueprints successfully reset to official JAMB UTME defaults.",
        englishBlueprint: OFFICIAL_UTME_ENGLISH_BLUEPRINT,
        standardBlueprint: OFFICIAL_STANDARD_SUBJECT_BLUEPRINT,
      });
    }

    // Action 2: Save custom blueprint configuration
    const errors: string[] = [];

    if (englishBlueprint) {
      // Recompute raw total marks and validate
      let totalQ = 0;
      let totalRaw = 0;
      for (const sec of englishBlueprint.sections_config || []) {
        sec.quota = Math.max(1, parseInt(sec.quota, 10) || 1);
        sec.marks_per_question = Math.max(0.1, parseFloat(sec.marks_per_question) || 1);
        sec.raw_total = Math.round(sec.quota * sec.marks_per_question * 100) / 100;
        totalQ += sec.quota;
        totalRaw += sec.raw_total;
      }
      englishBlueprint.total_questions = totalQ;
      englishBlueprint.raw_max_marks = totalRaw;
      englishBlueprint.converted_max_marks = Number(englishBlueprint.converted_max_marks) || 100;

      const val = validateBlueprint(englishBlueprint);
      if (!val.valid) {
        errors.push(`English Blueprint: ${val.errors.join(", ")}`);
      } else {
        const saveRes = await saveBlueprint(englishBlueprint);
        if (!saveRes.ok) errors.push(`Failed to save English Blueprint: ${saveRes.message}`);
      }
    }

    if (standardBlueprint) {
      for (const sec of standardBlueprint.sections_config || []) {
        sec.quota = Math.max(1, parseInt(sec.quota, 10) || 40);
        sec.marks_per_question = Math.max(0.1, parseFloat(sec.marks_per_question) || 2.5);
        sec.raw_total = Math.round(sec.quota * sec.marks_per_question * 100) / 100;
      }
      standardBlueprint.total_questions = standardBlueprint.sections_config[0]?.quota || 40;
      standardBlueprint.raw_max_marks = standardBlueprint.sections_config[0]?.raw_total || 100;
      standardBlueprint.converted_max_marks = 100;

      const val = validateBlueprint(standardBlueprint);
      if (!val.valid) {
        errors.push(`Standard Blueprint: ${val.errors.join(", ")}`);
      } else {
        const saveRes = await saveBlueprint(standardBlueprint);
        if (!saveRes.ok) errors.push(`Failed to save Standard Blueprint: ${saveRes.message}`);
      }
    }

    if (Array.isArray(readingTexts)) {
      const supabase = getSupabaseServerClient();
      await supabase.from("exam_config").upsert(
        {
          config_key: "reading_text_registry",
          config_value: readingTexts,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "config_key" }
      );
    }

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, error: errors.join("; ") }, { status: 400 });
    }

    // Audit log
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from("configuration_audit_logs").insert({
        admin_id: admin.id,
        admin_email: admin.email,
        action_type: "update_exam_blueprints",
        target_entity: "exam_blueprints",
        new_payload: { englishBlueprint, standardBlueprint, readingTexts },
        change_reason: `Admin updated examination blueprints (${englishBlueprint?.total_questions || 60} English Qs, ${standardBlueprint?.total_questions || 40} Standard Qs)`,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      message: "Examination blueprints and scoring rules updated successfully.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to update blueprints" },
      { status: 500 }
    );
  }
}
