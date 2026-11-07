import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const supabase = getSupabaseServerClient();
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") || "all"; // 'individual' | 'teams' | 'matches' | 'all'

    const responseData: Record<string, unknown> = {};

    // 1. INDIVIDUAL LEADERBOARD
    if (type === "all" || type === "individual") {
      const { data: individualRows, error: indErr } = await supabase
        .from("competition_ratings")
        .select(`
          user_id, elo_rating, peak_elo, matches_played, matches_won, matches_drawn, matches_lost,
          win_streak, best_streak, tier, updated_at
        `)
        .order("elo_rating", { ascending: false })
        .limit(50);

      if (indErr) throw indErr;

      const userIds = individualRows?.map((r) => r.user_id) || [];
      let profilesMap: Record<string, { full_name?: string; username?: string; avatar_url?: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("competition_public_profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds)
          .eq("visibility", "public");

        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map((profile) => [profile.user_id, {
            full_name: profile.display_name,
            username: profile.display_name,
            avatar_url: profile.avatar_url || undefined,
          }]));
        }
      }

      const individualRanked = (individualRows || []).map((row, idx) => {
        const { user_id: _privateUserId, ...publicRating } = row;
        return {
          rank: idx + 1,
          ...publicRating,
          profile: profilesMap[row.user_id] || { full_name: "Private player" },
          is_me: Boolean(user && row.user_id === user.id),
          win_rate: row.matches_played > 0 ? Math.round((row.matches_won / row.matches_played) * 100) : 0,
        };
      });

      responseData.individuals = individualRanked;

      // Personal user rank
      if (user) {
        const myRankIndex = (individualRows || []).findIndex((row) => row.user_id === user.id);
        if (myRankIndex >= 0) {
          responseData.my_rank = individualRanked[myRankIndex];
        } else {
          const { data: myRating } = await supabase
            .from("competition_ratings")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (myRating) {
            responseData.my_rank = {
              rank: "50+",
              ...(({ user_id: _privateUserId, ...publicRating }) => publicRating)(myRating),
              win_rate: myRating.matches_played > 0 ? Math.round((myRating.matches_won / myRating.matches_played) * 100) : 0,
            };
          }
        }
      }
    }

    // 2. TEAMS LEADERBOARD
    if (type === "all" || type === "teams") {
      const { data: teamRows, error: teamErr } = await supabase
        .from("competition_teams")
        .select(`
          id, name, slug, motto, avatar_url, elo_rating,
          matches_played, matches_won, matches_drawn, matches_lost, total_xp
        `)
        .order("elo_rating", { ascending: false })
        .limit(50);

      if (teamErr) throw teamErr;

      responseData.teams = (teamRows || []).map((t, idx) => ({
        rank: idx + 1,
        ...t,
        win_rate: t.matches_played > 0 ? Math.round((t.matches_won / t.matches_played) * 100) : 0,
      }));
    }

    // 3. RECENT MATCHES
    if (type === "all" || type === "matches") {
      const { data: matches, error: mErr } = await supabase
        .from("competition_matches")
        .select(`
          id, match_type, status, score_a, score_b, winner_id,
          participant_a_id, participant_b_id, duration_seconds, started_at, ended_at, metadata
        `)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(20);

      if (mErr) throw mErr;

      responseData.recent_matches = (matches || []).map((match) => {
        const { winner_id: _winnerId, participant_a_id: _participantAId, participant_b_id: _participantBId, ...publicMatch } = match;
        return publicMatch;
      });
    }

    return NextResponse.json(responseData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching leaderboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
