import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const {
      submissionId,
      grade,
      feedback,
      tutorAudioAssetId,
      rubricScores = {},
      status = "graded",
    } = body;

    if (!submissionId) {
      return NextResponse.json({ success: false, error: "submissionId is required." }, { status: 400 });
    }

    // 1. Fetch submission and related assignment
    const { data: submission, error: subError } = await supabase
      .from("assignment_submissions")
      .select(`
        id,
        assignment_id,
        student_id,
        assignments (
          id,
          title,
          tutor_id,
          max_points
        )
      `)
      .eq("id", submissionId)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ success: false, error: "Submission not found." }, { status: 404 });
    }

    const assignment = (submission as any).assignments;

    // Check tutor authorization
    const { data: adminRole } = await supabase
      .from("admin_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isPrivileged =
      assignment?.tutor_id === user.id ||
      (adminRole && ["super_admin", "platform_admin", "teacher"].includes(adminRole.role));

    if (!isPrivileged) {
      return NextResponse.json(
        { success: false, error: "Only the assigned course tutor or an administrator can grade this submission." },
        { status: 403 }
      );
    }

    const numericGrade = grade !== undefined && grade !== null && grade !== "" ? Number(grade) : null;
    if (numericGrade !== null && (numericGrade < 0 || numericGrade > (assignment?.max_points || 100))) {
      return NextResponse.json(
        { success: false, error: `Grade must be between 0 and ${assignment?.max_points || 100} points.` },
        { status: 400 }
      );
    }

    // 2. Update submission record
    const { data: updated, error: updateError } = await supabase
      .from("assignment_submissions")
      .update({
        grade: numericGrade,
        feedback: feedback?.trim() || null,
        tutor_audio_asset_id: tutorAudioAssetId || null,
        rubric_scores: rubricScores,
        status,
        graded_at: new Date().toISOString(),
        graded_by: user.id,
      })
      .eq("id", submissionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Dispatch notification to student
    if (submission.student_id) {
      const isResubmit = status === "resubmission_requested";
      const notifTitle = isResubmit
        ? `Revision Requested: ${assignment?.title}`
        : `Assignment Graded: ${assignment?.title}`;
      const notifMessage = isResubmit
        ? `Your tutor requested a revision for "${assignment?.title}". Check the feedback and resubmit.`
        : `Your submission for "${assignment?.title}" received ${numericGrade ?? 0}/${assignment?.max_points || 100} points.`;

      try {
        await supabase.from("notifications").insert({
          user_id: submission.student_id,
          title: notifTitle,
          message: notifMessage,
          type: "assignment",
          link_url: `/assignments?id=${assignment?.id}`,
        });
      } catch (notifErr) {
        console.warn("[api/assignments/grade] Student notification error:", notifErr);
      }
    }

    return NextResponse.json({ success: true, submission: updated });
  } catch (error: unknown) {
    console.error("[api/assignments/grade] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to grade submission" },
      { status: 500 }
    );
  }
}
