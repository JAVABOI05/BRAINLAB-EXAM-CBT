import { NextRequest, NextResponse } from "next/server";
import {
  getSupabasePublicServerClient,
  getSupabaseServerClient,
  getUserFromRequest,
} from "@/app/lib/supabaseServer";
import { getStudentDailyFeed } from "@/app/lib/community/questService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = token ? getSupabaseServerClient(token) : getSupabasePublicServerClient();

    const feed = await getStudentDailyFeed(user?.id || null, client);

    return NextResponse.json({
      ok: true,
      user_id: user?.id || "guest",
      ...feed,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: err instanceof Error ? err.message : "Failed to load student daily feed.",
      },
      { status: 500 }
    );
  }
}
