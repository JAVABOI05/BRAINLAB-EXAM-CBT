import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "../../lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const classId = searchParams.get("classId");

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("class_recordings")
      .select("*, live_classes(title, scheduled_start_at), courses(title, slug)")
      .order("created_at", { ascending: false });

    if (courseId) query = query.eq("course_id", courseId);
    if (classId) query = query.eq("class_id", classId);

    const { data: recordings, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, recordings: recordings ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Verify user is tutor or admin
    const { data: adminRole } = await supabase
      .from("admin_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAuthorized =
      adminRole &&
      ["super_admin", "platform_admin", "teacher", "ai_learning_admin"].includes(adminRole.role);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      class_id,
      course_id,
      title,
      description,
      video_url,
      duration_seconds = 0,
      transcript_text,
      is_downloadable = false,
      access_policy = "enrolled_only",
    } = body;

    if (!class_id || !title || !video_url) {
      return NextResponse.json({ error: "Missing required recording fields." }, { status: 400 });
    }

    const { data: recording, error } = await supabase
      .from("class_recordings")
      .insert({
        class_id,
        course_id: course_id || null,
        title,
        description,
        video_url,
        duration_seconds,
        transcript_text,
        is_downloadable,
        access_policy,
        processing_status: "ready",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, recording });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
