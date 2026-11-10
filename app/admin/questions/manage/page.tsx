"use client";

import { adminSignOut, getAdminSession } from "../../../lib/adminAuth";
import { adminHasPermission } from "../../../lib/adminRoles";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import Papa from "papaparse";
import "../../admin.css";

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

type QuestionRow = {
  id: number;
  source_question_id: string | null;
  subject: string;
  section: string;
  category: string | null;
  question: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  option_e?: string | null;
  correct_answer: string;
  marks: number;
  difficulty: string | null;
  is_active: boolean;
};

export default function AdminQuestionManagerPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [subjectFilter, setSubjectFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) { router.replace("/account"); return; }
      if (!(await adminHasPermission("cbt.questions.manage"))) {
        if (active) { setMessage("You do not have permission to manage the question bank."); setLoading(false); }
        return;
      }
      setAdminUser(admin);
      await loadQuestions();
    }
    void init().catch(() => { if (active) { setMessage("Could not verify administrator access."); setLoading(false); } });
    return () => { active = false; };
  }, [router]);

  async function loadQuestions() {
    setLoading(true);
    setMessage("");

    // Fetch the full bank in bounded requests. The table itself is rendered
    // in small UI pages below so thousands of rows never enter the DOM at once.
    const fetchPageSize = 500;
    const columns =
      "id, source_question_id, subject, section, category, question, option_a, option_b, option_c, option_d, option_e, correct_answer, marks, difficulty, is_active";
    const allQuestions: QuestionRow[] = [];
    let lastId: number | null = null;

    try {
      while (true) {
        let query = supabase
          .from("questions")
          .select(columns)
          .order("id", { ascending: false })
          .limit(fetchPageSize);

        if (lastId !== null) {
          query = query.lt("id", lastId);
        }

        const { data, error } = await query;

        if (error) {
          setQuestions(allQuestions);
          setCurrentPage(1);
          setMessage(
            `Question loading stopped after ${allQuestions.length} records: ${error.message}. The records already loaded are still available; refresh to retry.`
          );
          return;
        }

        const page = (data || []) as QuestionRow[];
        allQuestions.push(...page);

        if (page.length < fetchPageSize) break;

        // Primary-key cursor prevents overlap and offset drift as new rows arrive.
        lastId = page[page.length - 1].id;
      }

      setQuestions(allQuestions);
      setCurrentPage(1);
      if (allQuestions.length === 0) {
        setMessage("The database returned no questions for this administrator session. Check the question-bank access policy and refresh.");
      }
    } catch (error) {
      setQuestions(allQuestions);
      setCurrentPage(1);
      const detail = error instanceof Error ? error.message : "Unexpected network error";
      setMessage(
        `Could not finish loading the question bank after ${allQuestions.length} records: ${detail}. Please refresh to retry.`
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleQuestionStatus(question: QuestionRow) {
    try {
      setUpdatingId(question.id);
      setMessage("");

      const { error } = await supabase
        .from("questions")
        .update({ is_active: !question.is_active })
        .eq("id", question.id);

      if (error) {
        setMessage(`Update failed: ${error.message}`);
        setUpdatingId(null);
        return;
      }

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === question.id
            ? { ...item, is_active: !item.is_active }
            : item
        )
      );

      setMessage(
        `Question ${question.id} ${
          question.is_active ? "deactivated" : "activated"
        } successfully.`
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateFilteredQuestionsStatus(makeActive: boolean) {
    if (filteredQuestions.length === 0) {
      setMessage(`No filtered questions to ${makeActive ? "activate" : "deactivate"}.`);
      return;
    }

    const confirmed = window.confirm(
      `${makeActive ? "Activate" : "Deactivate"} ${filteredQuestions.length} filtered question(s)?`
    );

    if (!confirmed) return;

    try {
      setBulkLoading(true);
      setMessage("");

      const ids = filteredQuestions.map((q) => q.id);

      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);

        const { error } = await supabase
          .from("questions")
          .update({ is_active: makeActive })
          .in("id", batch);

        if (error) {
          setMessage(
            `Bulk ${makeActive ? "activation" : "deactivation"} failed: ${error.message}`
          );
          setBulkLoading(false);
          return;
        }
      }

      setQuestions((prev) =>
        prev.map((q) =>
          ids.includes(q.id) ? { ...q, is_active: makeActive } : q
        )
      );

      setMessage(
        `${filteredQuestions.length} question(s) ${
          makeActive ? "activated" : "deactivated"
        } successfully.`
      );
    } finally {
      setBulkLoading(false);
    }
  }

  function exportQuestionsToCsv() {
    if (filteredQuestions.length === 0) {
      setMessage("No questions to export.");
      return;
    }

    const csvData = filteredQuestions.map((q) => ({
      id: q.id,
      source_question_id: q.source_question_id || "",
      subject: q.subject,
      section: q.section,
      category: q.category || "",
      question: q.question,
      option_a: q.option_a || "",
      option_b: q.option_b || "",
      option_c: q.option_c || "",
      option_d: q.option_d || "",
      option_e: q.option_e || "",
      correct_answer: q.correct_answer,
      marks: q.marks,
      difficulty: q.difficulty || "medium",
      is_active: q.is_active ? "TRUE" : "FALSE",
    }));

    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute(
      "download",
      `brainlab_questions_${subjectFilter.toLowerCase()}_${dateStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage(`Successfully exported ${filteredQuestions.length} questions to CSV.`);
  }

  function handleLogout() {
    void adminSignOut();
    router.push("/admin/login");
  }

  const subjects = useMemo(() => {
    const values = Array.from(
      new Set(
        questions
          .map((q) => q.subject?.trim())
          .filter((v): v is string => Boolean(v))
      )
    ).sort();
    return ["All", ...values];
  }, [questions]);

  const sections = useMemo(() => {
    const values = Array.from(
      new Set(
        questions
          .map((q) => q.section?.trim())
          .filter((v): v is string => Boolean(v))
      )
    ).sort();
    return ["All", ...values];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const subjectMatch =
        subjectFilter === "All" || q.subject === subjectFilter;

      const sectionMatch =
        sectionFilter === "All" || q.section === sectionFilter;

      const search = searchText.trim().toLowerCase();
      const searchMatch =
        search === "" ||
        q.question.toLowerCase().includes(search) ||
        (q.category || "").toLowerCase().includes(search) ||
        (q.source_question_id || "").toLowerCase().includes(search);

      return subjectMatch && sectionMatch && searchMatch;
    });
  }, [questions, subjectFilter, sectionFilter, searchText]);

  const tablePageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / tablePageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleQuestions = useMemo(() => {
    const start = (safeCurrentPage - 1) * tablePageSize;
    return filteredQuestions.slice(start, start + tablePageSize);
  }, [filteredQuestions, safeCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [subjectFilter, sectionFilter, searchText]);

  const activeCount = filteredQuestions.filter((q) => q.is_active).length;
  const inactiveCount = filteredQuestions.length - activeCount;

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Brainlab Question Manager</div>
              <h1 className="admin-title">Manage uploaded questions</h1>
              <p className="admin-subtitle">
                Filter, search, edit, and control the active status of questions
                in your bank without touching Supabase manually.
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
                onClick={exportQuestionsToCsv}
                className="admin-btn-light"
                title="Download filtered questions as CSV"
              >
                📥 Export CSV
              </button>
              <button
                onClick={() => router.push("/admin/questions")}
                className="admin-btn-light"
              >
                Upload Questions
              </button>

              <button
                onClick={() => router.push("/admin/results")}
                className="admin-btn-light"
              >
                Results
              </button>

              <AdminNotificationBell />
              <button onClick={handleLogout} className="admin-btn-primary">
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="admin-section admin-stats">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Loaded Questions</p>
            <p className="admin-stat-value">{questions.length}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Filtered Active</p>
            <p className="admin-stat-value">{activeCount}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Filtered Inactive</p>
            <p className="admin-stat-value">{inactiveCount}</p>
          </div>
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Filters</h2>
          <p className="admin-card-text">
            Narrow the question bank by subject, section, or keyword.
          </p>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="admin-input"
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Section</label>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="admin-input"
              >
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-setting-box" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Search</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by question text, category, or source ID"
                className="admin-input"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <button onClick={loadQuestions} className="admin-btn-primary">
              Refresh Questions
            </button>

            <button
              onClick={() => updateFilteredQuestionsStatus(true)}
              disabled={bulkLoading || filteredQuestions.length === 0}
              className="admin-btn-light"
            >
              {bulkLoading ? "Processing..." : "Activate All Filtered"}
            </button>

            <button
              onClick={() => updateFilteredQuestionsStatus(false)}
              disabled={bulkLoading || filteredQuestions.length === 0}
              className="admin-btn-light"
            >
              {bulkLoading ? "Processing..." : "Deactivate All Filtered"}
            </button>

            <button
              onClick={() => {
                setSubjectFilter("All");
                setSectionFilter("All");
                setSearchText("");
              }}
              className="admin-btn-light"
            >
              Clear Filters
            </button>
          </div>

          {message && <div className="admin-message">{message}</div>}
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Question Bank</h2>
          <p className="admin-card-text">
            Showing {filteredQuestions.length} question(s) across the complete loaded bank.
            {filteredQuestions.length > 0 && (
              <> Displaying {((safeCurrentPage - 1) * tablePageSize) + 1}–{Math.min(safeCurrentPage * tablePageSize, filteredQuestions.length)}.</>
            )}
          </p>

          {loading ? (
            <p className="mt-6 text-slate-600">Loading questions...</p>
          ) : filteredQuestions.length === 0 ? (
            <p className="mt-6 text-slate-600">No questions found.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Source ID</th>
                    <th>Subject</th>
                    <th>Section</th>
                    <th>Category</th>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Marks</th>
                    <th>Status</th>
                    <th>Action</th>
                    <th>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleQuestions.map((question) => (
                    <tr key={question.id}>
                      <td>{question.id}</td>
                      <td>{question.source_question_id || "-"}</td>
                      <td>{question.subject}</td>
                      <td>{question.section}</td>
                      <td>{question.category || "-"}</td>
                      <td>{question.question}</td>
                      <td>{question.correct_answer}</td>
                      <td>{question.marks}</td>
                      <td>
                        {question.is_active ? (
                          <span className="admin-status-unused">Active</span>
                        ) : (
                          <span className="admin-status-used">Inactive</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleQuestionStatus(question)}
                          disabled={updatingId === question.id}
                          className="admin-btn-light"
                          style={{ padding: "10px 14px" }}
                        >
                          {updatingId === question.id
                            ? "Updating..."
                            : question.is_active
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            router.push(`/admin/questions/edit/${question.id}`)
                          }
                          className="admin-btn-light"
                          style={{ padding: "10px 14px" }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filteredQuestions.length > tablePageSize && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className="admin-btn-light"
              >
                Previous
              </button>
              <span className="text-sm" aria-live="polite">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="admin-btn-light"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}