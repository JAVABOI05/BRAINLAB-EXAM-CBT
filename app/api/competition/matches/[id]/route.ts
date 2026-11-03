import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

interface MatchParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: MatchParams) {
  try {
    const { id: matchId } = await params;
    const user = await getUserFromRequest(req);
    const supabase = getSupabaseServerClient();
    const searchParams = req.nextUrl.searchParams;
    const isSpectator = searchParams.get("spectator") === "true";

    // Fetch match
    const { data: match, error: matchErr } = await supabase
      .from("competition_matches")
      .select(`
        id, competition_id, round_id, match_number, match_type, status,
        participant_a_id, participant_b_id, team_a_id, team_b_id,
        score_a, score_b, winner_id, winner_team_id,
        duration_seconds, started_at, ended_at, paused_at,
        remaining_seconds_at_pause, spectator_delay_seconds,
        questions_snapshot, metadata, created_at
      `)
      .eq("id", matchId)
      .single();

    if (matchErr || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Fetch participants
    const { data: participants, error: partErr } = await supabase
      .from("competition_match_participants")
      .select("*")
      .eq("match_id", matchId);

    if (partErr) throw partErr;

    // Fetch profiles for participants
    const userIds = participants?.map((p) => p.user_id) || [];
    let profilesMap: Record<string, { full_name?: string; username?: string; avatar_url?: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", userIds);

      if (profiles) {
        profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
      }
    }

    // Enriched participants
    const enrichedParticipants = (participants || []).map((p) => ({
      ...p,
      profile: profilesMap[p.user_id] || { full_name: p.display_name },
    }));

    // Calculate server authoritative remaining time
    let remainingSeconds = match.duration_seconds;
    if (match.status === "in_progress" && match.started_at) {
      const elapsed = Math.floor((Date.now() - new Date(match.started_at).getTime()) / 1000);
      remainingSeconds = Math.max(0, match.duration_seconds - elapsed);
    } else if (match.status === "paused" && match.remaining_seconds_at_pause !== null) {
      remainingSeconds = match.remaining_seconds_at_pause;
    } else if (match.status === "completed") {
      remainingSeconds = 0;
    }

    // If user is a player in this match, fetch their submitted answers
    let myAnswers: Record<string, string> = {};
    if (user) {
      const myParticipant = participants?.find((p) => p.user_id === user.id);
      if (myParticipant) {
        const { data: ans } = await supabase
          .from("competition_match_answers")
          .select("question_id, selected_option, is_correct, points_awarded")
          .eq("match_id", matchId)
          .eq("participant_id", myParticipant.id);

        if (ans) {
          myAnswers = Object.fromEntries(ans.map((a) => [a.question_id, a.selected_option]));
        }
      }
    }

    return NextResponse.json({
      match: {
        ...match,
        remaining_seconds: remainingSeconds,
      },
      participants: enrichedParticipants,
      my_answers: myAnswers,
      current_user_id: user?.id || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error loading match";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: MatchParams) {
  try {
    const { id: matchId } = await params;
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;
    const supabase = getSupabaseServerClient();

    // Fetch match
    const { data: match, error: matchErr } = await supabase
      .from("competition_matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchErr || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Fetch participant
    const { data: myParticipant, error: partErr } = await supabase
      .from("competition_match_participants")
      .select("*")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .maybeSingle();

    // ACTION: HEARTBEAT
    if (action === "heartbeat") {
      if (myParticipant) {
        await supabase
          .from("competition_match_participants")
          .update({
            last_heartbeat: new Date().toISOString(),
            connected: true,
            ping_ms: Math.min(Math.max(Number(body.ping_ms) || 0, 1), 999),
          })
          .eq("id", myParticipant.id);
      }
      return NextResponse.json({ ok: true });
    }

    // ACTION: TOGGLE READY
    if (action === "toggle_ready") {
      if (!myParticipant) {
        return NextResponse.json({ error: "You are not a participant in this match" }, { status: 403 });
      }

      if (match.status !== "lobby" && match.status !== "waiting") {
        return NextResponse.json({ error: "Match is already started or completed" }, { status: 400 });
      }

      const nextReady = !myParticipant.is_ready;
      await supabase
        .from("competition_match_participants")
        .update({ is_ready: nextReady })
        .eq("id", myParticipant.id);

      // Check if both participants are ready
      const { data: allParts } = await supabase
        .from("competition_match_participants")
        .select("id, is_ready, user_id")
        .eq("match_id", matchId);

      const allReady = allParts && allParts.length >= 2 && allParts.every((p) => p.is_ready || p.id === myParticipant.id && nextReady);

      if (allReady) {
        // Start the match!
        const now = new Date().toISOString();
        await supabase
          .from("competition_matches")
          .update({
            status: "in_progress",
            started_at: now,
          })
          .eq("id", matchId);

        return NextResponse.json({
          ok: true,
          match_status: "in_progress",
          started_at: now,
          message: "All players ready! Match started.",
        });
      }

      return NextResponse.json({
        ok: true,
        match_status: "lobby",
        is_ready: nextReady,
      });
    }

    // ACTION: SUBMIT ANSWER
    if (action === "submit_answer") {
      if (!myParticipant) {
        return NextResponse.json({ error: "You are not a participant in this match" }, { status: 403 });
      }

      if (match.status !== "in_progress") {
        return NextResponse.json({ error: `Cannot submit answer. Match status is ${match.status}.` }, { status: 400 });
      }

      // Check if elapsed time has exceeded duration + 5s grace period
      if (match.started_at) {
        const elapsed = (Date.now() - new Date(match.started_at).getTime()) / 1000;
        if (elapsed > match.duration_seconds + 5) {
          // Finalize match as time expired
          await finalizeMatch(matchId, supabase);
          return NextResponse.json({ error: "Time expired for this match" }, { status: 400 });
        }
      }

      const { question_id, selected_option, time_taken_seconds = 0 } = body;
      if (!question_id || !selected_option) {
        return NextResponse.json({ error: "Missing question_id or selected_option" }, { status: 400 });
      }

      // Check if already answered
      const { data: existingAns } = await supabase
        .from("competition_match_answers")
        .select("id")
        .eq("match_id", matchId)
        .eq("participant_id", myParticipant.id)
        .eq("question_id", String(question_id))
        .maybeSingle();

      if (existingAns) {
        return NextResponse.json({ error: "Question already answered" }, { status: 400 });
      }

      // Validate against server answer_keys_snapshot
      const answerKeys: Record<string, string> = match.answer_keys_snapshot || {};
      const correctAnswer = String(answerKeys[String(question_id)] || "").trim().toUpperCase();
      const studentAnswer = String(selected_option).trim().toUpperCase();
      const isCorrect = correctAnswer.length > 0 && correctAnswer === studentAnswer;

      // Scoring calculation: 10 base points + speed bonus (up to 5 points for under 6 seconds)
      let pointsAwarded = 0;
      if (isCorrect) {
        const basePoints = 10;
        const timeTaken = Math.max(Number(time_taken_seconds) || 0, 0);
        let speedBonus = 0;
        if (timeTaken <= 3) speedBonus = 5;
        else if (timeTaken <= 6) speedBonus = 3;
        else if (timeTaken <= 10) speedBonus = 1;
        pointsAwarded = basePoints + speedBonus;
      }

      // Insert answer
      await supabase.from("competition_match_answers").insert({
        match_id: matchId,
        participant_id: myParticipant.id,
        user_id: user.id,
        question_id: String(question_id),
        selected_option: studentAnswer,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        time_taken_seconds: Number(time_taken_seconds) || 0,
      });

      // Update participant score & progress
      const newScore = (Number(myParticipant.score) || 0) + pointsAwarded;
      const nextIndex = (myParticipant.current_question_index || 0) + 1;
      const totalTime = (Number(myParticipant.total_time_spent_seconds) || 0) + (Number(time_taken_seconds) || 0);

      await supabase
        .from("competition_match_participants")
        .update({
          score: newScore,
          current_question_index: nextIndex,
          total_time_spent_seconds: totalTime,
        })
        .eq("id", myParticipant.id);

      // Update match score_a or score_b
      const isPlayerA = match.participant_a_id === user.id;
      if (isPlayerA) {
        await supabase
          .from("competition_matches")
          .update({ score_a: newScore })
          .eq("id", matchId);
      } else {
        await supabase
          .from("competition_matches")
          .update({ score_b: newScore })
          .eq("id", matchId);
      }

      // Check if both players have answered all questions
      const totalQuestionsCount = Array.isArray(match.questions_snapshot) ? match.questions_snapshot.length : 10;
      const { data: allParts } = await supabase
        .from("competition_match_participants")
        .select("id, current_question_index, user_id, score")
        .eq("match_id", matchId);

      const allFinished = allParts && allParts.length >= 2 && allParts.every((p) => p.current_question_index >= totalQuestionsCount);

      if (allFinished) {
        await finalizeMatch(matchId, supabase);
      }

      return NextResponse.json({
        ok: true,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        current_score: newScore,
        next_question_index: nextIndex,
      });
    }

    // ACTION: FINISH EARLY (Player submitted all answers)
    if (action === "finish") {
      if (myParticipant) {
        const totalQuestionsCount = Array.isArray(match.questions_snapshot) ? match.questions_snapshot.length : 10;
        await supabase
          .from("competition_match_participants")
          .update({ current_question_index: totalQuestionsCount })
          .eq("id", myParticipant.id);

        const { data: allParts } = await supabase
          .from("competition_match_participants")
          .select("id, current_question_index")
          .eq("match_id", matchId);

        const allDone = allParts && allParts.every((p) => p.current_question_index >= totalQuestionsCount);
        if (allDone) {
          await finalizeMatch(matchId, supabase);
        }
      }
      return NextResponse.json({ ok: true, message: "Finished match submission" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error processing match action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Server-authoritative match finalization with Elo & XP calculations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function finalizeMatch(matchId: string, supabase: any) {
  const { data: match } = await supabase
    .from("competition_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!match || match.status === "completed") return;

  const { data: participants } = await supabase
    .from("competition_match_participants")
    .select("*")
    .eq("match_id", matchId);

  if (!participants || participants.length < 2) {
    await supabase
      .from("competition_matches")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", matchId);
    return;
  }

  const pA = participants.find((p: { user_id: string }) => p.user_id === match.participant_a_id) || participants[0];
  const pB = participants.find((p: { user_id: string }) => p.user_id === match.participant_b_id) || participants[1];

  const scoreA = Number(pA.score) || 0;
  const scoreB = Number(pB.score) || 0;

  let winnerId: string | null = null;
  let actualScoreA = 0.5; // draw
  let actualScoreB = 0.5;

  if (scoreA > scoreB) {
    winnerId = pA.user_id;
    actualScoreA = 1.0;
    actualScoreB = 0.0;
  } else if (scoreB > scoreA) {
    winnerId = pB.user_id;
    actualScoreA = 0.0;
    actualScoreB = 1.0;
  }

  // Update match record
  await supabase
    .from("competition_matches")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      score_a: scoreA,
      score_b: scoreB,
      winner_id: winnerId,
    })
    .eq("id", matchId);

  // Fetch or initialize ratings for both players
  const { data: ratingA } = await supabase
    .from("competition_ratings")
    .select("*")
    .eq("user_id", pA.user_id)
    .maybeSingle();

  const { data: ratingB } = await supabase
    .from("competition_ratings")
    .select("*")
    .eq("user_id", pB.user_id)
    .maybeSingle();

  const currentEloA = ratingA?.elo_rating || 1200;
  const currentEloB = ratingB?.elo_rating || 1200;

  // Calculate Elo deltas
  const { data: deltaA } = await supabase.rpc("calculate_elo_delta", {
    player_rating: currentEloA,
    opponent_rating: currentEloB,
    actual_score: actualScoreA,
    k_factor: 32,
  });

  const { data: deltaB } = await supabase.rpc("calculate_elo_delta", {
    player_rating: currentEloB,
    opponent_rating: currentEloA,
    actual_score: actualScoreB,
    k_factor: 32,
  });

  const newEloA = Math.max(100, currentEloA + (Number(deltaA) || 0));
  const newEloB = Math.max(100, currentEloB + (Number(deltaB) || 0));

  const tierFromElo = (elo: number) => {
    if (elo >= 2200) return "Grandmaster";
    if (elo >= 1900) return "Master";
    if (elo >= 1650) return "Diamond";
    if (elo >= 1450) return "Platinum";
    if (elo >= 1300) return "Gold";
    if (elo >= 1150) return "Silver";
    return "Bronze";
  };

  // Upsert Player A rating
  await supabase.from("competition_ratings").upsert({
    user_id: pA.user_id,
    elo_rating: newEloA,
    peak_elo: Math.max(ratingA?.peak_elo || 1200, newEloA),
    matches_played: (ratingA?.matches_played || 0) + 1,
    matches_won: (ratingA?.matches_won || 0) + (actualScoreA === 1.0 ? 1 : 0),
    matches_drawn: (ratingA?.matches_drawn || 0) + (actualScoreA === 0.5 ? 1 : 0),
    matches_lost: (ratingA?.matches_lost || 0) + (actualScoreA === 0.0 ? 1 : 0),
    win_streak: actualScoreA === 1.0 ? (ratingA?.win_streak || 0) + 1 : 0,
    best_streak: Math.max(ratingA?.best_streak || 0, actualScoreA === 1.0 ? (ratingA?.win_streak || 0) + 1 : 0),
    tier: tierFromElo(newEloA),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  // Upsert Player B rating
  await supabase.from("competition_ratings").upsert({
    user_id: pB.user_id,
    elo_rating: newEloB,
    peak_elo: Math.max(ratingB?.peak_elo || 1200, newEloB),
    matches_played: (ratingB?.matches_played || 0) + 1,
    matches_won: (ratingB?.matches_won || 0) + (actualScoreB === 1.0 ? 1 : 0),
    matches_drawn: (ratingB?.matches_drawn || 0) + (actualScoreB === 0.5 ? 1 : 0),
    matches_lost: (ratingB?.matches_lost || 0) + (actualScoreB === 0.0 ? 1 : 0),
    win_streak: actualScoreB === 1.0 ? (ratingB?.win_streak || 0) + 1 : 0,
    best_streak: Math.max(ratingB?.best_streak || 0, actualScoreB === 1.0 ? (ratingB?.win_streak || 0) + 1 : 0),
    tier: tierFromElo(newEloB),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  // Award XP to gamification ledger
  const xpWin = 50;
  const xpParticipation = 20;

  const xpA = actualScoreA === 1.0 ? xpWin : xpParticipation;
  const xpB = actualScoreB === 1.0 ? xpWin : xpParticipation;

  await supabase.from("user_xp_ledger").insert([
    {
      user_id: pA.user_id,
      amount: xpA,
      activity_type: "competition_match",
      source_id: matchId,
      description: actualScoreA === 1.0 ? "Arena Match Victory!" : "Arena Match Participation",
    },
    {
      user_id: pB.user_id,
      amount: xpB,
      activity_type: "competition_match",
      source_id: matchId,
      description: actualScoreB === 1.0 ? "Arena Match Victory!" : "Arena Match Participation",
    },
  ]);
}
