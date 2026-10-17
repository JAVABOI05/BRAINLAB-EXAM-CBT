"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../../../lib/supabase";

type TestInfo = {
  id: string;
  topic_id: string;
  title: string;
  instructions: string | null;
  question_limit: number;
  time_limit_mins: number | null;
  pass_percentage: number;
};
type Choice = { id: string; text: string };
type TestQuestion = {
  id: string;
  version: number;
  questionType: "mcq" | "true_false";
  prompt: string;
  imageUrl: string | null;
  options: Choice[];
};
type Attempt = {
  attemptId: string;
  test: { id: string; title: string; instructions: string | null; questionCount: number; timeLimitMins: number | null; passPercentage: number };
  startedAt: string;
  deadlineAt: string | null;
  questions: TestQuestion[];
  answers: Record<string, string>;
};
type ReviewItem = {
  questionId: string;
  prompt: string;
  questionType: "mcq" | "true_false";
  imageUrl: string | null;
  options: Choice[];
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
};
type Result = {
  attemptId: string;
  status: "submitted" | "expired";
  title: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  passPercentage: number;
  startedAt: string;
  submittedAt: string;
  review: ReviewItem[];
};

function formatSeconds(value: number) {
  const safe = Math.max(0, Math.floor(value));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function TopicTestPage() {
  const params = useParams<{ subjectSlug: string; topicSlug: string }>();
  const subjectSlug = decodeURIComponent(params.subjectSlug);
  const topicSlug = decodeURIComponent(params.topicSlug);
  const [test, setTest] = useState<TestInfo | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const pendingSaves = useRef<Map<string, Promise<boolean>>>(new Map());
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function loadTest() {
      setLoading(true);
      setError("");
      const { data: subject, error: subjectError } = await supabase
        .from("learning_subjects").select("id,name,slug").eq("slug", subjectSlug).eq("is_published", true).maybeSingle();
      if (!active) return;
      if (subjectError || !subject) {
        setError("This subject is not available.");
        setLoading(false);
        return;
      }
      const { data: topic, error: topicError } = await supabase
        .from("learning_topics").select("id,title,slug").eq("subject_id", subject.id).eq("slug", topicSlug).eq("is_published", true).maybeSingle();
      if (!active) return;
      if (topicError || !topic) {
        setError("This topic is not available.");
        setLoading(false);
        return;
      }
      const { data: testData, error: testError } = await supabase
        .from("learning_topic_tests")
        .select("id,topic_id,title,instructions,question_limit,time_limit_mins,pass_percentage")
        .eq("topic_id", topic.id).eq("is_published", true).maybeSingle();
      if (!active) return;
      if (testError || !testData) {
        setError("A topic test has not been published for this topic yet.");
        setLoading(false);
        return;
      }
      setSubjectName(subject.name);
      setTopicTitle(topic.title);
      setTest(testData as TestInfo);
      setLoading(false);
    }
    void loadTest();
    return () => { active = false; };
  }, [subjectSlug, topicSlug]);

  const saveAnswer = useCallback(async (attemptId: string, questionId: string, selectedAnswer: string) => {
    const token = tokenRef.current;
    if (!token) return false;
    const previous = pendingSaves.current.get(questionId) ?? Promise.resolve(true);
    const promise = previous.catch(() => false).then(async () => {
      const response = await fetch(`/api/learning/attempts/${attemptId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId, selectedAnswer }),
        cache: "no-store",
      });
      return response.ok;
    }).catch(() => false);
    pendingSaves.current.set(questionId, promise);
    const saved = await promise;
    if (pendingSaves.current.get(questionId) === promise) pendingSaves.current.delete(questionId);
    return saved;
  }, []);

  const submitAttempt = useCallback(async (auto = false) => {
    if (!attempt || submittingRef.current || result) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSaving(true);
    setError("");
    setNotice(auto ? "Time is up. Submitting your saved answers…" : "Submitting your answers…");
    const pendingResults = await Promise.all(Array.from(pendingSaves.current.values()));
    let retryResults: boolean[] = [];
    if (!auto) {
      // Re-sync every locally selected answer immediately before manual submission.
      // The server still grades only its persisted copy; it never trusts this payload.
      retryResults = await Promise.all(Object.entries(answers).map(([questionId, selectedAnswer]) =>
        saveAnswer(attempt.attemptId, questionId, selectedAnswer)
      ));
    }
    setSaving(false);
    const hasUnsyncedAnswers = Object.keys(answers).length > 0
      ? retryResults.some((saved) => !saved)
      : pendingResults.some((saved) => !saved);
    if (!auto && hasUnsyncedAnswers) {
      submittingRef.current = false;
      setSubmitting(false);
      setError("Some answers could not be saved. Check your connection and try submitting again.");
      setNotice("");
      return;
    }
    const token = tokenRef.current;
    if (!token) {
      submittingRef.current = false;
      setSubmitting(false);
      setError("Your session has expired. Sign in again before submitting.");
      setNotice("");
      return;
    }
    try {
      const response = await fetch(`/api/learning/attempts/${attempt.attemptId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "We could not submit this assessment.");
      setResult(data as Result);
      setNotice("");
      if (typeof window !== "undefined") localStorage.removeItem(`brainlab-learning-test:${attempt.attemptId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We could not submit this assessment.");
      setNotice("");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [attempt, result, answers, saveAnswer]);

  useEffect(() => {
    if (!attempt?.deadlineAt || result) {
      setTimeLeft(null);
      return;
    }
    const update = () => setTimeLeft(Math.max(0, Math.ceil((new Date(attempt.deadlineAt as string).getTime() - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [attempt, result]);

  useEffect(() => {
    if (attempt && timeLeft === 0 && !result && !submittingRef.current) void submitAttempt(true);
  }, [attempt, timeLeft, result, submitAttempt]);

  async function beginTest() {
    if (!test || starting) return;
    setStarting(true);
    setError("");
    setNotice("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) {
        setError("Sign in to your BrainLab account before starting a topic test.");
        return;
      }
      tokenRef.current = token;
      const response = await fetch(`/api/learning/tests/${test.id}/attempts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "We could not start this assessment.");
      const started = data as Attempt;
      setAttempt(started);
      setCurrentIndex(0);
      const storageKey = `brainlab-learning-test:${started.attemptId}`;
      let localRestored: Record<string, string> = {};
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) localRestored = parsed as Record<string, string>;
        }
      } catch { localRestored = {}; }
      const allowed = new Map(started.questions.map((question) => [question.id, new Set(question.options.map((option) => option.id))]));
      const validAnswers = (source: Record<string, string>) => Object.fromEntries(
        Object.entries(source).filter(([questionId, answer]) => allowed.has(questionId) && allowed.get(questionId)?.has(answer))
      );
      // Server-saved selections recover attempts on another device. Local recovery
      // data wins for this device because it may contain a newer unsynced selection.
      const serverRestored = validAnswers(started.answers ?? {});
      const safeLocalRestored = validAnswers(localRestored);
      const safeRestored = { ...serverRestored, ...safeLocalRestored };
      setAnswers(safeRestored);
      try { localStorage.setItem(storageKey, JSON.stringify(safeRestored)); } catch { /* server saves remain authoritative */ }
      if (Object.keys(safeRestored).length) {
        const savedResults = await Promise.all(Object.entries(safeRestored).map(([questionId, answer]) => saveAnswer(started.attemptId, questionId, answer)));
        if (savedResults.some((saved) => !saved)) setNotice("Some restored answers could not sync yet. Check your connection before submitting.");
      }
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "We could not start this assessment.");
    } finally {
      setStarting(false);
    }
  }

  function chooseAnswer(questionId: string, answerId: string) {
    if (!attempt || submitting || result) return;
    const next = { ...answers, [questionId]: answerId };
    setAnswers(next);
    try { localStorage.setItem(`brainlab-learning-test:${attempt.attemptId}`, JSON.stringify(next)); } catch { /* server saves remain authoritative */ }
    setSaving(true);
    void saveAnswer(attempt.attemptId, questionId, answerId).then((saved) => {
      setSaving(false);
      setNotice(saved ? "Answer saved." : "This answer is on this device but has not synced to the server yet.");
    });
  }

  const currentQuestion = attempt?.questions[currentIndex] ?? null;
  const answeredCount = useMemo(() => Object.keys(answers).filter((id) => attempt?.questions.some((question) => question.id === id)).length, [answers, attempt]);

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href={`/learn/${subjectSlug}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-blue-800 underline underline-offset-4">← Back to {subjectName || "subject"}</Link>
      {loading && <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">Loading topic test…</p>}
      {!loading && error && !attempt && <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert"><h1 className="text-xl font-extrabold">Topic test unavailable</h1><p className="mt-2">{error}</p><div className="mt-4 flex flex-wrap gap-4"><Link href="/account" className="font-bold underline underline-offset-4">Sign in or create an account</Link><Link href={`/learn/${subjectSlug}`} className="font-bold underline underline-offset-4">Return to topics</Link></div></div>}

      {!loading && test && !attempt && !result && !error && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-800">End-of-topic assessment</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{test.title}</h1>
          <p className="mt-2 text-slate-600">{subjectName} · {topicTitle}</p>
          {test.instructions && <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-700">{test.instructions}</p>}
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Questions</p><p className="mt-2 text-2xl font-black text-slate-950">{test.question_limit}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Time limit</p><p className="mt-2 text-2xl font-black text-slate-950">{test.time_limit_mins ? `${test.time_limit_mins} min` : "Untimed"}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pass score</p><p className="mt-2 text-2xl font-black text-slate-950">{test.pass_percentage}%</p></div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">Your answers are saved to the server as you work. The official score and answer explanations are only returned after submission.</p>
          <button type="button" disabled={starting} onClick={() => void beginTest()} className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-extrabold text-white transition hover:bg-[#0a2f72] disabled:cursor-wait disabled:opacity-60 sm:w-auto">{starting ? "Preparing assessment…" : "Start assessment →"}</button>
          <p className="mt-3 text-xs leading-5 text-slate-500">You must be signed in to start. <Link href="/account" className="font-bold text-blue-800 underline underline-offset-4">Sign in or create an account</Link>.</p>
        </section>
      )}

      {attempt && !result && currentQuestion && (
        <section className="mt-6">
          <header className="rounded-3xl bg-[#061a3a] p-5 text-white sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-cyan-200">Topic test</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{attempt.test.title}</h1></div>
              {attempt.deadlineAt && <div className={`rounded-2xl border px-4 py-3 text-center ${(timeLeft ?? 999) < 60 ? "border-rose-300 bg-rose-500/15" : "border-white/20 bg-white/5"}`}><p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-100">Time left</p><p className="mt-1 text-2xl font-black tabular-nums" aria-live="off">{formatSeconds(timeLeft ?? 0)}</p></div>}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-blue-100"><span>Question {currentIndex + 1} of {attempt.questions.length}</span><span>{answeredCount} answered</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${((currentIndex + 1) / attempt.questions.length) * 100}%` }} /></div>
          </header>

          <article className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-wider text-blue-800">{currentQuestion.questionType === "true_false" ? "True or False" : "Multiple choice"}</p>
            <h2 className="mt-3 text-xl font-extrabold leading-8 text-slate-950 sm:text-2xl">{currentQuestion.prompt}</h2>
            {currentQuestion.imageUrl && <img src={currentQuestion.imageUrl} alt="Question diagram" loading="lazy" className="mt-5 max-h-80 max-w-full rounded-xl object-contain" />}
            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((option, index) => {
                const selected = answers[currentQuestion.id] === option.id;
                return <button key={option.id} type="button" onClick={() => chooseAnswer(currentQuestion.id, option.id)} aria-pressed={selected} className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${selected ? "border-blue-800 bg-blue-50 ring-1 ring-blue-800" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current text-xs font-black">{String.fromCharCode(65 + index)}</span><span className="font-semibold text-slate-800">{option.text}</span>{selected && <span className="ml-auto text-sm font-extrabold text-blue-800">Selected</span>}</button>;
              })}
            </div>
          </article>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button type="button" disabled={currentIndex === 0 || submitting} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 disabled:opacity-40">← Previous</button>
            <div className="flex flex-wrap gap-3">
              {currentIndex < attempt.questions.length - 1 && <button type="button" disabled={submitting} onClick={() => setCurrentIndex((index) => Math.min(attempt.questions.length - 1, index + 1))} className="min-h-11 rounded-xl bg-[#012153] px-5 py-3 font-bold text-white">Next question →</button>}
              <button type="button" disabled={submitting || saving} onClick={() => void submitAttempt(false)} className="min-h-11 rounded-xl border border-blue-800 px-5 py-3 font-extrabold text-blue-900 disabled:opacity-50">{submitting ? "Submitting…" : saving ? "Saving answers…" : "Submit test"}</button>
            </div>
          </div>
          <div className="mt-4 min-h-6 text-sm" aria-live="polite">{notice && <p className="text-slate-600">{notice}</p>}{error && <p role="alert" className="font-semibold text-rose-700">{error}</p>}</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">A local recovery copy helps with reloads, but the server copy is used for grading. If your connection drops, reconnect and check that your latest answer has synced before submitting.</p>
        </section>
      )}

      {result && (
        <section className="mt-6">
          <header className={`rounded-3xl p-6 text-white sm:p-10 ${result.passed ? "bg-emerald-800" : "bg-[#061a3a]"}`}>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/80">{result.status === "expired" ? "Time limit reached" : "Assessment complete"}</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">{result.passed ? "Good work — you passed." : "Keep learning. You can improve."}</h1>
            <div className="mt-6 flex flex-wrap items-end gap-6"><div><p className="text-sm text-white/75">Your score</p><p className="text-5xl font-black tabular-nums">{result.percentage.toFixed(1)}<span className="text-2xl">%</span></p></div><div className="pb-1 text-sm leading-6 text-white/85"><p>{result.score} correct out of {result.totalQuestions}</p><p>Pass mark: {result.passPercentage}%</p></div></div>
          </header>
          <div className="mt-8"><h2 className="text-2xl font-extrabold text-slate-950">Review your answers</h2><p className="mt-2 leading-7 text-slate-600">Use the explanations to understand each answer. The next step is to revisit any topic that still feels unclear.</p></div>
          <div className="mt-5 space-y-4">
            {result.review.map((item, index) => (
              <article key={item.questionId} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Question {index + 1}</p><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${item.isCorrect ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}`}>{item.isCorrect ? "Correct" : "Review this"}</span></div>
                <h3 className="mt-3 font-extrabold leading-7 text-slate-950">{item.prompt}</h3>
                {item.imageUrl && <img src={item.imageUrl} alt="Question diagram" loading="lazy" className="mt-4 max-h-64 max-w-full rounded-xl object-contain" />}
                <div className="mt-4 space-y-2">{item.options.map((option) => { const correct = option.id === item.correctAnswer; const picked = option.id === item.selectedAnswer; return <div key={option.id} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${correct ? "border-emerald-300 bg-emerald-50 text-emerald-950" : picked ? "border-rose-300 bg-rose-50 text-rose-950" : "border-slate-200 text-slate-700"}`}><span className="font-black">{option.id.toUpperCase()}.</span><span className="flex-1">{option.text}{picked && <strong> · Your answer</strong>}{correct && <strong> · Correct answer</strong>}</span></div>; })}</div>
                {item.explanation && <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Tutor explanation</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.explanation}</p></div>}
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3"><Link href={`/learn/${subjectSlug}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white">Return to topics</Link><Link href="/ai-learning" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-800">Open AI Learning</Link></div>
        </section>
      )}
    </main>
  );
}
