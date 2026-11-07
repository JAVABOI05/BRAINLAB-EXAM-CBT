"use client";

import { useState } from "react";
import Link from "next/link";

interface LoopStage {
  id: string;
  number: string;
  title: string;
  badge: string;
  headline: string;
  description: string;
  products: { name: string; url: string; tag: string }[];
  stemRole?: string;
  metricLabel: string;
  metricPlaceholder: string;
}

const LOOP_STAGES: LoopStage[] = [
  {
    id: "learn",
    number: "01",
    title: "LEARN",
    badge: "Foundation",
    headline: "Master Curriculum Concepts Before Facing Full Exams",
    description: "Begin with structured syllabus notes, interactive video lessons, and teacher-led whiteboard sessions. Rather than guessing, students build fundamental subject comprehension topic by topic.",
    products: [
      { name: "Learning Hub", url: "/products/learning-hub", tag: "Syllabus Notes" },
      { name: "Live Classroom", url: "/products/live-classroom", tag: "Whiteboard Stage" },
    ],
    stemRole: "STEM Studio provides interactive visual simulations of complex science and engineering concepts.",
    metricLabel: "Curriculum Coverage",
    metricPlaceholder: "Official JAMB & WAEC Syllabi Aligned",
  },
  {
    id: "practise",
    number: "02",
    title: "PRACTISE",
    badge: "Application",
    headline: "Sit Authentic Timed CBT Simulations Under Exam Pressure",
    description: "Experience the authentic 4-subject combination JAMB UTME testing environment. Featuring authentic 2-hour countdown timers, standardized 400-point scoring, built-in calculators, and offline question caching.",
    products: [
      { name: "CBT Simulator", url: "/products/cbt", tag: "4-Subject Mocks" },
      { name: "STEM Studio", url: "/products/stem-studio", tag: "Virtual Labs" },
    ],
    stemRole: "Hands-on virtual logic gates bench and science calculation labs reinforce practical understanding.",
    metricLabel: "Simulation Authenticity",
    metricPlaceholder: "180 Questions • Standard UTME Blueprint",
  },
  {
    id: "diagnose",
    number: "03",
    title: "DIAGNOSE",
    badge: "Insight",
    headline: "Pinpoint Exact Topic Deficiencies & Time Telemetry",
    description: "Beyond simple percentage scores, diagnostic psychometrics analyze time spent per question, question difficulty handling, and topic-by-topic retention, highlighting precise revision needs.",
    products: [
      { name: "Psychometrics", url: "/dashboard", tag: "Cognitive Radar" },
      { name: "Time Telemetry", url: "/result", tag: "Pacing Analysis" },
    ],
    metricLabel: "Diagnostic Precision",
    metricPlaceholder: "Cognitive Weakness Detection Per Subject",
  },
  {
    id: "improve",
    number: "04",
    title: "IMPROVE",
    badge: "Correction",
    headline: "Eliminate Blind Spots with AI-Assisted Worked Solutions",
    description: "Turn errors into breakthroughs. The AI Tutor analyzes why incorrect options were tempting, provides step-by-step mathematical derivations, and generates focused micro-drills.",
    products: [
      { name: "AI Tutor", url: "/products/ai-studio", tag: "Worked Solutions" },
      { name: "Spaced Repetition", url: "/learn", tag: "Adaptive Drills" },
    ],
    stemRole: "Interactive parameter adjustments demonstrate how altering formulas affects experimental outputs.",
    metricLabel: "Targeted Resolution",
    metricPlaceholder: "Step-by-Step AI Concept Rationales",
  },
  {
    id: "master",
    number: "05",
    title: "MASTER",
    badge: "Excellence",
    headline: "Compete in Synchronized 1v1 Duels & Top Leaderboards",
    description: "True mastery is proven under speed and pressure. High-scoring candidates enter the Challenge Arena for synchronized 1v1 academic battles, school vs. school leagues, and national rankings.",
    products: [
      { name: "Challenge Arena", url: "/products/challenge-arena", tag: "1v1 Duels" },
      { name: "National Ranks", url: "/leaderboard", tag: "Leaderboards" },
    ],
    metricLabel: "Competitive Performance",
    metricPlaceholder: "Top National Percentile Benchmark",
  },
];

export default function PrototypeBrainLabLoop() {
  const [activeStageId, setActiveStageId] = useState<string>("learn");
  const activeStage = LOOP_STAGES.find((s) => s.id === activeStageId) || LOOP_STAGES[0];

  return (
    <section className="border-b border-slate-200 bg-slate-50/60 py-16 sm:py-20 lg:py-24 dark:border-slate-800 dark:bg-[#0B1536]/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">
            The Learning Methodology
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            The BrainLab Loop
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Every learning tool in the BrainLab ecosystem connects into a continuous 5-stage progression designed to move students from basic understanding to verified exam mastery.
          </p>
        </div>

        {/* Stepper Navigation Tabs */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3" role="tablist" aria-label="BrainLab Loop Stages">
          {LOOP_STAGES.map((stage) => {
            const isActive = stage.id === activeStageId;
            return (
              <button
                key={stage.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveStageId(stage.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md dark:bg-blue-600"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                  isActive ? "bg-white text-blue-600" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  {stage.number}
                </span>
                <span>{stage.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detailed Panel */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Stage Description Column */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-sky-950 dark:text-sky-300">
                  Stage {activeStage.number} • {activeStage.badge}
                </span>
              </div>

              <h3 className="mt-4 text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                {activeStage.headline}
              </h3>

              <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {activeStage.description}
              </p>

              {/* STEM Cross-Cutting Callout */}
              {activeStage.stemRole && (
                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <span className="text-base">🔬</span>
                    <span>STEM Studio Cross-Cutting Support</span>
                  </div>
                  <p className="mt-1 text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                    {activeStage.stemRole}
                  </p>
                </div>
              )}

              {/* Connected Products */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Connected Tools:
                </span>
                {activeStage.products.map((p) => (
                  <Link
                    key={p.name}
                    href={p.url}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-sky-400"
                  >
                    <span>{p.name}</span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      {p.tag}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Stage Visual Artifact Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {activeStage.metricLabel}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>

                <div className="mt-6 py-6 text-center">
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">
                    Stage Focus
                  </span>
                  <p className="mt-2 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    {activeStage.metricPlaceholder}
                  </p>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Integrated directly into student dashboard telemetry
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-sky-400">
                    Continuous feedback loop dynamically guides next study priority
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
