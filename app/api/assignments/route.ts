import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get("courseId");
    const subjectId = searchParams.get("subjectId");
    const mode = searchParams.get("mode") || "student"; // "student" or "tutor"

    if (mode === "tutor") {
      // Check if tutor or admin
      const { data: adminRole } = await supabase
        .from("admin_profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const isPlatformAdmin = Boolean(adminRole && ["super_admin", "platform_admin"].includes(adminRole.role));

      let query = supabase
        .from("assignments")
        .select(`
          id,
          course_id,
          subject_id,
          tutor_id,
          title,
          instructions,
          allow_audio_submission,
          allow_late_submissions,
          due_date,
          max_points,
          rubric,
          status,
          created_at,
          courses ( id, title, slug ),
          learning_subjects ( id, name, slug )
        `)
        .order("created_at", { ascending: false });

      if (!isPlatformAdmin) {
        query = query.eq("tutor_id", user.id);
      }
      if (courseId) {
        query = query.eq("course_id", courseId);
      }
      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }

      const { data: assignments, error } = await query;
      if (error) throw error;

      // Fetch submission counts for each assignment
      const assignmentIds = (assignments || []).map((a) => a.id);
      const submissionCounts: Record<string, { total: number; submitted: number; graded: number }> = {};

      if (assignmentIds.length > 0) {
        const { data: subs } = await supabase
          .from("assignment_submissions")
          .select("assignment_id, status")
          .in("assignment_id", assignmentIds);

        (subs || []).forEach((s) => {
          if (!submissionCounts[s.assignment_id]) {
            submissionCounts[s.assignment_id] = { total: 0, submitted: 0, graded: 0 };
          }
          submissionCounts[s.assignment_id].total += 1;
          if (s.status === "graded") {
            submissionCounts[s.assignment_id].graded += 1;
          } else {
            submissionCounts[s.assignment_id].submitted += 1;
          }
        });
      }

      const enriched = (assignments || []).map((a) => ({
        ...a,
        stats: submissionCounts[a.id] || { total: 0, submitted: 0, graded: 0 },
      }));

      return NextResponse.json({ success: true, assignments: enriched });
    }

    // Default: Student Mode
    // Fetch published assignments and join student's own submission
    let query = supabase
      .from("assignments")
      .select(`
        id,
        course_id,
        subject_id,
        tutor_id,
        title,
        instructions,
        allow_audio_submission,
        allow_late_submissions,
        due_date,
        max_points,
        rubric,
        status,
        created_at,
        courses ( id, title, slug ),
        learning_subjects ( id, name, slug )
      `)
      .eq("status", "published")
      .order("due_date", { ascending: true });

    if (courseId) {
      query = query.eq("course_id", courseId);
    }
    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    const { data: assignments, error } = await query;
    if (error) throw error;

    // Fetch student's own submissions with audio assets
    const assignmentIds = (assignments || []).map((a) => a.id);
    const mySubmissions: Record<string, unknown> = {};

    if (assignmentIds.length > 0) {
      const { data: subs } = await supabase
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
        .eq("student_id", user.id)
        .in("assignment_id", assignmentIds);

      (subs || []).forEach((s) => {
        mySubmissions[s.assignment_id] = s;
      });
    }

    const studentAssignments = (assignments || []).map((a) => ({
      ...a,
      submission: mySubmissions[a.id] || null,
    }));

    return NextResponse.json({ success: true, assignments: studentAssignments });
  } catch (error: unknown) {
    console.error("[api/assignments] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load assignments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Verify Tutor / Admin authorization
    const { data: adminRole } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: subjectMembership } = await supabase
      .from("learning_subject_memberships")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAuthorized =
      subjectMembership ||
      (adminRole && ["super_admin", "platform_admin", "teacher"].includes(adminRole.role));

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Tutor or administrator authorization required." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      title,
      instructions,
      courseId,
      subjectId,
      maxPoints = 100,
      dueDate,
      allowAudioSubmission = false,
      allowLateSubmissions = true,
      rubric = [],
      status = "published",
    } = body;

    if (!title?.trim() || !instructions?.trim() || !courseId) {
      return NextResponse.json(
        { success: false, error: "Title, instructions, and course selection are required." },
        { status: 400 }
      );
    }

    // Insert Assignment
    const { data: assignment, error: insertError } = await supabase
      .from("assignments")
      .insert({
        title: title.trim(),
        instructions: instructions.trim(),
        course_id: courseId,
        subject_id: subjectId || null,
        tutor_id: user.id,
        max_points: Number(maxPoints) || 100,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        allow_audio_submission: Boolean(allowAudioSubmission),
        allow_late_submissions: Boolean(allowLateSubmissions),
        rubric: Array.isArray(rubric) ? rubric : [],
        status,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // If published with due date, synchronize canonical event to calendar_events
    if (status === "published" && dueDate) {
      try {
        await supabase.from("calendar_events").insert({
          title: `Assignment Due: ${title.trim()}`,
          description: `Course assignment due: ${instructions.slice(0, 200)}`,
          event_type: "assignment",
          course_id: courseId,
          subject_id: subjectId || null,
          start_time: new Date(dueDate).toISOString(),
          end_time: new Date(new Date(dueDate).getTime() + 30 * 60 * 1000).toISOString(),
          location_url: `/assignments?id=${assignment.id}`,
          created_by: user.id,
        });
      } catch (calErr) {
        console.warn("[api/assignments] Calendar sync error:", calErr);
      }
    }

    // Post announcement to course feed
    if (status === "published" && subjectId) {
      try {
        await supabase.from("course_feed_posts").insert({
          subject_id: subjectId,
          author_id: user.id,
          title: `New Assignment: ${title.trim()}`,
          content: `A new course assignment has been assigned. Due: ${
            dueDate ? new Date(dueDate).toLocaleDateString() : "No deadline"
          }\n\n${instructions.slice(0, 300)}...`,
          post_type: "announcement",
          is_pinned: false,
        });
      } catch (feedErr) {
        console.warn("[api/assignments] Feed post error:", feedErr);
      }
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error: unknown) {
    console.error("[api/assignments] Creation error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create assignment" },
      { status: 500 }
    );
  }
}
