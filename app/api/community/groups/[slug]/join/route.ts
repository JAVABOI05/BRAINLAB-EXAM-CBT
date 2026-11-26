import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { getGroupBySlug, joinCommunityGroup } from "@/app/lib/community/communityService";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const supabase = getSupabaseServerClient(token);
    const group = await getGroupBySlug(slug, supabase);

    if (!group) {
      return NextResponse.json({ ok: false, error: "group_not_found" }, { status: 404 });
    }

    const result = await joinCommunityGroup(group.id, user.id, supabase);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        group_id: group.id,
        membership_status: result.status,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
