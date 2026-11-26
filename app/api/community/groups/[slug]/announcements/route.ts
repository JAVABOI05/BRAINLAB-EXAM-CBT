import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient, getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { getGroupBySlug } from "@/app/lib/community/communityService";
import { listCohortAnnouncements, createCohortAnnouncement } from "@/app/lib/community/announcementService";

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

    const publicClient = getSupabasePublicServerClient();
    const group = await getGroupBySlug(slug, publicClient);
    if (!group) {
      return NextResponse.json({ ok: false, error: "group_not_found" }, { status: 404 });
    }

    const user = await getUserFromRequest(request);
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = token ? getSupabaseServerClient(token) : publicClient;

    const announcements = await listCohortAnnouncements(group.id, user?.id || null, client);

    return NextResponse.json({ ok: true, data: announcements });
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

    const body = await request.json();
    const { title, content, priority, is_pinned, requires_acknowledgement, attachments, expires_at } = body || {};

    if (!title || !content) {
      return NextResponse.json({ ok: false, error: "title_and_content_required" }, { status: 400 });
    }

    const res = await createCohortAnnouncement(
      {
        group_id: group.id,
        author_id: user.id,
        title,
        content,
        priority,
        is_pinned,
        requires_acknowledgement,
        attachments,
        expires_at,
      },
      client
    );

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: res.announcement }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
