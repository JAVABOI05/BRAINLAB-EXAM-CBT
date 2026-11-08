import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient, getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { getGroupBySlug } from "@/app/lib/community/communityService";
import { getCohortLeaderboard } from "@/app/lib/community/leaderboardService";
import type { CohortLeaderboardScope } from "@/app/lib/community/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const slug = resolvedParams?.slug;
    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") || "weekly") as CohortLeaderboardScope;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const publicClient = getSupabasePublicServerClient();
    const group = await getGroupBySlug(slug, publicClient);
    if (!group) {
      return NextResponse.json({ ok: false, error: "group_not_found" }, { status: 404 });
    }

    const user = await getUserFromRequest(request);
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = token ? getSupabaseServerClient(token) : publicClient;

    const rows = await getCohortLeaderboard(group.id, scope, limit, user?.id || null, client);

    return NextResponse.json({
      ok: true,
      data: {
        group: { id: group.id, name: group.name, slug: group.slug },
        scope,
        rows,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
