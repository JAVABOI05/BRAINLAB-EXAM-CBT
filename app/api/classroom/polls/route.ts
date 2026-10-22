import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ ok: false, error: "classId is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch polls for this class
    const { data: polls, error: pollsError } = await supabase
      .from("classroom_polls")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (pollsError) {
      return NextResponse.json({ ok: false, error: pollsError.message }, { status: 500 });
    }

    if (!polls || polls.length === 0) {
      return NextResponse.json({ ok: true, polls: [] });
    }

    const pollIds = polls.map((p) => p.id);

    // 2. Fetch all votes for these polls
    const { data: votes, error: votesError } = await supabase
      .from("classroom_poll_votes")
      .select("poll_id, user_id, selected_option_id")
      .in("poll_id", pollIds);

    if (votesError) {
      return NextResponse.json({ ok: false, error: votesError.message }, { status: 500 });
    }

    const votesMap = new Map<string, { totalVotes: number; optionCounts: Record<string, number>; userVote?: string }>();

    for (const pollId of pollIds) {
      votesMap.set(pollId, { totalVotes: 0, optionCounts: {} });
    }

    for (const v of votes || []) {
      const entry = votesMap.get(v.poll_id);
      if (entry) {
        entry.totalVotes += 1;
        entry.optionCounts[v.selected_option_id] = (entry.optionCounts[v.selected_option_id] || 0) + 1;
        if (v.user_id === user.id) {
          entry.userVote = v.selected_option_id;
        }
      }
    }

    const aggregated = polls.map((poll) => {
      const stats = votesMap.get(poll.id) || { totalVotes: 0, optionCounts: {} };
      const rawOptions = Array.isArray(poll.options) ? poll.options : [];
      const options = rawOptions.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
        is_correct: poll.is_open ? undefined : opt.is_correct, // Hide correct answer while poll is live
        votes: stats.optionCounts[opt.id] || 0,
        percentage: stats.totalVotes > 0 ? Math.round(((stats.optionCounts[opt.id] || 0) / stats.totalVotes) * 100) : 0,
      }));

      return {
        id: poll.id,
        class_id: poll.class_id,
        created_by: poll.created_by,
        question: poll.question,
        options,
        explanation: poll.is_open ? undefined : poll.explanation,
        is_open: poll.is_open,
        duration_seconds: poll.duration_seconds,
        total_votes: stats.totalVotes,
        user_voted_option_id: stats.userVote || null,
        created_at: poll.created_at,
        closed_at: poll.closed_at,
      };
    });

    return NextResponse.json({ ok: true, polls: aggregated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load polls" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { classId, question, options, explanation, durationSeconds } = body;

    if (!classId || !question?.trim() || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { ok: false, error: "classId, question, and at least 2 options are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Verify class ownership or tutor/admin authorization
    const { data: liveClass } = await supabase
      .from("live_classes")
      .select("tutor_id")
      .eq("id", classId)
      .maybeSingle();

    const { data: adminRole } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAuthorized =
      (liveClass && liveClass.tutor_id === user.id) ||
      (adminRole && ["super_admin", "platform_admin", "teacher"].includes(adminRole.role));

    if (!isAuthorized) {
      return NextResponse.json(
        { ok: false, error: "Only the class tutor or administrator can launch polls." },
        { status: 403 }
      );
    }

    // Close any currently active poll for this class first
    await supabase
      .from("classroom_polls")
      .update({ is_open: false, closed_at: new Date().toISOString() })
      .eq("class_id", classId)
      .eq("is_open", true);

    // Format options with guaranteed unique string IDs
    const formattedOptions = options.map((opt: any, index: number) => ({
      id: String(opt.id || `opt_${index + 1}`),
      text: String(opt.text || "").trim(),
      is_correct: Boolean(opt.is_correct),
    }));

    const { data: newPoll, error: insertError } = await supabase
      .from("classroom_polls")
      .insert({
        class_id: classId,
        created_by: user.id,
        question: question.trim(),
        options: formattedOptions,
        explanation: explanation?.trim() || null,
        duration_seconds: typeof durationSeconds === "number" ? durationSeconds : 60,
        is_open: true,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, poll: newPoll });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to launch poll" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { pollId, isOpen } = body;

    if (!pollId) {
      return NextResponse.json({ ok: false, error: "pollId is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: updatedPoll, error: updateError } = await supabase
      .from("classroom_polls")
      .update({
        is_open: Boolean(isOpen),
        closed_at: isOpen ? null : new Date().toISOString(),
      })
      .eq("id", pollId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, poll: updatedPoll });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to update poll" },
      { status: 500 }
    );
  }
}
