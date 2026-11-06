import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { selectPassageSafeQuestions } from "@/app/lib/competitionEngine";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const supabase = getSupabaseServerClient();
    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get("filter") || "all"; // 'open', 'incoming', 'outgoing', 'my'

    let query = supabase
      .from("competition_challenges")
      .select(`
        *,
        match:competition_matches(id, status, score_a, score_b, winner_id)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter === "open") {
      query = query.is("challenged_id", null).eq("status", "pending");
    } else {
      if (!user) return NextResponse.json({ error: "Sign in to view your challenge centre." }, { status: 401 });
      if (filter === "incoming") {
        query = query.eq("challenged_id", user.id).eq("status", "pending");
      } else if (filter === "outgoing") {
        query = query.eq("challenger_id", user.id);
      } else {
        query = query.or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`);
      }
    }

    const { data: challenges, error } = await query;
    if (error) throw error;

    // Fetch user profiles for challenger and challenged display names
    const userIds = new Set<string>();
    challenges?.forEach((c) => {
      if (c.challenger_id) userIds.add(c.challenger_id);
      if (c.challenged_id) userIds.add(c.challenged_id);
    });

    let profilesMap: Record<string, { display_name?: string; avatar_url?: string }> = {};
    if (userIds.size > 0) {
      let profileQuery = supabase
        .from("competition_public_profiles")
        .select("user_id, display_name, avatar_url, visibility")
        .in("user_id", Array.from(userIds))
        .eq("visibility", "public");
      if (user) profileQuery = profileQuery.or(`visibility.eq.public,user_id.eq.${user.id}`);
      const { data: profiles } = await profileQuery;
      if (profiles) {
        profilesMap = Object.fromEntries(profiles.map((profile) => [profile.user_id, profile]));
      }
    }

    const enriched = (challenges || []).map((challenge) => {
      const isOutgoing = Boolean(user && challenge.challenger_id === user.id);
      const challengerProfile = profilesMap[challenge.challenger_id];
      const challengedProfile = challenge.challenged_id ? profilesMap[challenge.challenged_id] : null;
      const { challenger_id: _challengerId, challenged_id: _challengedId, match: privateMatch, ...safeChallenge } = challenge;
      const safeMatch = privateMatch ? {
        id: privateMatch.id,
        status: privateMatch.status,
        score_a: privateMatch.score_a,
        score_b: privateMatch.score_b,
        winner_is_me: Boolean(user && privateMatch.winner_id === user.id),
        has_winner: Boolean(privateMatch.winner_id),
      } : null;
      return {
        ...safeChallenge,
        match: safeMatch,
        is_outgoing: isOutgoing,
        challenger: { display_name: challengerProfile?.display_name || "Private player", avatar_url: challengerProfile?.avatar_url || null },
        challenged: challenge.challenged_id
          ? { display_name: challengedProfile?.display_name || "Private player", avatar_url: challengedProfile?.avatar_url || null }
          : null,
      };
    });

    return NextResponse.json({ challenges: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing challenges";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Sign in to issue challenges." }, { status: 401 });
    }

    const body = await req.json();
    const {
      challenged_slug = null,
      subject = "General",
      question_count = 10,
      duration_minutes = 5,
      difficulty = "medium",
      match_mode = "ranked",
    } = body;

    if (!["ranked", "friendly"].includes(match_mode)) {
      return NextResponse.json({ error: "Challenge mode must be ranked or friendly." }, { status: 400 });
    }
    if (!["easy", "medium", "hard", "mixed"].includes(difficulty)) {
      return NextResponse.json({ error: "Choose a valid challenge difficulty." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    let challenged_id: string | null = null;
    if (challenged_slug) {
      if (typeof challenged_slug !== "string" || challenged_slug.length > 100) {
        return NextResponse.json({ error: "Invalid public player profile." }, { status: 400 });
      }
      const { data: targetBySlug, error: targetBySlugError } = await supabase
        .from("competition_public_profiles")
        .select("user_id, challenge_availability, is_available")
        .eq("slug", challenged_slug)
        .eq("visibility", "public")
        .maybeSingle();
      if (targetBySlugError) throw targetBySlugError;
      if (!targetBySlug) return NextResponse.json({ error: "Public player profile not found." }, { status: 404 });
      challenged_id = targetBySlug.user_id;
      if (challenged_id === user.id) return NextResponse.json({ error: "You cannot challenge yourself." }, { status: 400 });
    }

    if (challenged_id) {
      const { data: targetProfile, error: targetProfileError } = await supabase
        .from("competition_public_profiles")
        .select("user_id, challenge_availability, is_available")
        .eq("user_id", challenged_id)
        .maybeSingle();
      if (targetProfileError) throw targetProfileError;
      if (targetProfile?.challenge_availability === "nobody") {
        return NextResponse.json({ error: "This player is not accepting direct challenges." }, { status: 403 });
      }
      if (targetProfile?.challenge_availability === "available_only" && !targetProfile.is_available) {
        return NextResponse.json({ error: "This player is currently unavailable for challenges." }, { status: 409 });
      }
      if (targetProfile?.challenge_availability === "approved_only") {
        const { data: connection } = await supabase
          .from("competition_player_connections")
          .select("id")
          .eq("user_id", challenged_id)
          .eq("connected_user_id", user.id)
          .eq("status", "approved")
          .maybeSingle();
        if (!connection) return NextResponse.json({ error: "This player accepts challenges only from approved connections." }, { status: 403 });
      }
    }

    // Check emergency controls
    const { data: emergency } = await supabase
      .from("competition_emergency_controls")
      .select("is_paused, maintenance_mode")
      .eq("scope", "global")
      .eq("target_id", "all")
      .maybeSingle();
    const { data: challengeEmergency } = await supabase
      .from("competition_emergency_controls")
      .select("is_paused, maintenance_mode")
      .eq("scope", "challenge")
      .eq("target_id", "all")
      .maybeSingle();

    if (emergency?.is_paused || emergency?.maintenance_mode || challengeEmergency?.is_paused || challengeEmergency?.maintenance_mode) {
      return NextResponse.json({ error: "Competition Arena is temporarily paused for maintenance." }, { status: 503 });
    }

    const { data: challenge, error } = await supabase
      .from("competition_challenges")
      .insert({
        challenger_id: user.id,
        challenged_id,
        subject,
        question_count: Math.min(Math.max(Number(question_count) || 10, 5), 30),
        duration_minutes: Math.min(Math.max(Number(duration_minutes) || 5, 2), 20),
        difficulty,
        match_mode,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // If direct challenge, send notification to challenged user
    if (challenged_id) {
      const { data: myProfile } = await supabase
        .from("competition_public_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const challengerName = myProfile?.display_name || "A BrainLab player";

      await supabase.from("notifications").insert({
        user_id: challenged_id,
        title: "⚔️ New 1v1 Arena Challenge!",
        message: `${challengerName} has challenged you to a ${subject} showdown (${challenge.question_count} questions)!`,
        type: "competition_challenge",
        metadata: { challenge_id: challenge.id, challenger_id: user.id, subject },
      });
    }

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        subject: challenge.subject,
        question_count: challenge.question_count,
        duration_minutes: challenge.duration_minutes,
        difficulty: challenge.difficulty,
        match_mode: challenge.match_mode,
        status: challenge.status,
        created_at: challenge.created_at,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating challenge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { challenge_id, action } = body; // action: 'accept' | 'decline' | 'cancel'

    if (!challenge_id || !action) {
      return NextResponse.json({ error: "Missing challenge_id or action" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Fetch challenge
    const { data: challenge, error: fetchErr } = await supabase
      .from("competition_challenges")
      .select("*")
      .eq("id", challenge_id)
      .single();

    if (fetchErr || !challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.status !== "pending") {
      if (action === "accept" && challenge.status === "accepted" && challenge.challenged_id === user.id && challenge.match_id) {
        return NextResponse.json({ ok: true, match_id: challenge.match_id, message: "Challenge already accepted. Rejoining the existing match." });
      }
      return NextResponse.json({ error: `Challenge is already ${challenge.status}` }, { status: 409 });
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await supabase.from("competition_challenges").update({ status: "expired" }).eq("id", challenge_id).eq("status", "pending");
      return NextResponse.json({ error: "This challenge has expired." }, { status: 410 });
    }

    // 1. CANCEL ACTION
    if (action === "cancel") {
      if (challenge.challenger_id !== user.id) {
        return NextResponse.json({ error: "Only the challenger can cancel this challenge" }, { status: 403 });
      }
      const { data: cancelled, error: cancelError } = await supabase
        .from("competition_challenges")
        .update({ status: "cancelled" })
        .eq("id", challenge_id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (cancelError) throw cancelError;
      if (!cancelled) return NextResponse.json({ error: "Challenge was already acted on." }, { status: 409 });
      return NextResponse.json({ ok: true, message: "Challenge cancelled" });
    }

    // 2. DECLINE ACTION
    if (action === "decline") {
      if (challenge.challenged_id && challenge.challenged_id !== user.id) {
        return NextResponse.json({ error: "Only the challenged student can decline this challenge" }, { status: 403 });
      }
      const { data: declined, error: declineError } = await supabase
        .from("competition_challenges")
        .update({ status: "declined" })
        .eq("id", challenge_id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (declineError) throw declineError;
      if (!declined) return NextResponse.json({ error: "Challenge was already acted on." }, { status: 409 });
      return NextResponse.json({ ok: true, message: "Challenge declined" });
    }

    // 3. ACCEPT ACTION -> INITIALIZE MATCH
    if (action === "accept") {
      if (challenge.challenger_id === user.id) {
        return NextResponse.json({ error: "You cannot accept your own challenge" }, { status: 400 });
      }
      if (challenge.challenged_id && challenge.challenged_id !== user.id) {
        return NextResponse.json({ error: "This challenge was issued to someone else" }, { status: 403 });
      }

      const acceptingUserId = user.id;

      const { data: globalEmergency } = await supabase
        .from("competition_emergency_controls")
        .select("is_paused, maintenance_mode")
        .eq("scope", "global")
        .eq("target_id", "all")
        .maybeSingle();
      const { data: challengeEmergency } = await supabase
        .from("competition_emergency_controls")
        .select("is_paused, maintenance_mode")
        .eq("scope", "challenge")
        .eq("target_id", "all")
        .maybeSingle();
      const { data: matchEmergency } = await supabase
        .from("competition_emergency_controls")
        .select("is_paused, maintenance_mode")
        .eq("scope", "match")
        .eq("target_id", "all")
        .maybeSingle();
      if ([globalEmergency, challengeEmergency, matchEmergency].some(control => control?.is_paused || control?.maintenance_mode)) {
        return NextResponse.json({ error: "Challenge acceptance and match creation are temporarily paused." }, { status: 503 });
      }

      // Load a full, valid source pool and preserve every linked passage as an indivisible unit.
      let questionsQuery = supabase
        .from("questions")
        .select("id, subject, difficulty, question, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, question_image_url, passage_id, passage_title, passage_text, reading_text_id, marks")
        .eq("is_active", true)
        .eq("is_archived", false);

      if (challenge.subject && challenge.subject !== "General") {
        questionsQuery = questionsQuery.eq("subject", challenge.subject);
      }
      if (challenge.difficulty && challenge.difficulty !== "mixed") {
        questionsQuery = questionsQuery.eq("difficulty", challenge.difficulty);
      }

      const { data: rawQuestions, error: qErr } = await questionsQuery.limit(5000);
      if (qErr) throw qErr;
      const validPool = (rawQuestions || []).filter((question) => {
        const answer = typeof question.correct_answer === "string" ? question.correct_answer.trim().toUpperCase() : "";
        const options = [question.option_a, question.option_b, question.option_c, question.option_d, question.option_e];
        const optionIndex = ["A", "B", "C", "D", "E"].indexOf(answer);
        return optionIndex >= 0 && Boolean(options[optionIndex]);
      });
      const selection = selectPassageSafeQuestions(validPool.map((question) => ({
        ...question,
        id: String(question.id),
        bank_id: "main_cbt_bank",
        subject: question.subject || challenge.subject || "General",
        difficulty: question.difficulty === "hard" ? "hard" : question.difficulty === "easy" ? "easy" : "medium",
        question_type: "multiple_choice",
        option_a: question.option_a || "",
        option_b: question.option_b || "",
        option_c: question.option_c || "",
        option_d: question.option_d || "",
        correct_answer: question.correct_answer.trim().toUpperCase(),
        marks: Number(question.marks) > 0 ? Number(question.marks) : 10,
        status: "published",
        created_by: "system_main",
      })), Number(challenge.question_count) || 10);

      if (!selection.ok) {
        return NextResponse.json({ error: selection.error }, { status: 409 });
      }

      const shuffled = selection.questions;

      // Client snapshot omits answer keys; the server retains the immutable key map.
      const questionsSnapshot: Array<{
        id: string;
        question: string;
        option_a: string;
        option_b: string;
        option_c: string;
        option_d: string;
        option_e?: string | null;
        question_image_url?: string | null;
        passage_id?: string | null;
        passage_title?: string | null;
        passage_text?: string | null;
        marks: number;
      }> = [];

      const answerKeysSnapshot: Record<string, string> = {};

      shuffled.forEach((question) => {
        const qId = String(question.id);
        questionsSnapshot.push({
          id: qId,
          question: question.question,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          option_e: question.option_e || null,
          question_image_url: question.question_image_url || null,
          passage_id: question.passage_id || null,
          passage_title: question.passage_title || null,
          passage_text: question.passage_text || null,
          marks: Number(question.marks) > 0 ? Number(question.marks) : 10,
        });
        answerKeysSnapshot[qId] = question.correct_answer.trim().toUpperCase();
      });

      // Resolve only public display identities. No email, phone or auth UUID is returned to clients.
      const { data: publicProfiles } = await supabase
        .from("competition_public_profiles")
        .select("user_id, display_name")
        .in("user_id", [challenge.challenger_id, acceptingUserId])
        .eq("visibility", "public");
      const publicName = (id: string) => publicProfiles?.find((profile) => profile.user_id === id)?.display_name || "Private player";
      const challengerName = publicName(challenge.challenger_id);
      const acceptingName = publicName(acceptingUserId);

      // Atomically create the match, participants and challenge transition.
      const durationSeconds = (challenge.duration_minutes || 5) * 60;
      const { data: matchId, error: acceptError } = await supabase.rpc("accept_competition_challenge_atomic", {
        p_challenge_id: challenge_id,
        p_accepting_user_id: acceptingUserId,
        p_questions_snapshot: questionsSnapshot,
        p_answer_keys_snapshot: answerKeysSnapshot,
        p_duration_seconds: durationSeconds,
        p_metadata: {
          subject: challenge.subject,
          question_count: challenge.question_count,
          player_a_name: challengerName,
          player_b_name: acceptingName,
          match_mode: challenge.match_mode || "ranked",
        },
        p_challenger_display_name: challengerName,
        p_accepting_display_name: acceptingName,
      });
      if (acceptError) {
        if (acceptError.message?.includes("no longer pending")) {
          return NextResponse.json({ error: "Another player has already accepted this challenge." }, { status: 409 });
        }
        if (acceptError.message?.includes("expired")) {
          return NextResponse.json({ error: "This challenge has expired." }, { status: 410 });
        }
        throw acceptError;
      }
      const createdMatchId = matchId as string;

      // 4. Notify challenger
      await supabase.from("notifications").insert({
        user_id: challenge.challenger_id,
        title: "⚡ Challenge Accepted!",
        message: `${acceptingName} accepted your challenge! Click to enter the Arena Match Lobby.`,
        type: "competition_match_lobby",
        metadata: { match_id: createdMatchId, opponent_name: acceptingName },
      });

      return NextResponse.json({
        ok: true,
        match_id: createdMatchId,
        message: "Challenge accepted. Match created.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating challenge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
