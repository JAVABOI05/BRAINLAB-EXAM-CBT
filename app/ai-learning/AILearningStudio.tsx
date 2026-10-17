"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Intent = "understand" | "practise" | "mistake" | "exam";
type Method = "decode" | "solve" | "spot" | "apply" | "teach";

const intents: { id: Intent; title: string; description: string; next: string }[] = [
  { id: "understand", title: "Understand an idea", description: "Break a difficult concept into smaller questions and connect it to something you already know.", next: "Write what you think the idea means, then identify the part you cannot yet explain." },
  { id: "practise", title: "Practise a skill", description: "Work through a small set of problems and notice the step that slows you down.", next: "Try one example without help, then review the exact step where you got stuck." },
  { id: "mistake", title: "Learn from a mistake", description: "Look beyond the score and identify whether the gap came from a concept, method, misread or rushed choice.", next: "Revisit the released correction, explain why your answer was tempting, and state the corrected reasoning." },
  { id: "exam", title: "Prepare for an exam", description: "Choose a topic, practise deliberately and reserve time to review errors.", next: "Choose one topic, set a realistic practice window, then finish by reviewing errors—not just the score." },
];

const methods: { id: Method; title: string; description: string }[] = [
  { id: "decode", title: "Explain it simply", description: "Put the concept into plain language and connect it to prior knowledge." },
  { id: "solve", title: "Solve step by step", description: "Show the reasoning that connects the question to a result." },
  { id: "spot", title: "Spot the flaw", description: "Find the step where a worked example stops making sense." },
  { id: "apply", title: "Apply it", description: "Use the idea in a practical situation and explain why the method fits." },
  { id: "teach", title: "Teach it back", description: "Explain the idea in your own words without copying a definition." },
];

export default function AILearningStudio() {
  const [intent, setIntent] = useState<Intent>("understand");
  const [method, setMethod] = useState<Method>("decode");
  const [topic, setTopic] = useState("");
  const [plan, setPlan] = useState(false);
  const [notice, setNotice] = useState("");
  const selectedIntent = intents.find((item) => item.id === intent) ?? intents[0];
  const selectedMethod = methods.find((item) => item.id === method) ?? methods[0];

  function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlan(true);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Guided study mission</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Make your next study session count.</h2>
        <p className="mt-4 leading-7 text-slate-600">Choose a goal and a learning method to create a small, practical session brief. This planner runs in your browser; it does not claim to diagnose mastery or generate an AI answer.</p>
      </div>

      <form onSubmit={createPlan} className="mt-8 grid gap-6 lg:grid-cols-[1fr_.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <fieldset>
            <legend className="text-base font-extrabold text-slate-950">1. What do you want to do?</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {intents.map((item) => (
                <button key={item.id} type="button" onClick={() => { setIntent(item.id); setPlan(false); }} aria-pressed={intent === item.id} className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${intent === item.id ? "border-blue-800 bg-blue-50 ring-1 ring-blue-800" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                  <span className="block font-extrabold text-slate-950">{item.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-slate-600">{item.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7">
            <legend className="text-base font-extrabold text-slate-950">2. How will you work on it?</legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {methods.map((item) => (
                <button key={item.id} type="button" onClick={() => { setMethod(item.id); setPlan(false); }} aria-pressed={method === item.id} className={`min-h-10 rounded-full border px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${method === item.id ? "border-[#012153] bg-[#012153] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"}`}>{item.title}</button>
              ))}
            </div>
          </fieldset>

          <div className="mt-7">
            <label htmlFor="ai-learning-topic" className="block text-sm font-extrabold text-slate-950">3. Which topic? <span className="font-normal text-slate-500">(optional)</span></label>
            <input id="ai-learning-topic" value={topic} onChange={(event) => { setTopic(event.target.value); setPlan(false); }} maxLength={120} placeholder="e.g. simultaneous equations" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
          </div>
          <button type="submit" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-extrabold text-white transition hover:bg-[#0a2f72] sm:w-auto">Create my study plan <span aria-hidden="true" className="ml-2">→</span></button>
        </div>

        <aside className="rounded-3xl bg-[#061a3a] p-6 text-white shadow-sm sm:p-8" aria-live="polite">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-200">Your session brief</p>
          <h3 className="mt-3 text-2xl font-black">{selectedMethod.title}</h3>
          <p className="mt-2 text-sm leading-6 text-blue-100">{selectedMethod.description}</p>
          <div className="mt-6 border-t border-white/15 pt-5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">Session focus</p>
            <p className="mt-2 font-bold">{selectedIntent.next}</p>
          </div>
          {plan ? (
            <div className="mt-6 rounded-2xl border border-cyan-200/30 bg-cyan-300/10 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">Your plan</p>
              <p className="mt-2 font-extrabold">{topic.trim() || "Choose one specific topic to begin"}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-blue-50">
                <li>Write down what you already understand.</li>
                <li>{selectedMethod.title}: {selectedMethod.description.toLowerCase()}</li>
                <li>Try a fresh example without looking at a solution.</li>
                <li>Note what remains unclear and choose one next step.</li>
              </ol>
              <p className="mt-4 text-xs leading-5 text-cyan-100">Created locally from your selections. This plan has not been saved to your account.</p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.05] p-4 text-sm leading-6 text-blue-100">Choose a goal and method, then create your study plan.</div>
          )}
        </aside>
      </form>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Study content</p>
          <h3 className="mt-2 text-lg font-extrabold text-slate-950">Lessons and topic tests</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use structured lessons and topic assessments in the Learning Hub.</p>
          <Link className="mt-4 inline-flex font-bold text-blue-800 hover:underline" href="/learn">Open Learning Hub →</Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Understand errors</p>
          <h3 className="mt-2 text-lg font-extrabold text-slate-950">Corrections and review</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Review released exam feedback where your exam settings make corrections available.</p>
          <Link className="mt-4 inline-flex font-bold text-blue-800 hover:underline" href="/corrections">Open Corrections →</Link>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-amber-900">AI Tutor status</p>
          <h3 className="mt-2 text-lg font-extrabold text-slate-950">Secure tutor connection</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">Live AI responses are not enabled from this page yet. Your questions are not sent anywhere by this planner.</p>
          <button type="button" onClick={() => setNotice("The AI Tutor connection is not yet enabled on this page. No message was sent or saved. Please use the Learning Hub or Corrections links while the secure connection is integrated.")} className="mt-4 inline-flex font-bold text-amber-950 underline underline-offset-2">Check status</button>
          {notice && <p role="status" className="mt-3 rounded-xl border border-amber-300 bg-white p-3 text-sm leading-6 text-amber-950">{notice}</p>}
        </article>
      </div>
    </section>
  );
}
