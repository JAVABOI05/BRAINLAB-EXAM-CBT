"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import "../../../admin.css";

type QuestionRow = {
  id: number;
  source_question_id: string | null;
  subject: string;
  section: string;
  category: string | null;
  question: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  explanation: string | null;
  marks: number;
  difficulty: string | null;
  is_active: boolean;
};

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [question, setQuestion] = useState<QuestionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedAdmin = localStorage.getItem("admin_user");
    if (!savedAdmin) {
      router.push("/admin/login");
      return;
    }

    loadQuestion();
  }, [router]);

  async function loadQuestion() {
    setLoading(true);

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      setMessage("Question not found.");
      setLoading(false);
      return;
    }

    setQuestion(data as QuestionRow);
    setLoading(false);
  }

  async function handleSave() {
    if (!question) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("questions")
      .update({
        source_question_id: question.source_question_id,
        subject: question.subject,
        section: question.section,
        category: question.category,
        question: question.question,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        marks: question.marks,
        difficulty: question.difficulty,
        is_active: question.is_active,
      })
      .eq("id", question.id);

    if (error) {
      setMessage(`Save failed: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("Question updated successfully.");
    setSaving(false);
  }

  if (loading || !question) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card">
            <p>Loading question...</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-card">
          <h1 className="admin-card-title">Edit Question</h1>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">Source ID</label>
              <input
                className="admin-input"
                value={question.source_question_id || ""}
                onChange={(e) =>
                  setQuestion({ ...question, source_question_id: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Subject</label>
              <input
                className="admin-input"
                value={question.subject}
                onChange={(e) =>
                  setQuestion({ ...question, subject: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Section</label>
              <input
                className="admin-input"
                value={question.section}
                onChange={(e) =>
                  setQuestion({ ...question, section: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Category</label>
              <input
                className="admin-input"
                value={question.category || ""}
                onChange={(e) =>
                  setQuestion({ ...question, category: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Question</label>
              <textarea
                className="admin-input"
                value={question.question}
                onChange={(e) =>
                  setQuestion({ ...question, question: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Option A</label>
              <input
                className="admin-input"
                value={question.option_a || ""}
                onChange={(e) =>
                  setQuestion({ ...question, option_a: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Option B</label>
              <input
                className="admin-input"
                value={question.option_b || ""}
                onChange={(e) =>
                  setQuestion({ ...question, option_b: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Option C</label>
              <input
                className="admin-input"
                value={question.option_c || ""}
                onChange={(e) =>
                  setQuestion({ ...question, option_c: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Option D</label>
              <input
                className="admin-input"
                value={question.option_d || ""}
                onChange={(e) =>
                  setQuestion({ ...question, option_d: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Correct Answer</label>
              <select
                className="admin-input"
                value={question.correct_answer}
                onChange={(e) =>
                  setQuestion({ ...question, correct_answer: e.target.value })
                }
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Marks</label>
              <input
                type="number"
                className="admin-input"
                value={question.marks}
                onChange={(e) =>
                  setQuestion({ ...question, marks: Number(e.target.value) || 1 })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Difficulty</label>
              <input
                className="admin-input"
                value={question.difficulty || ""}
                onChange={(e) =>
                  setQuestion({ ...question, difficulty: e.target.value })
                }
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={question.is_active}
                  onChange={(e) =>
                    setQuestion({ ...question, is_active: e.target.checked })
                  }
                />
                <span>Question is active</span>
              </label>
            </div>

            <div className="admin-setting-box" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Explanation</label>
              <textarea
                className="admin-input"
                value={question.explanation || ""}
                onChange={(e) =>
                  setQuestion({ ...question, explanation: e.target.value })
                }
              />
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button onClick={handleSave} className="admin-btn-primary">
              {saving ? "Saving..." : "Save Question"}
            </button>

            <button
              onClick={() => router.push("/admin/questions/manage")}
              className="admin-btn-light"
            >
              Back
            </button>
          </div>

          {message && <div className="admin-message">{message}</div>}
        </section>
      </div>
    </main>
  );
}