import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  CompetitionActor,
  canApproveRewardProposal,
  logCompetitionAuditEvent,
} from "@/app/lib/competitionRbac";

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

export async function GET(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data: proposals, error } = await supabase
      .from("competition_reward_proposals")
      .select("*, competitions(title)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ proposals: proposals || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing reward proposals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action = "propose" } = body;
    const supabase = getSupabaseServerClient();

    if (action === "propose") {
      const { competitionId, recipientId, rewardType, amountOrDetails, notes } = body;

      if (!competitionId || !recipientId || !rewardType) {
        return NextResponse.json({ error: "competitionId, recipientId, and rewardType are required" }, { status: 400 });
      }

      const { data: proposal, error: insertErr } = await supabase
        .from("competition_reward_proposals")
        .insert({
          competition_id: competitionId,
          recipient_id: recipientId,
          reward_type: rewardType,
          amount_or_details: amountOrDetails || {},
          notes: notes || null,
          proposed_by: actor.id,
          status: "proposed",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      await logCompetitionAuditEvent({
        action: "reward_proposed",
        resourceType: "competition_reward_proposals",
        resourceId: proposal.id,
        actorId: actor.id,
        actorEmail: actor.email,
        details: { competitionId, recipientId, rewardType, amountOrDetails },
      });

      return NextResponse.json({ proposal }, { status: 201 });
    } else if (action === "approve") {
      const { proposalId, decision = "approved", notes } = body; // 'approved' | 'rejected'
      if (!proposalId) return NextResponse.json({ error: "proposalId is required" }, { status: 400 });

      const { data: proposal } = await supabase
        .from("competition_reward_proposals")
        .select("*")
        .eq("id", proposalId)
        .maybeSingle();

      if (!proposal) return NextResponse.json({ error: "Reward proposal not found" }, { status: 404 });

      // Enforce separation of duties: proposer cannot self-approve!
      const xpAmount = typeof proposal.amount_or_details?.xp === "number" ? proposal.amount_or_details.xp : undefined;
      const canApprove = canApproveRewardProposal(actor, {
        proposed_by: proposal.proposed_by,
        amount: xpAmount,
      });

      if (!canApprove.allowed) {
        return NextResponse.json({ error: canApprove.reason || "Forbidden" }, { status: 403 });
      }

      const { data: updatedProposal, error: updateErr } = await supabase
        .from("competition_reward_proposals")
        .update({
          status: decision === "approved" ? "approved" : "rejected",
          approved_by: actor.id,
          notes: notes || proposal.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposalId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      await logCompetitionAuditEvent({
        action: `reward_${decision}`,
        resourceType: "competition_reward_proposals",
        resourceId: proposalId,
        actorId: actor.id,
        actorEmail: actor.email,
        details: { decision, notes },
      });

      return NextResponse.json({ proposal: updatedProposal });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error handling reward";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
