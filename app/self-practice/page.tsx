"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import type { PaperQuestion, Option, ResultItem } from "../lib/examApi";

type CatalogSubject = { name: string; question_count: number; categories: string[] };
type PracticeAttempt = { attempt_id: string; attempt_token: string; deadline_at: string | null; questions: PaperQuestion[]; answers: Record<string, Option> };
type PracticeResult = { ok: true; status: string; score: number; total: number; percentage: number; auto_submitted: boolean; items: ResultItem[] };
type ApiFailure = { ok: false; error?: string; message?: string };

function safeImageUrl(value: string | null | undefined): string | null {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}
function formatTime(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

export default function SelfPracticePage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogSubject[]>([]);
  const [maxQuestions, setMaxQuestions] = useState(50);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, Option>>({});
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) { router.replace("/account"); return; }
      const { data, error: catalogError } = await supabase.rpc("get_self_practice_catalog");
      if (!active) return;
      if (catalogError || !data?.ok) setError(catalogError?.message || (data as ApiFailure | null)?.message || "Could not load practice options.");
      else {
        setCatalog((data.subjects ?? []) as CatalogSubject[]);
        setMaxQuestions(Number(data.max_questions) || 50);
        setQuestionCount(Math.min(10, Number(data.max_questions) || 50));
      }
      setLoading(false);
    }
    void load().catch(() => { if (active) { setError("Could not load Self Practice."); setLoading(false); } });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!attempt?.deadline_at || result) return;
    const deadline = new Date(attempt.deadline_at).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.deadline_at, result]);

  const availableSelected = catalog.filter((s) => selectedSubjects.includes(s.name)).reduce((n, s) => n + s.question_count, 0);

  async function startPractice(event: { preventDefault: () => void }) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!selectedSubjects.length) { setError("Choose at least one subject."); return; }
    if (questionCount > maxQuestions) { setError(`Your current access allows up to ${maxQuestions} questions per attempt.`); return; }
    if (questionCount > availableSelected) { setError(`Only ${availableSelected} questions are available across the selected subjects.`); return; }
    setWorking(true);
    const { data, error: rpcError } = await supabase.rpc("start_self_practice", {
      p_subjects: selectedSubjects,
      p_question_count: questionCount,
      p_duration_seconds: durationMinutes ? durationMinutes * 60 : null,
      p_categories: [],
    });
    if (rpcError) setError(rpcError.message);
    else if (!data?.ok) setError((data as ApiFailure).message || "Could not start this attempt.");
    else {
      const next: PracticeAttempt = {
        attempt_id: data.attempt_id,
        attempt_token: data.attempt_token,
        deadline_at: data.deadline_at ?? null,
        questions: (data.questions ?? []) as PaperQuestion[],
        answers: {},
      };
      setAttempt(next); setAnswers({}); setResult(null); setSecondsLeft(next.deadline_at ? Math.max(0,Math.ceil((new Date(next.deadline_at).getTime()-Date.now())/1000)) : null);
      setMessage(`Practice started with ${next.questions.length} unique questions. Your answer key remains protected until submission.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setWorking(false);
  }

  const chooseAnswer = useCallback(async (questionId: number, option: Option) => {
    if (!attempt || result || secondsLeft === 0) return;
    const key = String(questionId);
    setAnswers((previous) => ({ ...previous, [key]: option }));
    const { data, error: saveError } = await supabase.rpc("save_self_practice_progress", {
      p_attempt_id: attempt.attempt_id,
      p_attempt_token: attempt.attempt_token,
      p_answers: { [key]: option },
    });
    if (saveError || !data?.ok) setError(saveError?.message || (data as ApiFailure | null)?.message || "Answer could not be saved. Retry before submitting.");
  }, [attempt, result, secondsLeft]);

  const submitPractice = useCallback(async () => {
    if (!attempt || result || working) return;
    setWorking(true); setError(""); setMessage("");
    const { data, error: submitError } = await supabase.rpc("submit_self_practice", {
      p_attempt_id: attempt.attempt_id,
      p_attempt_token: attempt.attempt_token,
      p_answers: answers,
    });
    if (submitError) setError(submitError.message);
    else if (!data?.ok) setError((data as ApiFailure).message || "Could not submit this attempt.");
    else {
      setResult(data as PracticeResult);
      setMessage(data.auto_submitted ? "Time expired. Your saved answers were submitted." : "Practice submitted. Review each explanation below.");
      setAttempt(null);
    }
    setWorking(false);
  }, [attempt, result, working, answers]);

  if (loading) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl rounded-2xl bg-white p-6">Loading Self Practice…</div></main>;

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">BrainLab Academy · CBT</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Self Practice</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Choose one or more subjects, set your question count, and practise from the active question bank. Questions are selected randomly without duplicates in the same attempt.</p>
        <div className="mt-4 flex flex-wrap gap-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">Current limit: {maxQuestions} questions per attempt</span><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">Selected pool: {availableSelected} questions</span></div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">{error}</div>}
      {message && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800" role="status">{message}</div>}

      {!attempt && !result && <form onSubmit={startPractice} className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-slate-900">Configure your practice</h2>
        <fieldset className="mt-5"><legend className="font-medium text-slate-800">Subjects</legend><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{catalog.map((subject) => <label key={subject.name} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-indigo-300"><input className="mt-1" type="checkbox" checked={selectedSubjects.includes(subject.name)} onChange={(e) => setSelectedSubjects((old) => e.target.checked ? [...old, subject.name] : old.filter((x) => x !== subject.name))} /><span><strong className="block">{subject.name}</strong><span className="text-sm text-slate-500">{subject.question_count} active questions</span></span></label>)}</div></fieldset>
        <div className="mt-6 grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block font-medium" htmlFor="question-count">Number of questions</label><input id="question-count" className="w-full rounded-lg border border-slate-300 p-3" type="number" min={1} max={maxQuestions} value={questionCount} onChange={(e) => setQuestionCount(Math.max(1,Math.min(maxQuestions,Number(e.target.value)||1)))} required /><p className="mt-1 text-sm text-slate-500">The server enforces your limit even if a browser value is changed.</p></div><div><label className="mb-2 block font-medium" htmlFor="duration">Time limit</label><select id="duration" className="w-full rounded-lg border border-slate-300 p-3" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}><option value={0}>Untimed</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={240}>4 hours</option></select></div></div>
        <div className="mt-6 flex flex-wrap items-center gap-3"><button className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={working || !selectedSubjects.length}>{working ? "Preparing questions…" : "Start Self Practice"}</button><button type="button" className="rounded-xl border border-slate-300 px-5 py-3 font-medium" onClick={() => router.push("/cbt")}>Back to CBT</button></div>
      </form>}

      {attempt && <section className="space-y-5">
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur"><div><strong>{attempt.questions.length} questions</strong><p className="text-sm text-slate-500">{Object.keys(answers).length} answered · no repeated question IDs</p></div><div className="flex items-center gap-3">{secondsLeft !== null && <span className={secondsLeft < 60 ? "font-bold text-red-700" : "font-semibold"}>Time left: {formatTime(secondsLeft)}</span>}<button className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={working} onClick={() => void submitPractice()}>{working ? "Submitting…" : "Submit practice"}</button></div></div>
        {attempt.questions.map((q,index) => <article key={q.id} className="rounded-2xl bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-indigo-700">Question {index+1} of {attempt.questions.length}</span><span className="text-sm text-slate-500">{q.subject}{q.section ? ` · ${q.section}` : ""}</span></div>{q.passage_text && <div className="mt-4 rounded-lg bg-slate-50 p-4"><p className="font-semibold">{q.passage_title || "Reading passage"}</p><p className="mt-2 whitespace-pre-wrap text-slate-700">{q.passage_text}</p></div>}<h2 className="mt-4 whitespace-pre-wrap text-lg font-semibold text-slate-900">{q.question}</h2>{safeImageUrl(q.question_image_url) && <img src={safeImageUrl(q.question_image_url)!} alt={q.question_image_alt || "Question illustration"} className="mt-4 block max-h-96 max-w-full rounded-lg border object-contain" loading="lazy" />}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{(["A","B","C","D"] as const).map((key) => { const text = q[`option_${key.toLowerCase()}` as "option_a"|"option_b"|"option_c"|"option_d"]; const image = q[`option_${key.toLowerCase()}_image_url` as "option_a_image_url"|"option_b_image_url"|"option_c_image_url"|"option_d_image_url"]; const alt = q[`option_${key.toLowerCase()}_image_alt` as "option_a_image_alt"|"option_b_image_alt"|"option_c_image_alt"|"option_d_image_alt"]; return <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${answers[String(q.id)]===key ? "border-indigo-600 bg-indigo-50" : "border-slate-200"} ${secondsLeft===0 ? "opacity-70" : ""}`}><input type="radio" name={`question-${q.id}`} checked={answers[String(q.id)]===key} disabled={secondsLeft===0 || working} onChange={() => void chooseAnswer(q.id,key)} className="mt-1" /><span className="min-w-0"><strong>{key}.</strong> {text || ""}{safeImageUrl(image) && <img src={safeImageUrl(image)!} alt={alt || `Option ${key} illustration`} className="mt-2 block max-h-56 max-w-full object-contain" loading="lazy" />}</span></label>; })}</div>
        </article>)}
        {secondsLeft===0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">Time is up. Your answer inputs are locked. Submit now to grade the answers saved so far.</div>}
        <button className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={working} onClick={() => void submitPractice()}>{working ? "Submitting…" : "Submit practice and view corrections"}</button>
      </section>}

      {result && <section className="space-y-5"><div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Practice complete</p><h2 className="mt-2 text-3xl font-bold">{result.score} / {result.total}</h2><p className="mt-1 text-slate-600">{result.percentage}% · {result.items.filter((x) => x.isCorrect).length} of {result.items.length} questions correct</p><button className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white" onClick={() => { setResult(null); setAttempt(null); setAnswers({}); setMessage(""); setError(""); }}>Start another practice</button></div>{result.items.map((item,index) => <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">Question {index+1}</span><span className={item.isCorrect ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{item.isCorrect ? "Correct" : "Review this answer"}</span></div><h3 className="mt-3 text-lg font-semibold">{item.text}</h3>{safeImageUrl(item.questionImageUrl) && <img src={safeImageUrl(item.questionImageUrl)!} alt={item.questionImageAlt || "Question illustration"} className="mt-3 block max-h-96 max-w-full rounded-lg object-contain" loading="lazy" />}<div className="mt-3 grid gap-2 sm:grid-cols-2">{(["A","B","C","D"] as const).map((key) => <div key={key} className={`rounded-lg border p-3 ${item.correctAnswer===key ? "border-green-400 bg-green-50" : item.userAnswer===key ? "border-red-300 bg-red-50" : "border-slate-200"}`}><strong>{key}.</strong> {item.options?.[key] || ""}{safeImageUrl(item.optionImages?.[key]) && <img src={safeImageUrl(item.optionImages?.[key])!} alt={item.optionImageAlts?.[key] || `Option ${key} illustration`} className="mt-2 block max-h-48 max-w-full object-contain" loading="lazy" />}</div>)}</div><p className="mt-3 text-sm text-slate-600">Your answer: <strong>{item.userAnswer || "Not answered"}</strong> · Correct answer: <strong>{item.correctAnswer}</strong></p>{item.explanation && <div className="mt-4 rounded-lg bg-blue-50 p-4"><strong>Explanation</strong><p className="mt-1 whitespace-pre-wrap">{item.explanation}</p>{safeImageUrl(item.explanationImageUrl) && <img src={safeImageUrl(item.explanationImageUrl)!} alt={item.explanationImageAlt || "Explanation illustration"} className="mt-3 block max-h-96 max-w-full object-contain" loading="lazy" />}</div>}</article>)}</section>}
    </div>
  </main>;
}
