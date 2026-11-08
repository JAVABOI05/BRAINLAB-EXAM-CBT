import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient, getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { listDailyQuests } from "@/app/lib/community/questService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = token ? getSupabaseServerClient(token) : getSupabasePublicServerClient();

    const quests = await listDailyQuests(user?.id || null, client);

    return NextResponse.json({ ok: true, data: quests });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
