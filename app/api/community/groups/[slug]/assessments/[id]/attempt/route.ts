import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { getGroupBySlug } from "@/app/lib/community/communityService";
import { recordCohortAttempt } from "@/app/lib/community/assessmentService";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; id: string }> | { slug: string; id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const slug = resolvedParams?.slug;
    const assessmentId = resolvedParams?.id;

    if (!slug || !assessmentId) {
      return NextResponse.json({ ok: false, error: "missing_parameters" }, { status: 400 });
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
    const { score, total_questions, time_spent_seconds, exam_session_id } = body || {};

    const numericScore = Number(score) || 0;
    const numericTotal = Number(total_questions) || 1;
    const percentage = Math.round((numericScore / numericTotal) * 100);

    const res = await recordCohortAttempt(
      {
        assessment_id: assessmentId,
        group_id: group.id,
        user_id: user.id,
        exam_session_id: exam_session_id || null,
        score: numericScore,
        total_questions: numericTotal,
        percentage,
        time_spent_seconds: Number(time_spent_seconds) || 0,
        status: "completed",
        submitted_at: new Date().toISOString(),
      },
      client
    );

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: res.attempt });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
