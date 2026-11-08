import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient, getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { getGroupBySlug } from "@/app/lib/community/communityService";
import { listCohortPolls, createCohortPoll } from "@/app/lib/community/announcementService";

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

    const user = await getUserFromRequest(request);
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = token ? getSupabaseServerClient(token) : publicClient;

    const polls = await listCohortPolls(group.id, user?.id || null, client);

    return NextResponse.json({ ok: true, data: polls });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> | { slug: string } }
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
    const { question, options, is_anonymous, is_multiple_choice, closes_at } = body || {};

    if (!question || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ ok: false, error: "question_and_at_least_two_options_required" }, { status: 400 });
    }

    const formattedOptions = options.map((opt: string | { id?: string; text: string }, idx: number) => {
      if (typeof opt === "string") {
        return { id: `opt-${idx + 1}`, text: opt.trim() };
      }
      return { id: opt.id || `opt-${idx + 1}`, text: opt.text.trim() };
    });

    const res = await createCohortPoll(
      {
        group_id: group.id,
        created_by: user.id,
        question,
        options: formattedOptions,
        is_anonymous,
        is_multiple_choice,
        closes_at,
      },
      client
    );

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: res.poll }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
