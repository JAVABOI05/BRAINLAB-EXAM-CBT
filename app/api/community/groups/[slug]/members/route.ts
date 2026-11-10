import { NextRequest, NextResponse } from "next/server";
import {
  getSupabasePublicServerClient,
  getSupabaseServerClient,
  getUserFromRequest,
} from "@/app/lib/supabaseServer";
import {
  getGroupBySlug,
  listCohortMembers,
  updateCohortMemberStatus,
  addCohortMemberByEmail,
  removeCohortMember,
} from "@/app/lib/community/communityService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const slug = resolvedParams?.slug;
    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = token ? getSupabaseServerClient(token) : getSupabasePublicServerClient();

    const group = await getGroupBySlug(slug, client);
    if (!group) {
      return NextResponse.json({ ok: false, error: "group_not_found" }, { status: 404 });
    }

    const members = await listCohortMembers(group.id, client);
    return NextResponse.json({ ok: true, data: members });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const slug = resolvedParams?.slug;
    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = getSupabaseServerClient(token);

    const group = await getGroupBySlug(slug, client);
    if (!group) {
      return NextResponse.json({ ok: false, error: "group_not_found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, memberId, email, role } = body;

    if (action === "add") {
      if (!email) {
        return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
      }
      const res = await addCohortMemberByEmail(group.id, email, role || "student", client);
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, membership: res.membership });
    }

    if (action === "approve") {
      if (!memberId) {
        return NextResponse.json({ ok: false, error: "missing_member_id" }, { status: 400 });
      }
      const res = await updateCohortMemberStatus(group.id, memberId, "active", client);
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "suspend") {
      if (!memberId) {
        return NextResponse.json({ ok: false, error: "missing_member_id" }, { status: 400 });
      }
      const res = await updateCohortMemberStatus(group.id, memberId, "suspended", client);
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "remove") {
      if (!memberId) {
        return NextResponse.json({ ok: false, error: "missing_member_id" }, { status: 400 });
      }
      const res = await removeCohortMember(group.id, memberId, client);
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
