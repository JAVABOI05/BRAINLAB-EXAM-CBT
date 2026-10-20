"use client";

import { adminSignOut, getAdminSession } from "../../../lib/adminAuth";
import { adminHasPermission } from "../../../lib/adminRoles";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
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
  correct_answer: string;
  marks: number;
  difficulty: string | null;
  is_active: boolean;
};

export default function AdminQuestionManagerPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
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

    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, source_question_id, subject, section, category, question, correct_answer, marks, difficulty, is_active"
      )
      .order("id", { ascending: false })
      .range(0, 4999);

    if (error) {
      setMessage(`Failed to load questions: ${error.message}`);
      setLoading(false);
      return;
    }

    setQuestions((data || []) as QuestionRow[]);
    setLoading(false);
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
      alert(`No filtered questions to ${makeActive ? "activate" : "deactivate"}.`);
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
      alert("No questions to export.");
      return;
    }

    const csvData = filteredQuestions.map((q) => ({
      id: q.id,
      source_question_id: q.source_question_id || "",
      subject: q.subject,
      section: q.section,
      category: q.category || "",
      question: q.question,
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
            Showing {filteredQuestions.length} question(s).
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
                  {filteredQuestions.map((question) => (
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
        </section>
      </div>
    </main>
  );
}