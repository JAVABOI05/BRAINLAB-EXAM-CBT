"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { getAdminSession, type AdminUser } from "@/app/lib/adminAuth";
import type { StemResource, StemResourceType } from "@/app/lib/stem/stemService";
import { INITIAL_STEM_RESOURCES } from "@/app/lib/stem/seedData";

export default function AdminStemStudioPage() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string>("");
  const [resources, setResources] = useState<StemResource[]>(INITIAL_STEM_RESOURCES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New Resource Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSlug, setCreateSlug] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createSummary, setCreateSummary] = useState("");
  const [createSubjectId, setCreateSubjectId] = useState("subj-math");
  const [createType, setCreateType] = useState<StemResourceType>("simulation");
  const [createTier, setCreateTier] = useState<1 | 2 | 3>(2);
  const [createTags, setCreateTags] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  // Review & Publish Modal State
  const [selectedForReview, setSelectedForReview] = useState<StemResource | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");

  // Tab State & Grading Workflow (Phase 4)
  const [mainTab, setMainTab] = useState<"catalog" | "grading">("catalog");
  const [attempts, setAttempts] = useState<any[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [selectedAttemptForGrading, setSelectedAttemptForGrading] = useState<any | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(85);
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [gradingBusy, setGradingBusy] = useState(false);
  const [gradeSuccessMessage, setGradeSuccessMessage] = useState("");

  const loadResources = useCallback(async (authToken?: string) => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch("/api/stem/resources?status=all", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.resources) && data.resources.length > 0) {
          setResources(data.resources);
          return;
        }
      }
      setResources(INITIAL_STEM_RESOURCES);
    } catch {
      setResources(INITIAL_STEM_RESOURCES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const admin = await getAdminSession();
      if (admin) setAdminUser(admin);

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || "";
      setToken(authToken);

      await loadResources(authToken);
    }
    init();
  }, [loadResources]);

  // Handle Create Draft Resource
  async function handleCreateResource(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateBusy(true);

    try {
      const tagsArray = createTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/stem/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: createSlug.trim().toLowerCase(),
          title: createTitle.trim(),
          summary: createSummary.trim(),
          subject_id: createSubjectId,
          tier: createTier,
          resource_type: createType,
          tags: tagsArray,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCreateError(data.error || "Failed to create resource.");
        return;
      }

      setShowCreateModal(false);
      setCreateSlug("");
      setCreateTitle("");
      setCreateSummary("");
      setCreateTags("");
      await loadResources(token);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Creation request failed.");
    } finally {
      setCreateBusy(false);
    }
  }

  // Handle Publish Resource
  async function handlePublishResource(resource: StemResource) {
    setPublishBusy(true);
    setPublishMessage("");
    try {
      const versionId = resource.current_version?.id || "seed-ver-01";
      const res = await fetch(`/api/stem/resources/${resource.slug}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ version_id: versionId }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPublishMessage(`Error: ${data.error || "Publish failed"}`);
        return;
      }

      setPublishMessage("Resource successfully approved and published!");
      setTimeout(() => {
        setSelectedForReview(null);
        setPublishMessage("");
      }, 1500);

      // Optimistically update resource in list
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, status: "published" } : r))
      );
    } catch (err) {
      setPublishMessage(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishBusy(false);
    }
  }

  const loadAttempts = useCallback(async (authToken?: string) => {
    try {
      setAttemptsLoading(true);
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const res = await fetch("/api/stem/attempts", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.attempts)) {
          setAttempts(data.attempts);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setAttemptsLoading(false);
    }
  }, []);

  async function handleGradeAttempt(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAttemptForGrading) return;
    setGradingBusy(true);
    setGradeSuccessMessage("");

    try {
      const res = await fetch(`/api/stem/attempts/${selectedAttemptForGrading.id}/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tutor_score: Number(gradeScore),
          tutor_feedback: gradeFeedback,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Grading failed.");
      }

      setGradeSuccessMessage("Experiment attempt successfully graded and updated!");
      await loadAttempts(token);
      setTimeout(() => {
        setSelectedAttemptForGrading(null);
        setGradeSuccessMessage("");
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Failed to grade attempt");
    } finally {
      setGradingBusy(false);
    }
  }

  const filtered = resources.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: resources.length,
    published: resources.filter((r) => r.status === "published").length,
    drafts: resources.filter((r) => r.status === "draft").length,
    tier2: resources.filter((r) => r.tier === 2).length,
  };

  return (
    <div className="space-y-6">
      {/* Overview Heading */}
      <section className="admin-overview-heading flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            STEM Studio Authoring &amp; Content Governance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Author parameterised simulations, review tutor drafts, manage curriculum mappings, and grade student submissions.
          </p>
        </div>
        {mainTab === "catalog" && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 self-start sm:self-auto"
          >
            <span>➕</span>
            <span>New STEM Resource</span>
          </button>
        )}
      </section>

      {/* Navigation Switcher: Catalog vs Grading */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setMainTab("catalog")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            mainTab === "catalog"
              ? "bg-[#1356E8] text-white shadow"
              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
          }`}
        >
          <span>📁</span>
          <span>Simulation Catalog &amp; Versioning</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMainTab("grading");
            loadAttempts(token);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            mainTab === "grading"
              ? "bg-[#1356E8] text-white shadow"
              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
          }`}
        >
          <span>🎓</span>
          <span>Student Submissions &amp; Grading</span>
          {attempts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-[10px] font-mono">
              {attempts.length}
            </span>
          )}
        </button>
      </div>

      {mainTab === "catalog" && (
        <>
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-4">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Catalog</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-4">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Published Live</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.published}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-4">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Drafts &amp; In-Review</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.drafts}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-4">
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase">Tier 2 Interactive</span>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">{stats.tier2}</div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, slug, or subject..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070d1e] text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold uppercase">Status:</span>
          {["all", "published", "draft", "review"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                statusFilter === st
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-4">Resource &amp; Slug</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Tier &amp; Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Pinned Version</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs">{item.slug}</div>
                  </td>
                  <td className="p-4 font-medium">{item.subject?.name || "General Science"}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 font-mono text-[10px]">
                      Tier {item.tier} · {item.resource_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status === "published"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-400">
                    v{item.current_version?.version_number || 1}.0
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Link
                      href={`/classroom/stem/${item.slug}`}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-800 dark:text-white font-bold text-[11px] transition inline-block"
                    >
                      Preview Lab
                    </Link>
                    {item.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => setSelectedForReview(item)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition"
                      >
                        Review &amp; Publish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Main Tab: Student Submissions & Grading */}
      {mainTab === "grading" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536] overflow-hidden shadow">
            {attemptsLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading student submissions…</div>
            ) : attempts.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <span className="text-3xl">🧪</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">No Experiment Submissions Yet</h3>
                <p className="text-xs text-slate-400">
                  When students complete labs and log hypothesis findings, their attempts will appear here for grading.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="p-4">Submission &amp; Lab</th>
                      <th className="p-4">Student ID</th>
                      <th className="p-4">Submitted At</th>
                      <th className="p-4">Score</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {attempts.map((att: any) => (
                      <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {att.resource_version?.resource?.title || "STEM Virtual Lab"}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                            {att.conclusion || "No student remarks recorded"}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs">{att.student_id?.slice(0, 8)}...</td>
                        <td className="p-4 text-slate-400">
                          {new Date(att.started_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-mono font-bold">
                          {att.tutor_score !== null ? (
                            <span className="text-emerald-400">{att.tutor_score}/100</span>
                          ) : (
                            <span className="text-slate-400">Ungraded</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              att.status === "graded"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAttemptForGrading(att);
                              setGradeScore(att.tutor_score !== null ? att.tutor_score : 85);
                              setGradeFeedback(att.tutor_feedback || "");
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition"
                          >
                            {att.status === "graded" ? "Review & Re-grade" : "Grade Attempt"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Resource Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B1536] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Create New STEM Resource
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
                  {createError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Resource Title</label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => {
                    setCreateTitle(e.target.value);
                    if (!createSlug) {
                      setCreateSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "")
                      );
                    }
                  }}
                  placeholder="e.g. Simple Pendulum & SHM Simulation"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">URL Slug</label>
                <input
                  type="text"
                  required
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  placeholder="e.g. simple-pendulum-shm"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070d1e] font-mono text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Summary / Objective</label>
                <textarea
                  required
                  rows={2}
                  value={createSummary}
                  onChange={(e) => setCreateSummary(e.target.value)}
                  placeholder="Brief description of the simulation and student learning outcome..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Subject</label>
                  <select
                    value={createSubjectId}
                    onChange={(e) => setCreateSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="subj-math">Mathematics</option>
                    <option value="subj-physics">Physics</option>
                    <option value="subj-chem">Chemistry</option>
                    <option value="subj-bio">Biology</option>
                    <option value="subj-eng">Engineering &amp; Logic</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Resource Type</label>
                  <select
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value as StemResourceType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="simulation">2D Simulation (Tier 2)</option>
                    <option value="formula_card">Formula Sheet (Tier 1)</option>
                    <option value="experiment">Virtual Experiment (Tier 2)</option>
                    <option value="diagram">Annotated Diagram (Tier 1)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Tags (comma separated)</label>
                <input
                  type="text"
                  value={createTags}
                  onChange={(e) => setCreateTags(e.target.value)}
                  placeholder="e.g. Mechanics, Harmonic Motion, WAEC"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBusy}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow disabled:opacity-50"
                >
                  {createBusy ? "Creating Draft..." : "Create Resource Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Publish Modal */}
      {selectedForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B1536] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Content Review &amp; Publication Approval
              </h3>
              <button
                type="button"
                onClick={() => setSelectedForReview(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                You are approving and publishing <strong className="text-white">{selectedForReview.title}</strong> to the public BrainLab Academy STEM Studio.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070d1e] border border-slate-200 dark:border-white/10 space-y-1 font-mono">
                <div>Subject: {selectedForReview.subject?.name}</div>
                <div>Slug: {selectedForReview.slug}</div>
                <div>Tier: Tier {selectedForReview.tier}</div>
                <div>Status: Ready for Publication</div>
              </div>
              {publishMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  {publishMessage}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedForReview(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold"
              >
                Close
              </button>
              <button
                type="button"
                disabled={publishBusy}
                onClick={() => handlePublishResource(selectedForReview)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow disabled:opacity-50"
              >
                {publishBusy ? "Publishing..." : "Approve & Publish Live"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Attempt Modal (Phase 4) */}
      {selectedAttemptForGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B1536] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Grade STEM Experiment Attempt
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAttemptForGrading(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGradeAttempt} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070d1e] border border-slate-200 dark:border-white/10 space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-white">
                  Lab: {selectedAttemptForGrading.resource_version?.resource?.title || "Virtual Lab"}
                </div>
                <div className="text-[11px] text-slate-400">
                  Student Hypothesis &amp; Findings:
                </div>
                <p className="p-2 rounded bg-black/30 text-cyan-300 font-mono text-[11px]">
                  {selectedAttemptForGrading.conclusion || "No observation text"}
                </p>
              </div>

              {gradeSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  {gradeSuccessMessage}
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Numerical Score (0 - 100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={gradeScore}
                  onChange={(e) => setGradeScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-white outline-none focus:border-blue-500 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Tutor Pedagogical Feedback &amp; Remarks
                </label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="e.g. Excellent deduction regarding parameter interaction and scientific method..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAttemptForGrading(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gradingBusy}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow disabled:opacity-50"
                >
                  {gradingBusy ? "Submitting Grade..." : "Submit Official Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
