"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { getAdminSession } from "../../../../lib/adminAuth";
import { adminHasPermission } from "../../../../lib/adminRoles";
import "../../../admin.css";

type QuestionRow = {
  id: number;
  source_question_id: string | null;
  subject: string;
  section: string;
  category: string | null;
  question: string;
  question_image_url: string | null;
  question_image_alt: string | null;
  option_a: string | null;
  option_a_image_url: string | null;
  option_a_image_alt: string | null;
  option_b: string | null;
  option_b_image_url: string | null;
  option_b_image_alt: string | null;
  option_c: string | null;
  option_c_image_url: string | null;
  option_c_image_alt: string | null;
  option_d: string | null;
  option_d_image_url: string | null;
  option_d_image_alt: string | null;
  option_e: string | null;
  option_e_image_url: string | null;
  option_e_image_alt: string | null;
  correct_answer: string;
  explanation: string | null;
  explanation_image_url: string | null;
  explanation_image_alt: string | null;
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
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) { router.replace("/account"); return; }
      if (!(await adminHasPermission("cbt.questions.manage"))) {
        if (active) { setMessage("You do not have permission to edit questions."); setLoading(false); }
        return;
      }
      await loadQuestion();
    }
    void init().catch(() => { if (active) { setMessage("Could not verify administrator access."); setLoading(false); } });
    return () => { active = false; };
  }, [router]);



  type ImageUrlField =
    | "question_image_url"
    | "option_a_image_url"
    | "option_b_image_url"
    | "option_c_image_url"
    | "option_d_image_url"
    | "explanation_image_url";

  async function uploadQuestionImage(target: ImageUrlField, file: File) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setMessage("Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Images must be 10 MB or smaller.");
      return;
    }

    setUploadingMedia(target);
    setMessage("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("Your administrator session has expired. Sign in again.");
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "image";
      const objectPath = `${authData.user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("question-media")
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("question-media")
        .getPublicUrl(objectPath);

      setQuestion((current) =>
        current ? { ...current, [target]: urlData.publicUrl } : current
      );
      setMessage("Image uploaded. Save the question to publish the image link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploadingMedia(null);
    }
  }

  async function handleSave() {
    if (!question) return;

    const mediaUrls = [
      question.question_image_url,
      question.option_a_image_url,
      question.option_b_image_url,
      question.option_c_image_url,
      question.option_d_image_url,
      question.explanation_image_url,
    ].filter((value): value is string => Boolean(value?.trim()));

    if (mediaUrls.some((value) => !/^https:\/\//i.test(value.trim()))) {
      setMessage("Image URLs must use HTTPS. Use a secure image URL from approved storage.");
      return;
    }

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
        question_image_url: question.question_image_url || null,
        question_image_alt: question.question_image_alt || null,
        option_a: question.option_a,
        option_a_image_url: question.option_a_image_url || null,
        option_a_image_alt: question.option_a_image_alt || null,
        option_b: question.option_b,
        option_b_image_url: question.option_b_image_url || null,
        option_b_image_alt: question.option_b_image_alt || null,
        option_c: question.option_c,
        option_c_image_url: question.option_c_image_url || null,
        option_c_image_alt: question.option_c_image_alt || null,
        option_d: question.option_d,
        option_d_image_url: question.option_d_image_url || null,
        option_d_image_alt: question.option_d_image_alt || null,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        explanation_image_url: question.explanation_image_url || null,
        explanation_image_alt: question.explanation_image_alt || null,
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

            <div className="admin-setting-box" style={{ gridColumn: "1 / -1" }}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Answer Options</span>
                <button
                  type="button"
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                  onClick={() => {
                    setQuestion({
                      ...question,
                      category: "true_false",
                      option_a: "True",
                      option_b: "False",
                      option_c: "",
                      option_d: "",
                      correct_answer: ["A", "B"].includes(question.correct_answer) ? question.correct_answer : "A",
                    });
                  }}
                >
                  ⚡ Preset: True / False
                </button>
              </div>
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
              <label className="admin-label">Option E (optional)</label>
              <input className="admin-input" value={question.option_e || ""} onChange={(e) => setQuestion({ ...question, option_e: e.target.value || null })} />
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
                {question.option_e?.trim() && <option value="E">E</option>}
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
              <h2 className="admin-card-title">Question and option images</h2>
              <p className="text-sm text-gray-600">
                Upload JPG, PNG, WebP, or GIF images (maximum 10 MB), or paste an HTTPS URL. Uploaded images are stored in BrainLab question media. Add meaningful alt text for accessibility.
              </p>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Question image URL</label>
              <input className="admin-input" type="url" placeholder="https://..." value={question.question_image_url || ""} onChange={(e) => setQuestion({ ...question, question_image_url: e.target.value || null })} />
              <label className="admin-label">Or upload question image</label>
              <input className="admin-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingMedia !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadQuestionImage("question_image_url", file); e.currentTarget.value = ""; }} />
              {uploadingMedia === "question_image_url" && <p className="text-sm">Uploading image…</p>}
              <label className="admin-label">Question image alt text</label>
              <input className="admin-input" value={question.question_image_alt || ""} onChange={(e) => setQuestion({ ...question, question_image_alt: e.target.value || null })} />
            </div>

            {([
              ["A", "option_a_image_url", "option_a_image_alt"],
              ["B", "option_b_image_url", "option_b_image_alt"],
              ["C", "option_c_image_url", "option_c_image_alt"],
              ["D", "option_d_image_url", "option_d_image_alt"],
            ] as const).map(([letter, urlKey, altKey]) => (
              <div className="admin-setting-box" key={letter}>
                <label className="admin-label">Option {letter} image URL</label>
                <input className="admin-input" type="url" placeholder="https://..." value={question[urlKey] || ""} onChange={(e) => setQuestion({ ...question, [urlKey]: e.target.value || null })} />
                <label className="admin-label">Or upload option {letter} image</label>
                <input className="admin-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingMedia !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadQuestionImage(urlKey, file); e.currentTarget.value = ""; }} />
                {uploadingMedia === urlKey && <p className="text-sm">Uploading image…</p>}
                <label className="admin-label">Option {letter} image alt text</label>
                <input className="admin-input" value={question[altKey] || ""} onChange={(e) => setQuestion({ ...question, [altKey]: e.target.value || null })} />
              </div>
            ))}

            <div className="admin-setting-box" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Explanation</label>
              <textarea
                className="admin-input"
                value={question.explanation || ""}
                onChange={(e) =>
                  setQuestion({ ...question, explanation: e.target.value })
                }
              />
              <label className="admin-label">Explanation image URL</label>
              <input className="admin-input" type="url" placeholder="https://..." value={question.explanation_image_url || ""} onChange={(e) => setQuestion({ ...question, explanation_image_url: e.target.value || null })} />
              <label className="admin-label">Or upload explanation image</label>
              <input className="admin-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingMedia !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadQuestionImage("explanation_image_url", file); e.currentTarget.value = ""; }} />
              {uploadingMedia === "explanation_image_url" && <p className="text-sm">Uploading image…</p>}
              <label className="admin-label">Explanation image alt text</label>
              <input className="admin-input" value={question.explanation_image_alt || ""} onChange={(e) => setQuestion({ ...question, explanation_image_alt: e.target.value || null })} />
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