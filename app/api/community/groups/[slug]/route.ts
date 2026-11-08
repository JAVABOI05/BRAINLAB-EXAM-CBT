import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient, getSupabaseServerClient, getUserFromRequest } from "../../../../lib/supabaseServer";
import { getGroupBySlug } from "../../../../lib/community/communityService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params?.slug;
    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }

    const publicClient = getSupabasePublicServerClient();
    const group = await getGroupBySlug(slug, publicClient);

    if (!group) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Check caller membership if token is present
    const user = await getUserFromRequest(request);
    let is_member = false;
    let user_role: string | null = null;
    let membership_status: string | null = null;

    if (user) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
      const serverClient = getSupabaseServerClient(token);
      const { data: mem } = await serverClient
        .from("community_group_memberships")
        .select("group_role, status")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (mem) {
        is_member = mem.status === "active";
        user_role = mem.group_role;
        membership_status = mem.status;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...group,
        is_member,
        user_role,
        membership_status,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
