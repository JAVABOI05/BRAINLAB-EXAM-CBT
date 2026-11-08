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
        const [{ data: enrollments }, { data: courses }, { data: adminProfile }] = await Promise.all([
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
    const { data: adminRole } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const isPlatformAdmin = Boolean(adminRole && ["super_admin", "platform_admin"].includes(adminRole.role));

    let resolvedCourseId: string | null = course_id || null;
    let course: { id: string; tutor_id: string; subject_id: string | null } | null = null;

    if (resolvedCourseId) {
      const { data, error: courseError } = await supabase
        .from("courses")
        .select("id, tutor_id, subject_id")
        .eq("id", resolvedCourseId)
        .maybeSingle();
      if (courseError || !data) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      }
      course = data;
    } else if (subject_id) {
      // The existing subject-feed composer does not send course_id. Resolve it
      // only when exactly one course is unambiguous for this tutor/subject.
      const { data: subjectCourses, error: coursesError } = await supabase
        .from("courses")
        .select("id, tutor_id, subject_id")
        .eq("subject_id", subject_id);
      if (coursesError) {
        return NextResponse.json({ error: "Unable to resolve the course for this subject." }, { status: 500 });
      }
      let eligibleCourses = subjectCourses || [];
      if (!isPlatformAdmin) {
        const ownCourses = eligibleCourses.filter((item) => item.tutor_id === user.id);
        if (ownCourses.length) {
          eligibleCourses = ownCourses;
        } else {
          const { data: membership, error: membershipError } = await supabase
            .from("learning_subject_memberships")
            .select("subject_id")
            .eq("user_id", user.id)
            .eq("subject_id", subject_id)
            .eq("membership_role", "tutor")
            .maybeSingle();
          if (membershipError) {
            return NextResponse.json({ error: "Unable to verify subject teaching assignment." }, { status: 500 });
          }
          eligibleCourses = membership ? eligibleCourses : [];
        }
      }
      if (eligibleCourses.length !== 1) {
        return NextResponse.json(
          { error: eligibleCourses.length
            ? "More than one course is linked to this subject. Select a specific course before publishing."
            : "No course assigned to you was found for this subject." },
          { status: 400 }
        );
      }
      course = eligibleCourses[0];
      resolvedCourseId = course.id;
    } else {
      return NextResponse.json({ error: "A course or subject must be selected for this announcement." }, { status: 400 });
    }

    if (!course || (subject_id && course.subject_id && course.subject_id !== subject_id)) {
      return NextResponse.json({ error: "The selected course does not match this subject." }, { status: 400 });
    }

    let hasCourseTeachingAssignment = course.tutor_id === user.id;
    if (!hasCourseTeachingAssignment && course.subject_id) {
      const { data: membership, error: membershipError } = await supabase
        .from("learning_subject_memberships")
        .select("subject_id")
        .eq("user_id", user.id)
        .eq("subject_id", course.subject_id)
        .eq("membership_role", "tutor")
        .maybeSingle();
      if (membershipError) {
        return NextResponse.json({ error: "Unable to verify course teaching assignment." }, { status: 500 });
      }
      hasCourseTeachingAssignment = Boolean(membership);
    }
    if (!isPlatformAdmin && !hasCourseTeachingAssignment) {
      return NextResponse.json(
        { error: "You are not assigned to teach this course." },
        { status: 403 }
      );
    }

    if (audio_asset_id) {
      const { data: audioAsset, error: audioError } = await supabase
        .from("audio_assets")
        .select("id, user_id, asset_type, course_id")
        .eq("id", audio_asset_id)
        .maybeSingle();
      if (audioError || !audioAsset || audioAsset.user_id !== user.id ||
          audioAsset.asset_type !== "tutor_voice_note" ||
          (audioAsset.course_id && audioAsset.course_id !== course_id)) {
        return NextResponse.json({ error: "The selected audio attachment is not available to this course." }, { status: 403 });
      }
    }

    const { data: post, error: insertError } = await supabase
      .from("course_feed_posts")
      .insert({
        title,
        content,
        course_id: resolvedCourseId,
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
