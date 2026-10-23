"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import TimetableSection from "../components/TimetableSection";

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

type HubTab = "subjects" | "timetable" | "live";

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<HubTab>("subjects");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasStudentSession, setHasStudentSession] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentLesson, setRecentLesson] = useState<RecentLessonResume | null>(null);
  const [customRoomId, setCustomRoomId] = useState("demo-class");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "timetable" || tabParam === "calendar") {
        setActiveTab("timetable");
      } else if (tabParam === "live" || tabParam === "classroom") {
        setActiveTab("live");
      }
    }
  }, []);

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
    <main id="main" className="mx-auto min-h-[75vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Unified Live Classroom Stage & Hero */}
      <div className="mb-8 rounded-3xl border border-blue-600/30 bg-gradient-to-br from-[#012153] via-blue-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Interactive Stage Ready
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Academy Learning Hub &amp; Live Classroom
            </h1>
            <p className="text-sm sm:text-base text-blue-100/90 max-w-2xl leading-relaxed">
              Your complete learning ecosystem: master curriculum subjects, attend interactive live classes with tutors, and manage your academic timetable in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/classroom/demo-class"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 hover:bg-emerald-300 px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition active:scale-95"
            >
              <span>🎥</span> Enter Live Stage
            </Link>
            <button
              onClick={() => setActiveTab("timetable")}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition active:scale-95 ${
                activeTab === "timetable"
                  ? "bg-white text-slate-950 shadow-md"
                  : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <span>📅</span> Timetable
            </button>
            <Link
              href="/recordings"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-3.5 text-sm font-bold text-white transition active:scale-95"
            >
              <span>📼</span> Recordings
            </Link>
          </div>
        </div>
      </div>

      {/* Unified Navigation Tabs */}
      <div className="mb-8 flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("subjects")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
            activeTab === "subjects"
              ? "bg-[#012153] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span>📚</span> Subjects &amp; Curriculum ({subjects.length})
        </button>
        <button
          onClick={() => setActiveTab("timetable")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
            activeTab === "timetable"
              ? "bg-[#012153] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span>📅</span> Academy Timetable &amp; Schedule
        </button>
        <button
          onClick={() => setActiveTab("live")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
            activeTab === "live"
              ? "bg-[#012153] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span>🎥</span> Live Classroom Portal
        </button>
      </div>

      {/* TAB 1: SUBJECTS & CURRICULUM */}
      {activeTab === "subjects" && (
        <section aria-labelledby="subjects-heading" className="space-y-6">
          {/* Resume Banner */}
          {recentLesson && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-xs">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                  Continue where you left off
                </span>
                <p className="mt-1 text-base font-extrabold text-slate-950">
                  {recentLesson.subjectName}: {recentLesson.title}
                </p>
              </div>
              <Link
                href={`/learn/${recentLesson.subjectSlug}/${recentLesson.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-blue-800 transition"
              >
                Resume Lesson →
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="subjects-heading" className="text-2xl font-extrabold text-slate-950">
                Explore subjects
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Comprehensive curriculum modules for JAMB UTME, WAEC, NECO and secondary classes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subjects…"
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 shadow-xs"
              />
              <Link href="/ai-learning" className="text-sm font-bold text-blue-800 hover:text-blue-900">
                AI Studio ↗
              </Link>
            </div>
          </div>

          {loading && (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">
              Loading published subjects…
            </p>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert">
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
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 sm:p-12">
              <p className="text-sm font-extrabold uppercase tracking-wider text-blue-800">
                Your learning space is ready
              </p>
              <h3 className="mt-3 text-2xl font-black text-slate-950">
                New lessons are being prepared.
              </h3>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                Published subjects will appear here when a tutor has created and reviewed the learning material.
              </p>
              <Link href="/cbt" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white">
                Practise with CBT
              </Link>
            </div>
          )}

          {!loading && !error && subjects.length > 0 && filteredSubjects.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSubjects.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/learn/${subject.slug}`}
                  className="group hover-lift rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-blue-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl font-black text-blue-900 group-hover:bg-blue-100 transition"
                    aria-hidden="true"
                  >
                    {subject.name.slice(0, 1).toUpperCase()}
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold text-slate-950 group-hover:text-blue-800">
                    {subject.name}
                  </h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600 line-clamp-2">
                    {subject.description || "Explore lessons, practical examples, and review key concepts."}
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
                        className="h-full rounded-full bg-emerald-600 transition-all duration-300"
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
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-blue-800 group-hover:translate-x-1 transition-transform">
                    Explore subject <span aria-hidden="true">→</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: TIMETABLE & SCHEDULE */}
      {activeTab === "timetable" && (
        <section aria-labelledby="timetable-heading">
          <TimetableSection />
        </section>
      )}

      {/* TAB 3: LIVE CLASSROOM PORTAL */}
      {activeTab === "live" && (
        <section aria-labelledby="live-heading" className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-900">
                Interactive Video &amp; Voice Stage
              </span>
              <h2 id="live-heading" className="mt-3 text-3xl font-black text-slate-950">
                Enter a Live Classroom
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Join a live lesson conducted by your instructor. You will be able to watch real-time screen shares, ask questions, raise your hand, and vote in live class polls.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {/* Quick Launch Demo/Active Room */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Public Stage
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      Live Now
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-black text-slate-950">
                    BrainLab Main Demo Stage
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    General interactive hall with WebRTC low-latency streaming, screen sharing, and student participation.
                  </p>
                </div>

                <div className="mt-6">
                  <Link
                    href="/classroom/demo-class"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-900 px-5 py-3 text-sm font-bold text-white shadow-md transition active:scale-95"
                  >
                    Enter Main Stage Now →
                  </Link>
                </div>
              </div>

              {/* Custom Class Code / Room Join */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Custom Room ID
                  </span>
                  <h3 className="mt-3 text-xl font-black text-slate-950">
                    Join with a Class Code
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Enter the room identifier given by your teacher (e.g. &ldquo;biology-ss3&rdquo; or &ldquo;jamb-prep&rdquo;).
                  </p>

                  <div className="mt-4">
                    <input
                      type="text"
                      value={customRoomId}
                      onChange={(e) => setCustomRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      placeholder="e.g. math-class-1"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href={`/classroom/${customRoomId.trim() || "demo-class"}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md transition active:scale-95"
                  >
                    Join Custom Room →
                  </Link>
                </div>
              </div>
            </div>

            {/* Past Recordings Shortcut */}
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-6 gap-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-950">Missed a live session?</h4>
                <p className="text-xs text-slate-500">Browse and rewatch past recorded classes with session materials.</p>
              </div>
              <Link
                href="/recordings"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
              >
                <span>📼</span> Browse All Recordings →
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
