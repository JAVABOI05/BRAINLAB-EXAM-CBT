"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "../admin.css";

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

type ResultRow = {
  id: string;
  name: string | null;
  phone: string | null;
  subject: string | null;
  score: number | null;
  total: number | null;
  created_at: string;
};

type AnswerDetail = {
  id: number;
  question_id: number;
  selected_answer: string | null;
  is_correct: boolean | null;
  questions?: {
    question: string | null;
    subject: string | null;
    correct_answer: string | null;
    explanation: string | null;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
  } | null;
};

export default function AdminResultsPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingPhone, setResettingPhone] = useState<string | null>(null);
  const [clearingResults, setClearingResults] = useState(false);
  const [clearingSessions, setClearingSessions] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [selectedResult, setSelectedResult] = useState<ResultRow | null>(null);
  const [answerSheet, setAnswerSheet] = useState<AnswerDetail[]>([]);
  const [loadingAnswerSheet, setLoadingAnswerSheet] = useState(false);

  useEffect(() => {
    const savedAdmin = localStorage.getItem("admin_user");

    if (!savedAdmin) {
      router.push("/admin/login");
      return;
    }

    try {
      const parsed = JSON.parse(savedAdmin) as AdminUser;
      setAdminUser(parsed);
      loadResults();
    } catch {
      localStorage.removeItem("admin_user");
      router.push("/admin/login");
    }
  }, [router]);

  async function logAudit(
    action: string,
    targetTable: string,
    targetId: string,
    details: Record<string, unknown>
  ) {
    if (!adminUser) return;

    await supabase.from("audit_logs").insert([
      {
        admin_email: adminUser.email,
        action,
        target_table: targetTable,
        target_id: targetId,
        details,
      },
    ]);
  }

  async function loadResults() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("results")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setResults((data || []) as ResultRow[]);
    setLoading(false);
  }

  async function handleDeleteResult(resultId: string) {
    const confirmed = window.confirm(
      "Delete this result? Linked answers will also be removed if cascade is enabled."
    );
    if (!confirmed) return;

    try {
      setDeletingId(resultId);
      setMessage("");

      const resultToDelete = results.find((r) => r.id === resultId);

      const { error } = await supabase.from("results").delete().eq("id", resultId);

      if (error) {
        setMessage(`Delete failed: ${error.message}`);
        return;
      }

      setResults((prev) => prev.filter((row) => row.id !== resultId));

      await logAudit("delete_result", "results", resultId, {
        name: resultToDelete?.name,
        phone: resultToDelete?.phone,
        subject: resultToDelete?.subject,
        score: resultToDelete?.score,
      });

      if (selectedResult?.id === resultId) {
        setSelectedResult(null);
        setAnswerSheet([]);
      }

      setMessage("Result deleted successfully.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleResetCandidateAttempts(result: ResultRow) {
    const phone = result.phone || "";
    if (!phone) {
      setMessage("This candidate has no phone number, so reset cannot continue.");
      return;
    }

    const confirmed = window.confirm(
      `Reset all attempts and sessions for ${result.name || "this candidate"} (${phone})?`
    );
    if (!confirmed) return;

    try {
      setResettingPhone(phone);
      setMessage("");

      const { error: deleteResultsError } = await supabase
        .from("results")
        .delete()
        .eq("phone", phone);

      if (deleteResultsError) {
        setMessage(`Could not clear candidate results: ${deleteResultsError.message}`);
        return;
      }

      const { error: deleteSessionsError } = await supabase
        .from("exam_sessions")
        .delete()
        .eq("phone", phone);

      if (deleteSessionsError) {
        setMessage(`Results cleared, but sessions failed: ${deleteSessionsError.message}`);
        return;
      }

      setResults((prev) => prev.filter((row) => row.phone !== phone));

      await logAudit("reset_candidate_attempts", "results/exam_sessions", phone, {
        name: result.name,
        phone,
        subject: result.subject,
      });

      if (selectedResult?.phone === phone) {
        setSelectedResult(null);
        setAnswerSheet([]);
      }

      setMessage("Candidate attempts and sessions cleared successfully.");
    } finally {
      setResettingPhone(null);
    }
  }

  async function handleClearAllResults() {
    const confirmed = window.confirm(
      "Clear ALL results? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setClearingResults(true);
      setMessage("");

      const { error } = await supabase.from("results").delete().neq("id", "");

      if (error) {
        setMessage(`Could not clear results: ${error.message}`);
        return;
      }

      setResults([]);
      setSelectedResult(null);
      setAnswerSheet([]);

      await logAudit("clear_all_results", "results", "ALL", {});
      setMessage("All results cleared successfully.");
    } finally {
      setClearingResults(false);
    }
  }

  async function handleClearAllSessions() {
    const confirmed = window.confirm(
      "Clear ALL exam sessions/attempts? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setClearingSessions(true);
      setMessage("");

      const { error } = await supabase
        .from("exam_sessions")
        .delete()
        .neq("id", "");

      if (error) {
        setMessage(`Could not clear sessions: ${error.message}`);
        return;
      }

      await logAudit("clear_all_sessions", "exam_sessions", "ALL", {});
      setMessage("All exam sessions cleared successfully.");
    } finally {
      setClearingSessions(false);
    }
  }

  async function handleViewAnswerSheet(result: ResultRow) {
    try {
      setSelectedResult(result);
      setLoadingAnswerSheet(true);
      setAnswerSheet([]);
      setMessage("");

      const { data, error } = await supabase
        .from("answers")
        .select(`
          id,
          question_id,
          selected_answer,
          is_correct,
          questions (
            question,
            subject,
            correct_answer,
            explanation,
            option_a,
            option_b,
            option_c,
            option_d
          )
        `)
        .eq("result_id", result.id)
        .order("question_id", { ascending: true });

      if (error) {
        setMessage(`Could not load answer sheet: ${error.message}`);
        setLoadingAnswerSheet(false);
        return;
      }

      setAnswerSheet((data ?? []) as unknown as AnswerDetail[]);
      setLoadingAnswerSheet(false);
    } catch {
      setLoadingAnswerSheet(false);
      setMessage("Could not load answer sheet.");
    }
  }

  function handleExportCsv() {
    try {
      setExporting(true);

      const headers = [
        "name",
        "phone",
        "subject",
        "score",
        "total",
        "submitted_at",
      ];

      const rows = filteredResults.map((r) => [
        r.name || "",
        r.phone || "",
        r.subject || "",
        String(r.score ?? 0),
        String(r.total ?? 0),
        new Date(r.created_at).toLocaleString(),
      ]);

      const csv = [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", "brainlab_results_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage("CSV exported successfully.");
    } finally {
      setExporting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_user");
    router.push("/admin/login");
  }

  const filteredResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return results.filter((r) => {
      const searchMatch =
        q === "" ||
        (r.name || "").toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q) ||
        (r.subject || "").toLowerCase().includes(q);

      const resultDate = new Date(r.created_at);
      const fromMatch = !dateFrom || resultDate >= new Date(`${dateFrom}T00:00:00`);
      const toMatch = !dateTo || resultDate <= new Date(`${dateTo}T23:59:59`);

      return searchMatch && fromMatch && toMatch;
    });
  }, [results, searchText, dateFrom, dateTo]);

  const totalCandidates = filteredResults.length;
  const highestScore =
    filteredResults.length > 0
      ? Math.max(...filteredResults.map((r) => Number(r.score || 0)))
      : 0;
  const averageScore =
    filteredResults.length > 0
      ? (
          filteredResults.reduce((sum, r) => sum + Number(r.score || 0), 0) /
          filteredResults.length
        ).toFixed(1)
      : "0.0";

  const answerSheetCorrectCount = answerSheet.filter(
    (a) => a.is_correct === true
  ).length;

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Brainlab Results Manager</div>
              <h1 className="admin-title">Review candidate performance</h1>
              <p className="admin-subtitle">
                View submitted records, compare scores, manage result data, and
                inspect answer sheets from one organized workspace.
              </p>

              {adminUser && (
                <div className="admin-user-chip">
                  Signed in as <strong>{adminUser.email}</strong>
                </div>
              )}
            </div>

            <div className="admin-actions">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="admin-btn-light"
              >
                Dashboard
              </button>

              <button
                onClick={() => router.push("/admin/codes")}
                className="admin-btn-light"
              >
                Codes
              </button>

              <button
                onClick={() => router.push("/admin/sessions")}
                className="admin-btn-light"
              >
                Sessions
              </button>

              <button onClick={handleLogout} className="admin-btn-light">
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="admin-section admin-stats">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Filtered Candidates</p>
            <p className="admin-stat-value">{totalCandidates}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Highest Score</p>
            <p className="admin-stat-value">{highestScore}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Average Score</p>
            <p className="admin-stat-value">{averageScore}</p>
          </div>
        </section>

        <section className="admin-section admin-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="admin-card-title">Manage Results</h2>
              <p className="admin-card-text">
                Search, filter by date, export, inspect answer sheets, delete one
                record, or reset a candidate’s attempts.
              </p>
            </div>

            <div className="admin-actions">
              <button onClick={loadResults} className="admin-btn-light">
                Refresh
              </button>

              <button
                onClick={handleExportCsv}
                disabled={exporting}
                className="admin-btn-light"
              >
                {exporting ? "Exporting..." : "Export CSV"}
              </button>

              <button
                onClick={handleClearAllSessions}
                disabled={clearingSessions}
                className="admin-btn-light"
              >
                {clearingSessions ? "Clearing Sessions..." : "Clear Attempts"}
              </button>

              <button
                onClick={handleClearAllResults}
                disabled={clearingResults}
                className="admin-btn-primary"
              >
                {clearingResults ? "Clearing Results..." : "Clear All Results"}
              </button>
            </div>
          </div>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">Search</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Name, phone, or subject"
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Quick Reset</label>
              <button
                onClick={() => {
                  setSearchText("");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="admin-btn-light"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {message && <div className="admin-message">{message}</div>}
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Submitted Results</h2>
          <p className="admin-card-text">
            All filtered candidate result records currently stored in the system.
          </p>

          {loading ? (
            <p className="mt-6 text-slate-600">Loading results...</p>
          ) : filteredResults.length === 0 ? (
            <p className="mt-6 text-slate-600">No results found.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Subject</th>
                    <th>Score</th>
                    <th>Total</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((result) => (
                    <tr key={result.id}>
                      <td>{result.name || "-"}</td>
                      <td>{result.phone || "-"}</td>
                      <td>{result.subject || "-"}</td>
                      <td>{result.score ?? 0}</td>
                      <td>{result.total ?? 0}</td>
                      <td>{new Date(result.created_at).toLocaleString()}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleViewAnswerSheet(result)}
                            className="admin-btn-light"
                            style={{ padding: "10px 14px" }}
                          >
                            View Sheet
                          </button>

                          <button
                            onClick={() => handleResetCandidateAttempts(result)}
                            disabled={resettingPhone === result.phone}
                            className="admin-btn-light"
                            style={{ padding: "10px 14px" }}
                          >
                            {resettingPhone === result.phone
                              ? "Resetting..."
                              : "Reset Attempts"}
                          </button>

                          <button
                            onClick={() => handleDeleteResult(result.id)}
                            disabled={deletingId === result.id}
                            className="admin-btn-light"
                            style={{ padding: "10px 14px" }}
                          >
                            {deletingId === result.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedResult && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
            onClick={() => {
              setSelectedResult(null);
              setAnswerSheet([]);
            }}
          >
            <div
              className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Candidate Answer Sheet
                  </h2>
                  <p className="mt-2 text-slate-600">
                    {selectedResult.name || "-"} • {selectedResult.phone || "-"} •{" "}
                    {selectedResult.subject || "-"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedResult(null);
                    setAnswerSheet([]);
                  }}
                  className="admin-btn-light"
                >
                  Close
                </button>
              </div>

              {loadingAnswerSheet ? (
                <p className="mt-6 text-slate-600">Loading answer sheet...</p>
              ) : answerSheet.length === 0 ? (
                <p className="mt-6 text-slate-600">No answers found for this result.</p>
              ) : (
                <>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Questions</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {answerSheet.length}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Correct</p>
                      <p className="mt-2 text-3xl font-bold text-green-700">
                        {answerSheetCorrectCount}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Wrong / Unclear</p>
                      <p className="mt-2 text-3xl font-bold text-red-700">
                        {answerSheet.length - answerSheetCorrectCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {answerSheet.map((item, index) => {
                      const q = item.questions;
                      return (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                          <p className="text-sm font-semibold text-blue-700">
                            {q?.subject || "Question"} #{index + 1}
                          </p>

                          <h3 className="mt-2 text-lg font-semibold text-slate-900">
                            {q?.question || `Question ID: ${item.question_id}`}
                          </h3>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-3">
                              <p className="text-sm text-slate-500">Selected Answer</p>
                              <p className="font-semibold text-slate-800">
                                {item.selected_answer || "-"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3">
                              <p className="text-sm text-slate-500">Correct Answer</p>
                              <p className="font-semibold text-slate-800">
                                {q?.correct_answer || "-"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3 md:col-span-2">
                              <p className="text-sm text-slate-500">Status</p>
                              <p className="font-semibold text-slate-800">
                                {item.is_correct ? "Correct" : "Wrong / Not marked correct"}
                              </p>
                            </div>

                            {q?.explanation && (
                              <div className="rounded-2xl bg-slate-50 p-3 md:col-span-2">
                                <p className="text-sm text-slate-500">Explanation</p>
                                <p className="text-slate-800">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}