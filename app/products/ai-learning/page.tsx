import type { Metadata } from "next";
import Link from "next/link";
import { PublicAiTutorDemo } from "@/app/components/public/PublicAiTutorDemo";

export const metadata: Metadata = {
  title: "AI Study Studio & Diagnostic Revision",
  description:
    "AI-assisted learning and diagnostic revision: automatically identify syllabus weaknesses from mock CBT mistakes, generate 5-question reinforcement drills, and retain formulas with SM-2 spaced repetition.",
  alternates: { canonical: "https://www.brainlabacademy.com.ng/products/ai-learning" },
  openGraph: {
    title: "AI Study Studio & Diagnostics — BrainLab Academy",
    description:
      "Automated mistake diagnosis, weak topic identification, and targeted 5-question reinforcement drills built for Nigerian secondary & UTME candidates.",
    url: "https://www.brainlabacademy.com.ng/products/ai-learning",
  },
};

const AI_CAPABILITIES = [
  {
    icon: "🔬",
    title: "Automated Mock Exam Error Diagnosis",
    description:
      "Our diagnostic engine analyzes your incorrect responses after each mock exam to distinguish between simple calculation slips and fundamental conceptual misunderstandings.",
  },
  {
    icon: "🎯",
    title: "Targeted 5-Question Reinforcement Drills",
    description:
      "Rather than retaking an entire 40-question paper, receive compact, high-intensity 5-question drills targeted specifically at the subtopics where you dropped marks.",
  },
  {
    icon: "🧠",
    title: "SM-2 Spaced Repetition Memory Engine",
    description:
      "Daily 10-minute active recall decks. Review formulas, scientific definitions, and grammatical rules just as they are about to fade from memory, locking them into long-term recall.",
  },
  {
    icon: "⚠️",
    title: "Examiner Trap Analysis",
    description:
      "Understand why incorrect options are seductive. Our step-by-step explanations reveal the exact calculation mistakes or conceptual traps examiners set in multiple-choice distractors.",
  },
  {
    icon: "🛡️",
    title: "Ethical & Academic Safety Guardrails",
    description:
      "Engineered strictly to teach how to solve problems. The AI will never provide unverified shortcuts or leak answer keys, adhering strictly to Nigerian curriculum integrity guidelines.",
  },
  {
    icon: "⚡",
    title: "Low-Bandwidth Inference Delivery",
    description:
      "Explanations and drills are streamlined for lightning-fast loading on mobile data connections without requiring high-speed fiber or high-end smartphones.",
  },
];

export default function AiLearningProductPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-[#091325]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-blue-700 dark:hover:text-cyan-400">Products</Link>
            <span>/</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">AI Learning</span>
          </div>
          <Link
            href="/ai-learning"
            className="font-bold text-purple-700 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
          >
            Open AI Study Studio →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(147,51,234,0.1),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-purple-900 dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-300">
              <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
              Adaptive Diagnostic Engine
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
              Turn exam mistakes into <br />
              <span className="text-purple-700 dark:text-purple-400">permanent conceptual mastery.</span>
            </h1>

            <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
              Stop endlessly repeating practice questions you already know. BrainLab&apos;s AI Study Studio isolates your exact subject weaknesses and delivers targeted 5-question reinforcement drills until you master the concept.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
              <Link
                href="/ai-learning"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-purple-700 hover:bg-purple-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-900/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                Launch AI Study Studio <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              >
                View Pro Diagnostic Access
              </Link>
            </div>
          </div>

          {/* Visual AI Diagnostic Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-2xl dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs font-mono">
                <span className="text-purple-400 font-bold">DIAGNOSTIC RADAR // PHYSICS</span>
                <span className="rounded bg-rose-950 px-2 py-0.5 text-rose-300 text-[10px] font-bold">Weak Topic Detected</span>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-slate-800/60 p-3.5 border border-slate-700/60 text-xs space-y-1.5">
                  <div className="font-bold text-slate-200">Identified Misconception:</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Confusion between electrical power dissipation formulas (P = I²R vs P = V²/R) when resistors are connected in series versus parallel.
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between text-purple-300 font-bold text-[11px]">
                    <span>🎯 Generated 5-Question Drill</span>
                    <span>Ready in 1.2s</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Drill 1: Compare thermal power in series resistors of 4Ω and 6Ω carrying 2A current.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>SM-2 INTERVAL: +3 DAYS</span>
                <span className="text-emerald-400 font-bold">RECALL PROBABILITY: 94%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Public AI Tutor Demo Component */}
      <section className="py-12 sm:py-16 bg-slate-100/60 dark:bg-[#060c18] border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PublicAiTutorDemo />
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Precision Diagnostics, Not General Answers
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Generic chatbots fail at Nigerian examination prep. Our algorithms are specifically tuned to the syllabus conventions of JAMB and WAEC.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AI_CAPABILITIES.map((cap, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-xl dark:bg-purple-950/60">
                  {cap.icon}
                </div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {cap.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Diagnose your test weaknesses today.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Take a mock test or submit a practice problem to generate your personalized AI revision plan.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/ai-learning"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-purple-700 hover:bg-purple-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Try AI Diagnostic Drills →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
