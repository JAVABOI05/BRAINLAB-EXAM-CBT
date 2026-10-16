"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type RevisionTask = {
  id: string;
  topic: string;
  subject: string;
  minutes: number;
  done: boolean;
};

type SavedPlan = {
  goal: string;
  days: number;
  dailyMinutes: number;
  tasks: RevisionTask[];
};

const STORAGE_KEY = "brainlab_revision_plan_v1";
const SUBJECTS = ["Mathematics", "English", "Physics", "Chemistry", "Biology", "General revision", "Other"];

function makeId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function RevisionPlannerPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [goal, setGoal] = useState("Prepare confidently for my next exam");
  const [days, setDays] = useState(7);
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [subject, setSubject] = useState("Mathematics");
  const [topicInput, setTopicInput] = useState("");
  const [tasks, setTasks] = useState<RevisionTask[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function checkAccount() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) {
        router.replace("/account");
        return;
      }
      setAuthLoading(false);
    }
    void checkAccount();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedPlan>;
        if (typeof saved.goal === "string") setGoal(saved.goal);
        if (typeof saved.days === "number" && saved.days >= 1 && saved.days <= 30) setDays(saved.days);
        if (typeof saved.dailyMinutes === "number" && saved.dailyMinutes >= 10 && saved.dailyMinutes <= 180) setDailyMinutes(saved.dailyMinutes);
        if (Array.isArray(saved.tasks)) {
          setTasks(saved.tasks.filter((task): task is RevisionTask =>
            typeof task?.id === "string" &&
            typeof task?.topic === "string" &&
            typeof task?.subject === "string" &&
            typeof task?.minutes === "number" &&
            typeof task?.done === "boolean"
          ));
        }
      }
    } catch {
      // Ignore invalid local data and let the learner create a fresh plan.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const plan: SavedPlan = { goal, days, dailyMinutes, tasks };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      setSavedMessage("Saved on this device");
    } catch {
      setSavedMessage("Browser storage is unavailable; keep a copy of your plan");
    }
  }, [goal, days, dailyMinutes, tasks, hydrated]);

  const completed = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const totalMinutes = useMemo(() => tasks.reduce((sum, task) => sum + task.minutes, 0), [tasks]);

  function addTopic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const topic = topicInput.trim();
    if (!topic) return;
    setTasks((current) => [...current, { id: makeId(), topic, subject, minutes: dailyMinutes, done: false }]);
    setTopicInput("");
    setSavedMessage("");
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function clearPlan() {
    if (!window.confirm("Clear this revision plan from this device?")) return;
    setTasks([]);
    setGoal("Prepare confidently for my next exam");
    setDays(7);
    setDailyMinutes(30);
    setSavedMessage("Plan cleared");
  }

  if (authLoading || !hydrated) {
    return <main id="main" className="mx-auto min-h-[60vh] max-w-5xl px-5 py-16"><p className="text-slate-600">Loading your revision planner…</p></main>;
  }

  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-7">
        <Link href="/dashboard" className="text-sm font-semibold text-blue-800 underline underline-offset-4">← Back to your learning space</Link>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-800">BrainLab learning tools · First version</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Your revision planner</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">Turn a broad study goal into manageable topics. Add the areas you want to revise, choose a realistic daily time, and tick off each session as you complete it.</p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 md:grid-cols-[1fr_180px_180px]">
          <div>
            <label htmlFor="revision-goal" className="mb-2 block text-sm font-bold text-slate-800">Your goal</label>
            <input id="revision-goal" value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={160} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" placeholder="What are you preparing for?" />
          </div>
          <div>
            <label htmlFor="revision-days" className="mb-2 block text-sm font-bold text-slate-800">Plan length</label>
            <select id="revision-days" value={days} onChange={(event) => setDays(Number(event.target.value))} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3">
              {[1, 3, 7, 14, 21, 30].map((value) => <option key={value} value={value}>{value} {value === 1 ? "day" : "days"}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="revision-minutes" className="mb-2 block text-sm font-bold text-slate-800">Daily study time</label>
            <select id="revision-minutes" value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3">
              {[10, 15, 20, 30, 45, 60, 90, 120, 180].map((value) => <option key={value} value={value}>{value} minutes</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-blue-50 p-4">
          <p className="text-sm font-bold text-blue-950">{goal.trim() || "Your revision goal"}</p>
          <p className="mt-1 text-sm leading-6 text-blue-900">Aim for {dailyMinutes} minutes a day over {days} {days === 1 ? "day" : "days"}. Your plan currently contains {tasks.length} topic{tasks.length === 1 ? "" : "s"} and about {totalMinutes} minutes of planned revision.</p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-extrabold text-slate-950">Add a topic to revise</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Start with a specific area, such as quadratic equations, chemical bonding or comprehension practice.</p>
        <form onSubmit={addTopic} className="mt-5 grid gap-3 sm:grid-cols-[190px_1fr_auto]">
          <label className="sr-only" htmlFor="revision-subject">Subject</label>
          <select id="revision-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-3">
            {SUBJECTS.map((value) => <option key={value}>{value}</option>)}
          </select>
          <label className="sr-only" htmlFor="revision-topic">Topic</label>
          <input id="revision-topic" value={topicInput} onChange={(event) => setTopicInput(event.target.value)} maxLength={120} className="min-h-12 min-w-0 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" placeholder="Enter a topic to revise" />
          <button type="submit" disabled={!topicInput.trim()} className="min-h-12 rounded-xl bg-[#012153] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Add topic</button>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">Your revision checklist</h2>
            <p className="mt-2 text-sm text-slate-600">Mark a topic complete after you have studied it or practised questions.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">{completed} of {tasks.length} complete</span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Revision checklist progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${progress}%` }} />
        </div>
        {tasks.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-7 text-center">
            <h3 className="font-bold text-slate-900">Your first step is small</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Add one topic above. You can grow the plan as you discover what needs more practice.</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <input id={task.id} type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} className="h-5 w-5 accent-blue-800" />
                <label htmlFor={task.id} className={`min-w-0 flex-1 cursor-pointer ${task.done ? "text-slate-500 line-through" : "text-slate-900"}`}>
                  <span className="block font-bold">{task.topic}</span>
                  <span className="mt-1 block text-xs text-slate-500">{task.subject} · {task.minutes} minutes</span>
                </label>
                <button type="button" onClick={() => removeTask(task.id)} aria-label={`Remove ${task.topic}`} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p role="status" className="text-sm text-slate-500">{savedMessage}</p>
          <button type="button" onClick={clearPlan} disabled={tasks.length === 0 && goal === "Prepare confidently for my next exam" && days === 7 && dailyMinutes === 30} className="min-h-10 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Clear plan</button>
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-[#012153] p-6 text-white sm:p-8">
        <h2 className="text-xl font-extrabold">Make your next session count</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-blue-100">Try a simple loop: review one concept, practise a few questions, check what you missed, then revisit the topic later. This planner does not yet import exam results or generate AI recommendations.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2 font-bold text-[#012153]">Open CBT practice</Link>
          <Link href="/about" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-4 py-2 font-bold text-white">Explore the Academy vision</Link>
        </div>
      </section>
      <p className="mt-5 text-xs leading-5 text-slate-500">Privacy note: this first version saves your plan in this browser on this device. It is not yet synced to your BrainLab account or across devices. Avoid entering sensitive personal information in topic names.</p>
    </main>
  );
}
