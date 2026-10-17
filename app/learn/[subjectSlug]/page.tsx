"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Subject = { id: string; name: string; slug: string; description: string | null };
type Lesson = { id: string; title: string; summary: string | null; estimated_duration_mins: number; order_index: number };
type Topic = { id: string; title: string; slug: string; description: string | null; order_index: number; lessons: Lesson[]; completedCount: number; test: { id: string; title: string } | null };

export default function SubjectLearningPage() {
  const params = useParams<{ subjectSlug: string }>();
  const subjectSlug = decodeURIComponent(params.subjectSlug);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasStudentSession, setHasStudentSession] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSubject() {
      setLoading(true);
      setError("");
      const { data: subjectData, error: subjectError } = await supabase
        .from("learning_subjects")
        .select("id,name,slug,description")
        .eq("slug", subjectSlug)
        .eq("is_published", true)
        .maybeSingle();
      if (!active) return;
      if (subjectError || !subjectData) {
        setError("This subject is not available or has not been published.");
        setLoading(false);
        return;
      }

      const { data: topicData, error: topicError } = await supabase
        .from("learning_topics")
        .select("id,title,slug,description,order_index")
        .eq("subject_id", subjectData.id)
        .eq("is_published", true)
        .order("order_index", { ascending: true });
      if (!active) return;
      if (topicError) {
        setError("We could not load the topics for this subject.");
        setLoading(false);
        return;
      }

      const topicRows = topicData ?? [];
      const topicIds = topicRows.map((topic) => topic.id);
      const { data: testRows, error: testsError } = topicIds.length
        ? await supabase.from("learning_topic_tests").select("id,topic_id,title").in("topic_id", topicIds).eq("is_published", true)
        : { data: [], error: null };
      if (!active) return;
      if (testsError) {
        setError("Published topic assessments could not be loaded.");
        setLoading(false);
        return;
      }
      const testsByTopic = new Map((testRows ?? []).map((item) => [item.topic_id, { id: item.id, title: item.title }]));
      const lessonResults = await Promise.all(topicRows.map(async (topic) => {
        const { data, error: lessonError } = await supabase
          .from("learning_lessons")
          .select("id,title,summary,estimated_duration_mins,order_index")
          .eq("topic_id", topic.id)
          .eq("is_published", true)
          .order("order_index", { ascending: true });
        return { topicId: topic.id, lessons: lessonError ? null : (data ?? []) };
      }));
      if (!active) return;
      if (lessonResults.some((item) => item.lessons === null)) {
        setError("Some lessons could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const studentId = sessionData.session?.user.id ?? null;
      setHasStudentSession(Boolean(studentId));
      const allLessons = lessonResults.flatMap((item) => item.lessons ?? []) as Lesson[];
      let completedIds = new Set<string>();
      if (studentId && allLessons.length) {
        const { data: progressRows, error: progressError } = await supabase
          .from("learning_lesson_progress")
          .select("lesson_id")
          .eq("student_id", studentId)
          .eq("status", "completed");
        if (progressError) {
          setError("Your learning progress is temporarily unavailable.");
          setLoading(false);
          return;
        }
        completedIds = new Set((progressRows ?? []).map((item) => item.lesson_id));
      }
      if (!active) return;
      setSubject(subjectData as Subject);
      setTopics(topicRows.map((topic) => {
        const lessons = (lessonResults.find((item) => item.topicId === topic.id)?.lessons ?? []) as Lesson[];
        return {
          ...topic,
          lessons,
          completedCount: lessons.filter((lesson) => completedIds.has(lesson.id)).length,
          test: testsByTopic.get(topic.id) ?? null,
        };
      }) as Topic[]);
      setLoading(false);
    }
    void loadSubject();
    return () => { active = false; };
  }, [subjectSlug]);

  const lessonCount = topics.reduce((total, topic) => total + topic.lessons.length, 0);

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
      <Link href="/learn" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-blue-800 underline underline-offset-4">← All subjects</Link>
      {loading && <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">Loading subject…</p>}
      {!loading && error && <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert"><h1 className="text-xl font-extrabold">Subject unavailable</h1><p className="mt-2">{error}</p><Link href="/learn" className="mt-4 inline-block font-bold underline underline-offset-4">Return to subjects</Link></div>}
      {!loading && !error && subject && (
        <>
          <header className="mt-6 rounded-3xl bg-[#061a3a] p-7 text-white sm:p-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-200">Learning subject</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{subject.name}</h1>
            <p className="mt-4 max-w-3xl leading-7 text-blue-100">{subject.description || "Work through the topics in order, study each lesson, and use checkpoints to test your understanding."}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-white/20 px-3 py-1.5">{topics.length} published {topics.length === 1 ? "topic" : "topics"}</span>
              <span className="rounded-full border border-white/20 px-3 py-1.5">{lessonCount} published {lessonCount === 1 ? "lesson" : "lessons"}</span>
            </div>
          </header>

          <section className="mt-10" aria-labelledby="topics-heading">
            <h2 id="topics-heading" className="text-2xl font-extrabold text-slate-950">Topics and lessons</h2>
            {topics.length === 0 && <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 leading-7 text-slate-600">This subject has no published topics yet. Check back when a tutor publishes the first lesson.</p>}
            <div className="mt-5 space-y-4">
              {topics.map((topic, index) => (
                <article key={topic.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-start gap-4 border-b border-slate-100 p-5 sm:p-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-900">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-extrabold text-slate-950">{topic.title}</h3>
                      {topic.description && <p className="mt-1 text-sm leading-6 text-slate-600">{topic.description}</p>}
                      <p className="mt-2 text-xs font-semibold text-slate-500">{topic.lessons.length} published {topic.lessons.length === 1 ? "lesson" : "lessons"}</p><div className="mt-3 max-w-xs"><div className="flex justify-between gap-3 text-xs font-semibold text-slate-500"><span>{hasStudentSession ? "Progress" : "Sign in to track progress"}</span>{hasStudentSession && <span>{topic.completedCount}/{topic.lessons.length} complete</span>}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${hasStudentSession && topic.lessons.length ? (topic.completedCount / topic.lessons.length) * 100 : 0}%` }} /></div></div>
                    </div>
                  </div>
                  {topic.lessons.length > 0 ? (
                    <ol className="divide-y divide-slate-100">
                      {topic.lessons.map((lesson, lessonIndex) => (
                        <li key={lesson.id}>
                          <Link href={`/learn/${subject.slug}/${lesson.id}`} className="flex min-h-16 items-center gap-4 px-5 py-4 transition hover:bg-blue-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-700 sm:px-6">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xs font-bold text-slate-600">{lessonIndex + 1}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-bold text-slate-900">{lesson.title}</span>
                              {lesson.summary && <span className="mt-1 block text-sm leading-5 text-slate-600">{lesson.summary}</span>}
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-slate-500">{lesson.estimated_duration_mins} min</span>
                            <span className="text-lg font-bold text-blue-800" aria-hidden="true">→</span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="px-5 py-4 text-sm text-slate-500 sm:px-6">Lessons for this topic are being prepared.</p>}
                  {topic.test && <div className="border-t border-slate-100 bg-blue-50/50 px-5 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-slate-950">{topic.test.title}</p><p className="mt-1 text-xs text-slate-600">Check what you understand after studying this topic.</p></div><Link href={`/learn/${subject.slug}/topic/${topic.slug}/test`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#012153] px-4 py-2.5 text-sm font-bold text-white">Take topic test →</Link></div></div>}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
