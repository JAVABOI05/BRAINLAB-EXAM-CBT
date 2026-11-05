"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLearnerTheme } from "@/app/components/LearnerThemeProvider";
import BrandHeader from "@/app/components/BrandHeader";
import BrandFooter from "@/app/components/BrandFooter";
import type { StemResource, StemResourceType, StemExperimentAttempt } from "@/app/lib/stem/stemService";
import { INITIAL_STEM_RESOURCES } from "@/app/lib/stem/seedData";

const SUBJECT_TABS = [
  { id: "all", label: "All Subjects", icon: "🌐" },
  { id: "subj-math", label: "Mathematics", icon: "📐" },
  { id: "subj-physics", label: "Physics", icon: "⚡" },
  { id: "subj-chem", label: "Chemistry", icon: "🧪" },
  { id: "subj-bio", label: "Biology", icon: "🧬" },
  { id: "subj-eng", label: "Engineering & Logic", icon: "🤖" },
];

export default function StemStudioHubPage() {
  const router = useRouter();
  const { resolvedTheme } = useLearnerTheme();

  const [activeHubTab, setActiveHubTab] = useState<"catalog" | "workspace">("catalog");
  const [resources, setResources] = useState<StemResource[]>(INITIAL_STEM_RESOURCES);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedTier, setSelectedTier] = useState<number | "all">("all");
  const [selectedType, setSelectedType] = useState<StemResourceType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Student Workspace & Attempts
  const [attempts, setAttempts] = useState<StemExperimentAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadResources() {
      try {
        setLoading(true);
        const res = await fetch("/api/stem/resources?status=published");
        if (res.ok) {
          const data = await res.json();
          if (active && data.ok && Array.isArray(data.resources) && data.resources.length > 0) {
            setResources(data.resources);
          }
        }
      } catch {
        // Fallback already pre-set to INITIAL_STEM_RESOURCES
      } finally {
        if (active) setLoading(false);
      }
    }
    loadResources();
    return () => {
      active = false;
    };
  }, []);

  // Fetch Student's graded attempts when switching to workspace tab
  useEffect(() => {
    let active = true;
    async function loadAttempts() {
      if (activeHubTab !== "workspace") return;
      try {
        setLoadingAttempts(true);
        const res = await fetch("/api/stem/attempts");
        if (res.ok) {
          const data = await res.json();
          if (active && data.ok && Array.isArray(data.attempts)) {
            setAttempts(data.attempts);
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (active) setLoadingAttempts(false);
      }
    }
    loadAttempts();
    return () => {
      active = false;
    };
  }, [activeHubTab]);

  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      if (
        selectedSubject !== "all" &&
        res.subject_id !== selectedSubject &&
        res.subject?.slug !== selectedSubject &&
        !(selectedSubject === "subj-eng" && res.subject_id === "subj-engineering")
      ) {
        return false;
      }
      if (selectedTier !== "all" && res.tier !== selectedTier) {
        return false;
      }
      if (selectedType !== "all" && res.resource_type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = res.title.toLowerCase().includes(q);
        const matchSummary = res.summary.toLowerCase().includes(q);
        const matchTags = res.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchTags) return false;
      }
      return true;
    });
  }, [resources, selectedSubject, selectedTier, selectedType, searchQuery]);

  const featured = useMemo(() => {
    return resources.find((r) => r.is_featured) || resources[0];
  }, [resources]);

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <BrandHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
          <span>/</span>
          <Link href="/classroom" className="hover:text-white transition">Live Classroom</Link>
          <span>/</span>
          <span className="text-cyan-400 font-bold">STEM Studio</span>
        </nav>

        {/* Hero Banner */}
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B1536] via-[#0e1c45] to-[#070d1e] p-6 sm:p-10 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <span>🔬</span>
              <span>BrainLab STEM Studio v3.0</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Interactive STEM Teaching &amp; Virtual Laboratory
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Explore parameterised 2D physics simulations, dynamic algebraic graphing, digital electronics logic, and virtual chemistry apparatus aligned with the official Nigerian JAMB UTME, WAEC, and NECO syllabi.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={`/classroom/stem/${featured.slug}`}
                className="px-5 py-2.5 rounded-xl bg-[#1356E8] hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
              >
                <span>🚀</span>
                <span>Launch Featured: {featured.title}</span>
              </Link>
              <Link
                href="/classroom/studio"
                className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition flex items-center gap-2"
              >
                <span>🎬</span>
                <span>Open Prep Studio (Tutor)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* STEM Arena Callout Card */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-[#0B1536] to-[#070d1e] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">STEM Battle Arena Challenges</h2>
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                  Live Competitions
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Compete head-to-head in timed STEM speed drills, circuit analysis, and formula derivations against top students nationwide.
              </p>
            </div>
          </div>
          <Link
            href="/competitions"
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Enter Competition Arena →
          </Link>
        </div>

        {/* Hub Tabs: Catalog vs Workspace */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveHubTab("catalog")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeHubTab === "catalog"
                ? "bg-[#1356E8] text-white shadow-md shadow-blue-500/20"
                : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            <span>📚</span>
            <span>Simulation Catalog ({resources.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveHubTab("workspace")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeHubTab === "workspace"
                ? "bg-[#1356E8] text-white shadow-md shadow-blue-500/20"
                : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            <span>📝</span>
            <span>My Workspace &amp; Graded Reports</span>
            {attempts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-[10px] text-white font-mono">
                {attempts.length}
              </span>
            )}
          </button>
        </div>

        {activeHubTab === "workspace" ? (
          /* Student Workspace & Graded Attempts Tab */
          <section aria-label="Student Workspace" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>📊</span>
                  <span>My Laboratory Submissions &amp; Academic Feedback</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your submitted experiment attempts, parameter sets, and tutor evaluation grades.
                </p>
              </div>
              {loadingAttempts && <span className="text-xs text-slate-400 animate-pulse">Loading reports...</span>}
            </div>

            {attempts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-12 text-center space-y-3">
                <span className="text-4xl">🧪</span>
                <h3 className="text-base font-bold text-white">No lab experiment reports yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Launch any simulation lab from the catalog, record your hypothesis and observations, and click &ldquo;Save Experiment Attempt&rdquo; to submit for tutor grading.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveHubTab("catalog")}
                  className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition"
                >
                  Explore Simulation Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attempts.map((att) => (
                  <article
                    key={att.id}
                    className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 flex flex-col justify-between space-y-4 shadow-lg hover:border-blue-500/40 transition"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          {new Date(att.submitted_at || att.started_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                            att.status === "graded"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {att.status === "graded" ? `Graded: ${att.tutor_score ?? "--"}/100` : "Pending Evaluation"}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Experiment Attempt #{att.id.slice(0, 8)}
                        </h4>
                        {typeof att.observations?.notes === "string" && att.observations.notes && (
                          <p className="text-xs text-slate-300 mt-1 italic line-clamp-2">
                            &ldquo;{att.observations.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      {att.tutor_feedback && (
                        <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3 text-xs text-cyan-200 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                            <span>👨‍🏫</span>
                            <span>Tutor Academic Feedback</span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{att.tutor_feedback}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">
                        ID: {att.id.slice(0, 12)}...
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveHubTab("catalog")}
                        className="text-cyan-400 hover:underline font-bold"
                      >
                        Launch Another Lab →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Catalog View */
          <>
            {/* Search & Filter Bar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search formulas, parabolic graphs, projectile mechanics, logic gates..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-[#0B1536] text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Tier Filters */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tier:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTier("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedTier === "all" ? "bg-blue-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTier(1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedTier === 1 ? "bg-blue-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    Tier 1 (Formulas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTier(2)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedTier === 2 ? "bg-blue-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    Tier 2 (Interactive Labs)
                  </button>
                </div>
              </div>

              {/* Subject Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
                {SUBJECT_TABS.map((tab) => {
                  const active = selectedSubject === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedSubject(tab.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                        active
                          ? "bg-[#1356E8] text-white shadow-md shadow-blue-500/20"
                          : "bg-[#0B1536] text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resources Grid */}
            <section aria-label="STEM Resources" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🔬</span>
                  <span>Available STEM Resources ({filteredResources.length})</span>
                </h2>
                {loading && <span className="text-xs text-slate-400 animate-pulse">Refreshing catalog...</span>}
              </div>

              {filteredResources.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-12 text-center space-y-3">
                  <span className="text-4xl">🔭</span>
                  <h3 className="text-base font-bold text-white">No STEM resources match your criteria</h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Try clearing your search query or selecting another subject to discover interactive formulas and virtual laboratories.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubject("all");
                      setSelectedTier("all");
                      setSelectedType("all");
                      setSearchQuery("");
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredResources.map((res) => (
                    <article
                      key={res.id}
                      className="rounded-2xl border border-white/10 bg-[#0B1536] hover:border-blue-500/50 p-5 flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-blue-900/10"
                    >
                      <div className="space-y-3">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-cyan-300 border border-cyan-500/20">
                            {res.subject?.name || "STEM"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] uppercase font-mono">
                            Tier {res.tier} • {res.resource_type.replace("_", " ")}
                          </span>
                        </div>

                        {/* Title & Summary */}
                        <div>
                          <h3 className="text-base font-black text-white group-hover:text-cyan-400 transition leading-snug">
                            {res.title}
                          </h3>
                          <p className="text-xs text-slate-300 mt-1.5 line-clamp-3 leading-relaxed">
                            {res.summary}
                          </p>
                        </div>

                        {/* Tags */}
                        {res.tags && res.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {res.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-medium text-slate-400"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions Footer */}
                      <div className="pt-5 mt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>🎯</span>
                          <span>JAMB / WAEC</span>
                        </span>
                        <Link
                          href={`/classroom/stem/${res.slug}`}
                          className="px-4 py-2 rounded-xl bg-[#1356E8] hover:bg-blue-600 text-white text-xs font-black shadow transition flex items-center gap-1.5"
                        >
                          <span>Open Lab</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BrandFooter />
    </div>
  );
}
