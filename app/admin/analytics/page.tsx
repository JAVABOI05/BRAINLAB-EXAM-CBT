"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";

type ResultSummary = {
  id: string;
  name: string | null;
  subject: string | null;
  score: number | null;
  total: number | null;
  created_at: string;
};

type SubjectStat = {
  subject: string;
  attempts: number;
  avgScore: number;
  passCount: number;
};

export default function AdminAnalyticsPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalCodes, setTotalCodes] = useState(0);
  const [totalLiveClasses, setTotalLiveClasses] = useState(0);
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [totalAudioAssets, setTotalAudioAssets] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState("all");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [resultsRes, questionsRes, codesRes, classesRes, attendRes, audioRes] = await Promise.all([
        supabase
          .from("results")
          .select("id, name, subject, score, total, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("questions").select("*", { count: "exact", head: true }),
        supabase.from("access_codes").select("*", { count: "exact", head: true }),
        supabase.from("live_classes").select("*", { count: "exact", head: true }),
        supabase.from("class_attendance_records").select("*", { count: "exact", head: true }),
        supabase.from("audio_assets").select("*", { count: "exact", head: true }),
      ]);

      if (resultsRes.error) {
        setError("Could not load examination results for analytics. Check database policies.");
      } else {
        setResults((resultsRes.data ?? []) as ResultSummary[]);
      }

      setTotalQuestions(questionsRes.count ?? 0);
      setTotalCodes(codesRes.count ?? 0);
      setTotalLiveClasses(classesRes.count ?? 0);
      setTotalAttendance(attendRes.count ?? 0);
      setTotalAudioAssets(audioRes.count ?? 0);
    } catch {
      setError("An unexpected error occurred while fetching platform metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      const admin = await getAdminSession();
      if (!active) return;

      if (!admin) {
        router.replace("/account");
        return;
      }

      const canReadAnalytics =
        admin.role === "super_admin" ||
        admin.role === "platform_admin" ||
        admin.role === "analytics_admin" ||
        (await adminHasPermission("analytics.read")) ||
        (await adminHasPermission("cbt.results.read"));

      if (!canReadAnalytics) {
        router.replace("/admin/dashboard");
        return;
      }

      setAdminUser(admin);
      await loadAnalytics();
    }

    void init();

    return () => {
      active = false;
    };
  }, [router, loadAnalytics]);

  const filteredResults = useMemo(() => {
    if (selectedSubject === "all") return results;
    return results.filter((r) => r.subject === selectedSubject);
  }, [results, selectedSubject]);

  const uniqueSubjects = useMemo(() => {
    const list = Array.from(new Set(results.map((r) => r.subject).filter(Boolean))) as string[];
    return ["all", ...list.sort()];
  }, [results]);

  const stats = useMemo(() => {
    const total = filteredResults.length;
    if (total === 0) {
      return {
        totalAttempts: 0,
        avgScorePercent: 0,
        passCount: 0,
        passRate: 0,
        brackets: { fail: 0, pass: 0, credit: 0, distinction: 0 },
      };
    }

    let sumPercent = 0;
    let passCount = 0;
    const brackets = { fail: 0, pass: 0, credit: 0, distinction: 0 };

    filteredResults.forEach((r) => {
      const score = Number(r.score) || 0;
      const qTotal = Number(r.total) || 1;
      const pct = Math.round((score / qTotal) * 100);
      sumPercent += pct;

      if (pct >= 50) passCount++;

      if (pct < 40) brackets.fail++;
      else if (pct < 50) brackets.pass++;
      else if (pct < 70) brackets.credit++;
      else brackets.distinction++;
    });

    return {
      totalAttempts: total,
      avgScorePercent: Math.round(sumPercent / total),
      passCount,
      passRate: Math.round((passCount / total) * 100),
      brackets,
    };
  }, [filteredResults]);

  const subjectBreakdown = useMemo<SubjectStat[]>(() => {
    const map = new Map<string, { attempts: number; sumPct: number; passCount: number }>();

    results.forEach((r) => {
      const subj = r.subject || "General";
      const score = Number(r.score) || 0;
      const total = Number(r.total) || 1;
      const pct = Math.round((score / total) * 100);

      const entry = map.get(subj) ?? { attempts: 0, sumPct: 0, passCount: 0 };
      entry.attempts += 1;
      entry.sumPct += pct;
      if (pct >= 50) entry.passCount += 1;
      map.set(subj, entry);
    });

    return Array.from(map.entries()).map(([subject, data]) => ({
      subject,
      attempts: data.attempts,
      avgScore: Math.round(data.sumPct / data.attempts),
      passCount: data.passCount,
    }));
  }, [results]);

  function exportCSV() {
    if (!filteredResults.length) return;
    const headers = "ID,Candidate,Subject,Score,Total,Percentage,Date\n";
    const rows = filteredResults
      .map((r) => {
        const pct = Math.round(((r.score || 0) / (r.total || 1)) * 100);
        const name = (r.name || "Anonymous").replace(/,/g, " ");
        const subj = (r.subject || "N/A").replace(/,/g, " ");
        return `"${r.id}","${name}","${subj}",${r.score || 0},${r.total || 0},${pct}%,"${r.created_at}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `brainlab-analytics-${selectedSubject}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <main className="admin-shell">
        <div className="admin-card text-center py-12">
          <p className="admin-card-text">Loading platform operational metrics…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="admin-badge">Platform Insights</span>
              {adminUser && (
                <span className="text-xs font-semibold text-slate-500">
                  Logged in as {adminUser.email} ({adminUser.role})
                </span>
              )}
            </div>
            <h1 className="admin-title">Platform Analytics & Exam Metrics</h1>
            <p className="admin-subtitle">
              Monitor test completion volumes, performance distributions, and subject-level proficiency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="admin-btn-light"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => void loadAnalytics()}
              className="admin-btn-light"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={filteredResults.length === 0}
              className="admin-btn-primary"
            >
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* KPI Overview Grid */}
      <section className="admin-section admin-stats mt-6">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total Exam Attempts</p>
          <p className="admin-stat-value">{stats.totalAttempts}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Overall Pass Rate</p>
          <p className="admin-stat-value">{stats.passRate}%</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Average Score</p>
          <p className="admin-stat-value">{stats.avgScorePercent}%</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Question Bank Total</p>
          <p className="admin-stat-value">{totalQuestions}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Access Codes Total</p>
          <p className="admin-stat-value">{totalCodes}</p>
        </div>
        <div className="admin-stat-card border-blue-200 bg-blue-50/20">
          <p className="admin-stat-label">Live Classes Scheduled</p>
          <p className="admin-stat-value text-blue-900">{totalLiveClasses}</p>
        </div>
        <div className="admin-stat-card border-emerald-200 bg-emerald-50/20">
          <p className="admin-stat-label">Class Attendance Records</p>
          <p className="admin-stat-value text-emerald-900">{totalAttendance}</p>
        </div>
        <div className="admin-stat-card border-indigo-200 bg-indigo-50/20">
          <p className="admin-stat-label">Tutor Voice Notes & Audio</p>
          <p className="admin-stat-value text-indigo-900">{totalAudioAssets}</p>
        </div>
      </section>

      {/* Subject Filter & Score Distribution */}
      <section className="admin-section mt-6 grid gap-6 lg:grid-cols-3">
        <div className="admin-card lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="admin-card-title">Score Performance Distribution</h2>
              <p className="admin-card-text">Candidate brackets for {selectedSubject === "all" ? "all subjects" : selectedSubject}</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="subject-select" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Filter Subject:
              </label>
              <select
                id="subject-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="admin-input !w-auto text-sm"
              >
                {uniqueSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Subjects" : s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Distinction (70% - 100%)</span>
                <span>{stats.brackets.distinction} attempts ({stats.totalAttempts ? Math.round((stats.brackets.distinction / stats.totalAttempts) * 100) : 0}%)</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${stats.totalAttempts ? (stats.brackets.distinction / stats.totalAttempts) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Credit (50% - 69%)</span>
                <span>{stats.brackets.credit} attempts ({stats.totalAttempts ? Math.round((stats.brackets.credit / stats.totalAttempts) * 100) : 0}%)</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${stats.totalAttempts ? (stats.brackets.credit / stats.totalAttempts) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Pass (40% - 49%)</span>
                <span>{stats.brackets.pass} attempts ({stats.totalAttempts ? Math.round((stats.brackets.pass / stats.totalAttempts) * 100) : 0}%)</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${stats.totalAttempts ? (stats.brackets.pass / stats.totalAttempts) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Needs Improvement (&lt; 40%)</span>
                <span>{stats.brackets.fail} attempts ({stats.totalAttempts ? Math.round((stats.brackets.fail / stats.totalAttempts) * 100) : 0}%)</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${stats.totalAttempts ? (stats.brackets.fail / stats.totalAttempts) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Subject Breakdown Card */}
        <div className="admin-card">
          <h2 className="admin-card-title">Subject Summary</h2>
          <p className="admin-card-text">Activity breakdown across curricula</p>

          <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {subjectBreakdown.length === 0 ? (
              <p className="py-4 text-xs text-slate-500">No subject records available.</p>
            ) : (
              subjectBreakdown.map((s) => (
                <div key={s.subject} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{s.subject}</p>
                    <p className="text-slate-500">{s.attempts} attempts · {s.passCount} passed</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">
                      {s.avgScore}% avg
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent Attempts Log */}
      <section className="admin-section admin-card mt-6">
        <h2 className="admin-card-title">Recent Examination Activity</h2>
        <p className="admin-card-text">Last 25 logged test completions</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Candidate</th>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">Percentage</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredResults.slice(0, 25).map((r) => {
                const score = r.score ?? 0;
                const total = r.total ?? 1;
                const pct = Math.round((score / total) * 100);
                const passed = pct >= 50;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-500">
                      {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                      {r.name || "Anonymous Learner"}
                    </td>
                    <td className="py-3 px-3 font-semibold">{r.subject || "General"}</td>
                    <td className="py-3 px-3 font-mono">{score} / {total}</td>
                    <td className="py-3 px-3 font-mono font-bold">{pct}%</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          passed
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {passed ? "PASSED" : "FAILED"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No results logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
