import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getGroupBySlug } from "@/app/lib/community/communityService";
import { getCohortPsychometrics } from "@/app/lib/community/leaderboardService";

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

    const publicClient = getSupabasePublicServerClient();
    const group = await getGroupBySlug(slug, publicClient);
    if (!group) {
      return NextResponse.json({ ok: false, error: "group_not_found" }, { status: 404 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = token ? getSupabaseServerClient(token) : publicClient;

    const psychometrics = await getCohortPsychometrics(group.id, client);

    return NextResponse.json({
      ok: true,
      data: {
        group: { id: group.id, name: group.name, slug: group.slug },
        psychometrics,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
