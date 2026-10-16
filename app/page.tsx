"use client";

import Link from "next/link";

const pathways = [
  {
    number: "01",
    title: "Prepare for an exam",
    description: "Enter the existing CBT portal, follow the exam access steps and practise with the subjects currently supported.",
    action: "Open CBT portal",
    href: "/login",
    status: "Available",
    available: true,
  },
  {
    number: "02",
    title: "Understand a difficult topic",
    description: "BrainLab is being designed to connect practice with clearer explanations and focused revision resources.",
    action: "Explore the vision",
    href: "/about",
    status: "Developing",
    available: false,
  },
  {
    number: "03",
    title: "Learn with others",
    description: "Moderated study groups and academic discussions are part of the planned learning community.",
    action: "See what is planned",
    href: "#future-learning",
    status: "Planned",
    available: false,
  },
  {
    number: "04",
    title: "Build new skills",
    description: "Future learning pathways may extend beyond examinations into practical projects and skill development.",
    action: "Explore the roadmap",
    href: "#future-learning",
    status: "Planned",
    available: false,
  },
];

const pillars = [
  { number: "01", title: "Practise", description: "Use available CBT practice to test your understanding and build exam familiarity." },
  { number: "02", title: "Understand", description: "Use results and corrections when they are enabled for your exam, then focus your next study session." },
  { number: "03", title: "Connect", description: "BrainLab's future community is intended to help learners exchange ideas in a moderated academic space." },
  { number: "04", title: "Progress", description: "Build better study habits by reviewing what you have attempted and choosing a useful next step." },
];

export default function HomePage() {
  return (
    <main id="main">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(47,111,237,0.14),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f5f7fb_100%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-900">
              A learning ecosystem, built in stages
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Learn smarter. Practise with purpose. <span className="text-blue-700">Grow beyond the exam.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Prepare for examinations, strengthen your understanding and keep progressing. BrainLab Academy is connecting CBT practice with a broader learning experience—carefully, one useful step at a time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white shadow-lg shadow-blue-950/15 transition hover:bg-[#0a2f72] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                Start with CBT practice <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link href="/about" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                Discover BrainLab
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">Exam access may require a valid access code. Result visibility depends on exam settings.</p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-4 rounded-[2rem] bg-blue-200/40 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-blue-950/10">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-800">BrainLab learning loop</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">From practice to progress</p>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Product concept</span>
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                <div className="flex items-start gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#012153] text-sm font-extrabold text-white">01</span>
                  <div><p className="font-bold text-slate-900">Practise a topic</p><p className="mt-1 text-sm leading-6 text-slate-600">Start with the existing CBT experience.</p></div>
                </div>
                <div className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-700">02</span>
                  <div><p className="font-bold text-slate-900">Identify what needs work</p><p className="mt-1 text-sm leading-6 text-slate-600">Use available results and corrections when released.</p></div>
                </div>
                <div className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-700">03</span>
                  <div><p className="font-bold text-slate-900">Choose your next step</p><p className="mt-1 text-sm leading-6 text-slate-600">Revision guidance, AI support and study groups are future capabilities.</p></div>
                </div>
              </div>
              <div className="border-t border-slate-200 px-5 py-3 text-xs leading-5 text-slate-500">
                Illustrative product concept—not a screenshot of features that are already live.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="learning-paths" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Choose your next step</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Start with what you need today.</h2>
          <p className="mt-4 leading-7 text-slate-600">The CBT portal is the current starting point. Other pathways will be introduced when their experiences are ready to use.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pathways.map((pathway) => (
            <article key={pathway.number} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-extrabold tracking-[0.16em] text-slate-400">{pathway.number}</span>
                <span className={pathway.available ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800"}>{pathway.status}</span>
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-slate-950">{pathway.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{pathway.description}</p>
              <Link href={pathway.href} className="mt-5 inline-flex items-center font-bold text-blue-800 hover:text-blue-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                {pathway.action} <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">The BrainLab difference</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">A stronger learning loop—not just a score.</h2>
            <p className="mt-4 leading-7 text-slate-600">Assessment can help a learner decide what to do next. BrainLab's long-term direction is to connect each step into a useful, supportive experience.</p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar) => (
              <div key={pillar.number} className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
                <p className="text-sm font-extrabold tracking-[0.14em] text-blue-800">{pillar.number}</p>
                <h3 className="mt-4 text-xl font-extrabold text-slate-950">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cbt" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_.8fr] lg:items-center lg:py-20">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Assessment and exam preparation</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Prepare with purpose. Improve with every attempt.</h2>
          <p className="mt-5 leading-8 text-slate-600">Use the existing BrainLab CBT portal to enter supported practice sessions. Follow the instructions and access requirements shown for your exam. Results and corrections are available according to the platform's current settings.</p>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
            <li className="flex gap-3"><span className="mt-0.5 font-black text-emerald-700">✓</span><span>Access the current CBT candidate flow.</span></li>
            <li className="flex gap-3"><span className="mt-0.5 font-black text-emerald-700">✓</span><span>Choose from the subjects presented by the existing portal.</span></li>
            <li className="flex gap-3"><span className="mt-0.5 font-black text-emerald-700">✓</span><span>Use the access-code and exam instructions provided for your session.</span></li>
          </ul>
          <Link href="/login" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white transition hover:bg-[#0a2f72]">
            Open CBT portal <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-900">Keep your session on track</p>
          <h3 className="mt-3 text-2xl font-extrabold text-slate-950">A clear route into practice.</h3>
          <ol className="mt-6 space-y-5">
            {[
              ["01", "Candidate details", "Enter the details requested by the portal."],
              ["02", "Access and instructions", "Complete any required access-code step and read the exam rules."],
              ["03", "Exam session", "Answer the questions and submit according to the on-screen instructions."],
              ["04", "Results and corrections", "Review them when results are enabled for your session."],
            ].map(([number, title, description]) => (
              <li key={number} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-extrabold text-blue-900 shadow-sm">{number}</span>
                <div><p className="font-bold text-slate-950">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="future-learning" className="bg-[#00112b] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-200">The future ecosystem</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">More ways to learn, when they are ready.</h2>
              <p className="mt-5 leading-8 text-slate-300">BrainLab's ambition extends beyond examinations. Each capability will be designed, tested and introduced in stages—without presenting a roadmap as an existing product.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["AI learning companion", "Concept explanations, step-by-step support and practice generation.", "In development"],
                ["Study groups and discussions", "Moderated academic conversation and peer learning.", "Planned"],
                ["Personal learning progress", "Useful progress summaries and explainable revision suggestions.", "Planned"],
                ["Courses and practical skills", "Guided learning pathways, projects and portfolios.", "Future direction"],
              ].map(([title, description, status]) => (
                <article key={title} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <span className="inline-flex rounded-full border border-blue-200/20 bg-blue-300/10 px-3 py-1 text-xs font-bold text-blue-100">{status}</span>
                  <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8 sm:py-20">
        <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Your next step</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Your next learning breakthrough starts here.</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-600">Start with one goal. Take the next step. Build knowledge that stays with you.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white transition hover:bg-[#0a2f72]">Start CBT practice</Link>
          <Link href="/about" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 transition hover:border-slate-500">About BrainLab</Link>
        </div>
      </section>
    </main>
  );
}
