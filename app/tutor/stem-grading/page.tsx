"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import type { StemExperimentAttempt } from "../../lib/stem/stemService";

export default function TutorStemGradingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<StemExperimentAttempt[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "graded">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Grading form state
  const [tutorScore, setTutorScore] = useState<number | "">("");
  const [tutorFeedback, setTutorFeedback] = useState("");
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?redirect=/tutor/stem-grading");
          return;
        }

        const admin = await getAdminSession();
        if (admin) {
          setCurrentUser(admin);
          setIsSuperAdmin(admin.role === "super_admin" || admin.role === "platform_admin");
        }

        // Fetch all student lab attempts
        const res = await fetch("/api/stem/attempts", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (active && data.ok && Array.isArray(data.attempts)) {
            setAttempts(data.attempts);
            if (data.attempts.length > 0) {
              setSelectedAttemptId(data.attempts[0].id);
              if (typeof data.attempts[0].tutor_score === "number") {
                setTutorScore(data.attempts[0].tutor_score);
                setTutorFeedback(data.attempts[0].tutor_feedback || "");
              }
            }
          }
        }
      } catch (err) {
        if (active) setNotification({ type: "error", text: "Could not load experiment submissions." });
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => { active = false; };
  }, [router]);

  const activeAttempt = attempts.find((a) => a.id === selectedAttemptId) || attempts[0];

  // When active attempt changes, update form
  const handleSelectAttempt = (attempt: StemExperimentAttempt) => {
    setSelectedAttemptId(attempt.id);
    setNotification(null);
    if (typeof attempt.tutor_score === "number") {
      setTutorScore(attempt.tutor_score);
      setTutorFeedback(attempt.tutor_feedback || "");
    } else {
      setTutorScore("");
      setTutorFeedback("");
    }
  };

  // Submit Grade
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAttempt) return;

    const numScore = Number(tutorScore);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      setNotification({ type: "error", text: "Please enter a valid numeric grade between 0 and 100." });
      return;
    }

    setSubmittingGrade(true);
    setNotification(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication expired");

      const res = await fetch(`/api/stem/attempts/${activeAttempt.id}/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tutor_score: numScore,
          tutor_feedback: tutorFeedback.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Grading failed");

      // Update local state
      setAttempts((prev) =>
        prev.map((a) =>
          a.id === activeAttempt.id
            ? { ...a, status: "graded", tutor_score: numScore, tutor_feedback: tutorFeedback.trim() }
            : a
        )
      );

      setNotification({ type: "success", text: `Lab report graded successfully: ${numScore}/100 awarded.` });
    } catch (err: any) {
      setNotification({ type: "error", text: err?.message || "Failed to submit grade." });
    } finally {
      setSubmittingGrade(false);
    }
  };

  // Filtered list
  const filteredAttempts = attempts.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const studentMatch = (a.student_id || "").toLowerCase().includes(q);
      const conclusionMatch = (a.conclusion || "").toLowerCase().includes(q);
      return studentMatch || conclusionMatch;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-indigo-200/60 pb-6 dark:border-indigo-950/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-black uppercase text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
              Virtual Lab Assessment
            </span>
            {isSuperAdmin && (
              <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-black uppercase text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                👑 Super Admin Access
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            STEM Experiment Worksheets &amp; Lab Grading
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Review student experimental data tables, empirical hypotheses, and publish laboratory grades and pedagogical feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/classroom/stem"
            target="_blank"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            🧪 Open STEM Studio
          </Link>
        </div>
      </div>

      {notification && (
        <div
          className={`rounded-2xl p-4 text-xs font-bold border ${
            notification.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300"
          }`}
        >
          {notification.text}
        </div>
      )}

      {/* Main Grid: Left Submissions List + Right Detailed Review & Grading */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Submissions List */}
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400">
                Submissions ({filteredAttempts.length})
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="all">All States</option>
                <option value="completed">Pending Review</option>
                <option value="graded">Graded</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search by student or keyword…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>

          {/* Submissions Cards */}
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400 animate-pulse">
              Loading student lab attempts…
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
              No lab worksheet submissions match this filter.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
              {filteredAttempts.map((att) => {
                const isSelected = att.id === activeAttempt?.id;
                const isGraded = att.status === "graded";

                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => handleSelectAttempt(att)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10 shadow-xs dark:bg-indigo-950/40"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(att.started_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${
                          isGraded
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {isGraded ? `Graded: ${att.tutor_score}/100` : "Pending Review"}
                      </span>
                    </div>

                    <h4 className="mt-2 text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      Student ID: {att.student_id.slice(0, 13)}…
                    </h4>

                    {att.conclusion && (
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                        {att.conclusion}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Lab Worksheet Inspection & Grading Form (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {!activeAttempt ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500 dark:border-slate-800">
              Select a lab submission from the left column to inspect the experiment worksheet.
            </div>
          ) : (
            <>
              {/* Inspection Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                      Worksheet Inspection
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Attempt #{activeAttempt.attempt_number} · Student {activeAttempt.student_id.slice(0, 8)}…
                    </h3>
                  </div>

                  <span
                    className={`rounded-xl px-3 py-1.5 text-xs font-black uppercase ${
                      activeAttempt.status === "graded"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    }`}
                  >
                    {activeAttempt.status === "graded"
                      ? `Score: ${activeAttempt.tutor_score}/100`
                      : "Pending Evaluation"}
                  </span>
                </div>

                {/* Hypothesis */}
                {Boolean(activeAttempt.observations?.hypothesis) && (
                  <div>
                    <h5 className="text-[11px] font-black uppercase text-slate-400 mb-1">Empirical Hypothesis</h5>
                    <div className="rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      {String(activeAttempt.observations.hypothesis)}
                    </div>
                  </div>
                )}

                {/* Data Collection Table */}
                {Array.isArray(activeAttempt.measurements) && activeAttempt.measurements.length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-black uppercase text-slate-400 mb-2">
                      Experimental Data Collection Table ({activeAttempt.measurements.length} Trials)
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                          <tr>
                            <th className="p-3">Trial</th>
                            <th className="p-3">Independent Variable (X)</th>
                            <th className="p-3">Dependent Variable (Y)</th>
                            <th className="p-3">Calculated Output</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {activeAttempt.measurements.map((row: any, i: number) => (
                            <tr key={i} className="dark:text-slate-200">
                              <td className="p-3 font-bold text-slate-400">#{row.trial || i + 1}</td>
                              <td className="p-3">{row.paramA || "—"}</td>
                              <td className="p-3">{row.paramB || "—"}</td>
                              <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                                {row.resultVal || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Observations */}
                {Boolean(activeAttempt.observations?.notes) && (
                  <div>
                    <h5 className="text-[11px] font-black uppercase text-slate-400 mb-1">Qualitative Observations</h5>
                    <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {String(activeAttempt.observations.notes)}
                    </div>
                  </div>
                )}

                {/* Conclusion */}
                {activeAttempt.conclusion && (
                  <div>
                    <h5 className="text-[11px] font-black uppercase text-slate-400 mb-1">Scientific Conclusion</h5>
                    <div className="rounded-xl bg-emerald-50/50 border border-emerald-500/20 p-3.5 text-xs text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-200 leading-relaxed">
                      {activeAttempt.conclusion}
                    </div>
                  </div>
                )}
              </div>

              {/* Grading & Feedback Form */}
              <form
                onSubmit={handleSaveGrade}
                className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm dark:border-indigo-950 dark:bg-slate-900 space-y-4"
              >
                <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tutor Evaluation &amp; Grade Award
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Assign a grade out of 100 and record instructive feedback for the learner.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Score (0 - 100) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={tutorScore}
                      onChange={(e) => setTutorScore(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 85"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-black text-indigo-700 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-300"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pedagogical Feedback &amp; Review Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={tutorFeedback}
                      onChange={(e) => setTutorFeedback(e.target.value)}
                      placeholder="Excellent observations on the direct proportionality. Remember to account for internal battery resistance in circuit trial 3…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={submittingGrade}
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
                  >
                    {submittingGrade ? "Saving Grade…" : "Publish Grade & Feedback to Student"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
