"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DEFAULT_JAMB_SYLLABUS, type SyllabusSubject, type SyllabusTopic } from "../lib/curriculumData";

export default function CandidateSyllabusPage() {
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header Banner */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900">
                Official Examination Curriculum
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                JAMB UTME Official Syllabus
              </h1>
              <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
                Review official exam topics, subtopic breakdowns, specific learning objectives, and recommended literature texts for your examination combination.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/learn"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition"
              >
                ← Back to Learning Hub
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-4 py-2.5 text-xs font-black text-white shadow-sm transition active:scale-95"
              >
                Start CBT Practice →
              </Link>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, subtopics, or concepts (e.g. concord, calculus, waves, osmosis)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pl-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3.5 top-3 h-4 w-4 text-slate-400"
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
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? "bg-[#012153] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Syllabus Workspace */}
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Left Subject Navigation Rail */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 px-1">
              Select Subject ({filteredSubjects.length})
            </h2>

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
                    className={`flex items-center justify-between rounded-2xl p-3.5 text-left transition w-full shrink-0 lg:shrink ${
                      isSelected
                        ? "bg-[#012153] text-white shadow-sm ring-1 ring-blue-900"
                        : "bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-black ${isSelected ? "text-white" : "text-slate-900"}`}>
                        {subj.name}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                        {subj.topics.length} Syllabus Modules
                      </p>
                    </div>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        isSelected
                          ? "bg-blue-800 text-cyan-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {subj.category.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Syllabus Detail View */}
          <div className="space-y-6">
            {/* Subject Overview Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div>
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-900 border border-blue-200/80">
                    {activeSubject.category}
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                    {activeSubject.name} Syllabus
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/learn/${activeSubject.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 transition"
                  >
                    <span>Read Topic Notes</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#012153] hover:bg-blue-950 px-4 py-2 text-xs font-black text-white shadow-xs transition active:scale-95"
                  >
                    <span>Practise in CBT</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>

              {/* Syllabus Description & Overview */}
              <div className="mt-5 space-y-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Syllabus Aim &amp; Scope
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {activeSubject.syllabus_overview}
                  </p>
                </div>

                {/* General Objectives */}
                {activeSubject.general_objectives.length > 0 && (
                  <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-4">
                    <h4 className="text-xs font-bold text-blue-950 mb-2">
                      General Syllabus Objectives:
                    </h4>
                    <ul className="space-y-1.5 text-xs text-blue-900 leading-relaxed">
                      {activeSubject.general_objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Textbooks */}
                {activeSubject.recommended_textbooks.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">
                      Official Recommended Reading &amp; Texts:
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeSubject.recommended_textbooks.map((book, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700 flex items-start gap-2"
                        >
                          <svg className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
                          <span>{book}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Curriculum Topics List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Examination Topics &amp; Detailed Breakdown ({activeSubject.topics.length})
                </h3>
                <span className="text-xs text-slate-400">Click any topic to view subtopics &amp; learning targets</span>
              </div>

              {activeSubject.topics.map((topic, index) => {
                const isOpen = expandedTopicId === topic.id || (index === 0 && expandedTopicId === null);
                return (
                  <div
                    key={topic.id}
                    className="rounded-2xl border border-slate-200 bg-white transition shadow-2xs overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      className="flex w-full items-center justify-between p-5 text-left hover:bg-slate-50/60 transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-900 shrink-0">
                          {topic.order_index}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-950">
                            {topic.title}
                          </h4>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                            {topic.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {topic.subtopics.length} Subtopics
                        </span>
                        <svg
                          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-blue-600" : ""
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
                      <div className="border-t border-slate-100 bg-slate-50/40 p-5 space-y-4">
                        {/* Subtopics */}
                        <div>
                          <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                            Curriculum Subtopics &amp; Content Units:
                          </h5>
                          <div className="flex flex-wrap gap-1.5">
                            {topic.subtopics.map((st, i) => (
                              <span
                                key={i}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-medium"
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Learning Objectives */}
                        <div>
                          <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                            Candidates Are Expected To (Learning Objectives):
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed bg-white rounded-xl border border-slate-200/80 p-3.5">
                            {topic.learning_objectives.map((lo, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-600 font-bold">✓</span>
                                <span>{lo}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Actions for this topic */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                          <Link
                            href={`/learn/${activeSubject.slug}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 transition"
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
      </section>
    </div>
  );
}
