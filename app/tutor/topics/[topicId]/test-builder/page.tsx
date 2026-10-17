"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type QuestionType = "mcq" | "true_false";
type Option = { id: string; text: string };
type Question = { id: string; test_id: string; question_type: QuestionType; prompt: string; image_url: string | null; options: Option[]; correct_answer: string; explanation: string | null; order_index: number; version: number };
type Test = { id: string; topic_id: string; title: string; instructions: string | null; question_limit: number; time_limit_mins: number | null; pass_percentage: number; shuffle_questions: boolean; is_published: boolean; version?: number };
type Topic = { id: string; title: string; subject_id: string; is_published: boolean };
type Subject = { id: string; name: string; slug: string; is_published: boolean };

const defaultOptions = (): Option[] => [
  { id: "a", text: "Option A" }, { id: "b", text: "Option B" },
  { id: "c", text: "Option C" }, { id: "d", text: "Option D" },
];
const slugSafeUrl = (value: string) => {
  if (!value.trim()) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};

function validateQuestions(questions: Question[], questionLimit: number, title: string, timeLimit: string) {
  if (!title.trim()) return "Add an assessment title.";
  if (!Number.isInteger(questionLimit) || questionLimit < 1 || questionLimit > 200) return "Question count must be between 1 and 200.";
  if (questions.length < questionLimit) return `The question pool has ${questions.length} questions, but the test requests ${questionLimit}. Add more questions or reduce the question count.`;
  if (timeLimit && (!Number.isInteger(Number(timeLimit)) || Number(timeLimit) < 1 || Number(timeLimit) > 600)) return "Time limit must be between 1 and 600 minutes, or left empty for untimed.";
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    if (!question.prompt.trim()) return `Question ${index + 1}: add a question prompt.`;
    if (!slugSafeUrl(question.image_url ?? "")) return `Question ${index + 1}: use an HTTPS image URL.`;
    if (question.question_type === "true_false") {
      if (!["true", "false"].includes(question.correct_answer)) return `Question ${index + 1}: choose True or False as the answer.`;
    } else {
      if (question.options.length < 2 || question.options.some((option) => !option.id || !option.text.trim())) return `Question ${index + 1}: provide at least two complete options.`;
      if (!question.options.some((option) => option.id === question.correct_answer)) return `Question ${index + 1}: select a correct option.`;
    }
  }
  return "";
}

