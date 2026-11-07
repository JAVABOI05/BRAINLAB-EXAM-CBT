import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { logAdminAction } from "@/app/lib/platformConfig";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const courseId = searchParams.get("courseId");
    const tag = searchParams.get("tag");
    const user = await getUserFromRequest(request);

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("course_feed_posts")
      .select("*, audio_assets(id, title, file_url, duration_seconds, mime_type), content_tags(tag_id, official_tags(*))")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (subjectId) query = query.eq("subject_id", subjectId);
    if (courseId) query = query.eq("course_id", courseId);

    const { data: posts, error } = await query;
    if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });

    let result = posts ?? [];
    const scopedCourseIds = [...new Set(result.map((post) => post.course_id).filter(Boolean))] as string[];
    if (scopedCourseIds.length) {
      if (!user) {
        result = result.filter((post) => !post.course_id);
      } else {
        const [{ data: enrollments }, { data: activeSubscription }, { data: courses }, { data: adminProfile }] = await Promise.all([
          supabase.from("course_enrollments")
            .select("course_id, expires_at")
            .eq("user_id", user.id)
            .eq("status", "active")
            .in("course_id", scopedCourseIds),
          supabase.from("courses")
            .select("id, tutor_id")
            .in("id", scopedCourseIds),
          supabase.from("admin_profiles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        const now = Date.now();
        const enrolledCourseIds = new Set((enrollments || [])
          .filter((enrollment) => !enrollment.expires_at || new Date(enrollment.expires_at).getTime() > now)
          .map((enrollment) => enrollment.course_id));
        const tutorCourseIds = new Set((courses || [])
          .filter((course) => course.tutor_id === user.id)
          .map((course) => course.id));
        const isAdmin = Boolean(adminProfile && ["super_admin", "platform_admin"].includes(adminProfile.role));
        result = result.filter((post) => !post.course_id ||
          isAdmin || enrolledCourseIds.has(post.course_id) ||
          tutorCourseIds.has(post.course_id));
      }
    }
    if (tag && tag !== "all") {
      result = result.filter((p) =>
        p.content_tags?.some((ct: { official_tags?: { name?: string | null } | null }) => ct.official_tags?.name === tag)
      );
    }

    return NextResponse.json({ success: true, posts: result });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
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
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAuthorized =
      adminRole &&
      ["super_admin", "platform_admin", "teacher", "ai_learning_admin"].includes(adminRole.role);

    const { data: memberships } = await supabase
      .from("learning_subject_memberships")
      .select("subject_id")
      .eq("user_id", user.id);

    const hasTeachingAssignment = (memberships && memberships.length > 0) || isAuthorized;

    if (!hasTeachingAssignment) {
      return NextResponse.json(
        { error: "Forbidden. Only authorized instructors can publish to the course feed." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      content,
      course_id,
      subject_id,
      post_type = "announcement",
      is_pinned = false,
      audio_asset_id,
      attachment_urls = [],
      tags = [],
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const { data: post, error: insertError } = await supabase
      .from("course_feed_posts")
      .insert({
        title,
        content,
        course_id: course_id || null,
        subject_id: subject_id || null,
        author_id: user.id,
        post_type,
        is_pinned,
        audio_asset_id: audio_asset_id || null,
        attachment_urls,
        status: "published",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await supabase.from("content_tags").insert({
          tag_id: tagId,
          content_type: "post",
          content_id: post.id,
          assigned_by: user.id,
        });
      }
    }

    await logAdminAction({
      admin_id: user.id,
      admin_email: user.email || "tutor@brainlabacademy.com",
      entity_type: "content",
      entity_id: post.id,
      action: "published",
      new_value: { title, post_type },
      change_reason: `Published course feed item: ${title}`,
    });

    return NextResponse.json({ success: true, post });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
