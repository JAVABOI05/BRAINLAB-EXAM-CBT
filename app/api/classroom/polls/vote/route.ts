import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { pollId, selectedOptionId } = body;

    if (!pollId || !selectedOptionId) {
      return NextResponse.json(
        { ok: false, error: "pollId and selectedOptionId are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch poll to ensure it exists and is open
    const { data: poll, error: pollError } = await supabase
      .from("classroom_polls")
      .select("id, class_id, is_open")
      .eq("id", pollId)
      .maybeSingle();

    if (pollError || !poll) {
      return NextResponse.json({ ok: false, error: "Poll not found." }, { status: 404 });
    }

    if (!poll.is_open) {
      return NextResponse.json({ ok: false, error: "This poll is now closed." }, { status: 400 });
    }

    // 2. Insert or update vote (upsert based on unique constraint)
    const { error: voteError } = await supabase
      .from("classroom_poll_votes")
      .upsert(
        {
          poll_id: poll.id,
          class_id: poll.class_id,
          user_id: user.id,
          selected_option_id: selectedOptionId,
        },
        { onConflict: "poll_id,user_id" }
      );

    if (voteError) {
      return NextResponse.json({ ok: false, error: voteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pollId: poll.id, selectedOptionId });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to record vote" },
      { status: 500 }
    );
  }
}
