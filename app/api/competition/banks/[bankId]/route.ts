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
    const supabase = getSupabaseServerClient();

    const { data: bank, error } = await supabase
      .from("competition_question_banks")
      .select("*, competition_questions(count)")
      .eq("id", bankId)
      .maybeSingle();

    if (error) throw error;
    if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });

    // Check scope access
    if (bank.visibility === "private") {
      if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const isOwner = bank.owner_id === actor.id;
      const isAdmin = actor.role === "super_admin" || actor.role === "platform_admin" || actor.role === "competition_admin";
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Access denied to private question bank." }, { status: 403 });
      }
    }

    return NextResponse.json({ bank });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching bank";
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

    const supabase = getSupabaseServerClient();
    const { data: bank } = await supabase
      .from("competition_question_banks")
      .select("*")
      .eq("id", bankId)
      .maybeSingle();

    if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });

    const perm = hasPermissionInScope(actor, "question_bank.edit_own", {
      scopeType: "question_bank",
      scopeId: bankId,
      ownerId: bank.owner_id,
    });
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, subject, academic_level, visibility, status } = body;

    const { data: updated, error: updateErr } = await supabase
      .from("competition_question_banks")
      .update({
        name: name !== undefined ? name.trim() : bank.name,
        description: description !== undefined ? description.trim() : bank.description,
        subject: subject !== undefined ? subject.trim() : bank.subject,
        academic_level: academic_level !== undefined ? academic_level : bank.academic_level,
        visibility: visibility !== undefined ? visibility : bank.visibility,
        status: status !== undefined ? status : bank.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bankId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await logCompetitionAuditEvent({
      action: "question_bank_updated",
      resourceType: "competition_question_banks",
      resourceId: bankId,
      actorId: actor.id,
      actorEmail: actor.email,
      details: { previous: bank, updated },
    });

    return NextResponse.json({ bank: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating bank";
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

    const supabase = getSupabaseServerClient();
    const { data: bank } = await supabase
      .from("competition_question_banks")
      .select("*")
      .eq("id", bankId)
      .maybeSingle();

    if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });

    const perm = hasPermissionInScope(actor, "question_bank.delete_own", {
      scopeType: "question_bank",
      scopeId: bankId,
      ownerId: bank.owner_id,
    });
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });
    }

    const { error: delErr } = await supabase
      .from("competition_question_banks")
      .delete()
      .eq("id", bankId);

    if (delErr) throw delErr;

    await logCompetitionAuditEvent({
      action: "question_bank_deleted",
      resourceType: "competition_question_banks",
      resourceId: bankId,
      actorId: actor.id,
      actorEmail: actor.email,
      details: { name: bank.name, subject: bank.subject },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error deleting bank";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
