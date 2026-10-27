import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { CompetitionActor, hasPermissionInScope, logCompetitionAuditEvent } from "@/app/lib/competitionRbac";
import {
  parseAndValidateCompetitionCSV,
  CompetitionQuestionItem,
} from "@/app/lib/competitionQuestionBank";

async function getActor(req: NextRequest): Promise<CompetitionActor | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email || "",
    role: (profile?.role || "student") as CompetitionActor["role"],
  };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bankId: string }> }
) {
  try {
    const { bankId } = await context.params;
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data: bank } = await supabase
      .from("competition_question_banks")
      .select("*")
      .eq("id", bankId)
      .maybeSingle();

    if (!bank) return NextResponse.json({ error: "Question bank not found." }, { status: 404 });

    const perm = hasPermissionInScope(actor, "question_bank.import_csv", {
      scopeType: "question_bank",
      scopeId: bankId,
      ownerId: bank.owner_id,
    });
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { csvContent, filename = "upload.csv", dryRun = false } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json({ error: "csvContent string is required." }, { status: 400 });
    }

    // Load existing active bank questions for cross-batch duplicate detection
    const { data: existingRows } = await supabase
      .from("competition_questions")
      .select("*")
      .eq("bank_id", bankId)
      .eq("is_archived", false);

    const existingQuestions = (existingRows || []) as CompetitionQuestionItem[];

    // Parse, validate, and check duplicates
    const summary = parseAndValidateCompetitionCSV(csvContent, bankId, actor.id, existingQuestions);

    if (dryRun) {
      // Preview mode: return summary without committing to database
      return NextResponse.json({
        preview: true,
        summary: {
          total_rows: summary.total_rows,
          valid_count: summary.imported_count,
          rejected_count: summary.rejected_count,
          duplicates_count: summary.duplicates_count,
          review_needed_count: summary.review_needed_count,
          errors: summary.errors,
          duplicates: summary.detected_duplicates,
          sample_preview: summary.imported_questions.slice(0, 5),
        },
      });
    }

    // Transactional / Safe commit
    let insertedRowsCount = 0;
    if (summary.imported_questions.length > 0) {
      const recordsToInsert = summary.imported_questions.map((q) => ({
        bank_id: bankId,
        question: q.question,
        subject: q.subject,
        topic: q.topic || null,
        subtopic: q.subtopic || null,
        difficulty: q.difficulty,
        question_type: q.question_type,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        option_e: q.option_e || null,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        marks: q.marks,
        tags: q.tags || [],
        status: q.status,
        group_hash: q.group_hash || null,
        created_by: actor.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("competition_questions")
        .insert(recordsToInsert)
        .select("id");

      if (insertError) throw insertError;
      insertedRowsCount = inserted?.length || 0;
    }

    // Record import batch report
    const { data: batch } = await supabase
      .from("competition_import_batches")
      .insert({
        bank_id: bankId,
        filename,
        total_rows: summary.total_rows,
        imported_count: insertedRowsCount,
        rejected_count: summary.rejected_count,
        duplicates_count: summary.duplicates_count,
        review_needed_count: summary.review_needed_count,
        errors_json: summary.errors,
        imported_by: actor.id,
      })
      .select()
      .maybeSingle();

    await logCompetitionAuditEvent({
      action: "csv_questions_imported",
      resourceType: "competition_import_batches",
      resourceId: batch?.id || bankId,
      actorId: actor.id,
      actorEmail: actor.email,
      details: {
        bank_id: bankId,
        filename,
        total_rows: summary.total_rows,
        imported_count: insertedRowsCount,
        rejected_count: summary.rejected_count,
        duplicates_count: summary.duplicates_count,
      },
    });

    return NextResponse.json({
      success: true,
      importReport: {
        batchId: batch?.id,
        filename,
        total_rows: summary.total_rows,
        imported_count: insertedRowsCount,
        rejected_count: summary.rejected_count,
        duplicates_count: summary.duplicates_count,
        review_needed_count: summary.review_needed_count,
        errors: summary.errors,
        duplicates_detected: summary.detected_duplicates,
        imported_at: new Date().toISOString(),
        responsible_user: actor.email,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error processing CSV import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
