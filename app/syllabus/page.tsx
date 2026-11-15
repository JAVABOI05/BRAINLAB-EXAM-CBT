"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DEFAULT_JAMB_SYLLABUS, type SyllabusSubject } from "../lib/curriculumData";

type ExamProgramme = "utme" | "waec" | "neco";

interface ProgrammeOption {
  id: ExamProgramme;
  label: string;
  status: "active" | "in_review";
}

const PROGRAMMES: ProgrammeOption[] = [
  { id: "utme", label: "JAMB UTME", status: "active" },
  { id: "waec", label: "WAEC SSCE", status: "in_review" },
  { id: "neco", label: "NECO SSCE", status: "in_review" },
];

export default function CandidateSyllabusPage() {
  const [selectedProgramme, setSelectedProgramme] = useState<ExamProgramme>("utme");
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState<string>("use-of-english");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const categories = ["All", "Compulsory", "Science", "Arts & Humanities", "Commercial & Social Sciences"];

  const filteredSubjects = useMemo(() => {
    return DEFAULT_JAMB_SYLLABUS.filter((subj) => {
      if (selectedCategory !== "All" && subj.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchSubject = subj.name.toLowerCase().includes(q) || subj.description.toLowerCase().includes(q);
      const matchTopic = subj.topics.some(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subtopics.some((st) => st.toLowerCase().includes(q)) ||
          t.learning_objectives.some((lo) => lo.toLowerCase().includes(q))
      );
      return matchSubject || matchTopic;
    });
  }, [selectedCategory, searchQuery]);

  const activeSubject = useMemo<SyllabusSubject>(() => {
    const found = DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === selectedSubjectSlug);
    return found || filteredSubjects[0] || DEFAULT_JAMB_SYLLABUS[0];
  }, [selectedSubjectSlug, filteredSubjects]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopicId((prev) => (prev === topicId ? null : topicId));
  };

  return (
    <div className="syllabus-page min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* 1. Header Banner & Atmospheric Curriculum Command Center */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(6,182,212,0.12),transparent_70%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/70 dark:text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
                <span>Official Examination Curriculum</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                National Syllabus Explorer
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Review official exam topics, subtopic breakdowns, specific learning objectives, and recommended literature texts for your examination combination.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/learn"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
              >
                ← Back to Learning Hub
              </Link>
              <Link
                href="/cbt"
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 px-5 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95"
              >
                Start CBT Practice →
              </Link>
            </div>
          </div>

          {/* Programme Level Switcher Bar */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
              Examination Body:
            </span>
            {PROGRAMMES.map((prog) => {
              const isSelected = selectedProgramme === prog.id;
              return (
                <button
                  key={prog.id}
                  type="button"
                  onClick={() => setSelectedProgramme(prog.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#012153] dark:bg-blue-600 text-white shadow-md font-black scale-[1.02]"
                      : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{prog.label}</span>
                  {prog.status === "in_review" && (
                    <span className="rounded-md bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-black text-amber-800 dark:text-amber-300">
                      In Review
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Category Filter Strip */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, subtopics, or concepts (e.g. concord, calculus, waves, osmosis)..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-4 py-2.5 pl-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <svg
                className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => {
                const isCatSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      isCatSelected
                        ? "bg-[#012153] dark:bg-blue-600 text-white shadow-xs font-black"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. When WAEC or NECO is selected in review */}
      {selectedProgramme !== "utme" ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-8 sm:p-12 text-center dark:border-amber-900/60 dark:bg-amber-950/20 max-w-3xl mx-auto space-y-4">
            <span className="inline-block rounded-full bg-amber-200 dark:bg-amber-900/60 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
              Curriculum In Editorial Review
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              {selectedProgramme.toUpperCase()} Syllabus Modules Are Under Final Verification
            </h2>
            <p className="mx-auto max-w-lg text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              To guarantee zero invented curriculum content (Rule S6), our academic desk is currently auditing the 2026/2027 syllabus standards with national exam bodies. In the meantime, explore the official JAMB UTME syllabus or practice with verified questions.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedProgramme("utme")}
                className="rounded-xl bg-[#012153] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition"
              >
                View JAMB UTME Syllabus
              </button>
              <Link
                href="/cbt"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Practice CBT Now
              </Link>
            </div>
          </div>
        </section>
      ) : (
        /* 3. Main Syllabus Explorer Observatory */
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[290px_1fr] items-start">
            {/* Left Subject Navigation Rail */}
            <div className="space-y-3 sticky top-24">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select Subject ({filteredSubjects.length})
                </h2>
              </div>

              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {filteredSubjects.map((subj) => {
                  const isSelected = activeSubject.slug === subj.slug;
                  return (
                    <button
                      key={subj.slug}
                      type="button"
                      onClick={() => {
                        setSelectedSubjectSlug(subj.slug);
                        setExpandedTopicId(null);
                      }}
                      className={`flex items-center justify-between rounded-2xl p-4 text-left transition w-full shrink-0 lg:shrink cursor-pointer border ${
                        isSelected
                          ? "bg-[#012153] dark:bg-blue-600 text-white shadow-md border-blue-900 dark:border-blue-500 scale-[1.01]"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-black ${isSelected ? "text-white" : "text-slate-950 dark:text-white"}`}>
                          {subj.name}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${isSelected ? "text-cyan-200" : "text-slate-600 dark:text-slate-400"}`}>
                          {subj.topics.length} Syllabus Modules
                        </p>
                      </div>

                      <span
                        className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          isSelected
                            ? "bg-blue-800/80 text-cyan-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {subj.category.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Syllabus Detail Stage */}
            <div className="space-y-8">
              {/* Active Subject Dossier Banner */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0a152b] p-6 sm:p-8 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="space-y-1.5">
                    <span className="rounded-md bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-cyan-300 border border-blue-200/80 dark:border-blue-800">
                      {activeSubject.category}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
                      {activeSubject.name} Syllabus
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/learn/${activeSubject.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
                    >
                      <span>Read Topic Notes</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      href="/cbt"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#012153] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-xs font-black text-white shadow-xs transition active:scale-95"
                    >
                      <span>Practise in CBT</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>

                {/* Scope & Objectives */}
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Syllabus Aim &amp; Scope
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeSubject.syllabus_overview}
                    </p>
                  </div>

                  {/* General Objectives */}
                  {activeSubject.general_objectives.length > 0 && (
                    <div className="rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-4 sm:p-5 space-y-2">
                      <h4 className="text-xs font-bold text-blue-950 dark:text-cyan-200">
                        General Syllabus Objectives:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                        {activeSubject.general_objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-cyan-400 font-bold">•</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Textbooks */}
                  {activeSubject.recommended_textbooks.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Official Recommended Reading &amp; Texts:
                      </h4>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {activeSubject.recommended_textbooks.map((book, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5"
                          >
                            <svg className="h-4 w-4 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
                            <span>{book}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Curriculum Topics List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Examination Topics &amp; Detailed Breakdown ({activeSubject.topics.length})
                  </h3>
                  <span className="text-xs text-slate-400">Click any topic to expand learning targets</span>
                </div>

                <div className="space-y-3">
                  {activeSubject.topics.map((topic, index) => {
                    const isOpen = expandedTopicId === topic.id || (index === 0 && expandedTopicId === null);
                    return (
                      <div
                        key={topic.id}
                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0a152b] transition shadow-2xs overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTopic(topic.id)}
                          className="flex w-full items-center justify-between p-5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-xs font-black text-blue-900 shrink-0 dark:bg-blue-950 dark:text-cyan-300">
                              {topic.order_index}
                            </span>
                            <div>
                              <h4 className="text-sm font-black text-slate-950 dark:text-white">
                                {topic.title}
                              </h4>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                {topic.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="hidden sm:inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {topic.subtopics.length} Subtopics
                            </span>
                            <svg
                              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                                isOpen ? "rotate-180 text-blue-600 dark:text-cyan-400" : ""
                              }`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-5 space-y-4">
                            {/* Subtopics */}
                            <div>
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                                Curriculum Subtopics &amp; Content Units:
                              </h5>
                              <div className="flex flex-wrap gap-1.5">
                                {topic.subtopics.map((st, i) => (
                                  <span
                                    key={i}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 font-medium"
                                  >
                                    {st}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Learning Objectives */}
                            <div>
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                                Candidates Are Expected To (Learning Objectives):
                              </h5>
                              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4">
                                {topic.learning_objectives.map((lo, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                                    <span>{lo}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Action Link */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                              <Link
                                href={`/learn/${activeSubject.slug}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 dark:text-cyan-400 dark:hover:text-cyan-300 transition"
                              >
                                <span>Study Lesson for this Topic</span>
                                <span aria-hidden="true">→</span>
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
