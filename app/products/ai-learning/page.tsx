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

interface AiCapabilityItem {
  iconId: "diag" | "drill" | "memory" | "trap" | "guard" | "speed";
  title: string;
  description: string;
}

const AI_CAPABILITIES: AiCapabilityItem[] = [
  {
    iconId: "diag",
    title: "Automated Mock Exam Error Diagnosis",
    description:
      "Our diagnostic engine analyzes your incorrect responses after each mock exam to distinguish between simple calculation slips and fundamental conceptual misunderstandings.",
  },
  {
    iconId: "drill",
    title: "Targeted 5-Question Reinforcement Drills",
    description:
      "Rather than retaking an entire 40-question paper, receive compact, high-intensity 5-question drills targeted specifically at the subtopics where you dropped marks.",
  },
  {
    iconId: "memory",
    title: "SM-2 Spaced Repetition Memory Engine",
    description:
      "Daily 10-minute active recall decks. Review formulas, scientific definitions, and grammatical rules just as they are about to fade from memory, locking them into long-term recall.",
  },
  {
    iconId: "trap",
    title: "Examiner Trap Analysis",
    description:
      "Understand why incorrect options are seductive. Our step-by-step explanations reveal the exact calculation mistakes or conceptual traps examiners set in multiple-choice distractors.",
  },
  {
    iconId: "guard",
    title: "Ethical & Academic Safety Guardrails",
    description:
      "Engineered strictly to teach how to solve problems. The AI will never provide unverified shortcuts or leak answer keys, adhering strictly to Nigerian curriculum integrity guidelines.",
  },
  {
    iconId: "speed",
    title: "Low-Bandwidth Inference Delivery",
    description:
      "Explanations and drills are streamlined for lightning-fast loading on mobile data connections without requiring high-speed fiber or high-end smartphones.",
  },
];

function AiCapabilityIcon({ id }: { id: AiCapabilityItem["iconId"] }) {
  switch (id) {
    case "diag":
      return (
        <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "drill":
      return (
        <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "memory":
      return (
        <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04" />
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04" />
        </svg>
      );
    case "trap":
      return (
        <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "guard":
      return (
        <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "speed":
      return (
        <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
  }
}

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
                    <span className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                      <span>Generated 5-Question Drill</span>
                    </span>
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

      {/* Capabilities - Compact Alternating Cards */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800/80 bg-purple-50/80 dark:bg-purple-950/60 px-4 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />
              <span>PEDAGOGICAL AI CAPABILITIES</span>
            </div>
            <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight sm:text-4xl">
              Precision Diagnostics, Not General Answers
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
              Generic chatbots fail at Nigerian examination prep. Our algorithms are specifically tuned to the syllabus conventions of JAMB and WAEC.
            </p>
          </div>

          <div className="space-y-12 sm:space-y-16">
            {/* Row 1: Automated Mock Exam Error Diagnosis (Text Left, Visual Preview Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-purple-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Text Side (Span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-purple-300 dark:border-purple-700/60 bg-purple-50 dark:bg-purple-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span>Root-Cause Error Diagnostics</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    Automated Mock Exam Error Diagnosis
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Our diagnostic engine analyzes your incorrect responses after each mock exam to distinguish between simple calculation slips and fundamental conceptual misunderstandings.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                      <span>Categorizes mistakes into arithmetic errors, distractor traps, or concept gaps</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                      <span>Deconstructs why incorrect distractor options trick examination candidates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                      <span>Directly maps every flagged question to the exact JAMB syllabus objective</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/ai-learning"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Open AI Study Studio</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Visual Preview Side (Span 5) */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-purple-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                          DIAGNOSTIC RADAR
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded">
                        Trap Identified
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-2">
                      <div className="text-xs font-mono text-cyan-300 font-bold">Physics: Current Electricity</div>
                      <div className="text-xs text-rose-300 font-mono">
                        Selected: P = I²R in Parallel (Trap)
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        In parallel circuits, voltage V is constant across branches. Power formula P = V²/R reveals that lower resistance yields higher power dissipation.
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                      <span>Remediation Target: Circuits</span>
                      <span className="text-emerald-400 font-bold">Drill Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Targeted 5-Question Reinforcement Drills (Visual Preview Left, Text Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-cyan-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Visual Preview Side (Span 5 - Order 2 on mobile, Order 1 on desktop) */}
                <div className="lg:col-span-5 order-2 lg:order-1">
                  <div className="rounded-2xl border border-cyan-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                          REINFORCEMENT DRILL
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded">
                        5 Questions
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center font-mono">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Target Concept</div>
                        <div className="text-xs font-black text-cyan-300 mt-0.5">Parallel Power</div>
                        <div className="text-[10px] text-slate-500">P = V²/R</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Generation Time</div>
                        <div className="text-xs font-black text-emerald-400 mt-0.5">&lt; 1.2s</div>
                        <div className="text-[10px] text-slate-500">Socratic Mode</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Drill Progress: Question 3 of 5</span>
                        <span className="text-emerald-400 font-bold">2/2 Correct</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500 w-[60%]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text Side (Span 7 - Order 1 on mobile, Order 2 on desktop) */}
                <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 dark:border-cyan-700/60 bg-cyan-50 dark:bg-cyan-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span>High-Intensity Targeted Drills</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    Targeted 5-Question Reinforcement Drills
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Rather than retaking an entire 40-question paper, receive compact, high-intensity 5-question drills targeted specifically at the subtopics where you dropped marks.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Sub-2 second generation tuned to your exact test responses</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Tests the missed principle from varying angles to ensure true comprehension</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Immediate Socratic hints if you hesitate or choose another distractor</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/cbt"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Take Practice Test to Trigger Drills</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: SM-2 Spaced Repetition Memory Engine (Text Left, Visual Preview Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-emerald-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Text Side (Span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Recall &amp; Memory Retention</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    SM-2 Spaced Repetition Memory Engine
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Daily 10-minute active recall decks. Review formulas, scientific definitions, and grammatical rules just as they are about to fade from memory, locking them into long-term recall.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Mathematically scheduled intervals prevent the Ebbinghaus forgetting curve</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Flashcards for physics constants, organic nomenclature &amp; English idioms</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>94% average retention probability verified across daily revision streaks</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/pricing"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Explore Revision Plans</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Visual Preview Side (Span 5) */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-emerald-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                          SM-2 MEMORY CARD
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                        Interval: +3 Days
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 space-y-2 text-xs font-mono">
                      <div className="text-[10px] text-slate-400 uppercase">Flashcard 14 of 25</div>
                      <div className="text-white font-bold text-sm">Faraday&apos;s Law of Induction</div>
                      <div className="p-2 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold">
                        &epsilon; = -N &middot; (d&Phi;/dt)
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans">
                        Induced EMF is directly proportional to rate of change of magnetic flux linkage.
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                      <span>Recall Confidence: High</span>
                      <span className="text-emerald-400 font-bold">94% Retention</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
