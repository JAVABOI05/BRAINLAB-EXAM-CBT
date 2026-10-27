import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  CompetitionActor,
  getCompetitionActor,
  canApproveResultCorrection,
  canApprovePublication,
  logCompetitionAuditEvent,
} from "@/app/lib/competitionRbac";

export async function GET(req: NextRequest) {
  try {
    const actor = await getCompetitionActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("competition_moderation_cases")
      .select("*, competitions(title)")
      .order("created_at", { ascending: false });

    // Students only see cases they reported
    if (actor.role === "student" || actor.role === "guest") {
      query = query.eq("reporter_id", actor.id);
    }

    const { data: cases, error } = await query;
    if (error) throw error;

    return NextResponse.json({ cases: cases || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing moderation cases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getCompetitionActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action = "create_case" } = body;
    const supabase = getSupabaseServerClient();

    if (action === "create_case") {
      const { competitionId, questionId, reportedParticipantId, caseType, description, recommendedAction } = body;

      if (!competitionId || !caseType || !description) {
        return NextResponse.json({ error: "competitionId, caseType, and description are required" }, { status: 400 });
      }

      const { data: newCase, error: insertErr } = await supabase
        .from("competition_moderation_cases")
        .insert({
          competition_id: competitionId,
          question_id: questionId || null,
          reporter_id: actor.id,
          reported_participant_id: reportedParticipantId || null,
          case_type: caseType,
          description: description.trim(),
          recommended_action: recommendedAction || null,
          status: "pending",
          assigned_moderator_id: actor.role === "competition_moderator" ? actor.id : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      await logCompetitionAuditEvent({
        action: "moderation_case_created",
        resourceType: "competition_moderation_cases",
        resourceId: newCase.id,
        actorId: actor.id,
        actorEmail: actor.email,
        details: { caseType, competitionId, questionId },
      });

      return NextResponse.json({ case: newCase }, { status: 201 });
    } else if (action === "resolve_case") {
      const { caseId, resolution, notes } = body; // resolution: 'approved_by_admin' | 'rejected_by_admin' | 'resolved'
      if (!caseId || !resolution) {
        return NextResponse.json({ error: "caseId and resolution are required" }, { status: 400 });
      }

      const { data: modCase } = await supabase
        .from("competition_moderation_cases")
        .select("*")
        .eq("id", caseId)
        .maybeSingle();

      if (!modCase) return NextResponse.json({ error: "Moderation case not found" }, { status: 404 });

      // Separation of duties enforcement:
      if (modCase.case_type === "score_dispute" || modCase.case_type === "cheating_misconduct") {
        const canApprove = canApproveResultCorrection(actor, modCase.reporter_id);
        if (!canApprove.allowed) {
          return NextResponse.json({ error: canApprove.reason || "Forbidden" }, { status: 403 });
        }
      }

      const { data: updatedCase, error: updateErr } = await supabase
        .from("competition_moderation_cases")
        .update({
          status: resolution,
          resolved_by_admin_id: actor.id,
          resolution_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      await logCompetitionAuditEvent({
        action: "moderation_case_resolved",
        resourceType: "competition_moderation_cases",
        resourceId: caseId,
        actorId: actor.id,
        actorEmail: actor.email,
        details: { caseType: modCase.case_type, resolution, notes },
      });

      return NextResponse.json({ case: updatedCase });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error handling moderation case";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
