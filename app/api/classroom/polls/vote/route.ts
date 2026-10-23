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
    const { data: poll } = await supabase
      .from("classroom_polls")
      .select("id, class_id, is_open")
      .eq("id", pollId)
      .maybeSingle();

    if (poll && !poll.is_open) {
      return NextResponse.json({ ok: false, error: "This poll is now closed." }, { status: 400 });
    }

    if (poll) {
      // Insert or update vote in DB
      await supabase
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
    }

    return NextResponse.json({ ok: true, pollId, selectedOptionId });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to record vote" },
      { status: 500 }
    );
  }
}
