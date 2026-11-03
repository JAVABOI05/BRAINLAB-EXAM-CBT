import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // Fetch active matches that are in progress
    const { data: matches, error } = await supabase
      .from("competition_matches")
      .select(`
        id, match_type, status, score_a, score_b,
        participant_a_id, participant_b_id,
        duration_seconds, started_at, spectator_delay_seconds, metadata
      `)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    // Fetch spectator counts
    const matchIds = matches?.map((m) => m.id) || [];
    const countsMap: Record<string, number> = {};

    if (matchIds.length > 0) {
      const { data: sessions } = await supabase
        .from("competition_spectator_sessions")
        .select("match_id")
        .in("match_id", matchIds)
        .is("left_at", null);

      if (sessions) {
        sessions.forEach((s) => {
          countsMap[s.match_id] = (countsMap[s.match_id] || 0) + 1;
        });
      }
    }

    const liveMatches = (matches || []).map((m) => ({
      ...m,
      spectators_count: countsMap[m.id] || 0,
    }));

    return NextResponse.json({ matches: liveMatches });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing spectator matches";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { match_id, action = "join" } = body;

    if (!match_id) {
      return NextResponse.json({ error: "Missing match_id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    if (action === "join") {
      const { data: session, error } = await supabase
        .from("competition_spectator_sessions")
        .insert({
          match_id,
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, session_id: session.id });
    }

    if (action === "react") {
      const { session_id } = body;
      if (session_id) {
        await supabase
          .from("competition_spectator_sessions")
          .update({
            reactions_count: supabase.rpc("increment_spectator_reaction"),
          })
          .eq("id", session_id);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error with spectator action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
