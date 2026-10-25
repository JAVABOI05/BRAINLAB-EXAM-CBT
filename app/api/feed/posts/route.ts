import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { logAdminAction } from "@/app/lib/platformConfig";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const courseId = searchParams.get("courseId");
    const tag = searchParams.get("tag");

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("course_feed_posts")
      .select("*, audio_assets(*), content_tags(tag_id, official_tags(*))")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (subjectId) query = query.eq("subject_id", subjectId);
    if (courseId) query = query.eq("course_id", courseId);

    const { data: posts, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let result = posts ?? [];
    if (tag && tag !== "all") {
      result = result.filter((p: any) =>
        p.content_tags?.some((ct: any) => ct.official_tags?.name === tag)
      );
    }

    return NextResponse.json({ success: true, posts: result });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Request failed" }, { status: 500 });
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
    return NextResponse.json({ error: err instanceof Error ? err.message : "Request failed" }, { status: 500 });
  }
}
