import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { gradeStemExperimentAttempt } from "@/app/lib/stem/stemService";
import { isGovernanceAdminRole } from "@/app/lib/adminRoles";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = getSupabaseServerClient(token);
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const adminRole = await resolveAdminRole(user.id);
    const isStemGovernanceRole = ["super_admin", "platform_admin", "content_reviewer", "ai_learning_admin", "admin"].includes(adminRole || "");
    const { data: approvedTutor } = await client
      .from("tutor_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("profile_status", "approved")
      .maybeSingle();
    const canGrade = isStemGovernanceRole || adminRole === "teacher" || Boolean(approvedTutor);

    if (!canGrade) {
      return NextResponse.json(
        { ok: false, error: "Insufficient permissions to grade STEM experiment attempts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tutor_score, tutor_feedback } = body;

    if (typeof tutor_score !== "number" || tutor_score < 0 || tutor_score > 100) {
      return NextResponse.json(
        { ok: false, error: "Valid score between 0 and 100 is required" },
        { status: 400 }
      );
    }

    const { ok, error } = await gradeStemExperimentAttempt(
      id,
      {
        tutor_score,
        tutor_feedback: tutor_feedback || "",
      },
      client
    );

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Attempt graded successfully" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to grade experiment attempt" },
      { status: 500 }
    );
  }
}
