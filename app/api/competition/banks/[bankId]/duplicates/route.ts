import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  CompetitionActor,
  getCompetitionActor,
  hasPermissionInScope,
  logCompetitionAuditEvent,
} from "@/app/lib/competitionRbac";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bankId: string }> }
) {
  try {
    const { bankId } = await context.params;
    const actor = await getCompetitionActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data: duplicates, error } = await supabase
      .from("competition_question_duplicates")
      .select("*")
      .eq("bank_id", bankId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Expand question details for side-by-side display
    const cases = await Promise.all(
      (duplicates || []).map(async (dup) => {
        const { data: questions } = await supabase
          .from("competition_questions")
          .select("*")
          .in("id", dup.question_ids);

        return {
          id: dup.id,
          group_hash: dup.group_hash,
          duplicate_type: dup.duplicate_type,
          notes: dup.notes,
          questions: questions || [],
        };
      })
    );

    return NextResponse.json({ duplicates: cases });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing duplicate cases";
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

    const perm = hasPermissionInScope(actor, "question_bank.edit_assigned", {
      scopeType: "question_bank",
      scopeId: bankId,
    });
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { duplicateId, resolution, retainedQuestionId, notes } = body;
    // resolution: 'keep_one' | 'mark_distinct' | 'merge'

    if (!duplicateId || !resolution) {
      return NextResponse.json({ error: "duplicateId and resolution are required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: dupCase } = await supabase
      .from("competition_question_duplicates")
      .select("*")
      .eq("id", duplicateId)
      .maybeSingle();

    if (!dupCase) return NextResponse.json({ error: "Duplicate case not found" }, { status: 404 });

    if (resolution === "keep_one" && retainedQuestionId) {
      // Archive non-retained duplicates
      const toArchive = dupCase.question_ids.filter((qid: string) => qid !== retainedQuestionId);
      if (toArchive.length > 0) {
        await supabase
          .from("competition_questions")
          .update({ is_archived: true, status: "archived", updated_at: new Date().toISOString() })
          .in("id", toArchive);
      }

      await supabase
        .from("competition_question_duplicates")
        .update({
          status: "resolved_retained",
          retained_question_id: retainedQuestionId,
          reviewed_by: actor.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq("id", duplicateId);
    } else if (resolution === "mark_distinct") {
      await supabase
        .from("competition_question_duplicates")
        .update({
          status: "resolved_distinct",
          reviewed_by: actor.id,
          reviewed_at: new Date().toISOString(),
          notes: notes || "Marked intentionally distinct by reviewer.",
        })
        .eq("id", duplicateId);
    } else if (resolution === "merge" && retainedQuestionId) {
      // Point non-retained to duplicate_of_id
      const toMerge = dupCase.question_ids.filter((qid: string) => qid !== retainedQuestionId);
      if (toMerge.length > 0) {
        await supabase
          .from("competition_questions")
          .update({
            duplicate_of_id: retainedQuestionId,
            is_archived: true,
            status: "archived",
            updated_at: new Date().toISOString(),
          })
          .in("id", toMerge);
      }

      await supabase
        .from("competition_question_duplicates")
        .update({
          status: "resolved_merged",
          retained_question_id: retainedQuestionId,
          reviewed_by: actor.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq("id", duplicateId);
    }

    await logCompetitionAuditEvent({
      action: "duplicate_question_resolved",
      resourceType: "competition_question_duplicates",
      resourceId: duplicateId,
      actorId: actor.id,
      actorEmail: actor.email,
      details: { resolution, retainedQuestionId, bankId, notes },
    });

    return NextResponse.json({ success: true, resolution });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error resolving duplicates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
