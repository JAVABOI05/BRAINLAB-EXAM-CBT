/* eslint react-hooks/set-state-in-effect: "off" */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import TimetableSection from "../components/TimetableSection";
import { getDueSpacedReviews, rateCardReview, type SpacedReviewCard } from "../lib/spacedRepetition";

type Subject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  topicCount: number;
  lessonCount: number;
  completedCount: number;
};

type RecentLessonResume = {
  id: string;
  title: string;
  subjectSlug: string;
  subjectName: string;
};

type HubTab = "subjects" | "flashcards" | "timetable" | "live";

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<HubTab>("subjects");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasStudentSession, setHasStudentSession] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentLesson, setRecentLesson] = useState<RecentLessonResume | null>(null);
  const [customRoomId, setCustomRoomId] = useState("BL-LIVE-101");

  // Spaced Repetition Flashcards State
  const [spacedCards, setSpacedCards] = useState<SpacedReviewCard[]>([]);
  const [loadingSpaced, setLoadingSpaced] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [spacedReviewDone, setSpacedReviewDone] = useState(false);
  const [spacedRatingWorking, setSpacedRatingWorking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "timetable" || tabParam === "calendar") {
        setActiveTab("timetable");
      } else if (tabParam === "live" || tabParam === "classroom") {
        setActiveTab("live");
      } else if (tabParam === "flashcards" || tabParam === "review" || tabParam === "reviews") {
        setActiveTab("flashcards");
      }
    }
  }, []);

  useEffect(() => {
    void getDueSpacedReviews().then((cards) => {
      setSpacedCards(cards);
      setLoadingSpaced(false);
    });
  }, []);

  async function handleRateCard(rating: 1 | 2 | 3) {
    if (spacedRatingWorking || !spacedCards[currentCardIndex]) return;
    setSpacedRatingWorking(true);
    const card = spacedCards[currentCardIndex];
    await rateCardReview(card.id, rating);
    setCardFlipped(false);
    setSpacedRatingWorking(false);
    if (currentCardIndex + 1 < spacedCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setSpacedReviewDone(true);
    }
  }

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
            topicCount: (topicRows ?? []).filter((topic) => topic.subject_id === subject.id).length,
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
      {/* Unified Live Classroom Stage & Hero with Ambient Glow */}
      <div className="mb-8 rounded-3xl border border-blue-600/30 bg-gradient-to-br from-[#012153] via-blue-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" aria-hidden="true" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
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
              href="/syllabus"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 px-5 py-3.5 text-sm font-bold text-cyan-200 transition active:scale-95 backdrop-blur-md"
            >
              <svg className="h-4 w-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
              <span>Official Syllabus</span>
            </Link>
            <Link
              href="/classroom/BL-LIVE-101"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 hover:bg-emerald-300 px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Enter Live Stage</span>
            </Link>
            <button
              onClick={() => setActiveTab("timetable")}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition active:scale-95 ${
                activeTab === "timetable"
                  ? "bg-white text-slate-950 shadow-md"
                  : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Timetable</span>
            </button>
            <Link
              href="/recordings"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-3.5 text-sm font-bold text-white transition active:scale-95 backdrop-blur-md"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              <span>Recordings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Unified Navigation Tabs */}
      <div className="mb-8 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("subjects")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
            activeTab === "subjects"
              ? "bg-[#012153] dark:bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h10" />
          </svg>
          <span>Subjects &amp; Curriculum ({subjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("flashcards")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
            activeTab === "flashcards"
              ? "bg-[#012153] dark:bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span>Spaced Flashcards</span>
          {spacedCards.length > 0 && (
            <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-black">
              {spacedCards.length} due
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("timetable")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
            activeTab === "timetable"
              ? "bg-[#012153] dark:bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Academy Timetable &amp; Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab("live")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
            activeTab === "live"
              ? "bg-[#012153] dark:bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m22 8-6 4 6 4V8Z" />
            <rect width="14" height="12" x="2" y="6" rx="2" />
          </svg>
          <span>Live Classroom Portal</span>
        </button>
      </div>

      {/* TAB 1: SUBJECTS & CURRICULUM */}
      {activeTab === "subjects" && (
        <section aria-labelledby="subjects-heading" className="space-y-6">
          {/* Resume Banner */}
          {recentLesson && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 p-5 shadow-xs">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  Continue where you left off
                </span>
                <p className="mt-1 text-base font-extrabold text-slate-950 dark:text-white">
                  {recentLesson.subjectName}: {recentLesson.title}
                </p>
              </div>
              <Link
                href={`/learn/${recentLesson.subjectSlug}/${recentLesson.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition"
              >
                Resume Lesson →
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="subjects-heading" className="text-2xl font-extrabold text-slate-950 dark:text-white">
                Explore subjects
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Comprehensive curriculum modules for JAMB UTME, WAEC, NECO and secondary classes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subjects…"
                  className="rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#070d1e] pl-9 pr-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-700 shadow-xs"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <Link href="/ai-learning" className="text-sm font-bold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                <span>AI Studio</span>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </Link>
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-8 text-center text-slate-600 dark:text-slate-400 animate-pulse min-h-[200px] flex items-center justify-center" role="status">
              Loading published subjects…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-6 text-amber-950 dark:text-amber-200" role="alert">
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
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0B1536]/40 p-8 sm:p-12">
              <p className="text-sm font-extrabold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                Your learning space is ready
              </p>
              <h3 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                New lessons are being prepared.
              </h3>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">
                Published subjects will appear here when a tutor has created and reviewed the learning material.
              </p>
              <Link href="/login" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] dark:bg-blue-600 px-5 py-3 font-bold text-white">
                Practise with CBT
              </Link>
            </div>
          )}

          {!loading && !error && subjects.length > 0 && filteredSubjects.length === 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-8 text-center">
              <p className="font-bold text-slate-800 dark:text-slate-200">No subjects match &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs font-bold text-blue-700 dark:text-blue-400 underline"
              >
                Clear search filter
              </button>
            </div>
          )}

          {!loading && !error && filteredSubjects.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSubjects.map((subject) => {
                const percent =
                  hasStudentSession && subject.lessonCount
                    ? Math.round((subject.completedCount / subject.lessonCount) * 100)
                    : 0;

                return (
                  <Link
                    key={subject.id}
                    href={`/learn/${subject.slug}`}
                    className="group hover-lift rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-6 shadow-xs transition hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-700 min-h-[380px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/80 dark:to-indigo-950/80 text-xl font-black text-blue-900 dark:text-blue-200 ring-1 ring-blue-100 dark:ring-white/10 transition group-hover:scale-105"
                          aria-hidden="true"
                        >
                          {subject.icon_url ? (
                            <img src={subject.icon_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            subject.name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {subject.topicCount} {subject.topicCount === 1 ? "topic" : "topics"}
                          </span>
                          {hasStudentSession && percent > 0 && (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                              {percent}% done
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition">
                        {subject.name}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                        {subject.description || "Explore clear notes, tutor explanations, worked examples and quick knowledge checks."}
                      </p>
                    </div>

                    <div>
                      {/* Chapter Progress Bar */}
                      <div className="mt-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/90 dark:bg-[#070d1e]/80 p-3.5">
                        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                          <span>{hasStudentSession ? "Curriculum Progress" : "Available Lessons"}</span>
                          <span>
                            {hasStudentSession
                              ? `${subject.completedCount}/${subject.lessonCount} complete`
                              : `${subject.lessonCount} lessons`}
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
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
                          <span className="mt-2 block text-[11px] text-slate-500 dark:text-slate-400">
                            Sign in to track your mastery.
                          </span>
                        )}
                      </div>

                      <span className="mt-4 flex min-h-11 items-center justify-between gap-2 rounded-xl bg-[#012153] dark:bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-xs transition group-hover:bg-blue-900 dark:group-hover:bg-blue-500">
                        <span>Open learning space</span>
                        <span aria-hidden="true" className="text-base font-bold">→</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: SPACED FLASHCARDS & MEMORY DRILLS */}
      {activeTab === "flashcards" && (
        <section aria-labelledby="flashcards-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 id="flashcards-heading" className="text-2xl font-black text-slate-950 dark:text-white">
                SM-2 Spaced Repetition Flashcards
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Scientifically timed flashcard drills based on your CBT practice questions to ensure long-term retention.
              </p>
            </div>
            <Link
              href="/learning/revision"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              <span>Full Revision Planner →</span>
            </Link>
          </div>

          {loadingSpaced ? (
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-12 text-center text-xs text-slate-500 animate-pulse min-h-[360px] flex items-center justify-center">
              Loading active spaced review deck…
            </div>
          ) : spacedReviewDone || spacedCards.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-10 sm:p-14 text-center max-w-xl mx-auto space-y-4 min-h-[360px] flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                All Reviews Completed!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                Zero cards due for review today. Questions you miss during CBT practice or chapter quizzes will automatically appear here for spaced repetition.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("subjects")}
                  className="rounded-xl bg-[#012153] dark:bg-blue-600 hover:bg-blue-900 px-5 py-2.5 text-xs font-bold text-white transition"
                >
                  Explore Subjects →
                </button>
                <Link
                  href="/cbt"
                  className="rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                >
                  Start CBT Mock →
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Card {currentCardIndex + 1} of {spacedCards.length}</span>
                <span className="capitalize text-blue-600 dark:text-blue-400">
                  {spacedCards[currentCardIndex].subject} • {spacedCards[currentCardIndex].category}
                </span>
              </div>

              {/* Interactive Flashcard */}
              <div
                onClick={() => setCardFlipped(!cardFlipped)}
                className="cursor-pointer rounded-3xl border border-blue-500/30 bg-white dark:bg-[#0B1536] p-8 shadow-xl min-h-[280px] flex flex-col justify-between transition hover:border-blue-500"
              >
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {cardFlipped ? "Answer & Verification" : "Prompt / Question"}
                  </span>
                  <div className="mt-4 text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                    {cardFlipped ? (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Correct Answer</span>
                        </div>
                        <p className="text-emerald-700 dark:text-emerald-300 font-extrabold text-lg">
                          {spacedCards[currentCardIndex].correctAnswer || "Refer to subject notes"}
                        </p>
                      </div>
                    ) : (
                      <p>{spacedCards[currentCardIndex].questionText || "Recall the core theorem or formula for this topic."}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>{cardFlipped ? "Rate your recall below" : "Click anywhere to reveal answer"}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{cardFlipped ? "Flip Back ↺" : "Reveal Answer ↷"}</span>
                </div>
              </div>

              {/* Recall Rating Actions */}
              {cardFlipped && (
                <div className="grid grid-cols-3 gap-3 animate-fade-in pt-2">
                  <button
                    type="button"
                    disabled={spacedRatingWorking}
                    onClick={() => handleRateCard(1)}
                    className="rounded-2xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 p-3 text-center transition active:scale-95 disabled:opacity-50"
                  >
                    <span className="block text-xs font-black text-rose-700 dark:text-rose-300">Hard</span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Repeat in 1d</span>
                  </button>

                  <button
                    type="button"
                    disabled={spacedRatingWorking}
                    onClick={() => handleRateCard(2)}
                    className="rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 p-3 text-center transition active:scale-95 disabled:opacity-50"
                  >
                    <span className="block text-xs font-black text-amber-700 dark:text-amber-300">Good</span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Repeat in 3d</span>
                  </button>

                  <button
                    type="button"
                    disabled={spacedRatingWorking}
                    onClick={() => handleRateCard(3)}
                    className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 p-3 text-center transition active:scale-95 disabled:opacity-50"
                  >
                    <span className="block text-xs font-black text-emerald-700 dark:text-emerald-300">Easy</span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Mastered (7d)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: TIMETABLE & SCHEDULE */}
      {activeTab === "timetable" && (
        <section aria-labelledby="timetable-heading">
          <TimetableSection />
        </section>
      )}

      {/* TAB 4: LIVE CLASSROOM PORTAL */}
      {activeTab === "live" && (
        <section aria-labelledby="live-heading" className="space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-6 sm:p-8 shadow-xs">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Interactive Video &amp; Voice Stage
              </span>
              <h2 id="live-heading" className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
                Enter a Live Classroom
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Join a live lesson conducted by your instructor. You will be able to watch real-time screen shares, ask questions, raise your hand, and vote in live class polls.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {/* Quick Launch Demo/Active Room */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#070d1e] p-6 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Public Stage
                    </span>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Now
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-black text-slate-950 dark:text-white">
                    BrainLab Live Academic Stage (BL-LIVE-101)
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    General interactive hall with WebRTC low-latency streaming, screen sharing, and student participation.
                  </p>
                </div>

                <div className="mt-6">
                  <Link
                    href="/classroom/BL-LIVE-101"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#012153] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-500 px-5 py-3 text-sm font-bold text-white shadow-md transition active:scale-95"
                  >
                    Enter Main Stage Now →
                  </Link>
                </div>
              </div>

              {/* Custom Class Code / Room Join */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#070d1e] p-6 flex flex-col justify-between min-h-[220px]">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Custom Room ID
                  </span>
                  <h3 className="mt-3 text-xl font-black text-slate-950 dark:text-white">
                    Join with a Class Code
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Enter the room identifier given by your teacher (e.g. &ldquo;BL-LIVE-101&rdquo; or cohort room).
                  </p>

                  <div className="mt-4">
                    <input
                      type="text"
                      value={customRoomId}
                      onChange={(e) => setCustomRoomId(e.target.value.toUpperCase())}
                      placeholder="e.g. BL-LIVE-101"
                      className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 shadow-xs uppercase tracking-wider"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href={`/classroom/${customRoomId.trim() || "BL-LIVE-101"}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md transition active:scale-95"
                  >
                    Join Custom Room →
                  </Link>
                </div>
              </div>
            </div>

            {/* Past Recordings Shortcut */}
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 dark:border-white/10 pt-6 gap-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">Missed a live session?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Browse and rewatch past recorded classes with session materials.</p>
              </div>
              <Link
                href="/recordings"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 shadow-xs transition"
              >
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="20" height="15" x="2" y="4" rx="2" />
                  <polyline points="8 4 8 10 12 7" />
                </svg>
                <span>Browse All Recordings →</span>
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
