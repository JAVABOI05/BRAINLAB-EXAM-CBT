import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

function slugify(value: string): string {
  const cleaned = value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `item-${Date.now().toString(36)}`;
}

async function verifyAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request);
  const supabase = getSupabaseServerClient();

  if (!user) {
    return { isAuthorized: false, user: null, role: null };
  }

  // 1. Check admin_profiles
  const { data: adminProfile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminProfile && ["super_admin", "platform_admin", "ai_learning_admin", "teacher"].includes(adminProfile.role)) {
    return { isAuthorized: true, user, role: adminProfile.role };
  }

  // 2. Check admin_users
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .or(`id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  if (adminUser && ["super_admin", "platform_admin", "ai_learning_admin", "teacher"].includes(adminUser.role)) {
    return { isAuthorized: true, user, role: adminUser.role };
  }

  // 3. Check admin_profiles
  const { data: adminUserRole } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminUserRole && ["super_admin", "platform_admin", "ai_learning_admin", "teacher"].includes(adminUserRole.role)) {
    return { isAuthorized: true, user, role: adminUserRole.role };
  }

  return { isAuthorized: false, user, role: null };
}

export async function GET(request: NextRequest) {
  try {
    const { isAuthorized } = await verifyAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator session required." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lesson_id");

    // If lesson_id is specified, return blocks for that lesson
    if (lessonId) {
      const { data: blocks, error: bErr } = await supabase
        .from("learning_lesson_blocks")
        .select("id, lesson_id, block_type, content, order_index, created_at")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });

      if (bErr) throw bErr;

      return NextResponse.json({
        ok: true,
        blocks: blocks || [],
      });
    }

    // Default: fetch subjects, topics, and lessons
    const [subjectsRes, topicsRes, lessonsRes] = await Promise.all([
      supabase
        .from("learning_subjects")
        .select("id, name, slug, description, is_published, order_index, created_at")
        .order("order_index", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("learning_topics")
        .select("id, subject_id, title, slug, description, is_published, order_index, created_at")
        .order("order_index", { ascending: true })
        .order("title", { ascending: true }),
      supabase
        .from("learning_lessons")
        .select("id, topic_id, title, summary, is_published, order_index, estimated_duration_mins, created_at")
        .order("order_index", { ascending: true })
        .order("title", { ascending: true }),
    ]);

    if (subjectsRes.error) throw subjectsRes.error;
    if (topicsRes.error) throw topicsRes.error;
    if (lessonsRes.error) throw lessonsRes.error;

    return NextResponse.json({
      ok: true,
      subjects: subjectsRes.data || [],
      topics: topicsRes.data || [],
      lessons: lessonsRes.data || [],
    });
  } catch (err: unknown) {
    console.error("[api/admin/content GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load learning content." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { isAuthorized, user } = await verifyAdmin(request);
    if (!isAuthorized || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator access required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { type, ...payload } = body as {
      type: "subject" | "topic" | "lesson" | "block";
      [key: string]: unknown;
    };

    const supabase = getSupabaseServerClient();

    if (type === "subject") {
      const name = String(payload.name || "").trim();
      if (!name) {
        return NextResponse.json({ ok: false, error: "Subject name is required." }, { status: 400 });
      }

      const baseSlug = slugify(String(payload.slug || name));
      let slug = baseSlug;

      // Ensure slug uniqueness
      const { data: existing } = await supabase
        .from("learning_subjects")
        .select("id, slug")
        .like("slug", `${baseSlug}%`);

      if (existing && existing.length > 0) {
        const slugs = new Set(existing.map((s) => s.slug));
        if (slugs.has(slug)) {
          let counter = 2;
          while (slugs.has(`${baseSlug}-${counter}`)) {
            counter++;
          }
          slug = `${baseSlug}-${counter}`;
        }
      }

      const { data: subject, error: subErr } = await supabase
        .from("learning_subjects")
        .insert({
          name,
          slug,
          description: payload.description ? String(payload.description).trim() : null,
          created_by: user.id,
          is_published: false,
          order_index: typeof payload.order_index === "number" ? payload.order_index : 0,
        })
        .select()
        .single();

      if (subErr) throw subErr;

      return NextResponse.json({
        ok: true,
        message: `Subject "${name}" created successfully.`,
        data: subject,
      });
    }

    if (type === "topic") {
      const subjectId = String(payload.subject_id || "").trim();
      const title = String(payload.title || "").trim();

      if (!subjectId) {
        return NextResponse.json({ ok: false, error: "Parent subject is required." }, { status: 400 });
      }
      if (!title) {
        return NextResponse.json({ ok: false, error: "Topic title is required." }, { status: 400 });
      }

      const baseSlug = slugify(String(payload.slug || title));
      let slug = baseSlug;

      // Ensure slug uniqueness within subject
      const { data: existing } = await supabase
        .from("learning_topics")
        .select("id, slug")
        .eq("subject_id", subjectId)
        .like("slug", `${baseSlug}%`);

      if (existing && existing.length > 0) {
        const slugs = new Set(existing.map((t) => t.slug));
        if (slugs.has(slug)) {
          let counter = 2;
          while (slugs.has(`${baseSlug}-${counter}`)) {
            counter++;
          }
          slug = `${baseSlug}-${counter}`;
        }
      }

      const { data: topic, error: topErr } = await supabase
        .from("learning_topics")
        .insert({
          subject_id: subjectId,
          title,
          slug,
          description: payload.description ? String(payload.description).trim() : null,
          created_by: user.id,
          is_published: false,
          order_index: typeof payload.order_index === "number" ? payload.order_index : 0,
        })
        .select()
        .single();

      if (topErr) throw topErr;

      return NextResponse.json({
        ok: true,
        message: `Topic "${title}" created successfully.`,
        data: topic,
      });
    }

    if (type === "lesson") {
      const topicId = String(payload.topic_id || "").trim();
      const title = String(payload.title || "").trim();

      if (!topicId) {
        return NextResponse.json({ ok: false, error: "Parent topic is required." }, { status: 400 });
      }
      if (!title) {
        return NextResponse.json({ ok: false, error: "Lesson title is required." }, { status: 400 });
      }

      const durationMins = Math.min(600, Math.max(1, Number(payload.estimated_duration_mins) || 5));

      const { data: lesson, error: lesErr } = await supabase
        .from("learning_lessons")
        .insert({
          topic_id: topicId,
          title,
          summary: payload.summary ? String(payload.summary).trim() : null,
          estimated_duration_mins: durationMins,
          created_by: user.id,
          is_published: false,
          order_index: typeof payload.order_index === "number" ? payload.order_index : 0,
        })
        .select()
        .single();

      if (lesErr) throw lesErr;

      return NextResponse.json({
        ok: true,
        message: `Lesson "${title}" created successfully.`,
        data: lesson,
      });
    }

    if (type === "block") {
      const lessonId = String(payload.lesson_id || "").trim();
      const blockType = String(payload.block_type || "text").trim();
      const content = payload.content && typeof payload.content === "object" ? payload.content : {};
      const orderIndex = typeof payload.order_index === "number" ? payload.order_index : 0;

      if (!lessonId) {
        return NextResponse.json({ ok: false, error: "Lesson ID is required." }, { status: 400 });
      }

      const { data: block, error: blockErr } = await supabase
        .from("learning_lesson_blocks")
        .insert({
          lesson_id: lessonId,
          block_type: blockType,
          content,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (blockErr) throw blockErr;

      return NextResponse.json({
        ok: true,
        message: "Lesson block created successfully.",
        data: block,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid content type specified." }, { status: 400 });
  } catch (err: unknown) {
    console.error("[api/admin/content POST] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to create content item." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { isAuthorized } = await verifyAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator access required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { type, id, updates } = body as {
      type: "subject" | "topic" | "lesson" | "block";
      id: string;
      updates: Record<string, unknown>;
    };

    if (!type || !id || !updates || typeof updates !== "object") {
      return NextResponse.json({ ok: false, error: "Type, id, and updates are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const table =
      type === "subject"
        ? "learning_subjects"
        : type === "topic"
        ? "learning_topics"
        : type === "lesson"
        ? "learning_lessons"
        : type === "block"
        ? "learning_lesson_blocks"
        : null;

    if (!table) {
      return NextResponse.json({ ok: false, error: "Invalid content type." }, { status: 400 });
    }

    const { error: patchErr } = await supabase
      .from(table)
      .update(updates)
      .eq("id", id);

    if (patchErr) throw patchErr;

    return NextResponse.json({
      ok: true,
      message: "Content item updated successfully.",
    });
  } catch (err: unknown) {
    console.error("[api/admin/content PATCH] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to update item." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { isAuthorized } = await verifyAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator access required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ ok: false, error: "Type and id are required to delete." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const table =
      type === "subject"
        ? "learning_subjects"
        : type === "topic"
        ? "learning_topics"
        : type === "lesson"
        ? "learning_lessons"
        : type === "block"
        ? "learning_lesson_blocks"
        : null;

    if (!table) {
      return NextResponse.json({ ok: false, error: "Invalid content type." }, { status: 400 });
    }

    const { error: delErr } = await supabase.from(table).delete().eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({
      ok: true,
      message: "Content item deleted successfully.",
    });
  } catch (err: unknown) {
    console.error("[api/admin/content DELETE] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to delete item." },
      { status: 500 }
    );
  }
}
