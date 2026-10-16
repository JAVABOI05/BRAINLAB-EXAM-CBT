"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type LearningIntent = "understand" | "practise" | "mistake" | "exam";
type MissionType = "decode" | "solve" | "spot" | "apply" | "teach";

const intents: { id: LearningIntent; number: string; title: string; prompt: string; detail: string }[] = [
  { id: "understand", number: "01", title: "Understand a difficult idea", prompt: "Start with a clear explanation", detail: "Choose one idea you cannot yet explain in your own words. Break it into smaller questions, then test your understanding with an example." },
  { id: "practise", number: "02", title: "Practise with purpose", prompt: "Try a focused practice session", detail: "Work through a small set of questions, note the step that slows you down, and revisit only what that evidence points to." },
  { id: "mistake", number: "03", title: "Learn from a mistake", prompt: "Trace the thinking, not just the score", detail: "Revisit a question you missed. Identify whether the gap was a concept, a method, a misread instruction or a rushed decision." },
  { id: "exam", number: "04", title: "Prepare for an exam", prompt: "Make your next revision session count", detail: "Pick a topic, practise under a realistic time limit when appropriate, then review your errors before attempting another set." },
];

const missions: { id: MissionType; title: string; verb: string; description: string; mark: string }[] = [
  { id: "decode", title: "Decode it", verb: "Explain the idea", description: "Put the concept into plain language and connect it to something you already know.", mark: "↳" },
  { id: "solve", title: "Solve it", verb: "Work through a challenge", description: "Take a problem one step at a time. Show the reasoning that gets you from the question to the result.", mark: "∑" },
  { id: "spot", title: "Spot the flaw", verb: "Find the hidden mistake", description: "Inspect a worked example and identify the step where the reasoning stops making sense.", mark: "⌕" },
  { id: "apply", title: "Apply it", verb: "Use it in context", description: "Connect an idea to a practical situation, then explain why the method fits.", mark: "↗" },
  { id: "teach", title: "Teach it back", verb: "Prove it in your own words", description: "Explain the idea without copying a definition. If a step is hard to explain, that is a useful next clue.", mark: "◎" },
];

