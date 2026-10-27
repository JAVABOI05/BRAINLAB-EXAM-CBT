import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  CompetitionActor,
  getCompetitionActor,
  hasPermissionInScope,
  logCompetitionAuditEvent,
} from "@/app/lib/competitionRbac";
import {
  validateQuestionItem,
  computeQuestionHash,
  detectQuestionDuplicates,
  CompetitionQuestionItem,
  canTransitionQuestionStatus,
} from "@/app/lib/competitionQuestionBank";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bankId: string }> }
) {
  try {
    const { bankId } = await context.params;
    const actor = await getCompetitionActor(req);
    const supabase = getSupabaseServerClient();

    // Verify bank access
    const { data: bank } = await supabase
      .from("competition_question_banks")
      .select("*")
      .eq("id", bankId)
      .maybeSingle();

    if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });

    if (bank.visibility === "private") {
      if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const isOwner = bank.owner_id === actor.id;
      const isAdmin = ["super_admin", "platform_admin", "competition_admin"].includes(actor.role);
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Access denied to private bank" }, { status: 403 });
      }
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const difficulty = searchParams.get("difficulty");
    const search = searchParams.get("q");

    let query = supabase
      .from("competition_questions")
      .select("*")
      .eq("bank_id", bankId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (difficulty && difficulty !== "all") query = query.eq("difficulty", difficulty);
    if (search) query = query.ilike("question", `%${search}%`);

    const { data: questions, error } = await query;
    if (error) throw error;

    return NextResponse.json({ questions: questions || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bankId: string }> }
) {
  try {
    const { bankId } = await context.params;
    const actor = await getCompetitionActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data: bank } = await supabase
      .from("competition_question_banks")
      .select("*")
      .eq("id", bankId)
      .maybeSingle();

    if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });

    const perm = hasPermissionInScope(actor, "question_builder.use", {
      scopeType: "question_bank",
      scopeId: bankId,
      ownerId: bank.owner_id,
    });
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const candidate: CompetitionQuestionItem = {
      bank_id: bankId,
      question: (body.question || "").trim(),
      subject: (body.subject || bank.subject).trim(),
      topic: body.topic?.trim() || undefined,
      subtopic: body.subtopic?.trim() || undefined,
      difficulty: body.difficulty || "medium",
      question_type: body.question_type || "multiple_choice",
      option_a: (body.option_a || "").trim(),
      option_b: (body.option_b || "").trim(),
      option_c: (body.option_c || "").trim(),
      option_d: (body.option_d || "").trim(),
      option_e: body.option_e?.trim() || null,
      option_a_image_url: body.option_a_image_url || null,
      option_b_image_url: body.option_b_image_url || null,
      option_c_image_url: body.option_c_image_url || null,
      option_d_image_url: body.option_d_image_url || null,
      option_e_image_url: body.option_e_image_url || null,
      question_image_url: body.question_image_url || null,
      question_image_alt: body.question_image_alt || null,
      correct_answer: (body.correct_answer || "").trim().toUpperCase(),
      explanation: body.explanation?.trim() || undefined,
      marks: typeof body.marks === "number" && body.marks > 0 ? body.marks : 1.0,
      tags: Array.isArray(body.tags) ? body.tags : [],
      status: body.status || "draft",
      created_by: actor.id,
    };

    candidate.group_hash = computeQuestionHash(candidate);

    // Validate fields
    const valErrors = validateQuestionItem(candidate, 1);
    if (valErrors.length > 0) {
      return NextResponse.json({ error: "Validation failed", details: valErrors }, { status: 400 });
    }

    // Check independent approval rule if target is approved/published
    if (candidate.status === "approved" || candidate.status === "published") {
      const transitionCheck = canTransitionQuestionStatus("draft", candidate.status, {
        id: actor.id,
        role: actor.role,
        created_by: actor.id,
      });
      if (!transitionCheck.allowed) {
        candidate.status = "review"; // downgrade to review pending independent approval
      }
    }

    // Duplicate detection against existing pool
    const { data: existingPool } = await supabase
      .from("competition_questions")
      .select("*")
      .eq("bank_id", bankId)
      .eq("is_archived", false);

    const dup = detectQuestionDuplicates(candidate, (existingPool || []) as CompetitionQuestionItem[]);
    if (dup && dup.duplicate_type === "exact") {
      return NextResponse.json(
        {
          error: "Exact duplicate question already exists in this bank.",
          duplicateDetails: dup,
        },
        { status: 409 }
      );
    }

    // Insert into database
    const { data: newQuestion, error: insertErr } = await supabase
      .from("competition_questions")
      .insert({
        bank_id: candidate.bank_id,
        question: candidate.question,
        subject: candidate.subject,
        topic: candidate.topic,
        subtopic: candidate.subtopic,
        difficulty: candidate.difficulty,
        question_type: candidate.question_type,
        option_a: candidate.option_a,
        option_b: candidate.option_b,
        option_c: candidate.option_c,
        option_d: candidate.option_d,
        option_e: candidate.option_e,
        option_a_image_url: candidate.option_a_image_url,
        option_b_image_url: candidate.option_b_image_url,
        option_c_image_url: candidate.option_c_image_url,
        option_d_image_url: candidate.option_d_image_url,
        option_e_image_url: candidate.option_e_image_url,
        question_image_url: candidate.question_image_url,
        question_image_alt: candidate.question_image_alt,
        correct_answer: candidate.correct_answer,
        explanation: candidate.explanation,
        marks: candidate.marks,
        tags: candidate.tags,
        status: candidate.status,
        group_hash: candidate.group_hash,
        created_by: actor.id,
        approved_by: candidate.status === "approved" || candidate.status === "published" ? actor.id : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Log potential duplicate for review if similarity is high
    if (dup && (dup.duplicate_type === "similar" || dup.duplicate_type === "identical_options")) {
      await supabase.from("competition_question_duplicates").insert({
        bank_id: bankId,
        group_hash: candidate.group_hash!,
        duplicate_type: dup.duplicate_type,
        question_ids: [dup.existing_question.id, newQuestion.id],
        status: "pending",
        notes: `Detected ${dup.duplicate_type} with similarity ${(dup.similarity_score * 100).toFixed(1)}%`,
      });
    }

    await logCompetitionAuditEvent({
      action: "competition_question_created",
      resourceType: "competition_questions",
      resourceId: newQuestion.id,
      actorId: actor.id,
      actorEmail: actor.email,
      details: {
        bank_id: bankId,
        subject: newQuestion.subject,
        status: newQuestion.status,
        has_option_e: Boolean(newQuestion.option_e),
      },
    });

    return NextResponse.json({ question: newQuestion, duplicateWarning: dup }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ bankId: string }> }
) {
  try {
    const { bankId } = await context.params;
    const actor = await getCompetitionActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { questionId, ...updates } = body;
    if (!questionId) return NextResponse.json({ error: "questionId is required" }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data: existingQ } = await supabase
      .from("competition_questions")
      .select("*")
      .eq("id", questionId)
      .eq("bank_id", bankId)
      .maybeSingle();

    if (!existingQ) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    // Boundary check: finalized competition retention protection
    // Check if this question was used in any concluded competition
    const { data: usedCompetitions } = await supabase
      .from("competition_attempt_snapshots")
      .select("id")
      .contains("questions_snapshot", [{ id: questionId }])
      .limit(1);

    const isUsedInAttempts = Boolean(usedCompetitions && usedCompetitions.length > 0);

    // Permission check
    const perm = hasPermissionInScope(actor, "question_bank.edit_own", {
      scopeType: "question_bank",
      scopeId: bankId,
      ownerId: existingQ.created_by,
      isFinalized: isUsedInAttempts && (updates.correct_answer || updates.marks),
    });

    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });
    }

    const { data: updatedQ, error: updateErr } = await supabase
      .from("competition_questions")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await logCompetitionAuditEvent({
      action: "competition_question_updated",
      resourceType: "competition_questions",
      resourceId: questionId,
      actorId: actor.id,
      actorEmail: actor.email,
      details: { previous: existingQ, updated: updatedQ },
    });

    return NextResponse.json({ question: updatedQ });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ bankId: string }> }
) {
  try {
    const { bankId } = await context.params;
    const actor = await getCompetitionActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const questionId = searchParams.get("id");
    if (!questionId) return NextResponse.json({ error: "Question ID is required" }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data: existingQ } = await supabase
      .from("competition_questions")
      .select("*")
      .eq("id", questionId)
      .eq("bank_id", bankId)
      .maybeSingle();

    if (!existingQ) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    const perm = hasPermissionInScope(actor, "question_bank.delete_own", {
      scopeType: "question_bank",
      scopeId: bankId,
      ownerId: existingQ.created_by,
    });
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });
    }

    // Safe archival: Mark is_archived = true to protect historical integrity
    const { error: archiveErr } = await supabase
      .from("competition_questions")
      .update({ is_archived: true, status: "archived", updated_at: new Date().toISOString() })
      .eq("id", questionId);

    if (archiveErr) throw archiveErr;

    await logCompetitionAuditEvent({
      action: "competition_question_archived",
      resourceType: "competition_questions",
      resourceId: questionId,
      actorId: actor.id,
      actorEmail: actor.email,
      details: { question: existingQ.question, subject: existingQ.subject },
    });

    return NextResponse.json({ success: true, archived: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error archiving question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