export default function TopicTestBuilderPage() {
  const params = useParams<{ topicId: string }>();
  const topicId = params.topicId;
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questionLimit, setQuestionLimit] = useState(10);
  const [timeLimit, setTimeLimit] = useState("");
  const [passPercentage, setPassPercentage] = useState(70);
  const [shuffle, setShuffle] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadQuestions(testId: string) {
    const { data, error: questionError } = await supabase.from("learning_test_questions")
      .select("id,test_id,question_type,prompt,image_url,options,correct_answer,explanation,order_index,version")
      .eq("test_id", testId).order("order_index", { ascending: true });
    if (questionError) throw questionError;
    setQuestions((data ?? []) as Question[]);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      const user = sessionData.session?.user;
      if (sessionError || !user) {
        setError("Sign in with an authorized BrainLab account to open the test builder.");
        setLoading(false);
        return;
      }
      const { data: topicData, error: topicError } = await supabase.from("learning_topics")
        .select("id,title,subject_id,is_published").eq("id", topicId).maybeSingle();
      if (!active) return;
      if (topicError || !topicData) {
        setError("This topic was not found or you do not have permission to view it.");
        setLoading(false);
        return;
      }
      const { data: subjectData, error: subjectError } = await supabase.from("learning_subjects")
        .select("id,name,slug,is_published").eq("id", topicData.subject_id).maybeSingle();
      if (!active) return;
      if (subjectError || !subjectData) {
        setError("The subject for this topic could not be loaded.");
        setLoading(false);
        return;
      }
      const { data: membership, error: membershipError } = await supabase.from("learning_subject_memberships")
        .select("membership_role").eq("subject_id", subjectData.id).eq("user_id", user.id).maybeSingle();
      const adminRole = await supabase.rpc("get_admin_role");
      if (!active) return;
      const admin = !adminRole.error && ["super_admin", "platform_admin"].includes(String(adminRole.data ?? ""));
      if (membershipError || (!membership && !admin)) {
        setError("Your account has not been assigned to this subject.");
        setLoading(false);
        return;
      }
      setCanManage(admin || membership?.membership_role === "tutor");
      setTopic(topicData as Topic);
      setSubject(subjectData as Subject);
      const { data: testData, error: testError } = await supabase.from("learning_topic_tests")
        .select("id,topic_id,title,instructions,question_limit,time_limit_mins,pass_percentage,shuffle_questions,is_published")
        .eq("topic_id", topicId).maybeSingle();
      if (!active) return;
      if (testError) {
        setError("The topic assessment could not be loaded.");
        setLoading(false);
        return;
      }
      if (testData) {
        setTest(testData as Test);
        setTitle(testData.title);
        setInstructions(testData.instructions ?? "");
        setQuestionLimit(testData.question_limit);
        setTimeLimit(testData.time_limit_mins == null ? "" : String(testData.time_limit_mins));
        setPassPercentage(testData.pass_percentage);
        setShuffle(testData.shuffle_questions);
        try { await loadQuestions(testData.id); }
        catch { if (active) setError("The question pool could not be loaded."); }
      }
      if (active) setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [topicId]);

  async function createTest() {
    if (!topic || !canManage) return;
    setSaving(true); setError(""); setMessage("");
    const { data, error: createError } = await supabase.from("learning_topic_tests").insert({
      topic_id: topic.id,
      title: `${topic.title} Topic Test`,
      question_limit: 10,
      pass_percentage: 70,
      shuffle_questions: true,
      is_published: false,
    }).select("id,topic_id,title,instructions,question_limit,time_limit_mins,pass_percentage,shuffle_questions,is_published").single();
    if (createError || !data) setError("The assessment draft could not be created. Check your tutor assignment.");
    else {
      setTest(data as Test); setTitle(data.title); setQuestionLimit(data.question_limit); setPassPercentage(data.pass_percentage); setShuffle(data.shuffle_questions);
      setMessage("Assessment draft created. Add enough questions before publishing.");
    }
    setSaving(false);
  }

  async function ensureDraft() {
    if (!test?.is_published) return true;
    const { error: updateError } = await supabase.from("learning_topic_tests").update({ is_published: false }).eq("id", test.id);
    if (updateError) { setError("The published test could not be moved safely to draft."); return false; }
    setTest({ ...test, is_published: false });
    return true;
  }

  async function addQuestion(type: QuestionType) {
    if (!test || !canManage) return;
    setSaving(true); setError(""); setMessage("");
    if (!(await ensureDraft())) { setSaving(false); return; }
    const options = type === "true_false" ? [{ id: "true", text: "True" }, { id: "false", text: "False" }] : defaultOptions();
    const { data, error: insertError } = await supabase.from("learning_test_questions").insert({
      test_id: test.id,
      question_type: type,
      prompt: "",
      options,
      correct_answer: type === "true_false" ? "true" : "a",
      explanation: null,
      order_index: Math.max(-1, ...questions.map((question) => question.order_index)) + 1,
      version: 1,
    }).select("id,test_id,question_type,prompt,image_url,options,correct_answer,explanation,order_index,version").single();
    if (insertError || !data) setError("The question could not be added.");
    else { setQuestions((old) => [...old, data as Question]); setMessage("Question added to the draft pool."); }
    setSaving(false);
  }

  async function deleteQuestion(question: Question) {
    if (!test || !canManage || !window.confirm("Delete this question from the pool? Existing attempts keep their private snapshots.")) return;
    setSaving(true); setError(""); setMessage("");
    if (!(await ensureDraft())) { setSaving(false); return; }
    const { error: deleteError } = await supabase.from("learning_test_questions").delete().eq("id", question.id);
    if (deleteError) setError("The question could not be deleted.");
    else { setQuestions((old) => old.filter((item) => item.id !== question.id)); setMessage("Question removed. Save the assessment to normalize ordering."); }
    setSaving(false);
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    if (!test || saving) return;
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setSaving(true); setError(""); setMessage("");
    if (!(await ensureDraft())) { setSaving(false); return; }
    const moving = questions[index];
    const other = questions[target];
    const temporary = Math.max(...questions.map((item) => item.order_index), 0) + 1000;
    const first = await supabase.from("learning_test_questions").update({ order_index: temporary }).eq("id", moving.id);
    const second = first.error ? first : await supabase.from("learning_test_questions").update({ order_index: moving.order_index }).eq("id", other.id);
    const third = second.error ? second : await supabase.from("learning_test_questions").update({ order_index: other.order_index }).eq("id", moving.id);
    if (first.error || second.error || third.error) setError("Question order could not be changed.");
    else { const next = [...questions]; next[index] = { ...other, order_index: moving.order_index }; next[target] = { ...moving, order_index: other.order_index }; setQuestions(next); setMessage("Question order updated."); }
    setSaving(false);
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((old) => old.map((question) => question.id === id ? { ...question, ...patch } : question));
  }

  async function save(publish: boolean) {
    if (!test || !canManage) return;
    setSaving(true); setError(""); setMessage("");
    if (publish) {
      const validation = validateQuestions(questions, questionLimit, title, timeLimit);
      if (validation) { setError(validation); setSaving(false); return; }
      if (passPercentage < 0 || passPercentage > 100) { setError("Pass percentage must be between 0 and 100."); setSaving(false); return; }
    }
    const { error: draftError } = await supabase.from("learning_topic_tests").update({ is_published: false }).eq("id", test.id);
    if (draftError) { setError("We could not safely save the assessment."); setSaving(false); return; }
    const settings = {
      title: title.trim(),
      instructions: instructions.trim() || null,
      question_limit: questionLimit,
      time_limit_mins: timeLimit.trim() ? Number(timeLimit) : null,
      pass_percentage: passPercentage,
      shuffle_questions: shuffle,
      is_published: false,
    };
    const { error: settingsError } = await supabase.from("learning_topic_tests").update(settings).eq("id", test.id);
    if (settingsError) { setError("Assessment settings could not be saved."); setSaving(false); return; }
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      const { error: questionError } = await supabase.from("learning_test_questions").update({
        question_type: question.question_type,
        prompt: question.prompt.trim(),
        image_url: question.image_url?.trim() || null,
        options: question.question_type === "true_false" ? [{ id: "true", text: "True" }, { id: "false", text: "False" }] : question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation?.trim() || null,
        order_index: index,
        version: question.version + 1,
      }).eq("id", question.id).eq("test_id", test.id);
      if (questionError) { setError(`Question ${index + 1} could not be saved. The assessment remains a draft.`); setSaving(false); return; }
    }
    if (publish) {
      const { error: publishError } = await supabase.from("learning_topic_tests").update({ is_published: true }).eq("id", test.id);
      if (publishError) { setError("Settings were saved, but the assessment could not be published."); setSaving(false); return; }
      setTest({ ...test, ...settings, is_published: true });
      setQuestions((old) => old.map((question, index) => ({ ...question, order_index: index, version: question.version + 1 })));
      setMessage("Topic test published. It will be available when the parent topic and subject are published.");
    } else {
      setTest({ ...test, ...settings, is_published: false });
      setQuestions((old) => old.map((question, index) => ({ ...question, order_index: index, version: question.version + 1 })));
      setMessage("Assessment saved as a draft. Students cannot start it.");
    }
    setSaving(false);
  }

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href={subject ? `/tutor/subjects/${subject.id}/topics` : "/tutor"} className="text-sm font-bold text-blue-800 underline underline-offset-4">← Back to topic organizer</Link>
      {loading && <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">Loading assessment builder…</p>}
      {!loading && error && !topic && <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">{error}<p className="mt-3"><Link href="/account" className="font-bold underline underline-offset-4">Sign in</Link></p></div>}
      {!loading && topic && subject && <>
        <header className="mt-6 rounded-3xl bg-[#061a3a] p-7 text-white sm:p-9"><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-cyan-200">Topic test authoring · {canManage ? "Editor" : "Review only"}</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">{topic.title}</h1><p className="mt-3 leading-7 text-blue-100">{subject.name} · Create a question pool and choose how the assessment is delivered.</p>{test && <span className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${test.is_published ? "bg-emerald-200 text-emerald-950" : "bg-amber-200 text-amber-950"}`}>{test.is_published ? "Published" : "Draft"}</span>}</header>
        {(error || message) && <p role={error ? "alert" : "status"} className={`mt-4 rounded-xl p-4 text-sm font-semibold ${error ? "bg-rose-50 text-rose-900" : "bg-emerald-50 text-emerald-900"}`}>{error || message}</p>}
        {!test && <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-7"><h2 className="text-xl font-extrabold text-slate-950">No topic test yet</h2><p className="mt-2 leading-7 text-slate-600">Create a draft assessment, then add MCQ and True/False questions. A test is not visible to students until it is published.</p>{canManage && <button type="button" disabled={saving} onClick={() => void createTest()} className="mt-5 min-h-11 rounded-xl bg-[#012153] px-5 py-3 font-bold text-white disabled:opacity-50">Create test draft</button>}</section>}
        {test && <>
          <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-xl font-extrabold text-slate-950">Assessment settings</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="block text-sm font-bold text-slate-800">Test title<input disabled={!canManage || saving} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 disabled:bg-slate-100" /></label><label className="block text-sm font-bold text-slate-800">Question count<input disabled={!canManage || saving} type="number" min={1} max={200} value={questionLimit} onChange={(event) => setQuestionLimit(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 disabled:bg-slate-100" /></label><label className="block text-sm font-bold text-slate-800">Time limit in minutes<input disabled={!canManage || saving} type="number" min={1} max={600} value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} placeholder="Leave empty for untimed" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 disabled:bg-slate-100" /></label><label className="block text-sm font-bold text-slate-800">Pass percentage<input disabled={!canManage || saving} type="number" min={0} max={100} value={passPercentage} onChange={(event) => setPassPercentage(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 disabled:bg-slate-100" /></label></div><label className="mt-4 block text-sm font-bold text-slate-800">Instructions<textarea disabled={!canManage || saving} value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={3} maxLength={3000} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-700 disabled:bg-slate-100" /></label><label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-800"><input disabled={!canManage || saving} type="checkbox" checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} className="h-4 w-4 accent-blue-900" />Shuffle questions for each attempt</label><p className="mt-3 text-xs leading-5 text-slate-500">A test with fewer questions in its pool than the configured count cannot be published. Question answer keys are not exposed to student sessions before submission.</p></section>

          <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold text-slate-950">Question pool</h2><p className="mt-1 text-sm text-slate-600">{questions.length} questions · Need at least {questionLimit} to publish.</p></div>{canManage && <div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => void addQuestion("mcq")} className="min-h-10 rounded-xl bg-[#012153] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">+ Multiple choice</button><button type="button" disabled={saving} onClick={() => void addQuestion("true_false")} className="min-h-10 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">+ True / False</button></div>}</div>
            {questions.length === 0 && <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">No questions yet. Add a question to start the pool.</p>}
            <div className="mt-5 space-y-4">{questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Question {index + 1} · {question.question_type === "true_false" ? "True / False" : "Multiple choice"}</p><p className="mt-1 text-xs text-slate-500">Version {question.version}</p></div>{canManage && <div className="flex gap-1"><button type="button" disabled={saving || index === 0} onClick={() => void moveQuestion(index, -1)} aria-label="Move question up" className="min-h-9 min-w-9 rounded-lg border border-slate-300 font-bold disabled:opacity-30">↑</button><button type="button" disabled={saving || index === questions.length - 1} onClick={() => void moveQuestion(index, 1)} aria-label="Move question down" className="min-h-9 min-w-9 rounded-lg border border-slate-300 font-bold disabled:opacity-30">↓</button><button type="button" disabled={saving} onClick={() => void deleteQuestion(question)} className="ml-2 min-h-9 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 disabled:opacity-40">Delete</button></div>}</div>
              {canManage && <label className="mt-4 block text-sm font-bold text-slate-800">Question type<select disabled={saving} value={question.question_type} onChange={(event) => { const nextType = event.target.value as QuestionType; updateQuestion(question.id, nextType === "true_false" ? { question_type: nextType, options: [{ id: "true", text: "True" }, { id: "false", text: "False" }], correct_answer: "true" } : { question_type: nextType, options: defaultOptions(), correct_answer: "a" }); }} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-blue-700 disabled:bg-slate-100"><option value="mcq">Multiple choice</option><option value="true_false">True / False</option></select></label>}
              <label className="mt-4 block text-sm font-bold text-slate-800">Question prompt<textarea disabled={!canManage || saving} value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} rows={3} maxLength={5000} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-700 disabled:bg-slate-100" /></label>
              <label className="mt-4 block text-sm font-bold text-slate-800">Diagram / image URL (optional)<input disabled={!canManage || saving} type="url" value={question.image_url ?? ""} onChange={(event) => updateQuestion(question.id, { image_url: event.target.value })} placeholder="https://…" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 disabled:bg-slate-100" /></label>
              {question.question_type === "true_false" ? <fieldset className="mt-5"><legend className="text-sm font-bold text-slate-800">Correct answer</legend><div className="mt-3 flex gap-3">{(["true", "false"] as const).map((value) => <label key={value} className={`flex min-h-11 flex-1 items-center gap-3 rounded-xl border p-3 text-sm font-bold capitalize ${question.correct_answer === value ? "border-blue-800 bg-blue-50" : "border-slate-200"}`}><input disabled={!canManage || saving} type="radio" name={`answer-${question.id}`} checked={question.correct_answer === value} onChange={() => updateQuestion(question.id, { correct_answer: value, options: [{ id: "true", text: "True" }, { id: "false", text: "False" }] })} className="h-4 w-4 accent-blue-900" />{value}</label>)}</div><p className="mt-2 text-xs text-slate-500">The options are fixed and cannot be edited for True / False questions.</p></fieldset> : <fieldset className="mt-5"><legend className="text-sm font-bold text-slate-800">Answer options · select the correct answer</legend><div className="mt-3 space-y-2">{question.options.map((option, optionIndex) => <div key={option.id} className="flex items-center gap-2"><input disabled={!canManage || saving} type="radio" name={`correct-${question.id}`} aria-label={`Set option ${option.id} as correct`} checked={question.correct_answer === option.id} onChange={() => updateQuestion(question.id, { correct_answer: option.id })} className="h-4 w-4 accent-blue-900" /><span className="w-6 text-xs font-black uppercase text-slate-500">{option.id}</span><input disabled={!canManage || saving} value={option.text} onChange={(event) => updateQuestion(question.id, { options: question.options.map((item) => item.id === option.id ? { ...item, text: event.target.value } : item) })} aria-label={`Question ${index + 1} option ${optionIndex + 1}`} className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-700 disabled:bg-slate-100" />{question.options.length > 2 && <button type="button" disabled={!canManage || saving} onClick={() => { const next = question.options.filter((item) => item.id !== option.id); updateQuestion(question.id, { options: next, correct_answer: question.correct_answer === option.id ? next[0]?.id ?? "" : question.correct_answer }); }} className="rounded-lg px-2 py-2 text-xs font-bold text-rose-700 disabled:opacity-40">Remove</button>}</div>)}</div><button type="button" disabled={!canManage || saving || question.options.length >= 8} onClick={() => { const id = `option-${Date.now().toString(36)}`; updateQuestion(question.id, { options: [...question.options, { id, text: `Option ${question.options.length + 1}` }] }); }} className="mt-3 text-sm font-bold text-blue-800 underline underline-offset-4 disabled:opacity-40">+ Add option</button></fieldset>}
              <label className="mt-5 block text-sm font-bold text-slate-800">Tutor explanation<textarea disabled={!canManage || saving} value={question.explanation ?? ""} onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })} rows={3} maxLength={10000} placeholder="Explain the reasoning behind the correct answer." className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-700 disabled:bg-slate-100" /></label>
            </article>)}</div>
          </section>

          {canManage && <div className="sticky bottom-3 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur"><p className="px-2 text-xs text-slate-500">Any edits move the assessment to draft until you publish again.</p><div className="flex gap-2"><button type="button" disabled={saving} onClick={() => void save(false)} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-extrabold text-slate-800 disabled:opacity-50">{saving ? "Saving…" : "Save draft"}</button><button type="button" disabled={saving} onClick={() => void save(true)} className="min-h-11 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? "Saving…" : "Publish test"}</button></div></div>}
        </>}
      </>}
    </main>
  );
}
