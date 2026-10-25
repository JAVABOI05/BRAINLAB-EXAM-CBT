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
    const { assignmentId, textSubmission, audioAssetId } = body;

    if (!assignmentId) {
      return NextResponse.json({ success: false, error: "assignmentId is required." }, { status: 400 });
    }

    if (!textSubmission?.trim() && !audioAssetId) {
      return NextResponse.json(
        { success: false, error: "Please provide either written work or a recorded voice note." },
        { status: 400 }
      );
    }

    // 1. Fetch assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("id, title, tutor_id, status, due_date, allow_late_submissions, allow_audio_submission")
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ success: false, error: "Assignment not found." }, { status: 404 });
    }

    if (assignment.status !== "published") {
      return NextResponse.json(
        { success: false, error: "This assignment is closed and is no longer accepting submissions." },
        { status: 400 }
      );
    }

    // Check due date & late submission policy
    if (assignment.due_date && new Date(assignment.due_date).getTime() < Date.now()) {
      if (!assignment.allow_late_submissions) {
        return NextResponse.json(
          { success: false, error: "The deadline for this assignment has passed and late submissions are disabled." },
          { status: 400 }
        );
      }
    }

    // Audio submission policy check
    if (audioAssetId && !assignment.allow_audio_submission) {
      return NextResponse.json(
        { success: false, error: "Voice note submissions are not enabled for this assignment." },
        { status: 400 }
      );
    }

    // 2. Upsert submission
    const { data: submission, error: submitError } = await supabase
      .from("assignment_submissions")
      .upsert(
        {
          assignment_id: assignmentId,
          student_id: user.id,
          text_submission: textSubmission?.trim() || null,
          audio_asset_id: audioAssetId || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "assignment_id,student_id" }
      )
      .select()
      .single();

    if (submitError) throw submitError;

    // 3. Notify tutor of submission
    if (assignment.tutor_id) {
      try {
        const studentName = user.user_metadata?.full_name || user.email?.split("@")[0] || "A student";
        await supabase.from("notifications").insert({
          user_id: assignment.tutor_id,
          title: `Assignment Submission: ${assignment.title}`,
          message: `${studentName} submitted work for "${assignment.title}". Ready for evaluation.`,
          type: "assignment",
          link_url: `/tutor/assignments?id=${assignmentId}`,
        });
      } catch (notifErr) {
        console.warn("[api/assignments/submit] Notification warning:", notifErr);
      }
    }

    return NextResponse.json({ success: true, submission });
  } catch (error: unknown) {
    console.error("[api/assignments/submit] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to submit assignment" },
      { status: 500 }
    );
  }
}
