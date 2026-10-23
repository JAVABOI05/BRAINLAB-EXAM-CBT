"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import { useRouter } from "next/navigation";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import Papa from "papaparse";
import { supabase } from "../../lib/supabase";
import "../admin.css";

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

type CsvQuestionRow = {
  source_question_id?: string;
  subject?: string;
  section?: string;
  category?: string;
  passage_id?: string;
  passage_title?: string;
  passage_text?: string;
  question?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
  explanation?: string;
  marks?: string | number;
  difficulty?: string;
  is_active?: string | boolean;
};

type ParsedRow = {
  source_question_id: string | null;
  subject: string;
  section: string;
  category: string | null;
  passage_id: string | null;
  passage_title: string | null;
  passage_text: string | null;
  question: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string | null;
  marks: number;
  difficulty: string | null;
  is_active: boolean;
};

export default function AdminQuestionsPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<CsvQuestionRow[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) { router.replace("/account"); return; }
      if (!(await adminHasPermission("cbt.questions.manage"))) {
        if (active) setMessage("You do not have permission to manage the question bank.");
        return;
      }
      setAdminUser(admin);
    }
    void init().catch(() => { if (active) setMessage("Could not verify administrator access."); });
    return () => { active = false; };
  }, [router]);

  function normalizeBoolean(value: string | boolean | undefined): boolean {
    if (typeof value === "boolean") return value;
    return String(value ?? "").trim().toLowerCase() === "true";
  }

  function normalizeNullable(value: unknown): string | null {
    const v = String(value ?? "").trim();
    return v === "" ? null : v;
  }

  function validateAndTransform(rows: CsvQuestionRow[]) {
    const nextErrors: string[] = [];
    const nextParsed: ParsedRow[] = [];

    rows.forEach((row, index) => {
      const rowNo = index + 2;

      const subject = String(row.subject ?? "").trim();
      const section = String(row.section ?? "").trim().toLowerCase();
      const question = String(row.question ?? "").trim();
      const correctAnswer = String(row.correct_answer ?? "").trim().toUpperCase();
      const optionA = normalizeNullable(row.option_a);
      const optionB = normalizeNullable(row.option_b);
      const optionC = normalizeNullable(row.option_c);
      const optionD = normalizeNullable(row.option_d);
      const marks = Number(row.marks ?? 1);

      if (!subject) nextErrors.push(`Row ${rowNo}: subject is required.`);
      if (!section) nextErrors.push(`Row ${rowNo}: section is required.`);
      if (!question) nextErrors.push(`Row ${rowNo}: question is required.`);
      if (!["A", "B", "C", "D"].includes(correctAnswer)) {
        nextErrors.push(`Row ${rowNo}: correct_answer must be A, B, C, or D.`);
      }

      if (!optionA || !optionB || !optionC || !optionD) {
        nextErrors.push(`Row ${rowNo}: option_a to option_d are all required.`);
      }

      if (Number.isNaN(marks)) {
        nextErrors.push(`Row ${rowNo}: marks must be a number.`);
      }

      if (
        subject &&
        section &&
        question &&
        ["A", "B", "C", "D"].includes(correctAnswer) &&
        optionA &&
        optionB &&
        optionC &&
        optionD &&
        !Number.isNaN(marks)
      ) {
        nextParsed.push({
          source_question_id: normalizeNullable(row.source_question_id),
          subject,
          section,
          category: normalizeNullable(row.category),
          passage_id: normalizeNullable(row.passage_id),
          passage_title: normalizeNullable(row.passage_title),
          passage_text: normalizeNullable(row.passage_text),
          question,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
          correct_answer: correctAnswer as "A" | "B" | "C" | "D",
          explanation: normalizeNullable(row.explanation),
          marks: marks || 1,
          difficulty: normalizeNullable(row.difficulty),
          is_active: normalizeBoolean(row.is_active),
        });
      }
    });

    setErrors(nextErrors);
    setParsedRows(nextParsed);
  }

  function handleFileChange(file: File) {
    setFileName(file.name);
    setMessage("");
    setErrors([]);
    setRawRows([]);
    setParsedRows([]);

    Papa.parse<CsvQuestionRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data || [];
        setRawRows(rows);
        validateAndTransform(rows);
      },
      error: (error) => {
        setErrors([error.message]);
      },
    });
  }

  async function handleUpload() {
    if (parsedRows.length === 0) {
      setMessage("No valid rows to upload.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const { error } = await supabase.from("questions").insert(parsedRows);

      if (error) {
        setMessage(`Upload failed: ${error.message}`);
        setUploading(false);
        return;
      }

      setMessage(`Successfully uploaded ${parsedRows.length} questions.`);
      setRawRows([]);
      setParsedRows([]);
      setErrors([]);
      setFileName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleDownloadTemplate() {
    const headers = [
      "source_question_id",
      "subject",
      "section",
      "category",
      "passage_id",
      "passage_title",
      "passage_text",
      "question",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "correct_answer",
      "explanation",
      "marks",
      "difficulty",
      "is_active",
    ];

    const sampleRows = [
      [
        "ENG001",
        "English",
        "objective",
        "Grammar",
        "",
        "",
        "",
        "Choose the correct option.",
        "Option A",
        "Option B",
        "Option C",
        "Option D",
        "A",
        "Optional explanation",
        "1",
        "medium",
        "true",
      ],
      [
        "ENGC001",
        "English",
        "comprehension",
        "Reading",
        "PASSAGE_1",
        "Passage 1",
        "This is the passage text.",
        "What is the main idea of the passage?",
        "Option A",
        "Option B",
        "Option C",
        "Option D",
        "B",
        "",
        "1",
        "medium",
        "true",
      ],
    ];

    const csvContent = [headers, ...sampleRows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "brainlab_question_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  const previewRows = useMemo(() => parsedRows.slice(0, 10), [parsedRows]);

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Brainlab Question Upload</div>
              <h1 className="admin-title">Upload question bank from CSV</h1>
              <p className="admin-subtitle">
                Import multiple questions into Supabase in one go. Upload a CSV,
                preview the parsed records, and send them directly into the
                questions table.
              </p>

              {adminUser && (
                <div className="admin-user-chip">
                  Signed in as <strong>{adminUser.email}</strong>
                </div>
              )}
            </div>

            <div className="admin-actions">
              <button
                onClick={() => router.push("/admin/questions/manage")}
                className="admin-btn-light"
              >
                Question Bank
              </button>
              <button
                onClick={() => router.push("/admin/schools")}
                className="admin-btn-light"
              >
                Schools
              </button>
              <AdminNotificationBell />
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
                onClick={() => router.push("/admin/results")}
                className="admin-btn-light"
              >
                Results
              </button>
            </div>
          </div>
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">CSV Upload</h2>
          <p className="admin-card-text">
            Required columns: source_question_id, subject, section, category,
            passage_id, passage_title, passage_text, question, option_a,
            option_b, option_c, option_d, correct_answer, explanation, marks,
            difficulty, is_active.
          </p>

          <div className="admin-settings-grid">
            <div className="admin-setting-box" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Choose CSV file</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
                className="admin-input"
              />
              <p className="admin-help">
                {fileName ? `Selected file: ${fileName}` : "No file selected."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              onClick={handleUpload}
              disabled={uploading || parsedRows.length === 0 || errors.length > 0}
              className="admin-btn-primary"
            >
              {uploading ? "Uploading..." : "Upload Questions"}
            </button>

            <button onClick={handleDownloadTemplate} className="admin-btn-light">
              Download Template
            </button>
          </div>

          {message && <div className="admin-message">{message}</div>}
        </section>

        <section className="admin-section admin-stats">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Rows Read</p>
            <p className="admin-stat-value">{rawRows.length}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Valid Rows</p>
            <p className="admin-stat-value">{parsedRows.length}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Errors</p>
            <p className="admin-stat-value">{errors.length}</p>
          </div>
        </section>

        {errors.length > 0 && (
          <section className="admin-section admin-card">
            <h2 className="admin-card-title">Validation Errors</h2>
            <div className="admin-message">
              {errors.slice(0, 20).map((err, i) => (
                <div key={i}>{err}</div>
              ))}
              {errors.length > 20 && <div>...and {errors.length - 20} more</div>}
            </div>
          </section>
        )}

        {previewRows.length > 0 && (
          <section className="admin-section admin-card">
            <h2 className="admin-card-title">Preview</h2>
            <p className="admin-card-text">
              Showing the first 10 valid rows before upload.
            </p>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Section</th>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Marks</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={index}>
                      <td>{row.subject}</td>
                      <td>{row.section}</td>
                      <td>{row.question}</td>
                      <td>{row.correct_answer}</td>
                      <td>{row.marks}</td>
                      <td>{row.is_active ? "true" : "false"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}