export default function LearningLabPage() {
  const [intent, setIntent] = useState<LearningIntent>("understand");
  const [mission, setMission] = useState<MissionType>("decode");
  const [topic, setTopic] = useState("");
  const [showPlan, setShowPlan] = useState(false);
  const selectedIntent = useMemo(() => intents.find((item) => item.id === intent) ?? intents[0], [intent]);
  const selectedMission = useMemo(() => missions.find((item) => item.id === mission) ?? missions[0], [mission]);

  function buildPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowPlan(true);
  }

  return (
    <main id="main" className="pb-16">
      <section className="overflow-hidden bg-[#061a3a] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-200"><span className="h-2 w-2 rounded-full bg-cyan-300" /> BrainLab Learning Lab</p>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Don’t just finish a lesson. <span className="text-cyan-300">Prove you understand it.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-blue-100 sm:text-lg">A different way to think about learning: find the sticking point, choose a mission, practise the thinking, and check what you can now do independently.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#mission-builder" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-300 px-6 py-3 font-extrabold text-[#061a3a] transition hover:bg-cyan-200">Build a learning mission <span aria-hidden="true" className="ml-2">↓</span></a>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-6 py-3 font-bold text-white transition hover:bg-white/10">Practise with CBT <span aria-hidden="true" className="ml-2">↗</span></Link>
            </div>
            <p className="mt-5 text-xs leading-5 text-blue-200/80">First-version experience concept. This page does not yet read exam results, build a personal mastery profile or provide an AI tutor.</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-cyan-400/10 blur-2xl" aria-hidden="true" />
            <div className="relative rounded-[1.75rem] border border-white/15 bg-white/[0.06] p-5 shadow-2xl backdrop-blur sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">The mastery map</p><h2 className="mt-2 text-xl font-extrabold">Learning is connected.</h2></div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-100">Illustration</span>
              </div>
              <p className="mt-3 max-w-md text-sm leading-6 text-blue-100/80">A topic is more than a percentage. Understanding often depends on foundations, methods and the ability to explain or apply an idea.</p>
              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-3 sm:gap-x-3">
                <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-3 sm:p-4"><span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">Step 01</span><p className="mt-2 text-sm font-extrabold">Foundation</p><p className="mt-1 text-xs leading-5 text-blue-100/70">What must I know first?</p></div>
                <span className="text-xl text-cyan-300" aria-hidden="true">→</span>
                <div className="rounded-2xl border border-cyan-200/60 bg-cyan-300/10 p-3 sm:p-4"><span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-200">Step 02</span><p className="mt-2 text-sm font-extrabold">Core idea</p><p className="mt-1 text-xs leading-5 text-blue-100/70">What does it mean?</p></div>
                <div className="col-span-3 flex justify-center text-xl text-cyan-300" aria-hidden="true">↓</div>
                <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-3 sm:p-4"><span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">Step 03</span><p className="mt-2 text-sm font-extrabold">Method</p><p className="mt-1 text-xs leading-5 text-blue-100/70">Can I use it?</p></div>
                <span className="text-xl text-cyan-300" aria-hidden="true">→</span>
                <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-3 sm:p-4"><span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">Step 04</span><p className="mt-2 text-sm font-extrabold">Apply & explain</p><p className="mt-1 text-xs leading-5 text-blue-100/70">Can I do it alone?</p></div>
              </div>
              <div className="mt-5 rounded-xl border border-amber-200/20 bg-amber-200/[0.08] px-4 py-3 text-xs leading-5 text-amber-100"><strong>Important:</strong> this is a concept preview, not real student data or a live diagnostic.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <div className="max-w-xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">The learning loop</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Every attempt should tell you something.</h2>
            <p className="mt-4 leading-7 text-slate-600">A score can tell you how you performed on a set of questions. The next step is to understand why—and what to do differently. BrainLab’s intended learning loop connects practice, explanation, targeted revision and a fresh check.</p>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-extrabold text-slate-950">The rule we want to build around</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">A recommendation should be traceable to evidence, explain why it was suggested, and leave the learner in control. No mysterious “AI says so” score.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { n: "01", title: "Notice the gap", body: "Identify the question, concept or step that caused difficulty.", icon: "⌕" },
              { n: "02", title: "Choose a mission", body: "Explain, solve, spot a flaw, apply an idea or teach it back.", icon: "◇" },
              { n: "03", title: "Practise the thinking", body: "Work through the reasoning—not just the final answer.", icon: "∑" },
              { n: "04", title: "Check the change", body: "Try a fresh question or explain the idea without a prompt.", icon: "✓" },
            ].map((step) => <article key={step.n} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex items-center justify-between"><span className="text-xs font-extrabold tracking-[0.16em] text-blue-800">{step.n} / LOOP</span><span aria-hidden="true" className="text-2xl text-blue-800">{step.icon}</span></div><h3 className="mt-5 text-lg font-extrabold text-slate-950">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p></article>)}
          </div>
        </div>
      </section>

      <section id="mission-builder" className="scroll-mt-24 border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Try the prototype</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Build your next learning mission.</h2>
            <p className="mt-4 leading-7 text-slate-600">Choose what you need right now. This lightweight planner helps you frame a useful session; it does not generate AI answers or claim to diagnose your ability.</p>
          </div>
          <form onSubmit={buildPlan} className="mt-8 grid gap-6 lg:grid-cols-[1fr_.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <fieldset>
                <legend className="text-base font-extrabold text-slate-950">1. What are you trying to do?</legend>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {intents.map((item) => <button key={item.id} type="button" onClick={() => { setIntent(item.id); setShowPlan(false); }} aria-pressed={intent === item.id} className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${intent === item.id ? "border-blue-800 bg-blue-50 ring-1 ring-blue-800" : "border-slate-200 bg-white hover:border-blue-300"}`}><span className="text-xs font-extrabold tracking-wider text-blue-800">{item.number}</span><span className="mt-2 block font-extrabold text-slate-950">{item.title}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{item.prompt}</span></button>)}
                </div>
              </fieldset>
              <fieldset className="mt-7">
                <legend className="text-base font-extrabold text-slate-950">2. Choose how you want to learn</legend>
                <div className="mt-4 flex flex-wrap gap-2">
                  {missions.map((item) => <button key={item.id} type="button" onClick={() => { setMission(item.id); setShowPlan(false); }} aria-pressed={mission === item.id} className={`min-h-10 rounded-full border px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${mission === item.id ? "border-[#012153] bg-[#012153] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"}`}>{item.title}</button>)}
                </div>
              </fieldset>
              <div className="mt-7">
                <label htmlFor="learning-topic" className="block text-sm font-extrabold text-slate-950">3. What topic are you working on? <span className="font-normal text-slate-500">(optional)</span></label>
                <input id="learning-topic" value={topic} onChange={(event) => { setTopic(event.target.value); setShowPlan(false); }} maxLength={120} placeholder="e.g. a topic you found difficult" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
              </div>
              <button type="submit" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-extrabold text-white transition hover:bg-[#0a2f72] sm:w-auto">Create my session plan <span aria-hidden="true" className="ml-2">→</span></button>
            </div>
            <aside className="rounded-3xl bg-[#061a3a] p-6 text-white shadow-sm sm:p-8" aria-live="polite">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-200">Your mission preview</p>
              <h3 className="mt-3 text-2xl font-black">{selectedMission.title}</h3>
              <p className="mt-2 text-sm leading-6 text-blue-100">{selectedMission.description}</p>
              <div className="mt-6 border-t border-white/15 pt-5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">Session focus</p>
                <p className="mt-2 font-bold">{selectedIntent.detail}</p>
              </div>
              {showPlan && <div className="mt-6 rounded-2xl border border-cyan-200/30 bg-cyan-300/10 p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">Your session brief</p><p className="mt-2 font-extrabold">{topic.trim() || "Choose one topic to work on"}</p><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-blue-50"><li>Write down what you already understand.</li><li>{selectedMission.verb}: {selectedMission.description.toLowerCase()}</li><li>Try a fresh example without looking at the explanation.</li><li>Note what still feels unclear and choose the next small step.</li></ol><p className="mt-4 text-xs leading-5 text-cyan-100">This plan was generated in your browser from your selections; it has not been saved to your account.</p></div>}
              {!showPlan && <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.05] p-4"><p className="text-sm font-bold">Your next step will appear here.</p><p className="mt-1 text-sm leading-6 text-blue-100/75">Choose an intention and mission, then create your session plan.</p></div>}
            </aside>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Connected to your current tools</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Start with what is available today.</h2>
            <p className="mt-4 leading-7 text-slate-600">The broader Learning Lab will need verified topic data and reliable links between practice and learning evidence. Until those integrations are built and tested, use the current tools without assuming your activity automatically syncs between them.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-2.5 font-bold text-white">CBT practice ↗</Link>
              <Link href="/learning/revision" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-800">Revision planner ↗</Link>
              <Link href="/ai-learning" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-800">AI learning roadmap ↗</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h3 className="text-xl font-extrabold text-slate-950">What we should build next</h3>
            <ol className="mt-5 space-y-4">
              {[
                ["Verified topic map", "Start with one approved subject and a small, reviewed set of prerequisite relationships."],
                ["Evidence, not assumptions", "Connect only permitted, verified practice outcomes to a topic; explain what the evidence can and cannot tell us."],
                ["Guided mission experience", "Add reviewed examples, graduated hints and short checks before introducing open-ended AI support."],
                ["Fresh mastery check", "Use a new question or explanation prompt to see whether understanding has improved."],
              ].map(([title, body], index) => <li key={title} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-900">{index + 1}</span><div><h4 className="font-extrabold text-slate-950">{title}</h4><p className="mt-1 text-sm leading-6 text-slate-600">{body}</p></div></li>)}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
