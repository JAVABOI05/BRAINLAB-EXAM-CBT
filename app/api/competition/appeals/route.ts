import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

const REVIEW_ROLES = new Set(["super_admin", "platform_admin", "competition_admin", "competition_moderator"]);

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to view appeals." }, { status: 401 });

    const role = await resolveAdminRole(user.id);
    const isReviewer = REVIEW_ROLES.has(role || "");
    const supabase = getSupabaseServerClient();
    let query = supabase.from("competition_appeals").select("*").order("submitted_at", { ascending: false }).limit(100);
    if (!isReviewer) query = query.eq("submitted_by", user.id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ appeals: data || [], can_review: isReviewer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load appeals." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in before submitting an appeal." }, { status: 401 });

    const body = await req.json();
    const matchId = typeof body.match_id === "string" ? body.match_id : "";
    const reason = typeof body.appeal_reason === "string" ? body.appeal_reason.trim() : "";
    const disputeId = typeof body.dispute_id === "string" && body.dispute_id ? body.dispute_id : null;
    const evidence = Array.isArray(body.evidence) ? body.evidence.slice(0, 10) : [];

    if (!matchId || reason.length < 20 || reason.length > 5000) {
      return NextResponse.json({ error: "Provide a match ID and an appeal explanation of 20–5,000 characters." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: match, error: matchError } = await supabase
      .from("competition_matches")
      .select("id, competition_id, status, participant_a_id, participant_b_id")
      .eq("id", matchId)
      .maybeSingle();
    if (matchError) throw matchError;
    if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });

    const { data: participant, error: participantError } = await supabase
      .from("competition_match_participants")
      .select("id")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (participantError) throw participantError;

    const isPlayer = Boolean(participant || match.participant_a_id === user.id || match.participant_b_id === user.id);
    if (!isPlayer) return NextResponse.json({ error: "Only a participant in this match may appeal its result." }, { status: 403 });
    if (!["completed", "disputed"].includes(match.status)) {
      return NextResponse.json({ error: "An appeal can only be submitted after a match result has been recorded." }, { status: 409 });
    }

    if (disputeId) {
      const { data: dispute, error: disputeError } = await supabase
        .from("competition_disputes")
        .select("id, match_id, raised_by")
        .eq("id", disputeId)
        .maybeSingle();
      if (disputeError) throw disputeError;
      if (!dispute || dispute.match_id !== matchId || dispute.raised_by !== user.id) {
        return NextResponse.json({ error: "The linked dispute does not belong to you or this match." }, { status: 403 });
      }
    }

    const { data: existing, error: existingError } = await supabase
      .from("competition_appeals")
      .select("id")
      .eq("match_id", matchId)
      .eq("submitted_by", user.id)
      .in("status", ["submitted", "under_review"])
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ error: "You already have an active appeal for this match." }, { status: 409 });

    const { data: appeal, error } = await supabase
      .from("competition_appeals")
      .insert({
        dispute_id: disputeId,
        match_id: matchId,
        competition_id: match.competition_id,
        submitted_by: user.id,
        appeal_reason: reason,
        evidence,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, appeal }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit appeal." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const role = await resolveAdminRole(user.id);
    if (!REVIEW_ROLES.has(role || "")) {
      return NextResponse.json({ error: "Only an authorised Arena reviewer may process appeals." }, { status: 403 });
    }

    const body = await req.json();
    const appealId = typeof body.appeal_id === "string" ? body.appeal_id : "";
    const status = body.status;
    const decisionReason = typeof body.decision_reason === "string" ? body.decision_reason.trim() : "";
    if (!appealId || !["under_review", "upheld", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid appeal or decision status." }, { status: 400 });
    }
    if ((status === "upheld" || status === "rejected") && decisionReason.length < 10) {
      return NextResponse.json({ error: "A decision explanation of at least 10 characters is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: appeal, error: appealError } = await supabase
      .from("competition_appeals")
      .select("id, submitted_by, status")
      .eq("id", appealId)
      .maybeSingle();
    if (appealError) throw appealError;
    if (!appeal) return NextResponse.json({ error: "Appeal not found." }, { status: 404 });
    if (appeal.submitted_by === user.id) {
      return NextResponse.json({ error: "You cannot review or decide your own appeal." }, { status: 403 });
    }
    if (["upheld", "rejected", "withdrawn"].includes(appeal.status)) {
      return NextResponse.json({ error: "This appeal already has a final outcome." }, { status: 409 });
    }

    const finalDecision = status === "upheld" || status === "rejected";
    const { data: updated, error } = await supabase
      .from("competition_appeals")
      .update({
        status,
        assigned_to: user.id,
        decision: finalDecision ? status : null,
        decision_reason: finalDecision ? decisionReason : null,
        decided_by: finalDecision ? user.id : null,
        decided_at: finalDecision ? new Date().toISOString() : null,
      })
      .eq("id", appealId)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, appeal: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update appeal." }, { status: 500 });
  }
}
