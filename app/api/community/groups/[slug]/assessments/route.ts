import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient, getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { getGroupBySlug } from "@/app/lib/community/communityService";
import { listCohortAssessments, createCohortAssessment } from "@/app/lib/community/assessmentService";

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

    const assessments = await listCohortAssessments(group.id, user?.id || null, client);

    return NextResponse.json({ ok: true, data: assessments });
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
    const {
      title,
      description,
      subject,
      topics,
      question_count,
      duration_minutes,
      starts_at,
      ends_at,
      max_attempts,
      freeze_eligible_members,
    } = body || {};

    if (!title || !subject || !starts_at || !ends_at) {
      return NextResponse.json(
        { ok: false, error: "title_subject_starts_and_ends_at_required" },
        { status: 400 }
      );
    }

    const res = await createCohortAssessment(
      {
        group_id: group.id,
        created_by: user.id,
        title,
        description,
        subject,
        topics: Array.isArray(topics) ? topics : [],
        question_count: Number(question_count) || 40,
        duration_minutes: Number(duration_minutes) || 60,
        starts_at,
        ends_at,
        max_attempts: Number(max_attempts) || 1,
        freeze_eligible_members: freeze_eligible_members !== false,
      },
      client
    );

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: res.assessment }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
