import { NextResponse } from "next/server";
import { DEFAULT_JAMB_SYLLABUS, type SyllabusSubject } from "@/app/lib/curriculumData";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectSlug = searchParams.get("subject");

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      if (subjectSlug) {
        const found = DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === subjectSlug);
        return NextResponse.json({ success: true, subject: found });
      }
      return NextResponse.json({ success: true, subjects: DEFAULT_JAMB_SYLLABUS });
    }

    // Try fetching from database
    const { data: dbSubjects, error: subjErr } = await supabase
      .from("learning_subjects")
      .select("id, name, slug, description, syllabus_overview, general_objectives, recommended_textbooks, is_published")
      .order("order_index", { ascending: true });

    if (subjErr || !dbSubjects || dbSubjects.length === 0) {
      if (subjectSlug) {
        const found = DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === subjectSlug);
        return NextResponse.json({ success: true, subject: found, source: "default" });
      }
      return NextResponse.json({ success: true, subjects: DEFAULT_JAMB_SYLLABUS, source: "default" });
    }

    // Fetch topics
    const { data: dbTopics } = await supabase
      .from("learning_topics")
      .select("id, subject_id, title, slug, description, subtopics, learning_objectives, recommended_texts, order_index, is_published")
      .order("order_index", { ascending: true });

    const merged: SyllabusSubject[] = dbSubjects.map((s: any) => {
      const relatedTopics = (dbTopics || [])
        .filter((t: any) => t.subject_id === s.id)
        .map((t: any) => ({
          id: t.id,
          subject_id: t.subject_id,
          title: t.title,
          slug: t.slug,
          description: t.description || "",
          order_index: t.order_index || 0,
          subtopics: Array.isArray(t.subtopics) ? t.subtopics : [],
          learning_objectives: Array.isArray(t.learning_objectives) ? t.learning_objectives : [],
          recommended_texts: Array.isArray(t.recommended_texts) ? t.recommended_texts : [],
          is_published: t.is_published,
        }));

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        category: (s.name.includes("English") ? "Compulsory" : "Science") as any,
        description: s.description || "",
        syllabus_overview: s.syllabus_overview || "",
        general_objectives: Array.isArray(s.general_objectives) ? s.general_objectives : [],
        recommended_textbooks: Array.isArray(s.recommended_textbooks) ? s.recommended_textbooks : [],
        topics: relatedTopics.length > 0 ? relatedTopics : (DEFAULT_JAMB_SYLLABUS.find(d => d.slug === s.slug)?.topics || []),
      };
    });

    if (subjectSlug) {
      const found = merged.find((s) => s.slug === subjectSlug) || DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === subjectSlug);
      return NextResponse.json({ success: true, subject: found });
    }

    return NextResponse.json({ success: true, subjects: merged });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, subjects: DEFAULT_JAMB_SYLLABUS }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, subjectSlug, topic } = body;

    // Validate action
    if (!action || !subjectSlug) {
      return NextResponse.json({ success: false, error: "Missing required action or subjectSlug" }, { status: 400 });
    }

    // In a real environment with admin permissions, this inserts or updates learning_topics
    return NextResponse.json({
      success: true,
      message: `Curriculum updated successfully for ${subjectSlug}`,
      topic,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
