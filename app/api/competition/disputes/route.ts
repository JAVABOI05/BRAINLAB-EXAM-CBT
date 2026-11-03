import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const adminRole = await resolveAdminRole(user.id);
    const searchParams = req.nextUrl.searchParams;
    const matchId = searchParams.get("match_id");

    let query = supabase
      .from("competition_disputes")
      .select(`
        *,
        match:competition_matches(id, match_type, status, score_a, score_b, winner_id)
      `)
      .order("created_at", { ascending: false });

    if (matchId) {
      query = query.eq("match_id", matchId);
    } else if (!adminRole) {
      query = query.eq("raised_by", user.id);
    }

    const { data: disputes, error } = await query.limit(50);
    if (error) throw error;

    return NextResponse.json({ disputes: disputes || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing disputes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Sign in to raise a dispute." }, { status: 401 });
    }

    const body = await req.json();
    const { match_id, reason, evidence_notes } = body;

    if (!match_id || !reason) {
      return NextResponse.json({ error: "Missing match_id or reason" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: dispute, error } = await supabase
      .from("competition_disputes")
      .insert({
        match_id,
        raised_by: user.id,
        reason: reason.trim(),
        evidence_notes: evidence_notes?.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Update match status to 'disputed' if currently completed
    await supabase
      .from("competition_matches")
      .update({ status: "disputed" })
      .eq("id", match_id);

    return NextResponse.json({ ok: true, dispute }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error raising dispute";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminRole = await resolveAdminRole(user.id);
    if (!adminRole) {
      return NextResponse.json({ error: "Only admins or moderators can resolve disputes" }, { status: 403 });
    }

    const body = await req.json();
    const { dispute_id, status, resolution_notes } = body; // 'resolved' | 'dismissed'

    if (!dispute_id || !status) {
      return NextResponse.json({ error: "Missing dispute_id or status" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: updated, error } = await supabase
      .from("competition_disputes")
      .update({
        status,
        resolution_notes: resolution_notes?.trim() || null,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", dispute_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, dispute: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating dispute";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
