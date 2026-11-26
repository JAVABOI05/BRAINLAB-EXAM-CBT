import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { getGroupBySlug } from "@/app/lib/community/communityService";
import { getAssessmentById, recordCohortAttempt } from "@/app/lib/community/assessmentService";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; id: string }> }
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

    const assessment = await getAssessmentById(assessmentId, user.id, client);
    if (!assessment) {
      return NextResponse.json({ ok: false, error: "assessment_not_found" }, { status: 404 });
    }

    // Check time window
    const now = new Date();
    const startsAt = new Date(assessment.starts_at);
    const endsAt = new Date(assessment.ends_at);

    if (now < startsAt) {
      return NextResponse.json(
        { ok: false, error: "assessment_not_yet_open", message: "This examination has not started yet." },
        { status: 403 }
      );
    }

    if (now > endsAt) {
      return NextResponse.json(
        { ok: false, error: "assessment_closed", message: "This examination testing window has closed." },
        { status: 403 }
      );
    }

    // Check member eligibility
    if (!assessment.is_eligible) {
      return NextResponse.json(
        { ok: false, error: "ineligible", message: "You were not in the frozen eligibility roster for this assessment." },
        { status: 403 }
      );
    }

    // Check attempt limits
    const { count, error: countErr } = await client
      .from("group_assessment_attempts")
      .select("*", { count: "exact", head: true })
      .eq("assessment_id", assessmentId)
      .eq("user_id", user.id);

    if (!countErr && (count ?? 0) >= assessment.max_attempts) {
      return NextResponse.json(
        { ok: false, error: "max_attempts_exceeded", message: `You have exhausted the maximum allowed attempts (${assessment.max_attempts}).` },
        { status: 403 }
      );
    }

    // Generate unique session identifier linking cohort assessment to CBT engine
    const examSessionId = `cohort-${group.slug}-${assessment.id}-${user.id}-${Date.now()}`;

    // Record new in-progress attempt
    const attemptRes = await recordCohortAttempt(
      {
        assessment_id: assessment.id,
        group_id: group.id,
        user_id: user.id,
        exam_session_id: examSessionId,
        score: 0,
        total_questions: assessment.question_count,
        percentage: 0,
        time_spent_seconds: 0,
        status: "in_progress",
      },
      client
    );

    return NextResponse.json({
      ok: true,
      data: {
        assessment,
        exam_session_id: examSessionId,
        attempt: attemptRes.attempt || null,
        redirect_url: `/cbt?cohort=${group.slug}&assessment=${assessment.id}&session=${examSessionId}`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
