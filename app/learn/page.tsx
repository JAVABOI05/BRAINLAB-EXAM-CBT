"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Subject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  lessonCount: number;
  completedCount: number;
};

type RecentLessonResume = {
  id: string;
  title: string;
  subjectSlug: string;
  subjectName: string;
};

export default function LearnPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasStudentSession, setHasStudentSession] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentLesson, setRecentLesson] = useState<RecentLessonResume | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      const { data, error: queryError } = await supabase
        .from("learning_subjects")
        .select("id,name,slug,description,icon_url")
        .eq("is_published", true)
        .order("order_index", { ascending: true });

      if (!active) return;
      if (queryError) {
        setError("We could not load the Learning Hub yet. Please try again shortly.");
        setLoading(false);
        return;
      }

      const subjectRows = data ?? [];
      if (!subjectRows.length) {
        setSubjects([]);
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const studentId = sessionData.session?.user.id ?? null;
      if (!active) return;
      setHasStudentSession(Boolean(studentId));

      const subjectIds = subjectRows.map((subject) => subject.id);
      const { data: topicRows, error: topicError } = await supabase
        .from("learning_topics")
        .select("id,subject_id")
        .in("subject_id", subjectIds)
        .eq("is_published", true);

      if (topicError) {
        setError("We could not load subject progress information.");
        setLoading(false);
        return;
      }

      const topicIds = (topicRows ?? []).map((topic) => topic.id);
      const { data: lessonRows, error: lessonError } = topicIds.length
        ? await supabase.from("learning_lessons").select("id,topic_id,title").in("topic_id", topicIds).eq("is_published", true)
        : { data: [], error: null };

      if (lessonError) {
        setError("We could not load subject progress information.");
        setLoading(false);
        return;
      }

      let completedIds = new Set<string>();
      if (studentId && (lessonRows ?? []).length) {
        const { data: progressRows, error: progressError } = await supabase
          .from("learning_lesson_progress")
          .select("lesson_id, status, updated_at")
          .eq("student_id", studentId);

        if (!progressError && progressRows) {
          completedIds = new Set(
            progressRows.filter((r) => r.status === "completed").map((item) => item.lesson_id)
          );

          // Find the most recent active lesson to offer "Resume"
          const sorted = [...progressRows].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );

          if (sorted[0]?.lesson_id) {
            const lastLesson = (lessonRows ?? []).find((l) => l.id === sorted[0].lesson_id);
            if (lastLesson) {
              const parentTopic = (topicRows ?? []).find((t) => t.id === lastLesson.topic_id);
              const parentSubject = subjectRows.find((s) => s.id === parentTopic?.subject_id);
              if (parentSubject) {
                setRecentLesson({
                  id: lastLesson.id,
                  title: lastLesson.title,
                  subjectSlug: parentSubject.slug,
                  subjectName: parentSubject.name,
                });
              }
            }
          }
        }
      }

      if (!active) return;
      const lessonsBySubject = new Map<string, string[]>();
      for (const lesson of lessonRows ?? []) {
        const parentTopic = (topicRows ?? []).find((topic) => topic.id === lesson.topic_id);
        if (parentTopic) {
          lessonsBySubject.set(
            parentTopic.subject_id,
            [...(lessonsBySubject.get(parentTopic.subject_id) ?? []), lesson.id]
          );
        }
      }

      setSubjects(
        subjectRows.map((subject) => {
          const lessonIds = lessonsBySubject.get(subject.id) ?? [];
          return {
            ...subject,
            lessonCount: lessonIds.length,
            completedCount: lessonIds.filter((id) => completedIds.has(id)).length,
          };
        }) as Subject[]
      );
      setLoading(false);
    }

    void loadSubjects();
    return () => {
      active = false;
    };
  }, []);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q))
    );
  }, [subjects, searchQuery]);

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-blue-800">
          BrainLab Academy · Learning Hub
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
          Learn it. Practise it. Make it yours.
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
          Explore structured lessons, work through examples, and check your understanding as you go. Start with a subject and follow a topic one step at a time.
        </p>
      </div>

      {/* Resume Banner */}
      {recentLesson && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-900">
              Continue where you left off
            </span>
            <p className="mt-1 text-base font-extrabold text-slate-900">
              {recentLesson.subjectName}: {recentLesson.title}
            </p>
          </div>
          <Link
            href={`/learn/${recentLesson.subjectSlug}/${recentLesson.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-800"
          >
            Resume Lesson →
          </Link>
        </div>
      )}

      <section className="mt-10" aria-labelledby="subjects-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="subjects-heading" className="text-2xl font-extrabold text-slate-950">
              Explore subjects
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Only reviewed and published learning content appears here.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects…"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <Link href="/ai-learning" className="text-sm font-bold text-blue-800 underline underline-offset-4">
              AI Learning
            </Link>
          </div>
        </div>

        {loading && (
          <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">
            Loading published subjects…
          </p>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert">
            <p className="font-bold">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 font-bold underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && subjects.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 sm:p-12">
            <p className="text-sm font-extrabold uppercase tracking-wider text-blue-800">
              Your learning space is ready
            </p>
            <h3 className="mt-3 text-2xl font-black text-slate-950">
              New lessons are being prepared.
            </h3>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Published subjects will appear here when a tutor has created and reviewed the learning material. We will not show sample content as if it were an official course.
            </p>
            <Link href="/login" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white">
              Practise with CBT
            </Link>
          </div>
        )}

        {!loading && !error && subjects.length > 0 && filteredSubjects.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-bold text-slate-800">No subjects match &ldquo;{searchQuery}&rdquo;</p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs font-bold text-blue-700 underline"
            >
              Clear search filter
            </button>
          </div>
        )}

        {!loading && !error && filteredSubjects.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((subject) => (
              <Link
                key={subject.id}
                href={`/learn/${subject.slug}`}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl font-black text-blue-900"
                  aria-hidden="true"
                >
                  {subject.name.slice(0, 1).toUpperCase()}
                </div>
                <h3 className="mt-5 text-xl font-extrabold text-slate-950 group-hover:text-blue-800">
                  {subject.name}
                </h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                  {subject.description || "Explore lessons and practise the key ideas in this subject."}
                </p>
                <div className="mt-5 rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
                    <span>{hasStudentSession ? "Lesson progress" : "Available lessons"}</span>
                    <span>
                      {hasStudentSession
                        ? `${subject.completedCount}/${subject.lessonCount} complete`
                        : `${subject.lessonCount} lessons`}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{
                        width: `${
                          hasStudentSession && subject.lessonCount
                            ? (subject.completedCount / subject.lessonCount) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  {!hasStudentSession && (
                    <span className="mt-2 block text-xs text-slate-500">
                      Sign in to track your progress.
                    </span>
                  )}
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-blue-800">
                  Explore subject <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
