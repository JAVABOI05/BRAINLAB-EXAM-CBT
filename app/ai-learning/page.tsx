import Link from "next/link";

export const metadata = {
  title: "AI Learning Companion",
  description: "Explore BrainLab Academy's planned approach to responsible, learner-centred AI support. AI tutoring is not yet available on this page.",
};

const principles = [
  ["Explain, don’t just answer", "The intended tutor should help learners understand the reasoning behind a solution, with steps they can question and revisit."],
  ["Practise with purpose", "Future tools may create extra practice around a topic, while clearly distinguishing generated practice from official exam questions."],
  ["Learn from mistakes", "When reliable, permitted learning data is available, future guidance may help a learner decide which topic to revisit next."],
  ["Keep learners in control", "Suggestions should be understandable and optional. Learners should be able to challenge an explanation and verify important information."],
];

const safeguards = [
  "It should support learning, not help users cheat during a live or restricted examination.",
  "It should not present generated explanations as guaranteed correct; learners need ways to check and question them.",
  "Personalised recommendations should only use data the learner is authorised to share and the platform can safely access.",
  "AI features should be introduced only after quality, privacy, cost and safety testing.",
];

export default function AILearningPage() {
  return (
    <main id="main">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">Planned capability</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">Meet a more thoughtful way to learn.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">BrainLab Academy’s long-term direction includes an AI learning companion that helps learners unpack difficult concepts, practise step by step and plan what to study next. This page describes the intended direction; an AI Tutor is not available here yet.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white hover:bg-[#0a2f72]">Start with CBT practice <span aria-hidden="true" className="ml-2">→</span></Link>
            <Link href="/learning/revision" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 hover:border-slate-500">Use the revision planner</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Intended learning experience</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">AI that helps you build understanding.</h2>
          <p className="mt-4 leading-7 text-slate-600">The goal is not to replace teachers or independent thinking. It is to offer another way to ask questions, explore a concept and practise what you have learned.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {principles.map(([title, description], index) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-extrabold tracking-[0.16em] text-blue-800">0{index + 1}</p>
              <h3 className="mt-3 text-xl font-extrabold text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:py-20">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Trust comes first</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Useful technology, responsible boundaries.</h2>
            <p className="mt-4 leading-7 text-slate-600">AI learning support must be accurate enough to be useful, clear about its limits and respectful of learner privacy. These are product requirements—not claims that a deployed AI system has already passed these checks.</p>
          </div>
          <ul className="space-y-4">
            {safeguards.map((item) => <li key={item} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700"><span aria-hidden="true" className="font-black text-blue-800">✓</span><span>{item}</span></li>)}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 text-center sm:px-8 lg:py-20">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">You can start building a learning habit today.</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">The current CBT portal and first-version revision planner are available entry points. The planner saves its checklist in this browser and does not yet import exam results or generate AI recommendations.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/learning/revision" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white">Open revision planner</Link>
          <Link href="/about" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800">Our vision and mission</Link>
        </div>
      </section>
    </main>
  );
}
