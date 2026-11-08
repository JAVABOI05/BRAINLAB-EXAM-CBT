import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const assignmentId = request.nextUrl.searchParams.get("assignmentId");
    if (!assignmentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assignmentId)) {
      return NextResponse.json({ success: false, error: "A valid assignmentId is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const [{ data: assignment, error: assignmentError }, { data: adminRole }] = await Promise.all([
      supabase.from("assignments").select("id, tutor_id").eq("id", assignmentId).maybeSingle(),
      supabase.from("admin_profiles").select("role").eq("user_id", user.id).maybeSingle(),
    ]);

    if (assignmentError || !assignment) {
      return NextResponse.json({ success: false, error: "Assignment not found." }, { status: 404 });
    }

    const isPlatformAdmin = Boolean(adminRole && ["super_admin", "platform_admin"].includes(adminRole.role));
    if (assignment.tutor_id !== user.id && !isPlatformAdmin) {
      return NextResponse.json({ success: false, error: "You are not assigned to this course assignment." }, { status: 403 });
    }

    const { data: submissions, error } = await supabase
      .from("assignment_submissions")
      .select(`
        id,
        assignment_id,
        student_id,
        text_submission,
        audio_asset_id,
        tutor_audio_asset_id,
        grade,
        feedback,
        rubric_scores,
        status,
        submitted_at,
        graded_at,
        audio_asset:audio_asset_id ( id, file_url, duration_seconds, title ),
        tutor_audio_asset:tutor_audio_asset_id ( id, file_url, duration_seconds, title )
      `)
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: "Unable to load assignment submissions." }, { status: 500 });
    }

    return NextResponse.json({ success: true, submissions: submissions || [] }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load submissions." },
      { status: 500 }
    );
  }
}
