"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";

type Subject = { id: string; name: string };
type Topic = { id: string; subject_id: string; title: string };
type Test = { id: string; topic_id: string; title: string; instructions: string | null; question_limit: number; time_limit_mins: number | null; pass_percentage: number; shuffle_questions: boolean; is_published: boolean };
type TestQuestion = { id: string; test_id: string; prompt: string; image_url: string | null; options: Record<string, string>; correct_answer: string; explanation: string | null; order_index: number };

export default function AcademyAssessmentsAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questionLimit, setQuestionLimit] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [passPercentage, setPassPercentage] = useState(70);
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setError("");
    const [s, t, a] = await Promise.all([
      supabase.from("learning_subjects").select("id,name").order("name"),
      supabase.from("learning_topics").select("id,subject_id,title").order("title"),
      supabase.from("learning_topic_tests").select("id,topic_id,title,instructions,question_limit,time_limit_mins,pass_percentage,shuffle_questions,is_published").order("created_at", { ascending: false }),
    ]);
    if (s.error || t.error || a.error) {
      setError("Could not load assessment data. Check administrator permissions and the staging migration state.");
      return;
    }
    setSubjects((s.data ?? []) as Subject[]);
    setTopics((t.data ?? []) as Topic[]);
    setTests((a.data ?? []) as Test[]);
    setTopicId((v) => v || t.data?.[0]?.id || "");
    setSelectedTestId((v) => v || a.data?.[0]?.id || "");
  }, []);

  const fetchQuestions = useCallback(async (testId: string): Promise<TestQuestion[]> => {
    if (!testId) return [];
    const { data, error: questionError } = await supabase.from("learning_test_questions")
      .select("id,test_id,prompt,image_url,options,correct_answer,explanation,order_index")
      .eq("test_id", testId).order("order_index").order("created_at");
    if (questionError) throw questionError;
    return (data ?? []) as TestQuestion[];
  }, []);

  const loadQuestions = useCallback(async (testId: string) => {
    try {
      setQuestions(await fetchQuestions(testId));
    } catch {
      setError("Could not load questions for this test.");
      setQuestions([]);
    }
  }, [fetchQuestions]);

  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) { router.replace("/account"); return; }
      setAdmin(session);
      const allowed = await adminHasPermission("learning.content.manage");
      if (!active) return;
      if (!allowed || !["super_admin", "platform_admin", "ai_learning_admin"].includes(session.role)) {
        setError("This workspace requires Super Admin, Platform Admin, or AI & Learning Admin.");
        setLoading(false); return;
      }
      await loadAll();
      if (active) setLoading(false);
    }
    void init().catch(() => { if (active) { setError("Could not verify administrator access."); setLoading(false); } });
    return () => { active = false; };
  }, [router, loadAll]);

  useEffect(() => {
    let active = true;
    async function refreshQuestions() {
      try {
        const nextQuestions = await fetchQuestions(selectedTestId);
        if (active) setQuestions(nextQuestions);
      } catch {
        if (active) {
          setError("Could not load questions for this test.");
          setQuestions([]);
        }
      }
    }
    void refreshQuestions();
    return () => { active = false; };
  }, [selectedTestId, fetchQuestions]);

  async function createTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topicId || !title.trim()) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in again to continue.");
      const { data, error: insertError } = await supabase.from("learning_topic_tests").insert({
        topic_id: topicId, title: title.trim(), instructions: instructions.trim() || null,
        question_limit: Math.min(100, Math.max(1, questionLimit)),
        time_limit_mins: Math.min(600, Math.max(1, timeLimit)),
        pass_percentage: Math.min(100, Math.max(0, passPercentage)),
        shuffle_questions: true, is_published: false, created_by: auth.user.id,
      }).select("id").single();
      if (insertError) throw insertError;
      setTitle(""); setInstructions(""); setSelectedTestId(data.id);
      setMessage("Assessment created as a draft. Add questions before publishing.");
      await loadAll();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create assessment."); }
    finally { setSaving(false); }
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTestId || !prompt.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) return;
    if (imageUrl.trim() && !/^https:\/\//i.test(imageUrl.trim())) { setError("Question image URL must use HTTPS."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in again to continue.");
      const { error: insertError } = await supabase.from("learning_test_questions").insert({
        test_id: selectedTestId, question_type: "mcq", prompt: prompt.trim(),
        image_url: imageUrl.trim() || null,
        options: { A: optionA.trim(), B: optionB.trim(), C: optionC.trim(), D: optionD.trim() },
        correct_answer: correctAnswer, explanation: explanation.trim() || null,
        order_index: questions.length, created_by: auth.user.id,
      });
      if (insertError) throw insertError;
      setPrompt(""); setImageUrl(""); setOptionA(""); setOptionB(""); setOptionC(""); setOptionD(""); setExplanation("");
      setMessage("Question added. The answer key stays in the protected database and is not part of the question preview.");
      await loadQuestions(selectedTestId);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add question."); }
    finally { setSaving(false); }
  }

  async function togglePublished(test: Test) {
    if (!test.is_published && questions.filter((q) => q.test_id === test.id).length < 1) {
      setError("Add at least one question before publishing this assessment."); return;
    }
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from("learning_topic_tests").update({ is_published: !test.is_published }).eq("id", test.id);
    if (updateError) setError(updateError.message);
    else { setMessage(test.is_published ? "Assessment unpublished." : "Assessment published."); await loadAll(); }
    setSaving(false);
  }

  const topicLabel = (id: string) => {
    const topic = topics.find((x) => x.id === id);
    return topic ? `${subjects.find((s) => s.id === topic.subject_id)?.name ?? "Subject"} · ${topic.title}` : "Unknown topic";
  };

  if (loading) return <main className="admin-page"><div className="admin-container"><section className="admin-card">Loading assessment administration…</section></div></main>;

  return <main className="admin-page"><div className="admin-container">
    <section className="admin-hero"><div className="admin-hero-top"><div><div className="admin-badge">BrainLab Academy · Assessment administration</div><h1 className="admin-title">Learning Assessments</h1><p className="admin-subtitle">Configure topic tests, question limits, time limits, pass marks, images, answer options, and publication. Tests are drafts until deliberately published.</p>{admin && <div className="admin-user-chip">{admin.email} · {admin.role.replaceAll("_", " ")}</div>}</div><div className="admin-actions"><button className="admin-btn-light" onClick={() => router.push("/admin/dashboard")}>Dashboard</button><button className="admin-btn-light" onClick={() => router.push("/admin/content")}>Learning content</button></div></div></section>
    {error && <div className="admin-message" role="alert">{error}</div>}{message && <div className="admin-message" role="status">{message}</div>}
    <section className="admin-section admin-grid-2">
      <form className="admin-card" onSubmit={createTest}><h2 className="admin-card-title">Create assessment</h2>
        <label className="admin-label">Topic</label><select className="admin-input" value={topicId} onChange={(e) => setTopicId(e.target.value)} required><option value="">Choose topic</option>{topics.map((t) => <option key={t.id} value={t.id}>{topicLabel(t.id)}</option>)}</select>
        <label className="admin-label">Assessment title</label><input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} placeholder="e.g. Fractions practice test" />
        <label className="admin-label">Instructions</label><textarea className="admin-input" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />
        <label className="admin-label">Question limit</label><input className="admin-input" type="number" min={1} max={100} value={questionLimit} onChange={(e) => setQuestionLimit(Number(e.target.value) || 1)} />
        <label className="admin-label">Time limit (minutes)</label><input className="admin-input" type="number" min={1} max={600} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value) || 1)} />
        <label className="admin-label">Pass percentage</label><input className="admin-input" type="number" min={0} max={100} value={passPercentage} onChange={(e) => setPassPercentage(Number(e.target.value) || 0)} />
        <button className="admin-btn-primary" disabled={saving || !topicId || !title.trim()}>Create draft assessment</button>
      </form>
      <div className="admin-card"><h2 className="admin-card-title">Existing assessments</h2>{tests.length === 0 ? <p className="admin-help">No Learning Hub assessments yet.</p> : <div className="space-y-3">{tests.map((test) => <div key={test.id} className="border-b py-3"><div className="flex flex-wrap justify-between gap-2"><button className="font-semibold text-left underline" onClick={() => setSelectedTestId(test.id)}>{test.title}</button><button className={test.is_published ? "admin-btn-light" : "admin-btn-primary"} disabled={saving} onClick={() => void togglePublished(test)}>{test.is_published ? "Unpublish" : "Publish"}</button></div><p className="admin-help">{topicLabel(test.topic_id)} · {test.question_limit} questions · {test.time_limit_mins ?? "Untimed"} min · Pass {test.pass_percentage}% · select to manage questions</p></div>)}</div>}</div>
    </section>
    <section className="admin-section admin-grid-2">
      <form className="admin-card" onSubmit={addQuestion}><h2 className="admin-card-title">Add MCQ question</h2><label className="admin-label">Target assessment</label><select className="admin-input" value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)} required><option value="">Choose assessment</option>{tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
        <label className="admin-label">Question text</label><textarea className="admin-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} required />
        <label className="admin-label">Optional HTTPS image URL</label><input className="admin-input" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        <label className="admin-label">Option A</label><input className="admin-input" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
        <label className="admin-label">Option B</label><input className="admin-input" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
        <label className="admin-label">Option C</label><input className="admin-input" value={optionC} onChange={(e) => setOptionC(e.target.value)} required />
        <label className="admin-label">Option D</label><input className="admin-input" value={optionD} onChange={(e) => setOptionD(e.target.value)} required />
        <label className="admin-label">Correct answer</label><select className="admin-input" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select>
        <label className="admin-label">Explanation (shown only after submission)</label><textarea className="admin-input" value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} />
        <button className="admin-btn-primary" disabled={saving || !selectedTestId || !prompt.trim()}>Add question</button>
      </form>
      <div className="admin-card"><h2 className="admin-card-title">Question bank for selected assessment</h2>{!selectedTestId ? <p className="admin-help">Select an assessment.</p> : questions.length === 0 ? <p className="admin-help">No questions have been added.</p> : <div className="space-y-4">{questions.map((q, index) => <article key={q.id} className="border-b pb-4"><p className="admin-help">Question {index + 1}</p><p className="font-semibold">{q.prompt}</p>{q.image_url && <p className="admin-help">Includes an image</p>}<ul className="list-disc pl-5 text-sm">{(["A","B","C","D"] as const).map((key) => <li key={key}>{key}. {q.options?.[key] ?? ""}</li>)}</ul><p className="admin-help">Answer key: {q.correct_answer}{q.explanation ? ` · Explanation: ${q.explanation}` : ""}</p></article>)}</div>}</div>
    </section>
  </div></main>;
}
