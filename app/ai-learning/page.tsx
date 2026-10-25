import Link from "next/link";
import AILearningStudio from "./AILearningStudio";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Learning and Study Support",
  description:
    "Plan focused study sessions and explore BrainLab Academy's responsible AI learning guidance, Learning Hub and correction tools.",
  alternates: { canonical: "/ai-learning" },
  openGraph: {
    title: "AI Learning and Study Support | BrainLab Academy",
    description:
      "Explore guided study planning, responsible AI learning guidance and links to BrainLab's learning tools.",
    url: "/ai-learning",
    type: "website",
  },
};

const principles = [
  ["Explain the reasoning", "Learning support should help students understand the steps behind an answer, not just copy a final result."],
  ["Use evidence carefully", "Personalized suggestions must be based on permitted, relevant information—not guessed mastery scores or placeholder questions."],
  ["Keep learners in control", "Study plans should be understandable and optional. Learners should be able to question explanations and verify important information."],
  ["Protect exam integrity", "AI support should help students learn and review released work, never disclose protected answer keys or assist during restricted live exams."],
];

export default function AILearningPage() {
  return (
    <main id="main" className="pb-16">
      <section className="border-b border-slate-200 bg-[#061a3a] text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="inline-flex rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.15em] text-cyan-200">AI Learning Studio</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">Understand the why. Practise the thinking. <span className="text-cyan-300">Own your progress.</span></h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-blue-100 sm:text-lg">Use a guided study mission to decide what to work on and how to approach it. AI-powered explanations and personalized assistance will be connected only when the secure tutor service is verified and enabled.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/learn" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-300 px-6 py-3 font-extrabold text-[#061a3a] hover:bg-cyan-200">Explore Learning Hub <span aria-hidden="true" className="ml-2">→</span></Link>
            <Link href="/corrections" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-6 py-3 font-bold text-white hover:bg-white/10">Review corrections <span aria-hidden="true" className="ml-2">↗</span></Link>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-6 py-3 font-bold text-white hover:bg-white/10">CBT practice <span aria-hidden="true" className="ml-2">↗</span></Link>
          </div>
        </div>
      </section>

      <AILearningStudio />

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:py-18">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Trust comes first</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Useful technology, responsible boundaries.</h2>
            <p className="mt-4 leading-7 text-slate-600">These are product requirements, not a claim that every AI capability is already live. AI responses must be authenticated, rate-limited, privacy-aware and tested before public release.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {principles.map(([title, description], index) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-extrabold tracking-[0.15em] text-blue-800">0{index + 1}</p>
                <h3 className="mt-2 text-lg font-extrabold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
