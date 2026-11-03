import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

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
    } else if (user) {
      if (filter === "incoming") {
        query = query.eq("challenged_id", user.id).eq("status", "pending");
      } else if (filter === "outgoing") {
        query = query.eq("challenger_id", user.id);
      } else if (filter === "my") {
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

    let profilesMap: Record<string, { full_name?: string; username?: string; avatar_url?: string }> = {};
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", Array.from(userIds));

      if (profiles) {
        profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
      }
    }

    // Attach profile data
    const enriched = (challenges || []).map((c) => ({
      ...c,
      challenger: profilesMap[c.challenger_id] || { full_name: "Challenger" },
      challenged: c.challenged_id ? profilesMap[c.challenged_id] || { full_name: "Challenged" } : null,
    }));

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
      challenged_id = null,
      subject = "General",
      question_count = 10,
      duration_minutes = 5,
      difficulty = "medium",
    } = body;

    if (challenged_id && challenged_id === user.id) {
      return NextResponse.json({ error: "You cannot challenge yourself." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check emergency controls
    const { data: emergency } = await supabase
      .from("competition_emergency_controls")
      .select("is_paused, maintenance_mode")
      .eq("scope", "global")
      .maybeSingle();

    if (emergency?.is_paused || emergency?.maintenance_mode) {
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
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // If direct challenge, send notification to challenged user
    if (challenged_id) {
      const { data: myProfile } = await supabase
        .from("user_profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .maybeSingle();

      const challengerName = myProfile?.full_name || myProfile?.username || "A student";

      await supabase.from("notifications").insert({
        user_id: challenged_id,
        title: "⚔️ New 1v1 Arena Challenge!",
        message: `${challengerName} has challenged you to a ${subject} showdown (${challenge.question_count} questions)!`,
        type: "competition_challenge",
        metadata: { challenge_id: challenge.id, challenger_id: user.id, subject },
      });
    }

    return NextResponse.json({ challenge }, { status: 201 });
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
      return NextResponse.json({ error: `Challenge is already ${challenge.status}` }, { status: 400 });
    }

    // 1. CANCEL ACTION
    if (action === "cancel") {
      if (challenge.challenger_id !== user.id) {
        return NextResponse.json({ error: "Only the challenger can cancel this challenge" }, { status: 403 });
      }
      await supabase
        .from("competition_challenges")
        .update({ status: "cancelled" })
        .eq("id", challenge_id);
      return NextResponse.json({ ok: true, message: "Challenge cancelled" });
    }

    // 2. DECLINE ACTION
    if (action === "decline") {
      if (challenge.challenged_id && challenge.challenged_id !== user.id) {
        return NextResponse.json({ error: "Only the challenged student can decline this challenge" }, { status: 403 });
      }
      await supabase
        .from("competition_challenges")
        .update({ status: "declined" })
        .eq("id", challenge_id);
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

      // Draw questions from questions bank matching subject
      let questionsQuery = supabase
        .from("questions")
        .select("id, question, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, question_image_url, passage_id, passage_title, passage_text")
        .eq("is_active", true);

      if (challenge.subject && challenge.subject !== "General") {
        questionsQuery = questionsQuery.eq("subject", challenge.subject);
      }

      const { data: rawQuestions, error: qErr } = await questionsQuery.limit(100);
      if (qErr || !rawQuestions || rawQuestions.length === 0) {
        // Fallback to any active questions if specific subject is empty
        const { data: fallbackQuestions } = await supabase
          .from("questions")
          .select("id, question, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, question_image_url, passage_id, passage_title, passage_text")
          .eq("is_active", true)
          .limit(100);

        if (!fallbackQuestions || fallbackQuestions.length === 0) {
          return NextResponse.json({ error: "No active questions available in the Question Bank" }, { status: 500 });
        }
      }

      const pool = (rawQuestions && rawQuestions.length >= challenge.question_count)
        ? rawQuestions
        : await supabase
            .from("questions")
            .select("id, question, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, question_image_url, passage_id, passage_title, passage_text")
            .eq("is_active", true)
            .limit(100)
            .then(res => res.data || []);

      // Shuffle pool and select question_count
      const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, challenge.question_count);

      // Create client snapshot (WITHOUT correct_answer) and server keys snapshot
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

      shuffled.forEach((q, idx) => {
        const qId = String(q.id || `q_${idx + 1}`);
        questionsSnapshot.push({
          id: qId,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          option_e: q.option_e || null,
          question_image_url: q.question_image_url || null,
          passage_id: q.passage_id || null,
          passage_title: q.passage_title || null,
          passage_text: q.passage_text || null,
          marks: 10,
        });
        answerKeysSnapshot[qId] = String(q.correct_answer || "").trim().toUpperCase();
      });

      // Get profile names
      const { data: userProfiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, username")
        .in("id", [challenge.challenger_id, acceptingUserId]);

      const challengerProfile = userProfiles?.find((p) => p.id === challenge.challenger_id);
      const acceptingProfile = userProfiles?.find((p) => p.id === acceptingUserId);

      const challengerName = challengerProfile?.full_name || challengerProfile?.username || "Player 1";
      const acceptingName = acceptingProfile?.full_name || acceptingProfile?.username || "Player 2";

      // 1. Create Match row
      const durationSeconds = (challenge.duration_minutes || 5) * 60;
      const { data: match, error: matchErr } = await supabase
        .from("competition_matches")
        .insert({
          match_type: "1v1",
          status: "lobby",
          participant_a_id: challenge.challenger_id,
          participant_b_id: acceptingUserId,
          score_a: 0,
          score_b: 0,
          questions_snapshot: questionsSnapshot,
          answer_keys_snapshot: answerKeysSnapshot,
          duration_seconds: durationSeconds,
          metadata: {
            subject: challenge.subject,
            question_count: challenge.question_count,
            player_a_name: challengerName,
            player_b_name: acceptingName,
          },
        })
        .select()
        .single();

      if (matchErr || !match) {
        throw new Error(matchErr?.message || "Failed to create match");
      }

      // 2. Insert match participants
      await supabase.from("competition_match_participants").insert([
        {
          match_id: match.id,
          user_id: challenge.challenger_id,
          display_name: challengerName,
          is_ready: false,
          current_question_index: 0,
          score: 0,
        },
        {
          match_id: match.id,
          user_id: acceptingUserId,
          display_name: acceptingName,
          is_ready: false,
          current_question_index: 0,
          score: 0,
        },
      ]);

      // 3. Update Challenge status
      await supabase
        .from("competition_challenges")
        .update({
          status: "accepted",
          challenged_id: acceptingUserId,
          match_id: match.id,
        })
        .eq("id", challenge_id);

      // 4. Notify challenger
      await supabase.from("notifications").insert({
        user_id: challenge.challenger_id,
        title: "⚡ Challenge Accepted!",
        message: `${acceptingName} accepted your challenge! Click to enter the Arena Match Lobby.`,
        type: "competition_match_lobby",
        metadata: { match_id: match.id, opponent_name: acceptingName },
      });

      return NextResponse.json({
        ok: true,
        match_id: match.id,
        message: "Challenge accepted. Match created.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating challenge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
