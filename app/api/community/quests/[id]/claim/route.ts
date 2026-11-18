import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { claimQuestReward } from "@/app/lib/community/questService";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const questId = resolvedParams?.id;
    if (!questId) {
      return NextResponse.json(
        { ok: false, error: "missing_quest_id", message: "Quest ID parameter is required." },
        { status: 400 }
      );
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", message: "Authentication required to claim quest rewards." },
        { status: 401 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = getSupabaseServerClient(token);

    const res = await claimQuestReward(questId, user.id, client);

    if (!res.ok) {
      const statusCode = res.error === "already_claimed" ? 409 : 400;
      return NextResponse.json(
        { ok: false, error: res.error, message: res.message || "Failed to claim quest reward." },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      ok: true,
      xp_earned: res.xp_earned,
      lifetime_xp: res.lifetime_xp,
      current_level: res.current_level,
      level_name: res.level_name,
      leveled_up: res.leveled_up,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: "server_error", message: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}
