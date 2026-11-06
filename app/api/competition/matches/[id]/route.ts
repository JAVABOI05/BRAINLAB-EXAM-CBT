import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

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

    // Load competition visibility/reveal policy before exposing any match payload.
    let competition: Record<string, unknown> | null = null;
    if (match.competition_id) {
      const { data: competitionRow, error: competitionError } = await supabase
        .from("competitions")
        .select("id, visibility, allow_spectators, spectator_questions_visible, spectator_scoreboard_visible, results_visibility, answer_reveal_mode, status")
        .eq("id", match.competition_id)
        .maybeSingle();
      if (competitionError) throw competitionError;
      competition = competitionRow;
    }

    // Fetch participants
    const { data: participants, error: partErr } = await supabase
      .from("competition_match_participants")
      .select("*")
      .eq("match_id", matchId);

    if (partErr) throw partErr;

    const isParticipant = Boolean(user && participants?.some((participant) => participant.user_id === user.id));
    const adminRole = user ? await resolveAdminRole(user.id) : null;
    const isAdmin = ["super_admin", "platform_admin", "competition_admin", "competition_moderator"].includes(adminRole || "");
    if (!isParticipant && !isAdmin) {
      if (!isSpectator || !competition || competition.visibility !== "public" || competition.allow_spectators !== true) {
        return NextResponse.json({ error: "You are not authorised to view this match. Spectator access is not enabled for this event." }, { status: 403 });
      }
    }

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

    // Apply result visibility before returning participant scores.
    const resultsVisibility = String(competition?.results_visibility || match.metadata?.results_visibility || "after_completion");
    const canSeeScores = isAdmin || (isSpectator
      ? competition?.spectator_scoreboard_visible === true &&
        (resultsVisibility === "public" || (resultsVisibility === "after_completion" && match.status === "completed"))
      : resultsVisibility === "public" ||
        (isParticipant && resultsVisibility === "participants") ||
        (isParticipant && resultsVisibility === "after_completion" && match.status === "completed"));

    // Enriched participants. Hidden results are not sent to the browser.
    const enrichedParticipants = (participants || []).map((p) => ({
      ...p,
      score: canSeeScores ? p.score : null,
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
          .select("question_id, selected_option")
          .eq("match_id", matchId)
          .eq("participant_id", myParticipant.id);

        if (ans) {
          myAnswers = Object.fromEntries(ans.map((a) => [a.question_id, a.selected_option]));
        }
      }
    }

    const revealMode = String(competition?.answer_reveal_mode || match.metadata?.answer_reveal_mode || "after_match");
    const competitionCompleted = competition?.status === "concluded";
    const safeQuestions = isSpectator && competition?.spectator_questions_visible !== true
      ? []
      : (Array.isArray(match.questions_snapshot) ? match.questions_snapshot : []).map((item: Record<string, unknown>) => {
      const questionId = String(item.id ?? item.question_id ?? "");
      const questionWasAnswered = Boolean(myAnswers[questionId]);
      const canRevealThisQuestion = isAdmin ||
        (revealMode === "after_question" && isParticipant && questionWasAnswered) ||
        (revealMode === "after_match" && match.status === "completed") ||
        (revealMode === "after_round" && match.status === "completed") ||
        (revealMode === "after_competition" && competitionCompleted);

      const safeItem = { ...item };
      if (!canRevealThisQuestion || revealMode === "never") {
        delete safeItem.correct_answer;
        delete safeItem.answer;
        delete safeItem.explanation;
      }
      return safeItem;
    });

    const safeMatch = {
      ...match,
      score_a: canSeeScores ? match.score_a : null,
      score_b: canSeeScores ? match.score_b : null,
      questions_snapshot: safeQuestions,
      remaining_seconds: remainingSeconds,
    };

    return NextResponse.json({
      match: safeMatch,
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

    const { data: globalControls } = await supabase
      .from("competition_emergency_controls")
      .select("is_paused, maintenance_mode")
      .eq("scope", "global")
      .eq("target_id", "all")
      .maybeSingle();
    const { data: matchControls } = await supabase
      .from("competition_emergency_controls")
      .select("is_paused, maintenance_mode")
      .eq("scope", "match")
      .eq("target_id", matchId)
      .maybeSingle();
    if (action !== "heartbeat" &&
        (globalControls?.is_paused || globalControls?.maintenance_mode ||
         matchControls?.is_paused || matchControls?.maintenance_mode)) {
      return NextResponse.json({ error: "This match is temporarily paused by Arena administration." }, { status: 423 });
    }

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

      const { question_id, selected_option } = body;
      if (!question_id || !selected_option) {
        return NextResponse.json({ error: "Missing question_id or selected_option" }, { status: 400 });
      }

      const snapshotQuestions: Record<string, unknown>[] = Array.isArray(match.questions_snapshot)
        ? match.questions_snapshot
        : [];
      const snapshotQuestion = snapshotQuestions.find(
        (item) => String(item.id ?? item.question_id ?? "") === String(question_id)
      );
      if (!snapshotQuestion) {
        return NextResponse.json({ error: "Question does not belong to this match" }, { status: 403 });
      }

      const studentAnswer = String(selected_option).trim().toUpperCase();
      if (!["A", "B", "C", "D", "E"].includes(studentAnswer)) {
        return NextResponse.json({ error: "Invalid answer option" }, { status: 400 });
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
      const isCorrect = correctAnswer.length > 0 && correctAnswer === studentAnswer;

      // Time is measured from the server's match clock. Ignore any timing value
      // supplied by the browser so clients cannot manufacture speed bonuses.
      if (!match.started_at) {
        return NextResponse.json({ error: "Match clock has not started" }, { status: 409 });
      }
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(match.started_at).getTime()) / 1000));
      const previousTime = Math.max(0, Math.floor(Number(myParticipant.total_time_spent_seconds) || 0));
      const timeTaken = Math.max(0, Math.min(Number(match.duration_seconds) || 0, elapsedSeconds - previousTime));

      // Use the marks frozen into this match's question snapshot. No client-side
      // score or timing input is trusted.
      const configuredMarks = Number(snapshotQuestion.marks);
      const basePoints = Number.isFinite(configuredMarks) && configuredMarks > 0 ? configuredMarks : 10;
      const pointsAwarded = isCorrect ? basePoints : 0;

      // One database transaction inserts the answer and atomically advances the
      // participant and match scores. Duplicate submissions roll back completely.
      const { data: progressRows, error: progressError } = await supabase.rpc("record_competition_match_answer", {
        p_match_id: matchId,
        p_participant_id: myParticipant.id,
        p_user_id: user.id,
        p_question_id: String(question_id),
        p_selected_option: studentAnswer,
        p_is_correct: isCorrect,
        p_points_awarded: pointsAwarded,
        p_time_taken_seconds: timeTaken,
      });
      if (progressError) {
        if (progressError.code === "23505") {
          return NextResponse.json({ error: "Question already answered" }, { status: 409 });
        }
        if (progressError.message?.includes("Match is not accepting answers")) {
          return NextResponse.json({ error: progressError.message }, { status: 409 });
        }
        throw progressError;
      }
      const progress = Array.isArray(progressRows) ? progressRows[0] : progressRows;
      const nextIndex = Number(progress?.current_question_index) || 0;

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
        submitted: true,
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

  // Claim finalisation exactly once. Concurrent finish/timeout requests cannot
  // both proceed to award rating changes or XP.
  const { data: completionClaim, error: completionClaimError } = await supabase
    .from("competition_matches")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      score_a: scoreA,
      score_b: scoreB,
      winner_id: winnerId,
    })
    .eq("id", matchId)
    .neq("status", "completed")
    .select("id")
    .maybeSingle();
  if (completionClaimError) throw completionClaimError;
  if (!completionClaim) return;

  // Friendly matches contribute experience but never change competitive rating.
  const isRankedMatch = match.metadata?.match_mode !== "friendly" && match.metadata?.ranked !== false;
  if (isRankedMatch) {
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

    // Preserve durable individual rating history for audit and season views.
    await supabase.from("competition_rating_history").insert([
      {
        user_id: pA.user_id,
        match_id: matchId,
        rating_kind: "individual",
        rating_before: currentEloA,
        rating_after: newEloA,
        rating_delta: newEloA - currentEloA,
        reason: "verified_ranked_match",
      },
      {
        user_id: pB.user_id,
        match_id: matchId,
        rating_kind: "individual",
        rating_before: currentEloB,
        rating_after: newEloB,
        rating_delta: newEloB - currentEloB,
        reason: "verified_ranked_match",
      },
    ]);
  }

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
