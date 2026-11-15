"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";

interface ShowcaseCbtQuestion {
  id: number;
  subject: string;
  topic: string;
  question: string;
  options: { key: "A" | "B" | "C" | "D"; label: string }[];
  correct: "A" | "B" | "C" | "D";
  derivation: string;
  examinerTrap: string;
}

const SHOWCASE_QUESTIONS: ShowcaseCbtQuestion[] = [
  {
    id: 1,
    subject: "Physics",
    topic: "Uniform Acceleration & Motion",
    question: "A body accelerates uniformly from rest at 2.0 m/s² for 5.0 seconds. Calculate the total distance covered.",
    options: [
      { key: "A", label: "10.0 meters" },
      { key: "B", label: "25.0 meters (s = ½at²)" },
      { key: "C", label: "50.0 meters" },
      { key: "D", label: "100.0 meters" },
    ],
    correct: "B",
    derivation: "Since starting from rest, initial velocity u = 0. Using s = ut + ½at²: s = 0 + ½(2.0)(5.0)² = 25.0 meters.",
    examinerTrap: "Trap: Candidates frequently forget to square time (using t instead of t² = 25), leading to 10.0 m.",
  },
  {
    id: 2,
    subject: "English",
    topic: "Lexis & Concord (Rule of Proximity)",
    question: "Neither the principal nor the teachers _______ present at the annual school meeting.",
    options: [
      { key: "A", label: "was" },
      { key: "B", label: "were" },
      { key: "C", label: "is" },
      { key: "D", label: "are being" },
    ],
    correct: "B",
    derivation: "In correlative 'Neither... nor' constructions, the verb agrees with the nearer subject. 'teachers' (plural) is closest to the verb.",
    examinerTrap: "Trap: Blindly agreeing with the singular head noun 'principal' instead of the nearest subject.",
  },
  {
    id: 3,
    subject: "Chemistry",
    topic: "Oxidation Numbers & Redox",
    question: "What is the oxidation state of Manganese (Mn) in potassium permanganate (KMnO₄)?",
    options: [
      { key: "A", label: "+5" },
      { key: "B", label: "+6" },
      { key: "C", label: "+7" },
      { key: "D", label: "+4" },
    ],
    correct: "C",
    derivation: "In neutral KMnO₄: (+1) + Mn + 4(-2) = 0  =>  1 + Mn - 8 = 0  =>  Mn = +7.",
    examinerTrap: "Trap: Forgetting that each oxygen is -2 (giving -8 total), leading candidates to guess +5.",
  },
];

export function HomeProductShowcase() {
  const products = HOMEPAGE_CONTENT_CONFIG.products;

  // Interactive state for Card 1: Live Interactive 8-Key CBT Drill Engine
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [selectedKeyStroke, setSelectedKeyStroke] = useState<string>("B");

  const currentQ = SHOWCASE_QUESTIONS[activeQuestionIndex];
  const userChoice = selectedAnswers[currentQ.id];
  const isAnswered = Boolean(userChoice);

  // Interactive state for Card 3: Daily Quests & Streak Bonus
  const [completedQuests, setCompletedQuests] = useState<Record<string, boolean>>({
    quest1: true,
    quest2: true,
    quest3: false,
  });
  const [streakBonusClaimed, setStreakBonusClaimed] = useState<boolean>(false);

  // Interactive state for Card 2: Diagnostic Topic Focus
  const [activeDiagnosticTopic, setActiveDiagnosticTopic] = useState<"chem" | "calc" | "eng">("chem");

  // Interactive state for Card 4: Offline Toggle
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(true);

  // Active view mode: "pillars" (4 visual cards) vs "products" (all 6 ecosystem products)
  const [activeTab, setActiveTab] = useState<"pillars" | "products">("pillars");
  const [selectedProductId, setSelectedProductId] = useState<string>("cbt-simulator");

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(targetTag)) return;
      const k = e.key.toUpperCase();
      if (["A", "B", "C", "D", "P", "N", "S", "R"].includes(k)) {
        handleKeyClick(k);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeQuestionIndex, currentQ]);

  const handleKeyClick = (key: string) => {
    setSelectedKeyStroke(key);

    if (["A", "B", "C", "D"].includes(key)) {
      const choice = key as "A" | "B" | "C" | "D";
      setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: choice }));
      setShowExplanation(true);
    } else if (key === "N") {
      // Next Question
      setShowExplanation(false);
      setActiveQuestionIndex((prev) => (prev + 1) % SHOWCASE_QUESTIONS.length);
    } else if (key === "P") {
      // Previous Question
      setShowExplanation(false);
      setActiveQuestionIndex((prev) => (prev - 1 + SHOWCASE_QUESTIONS.length) % SHOWCASE_QUESTIONS.length);
    } else if (key === "S") {
      // Toggle Explanation
      setShowExplanation((prev) => !prev);
    } else if (key === "R") {
      // Reset Drill for this question
      setSelectedAnswers((prev) => {
        const next = { ...prev };
        delete next[currentQ.id];
        return next;
      });
      setShowExplanation(false);
    }
  };

  const toggleQuest = (id: string) => {
    setCompletedQuests((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      id="products"
      aria-label="Integrated Learning Products"
      className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-slate-50/50 dark:border-white/10 dark:bg-[#060913] overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Refined Empirical Branding */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <span
            data-slot="SLOTS S4-01 TO S4-04"
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-3 shadow-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>4 CORE EXAM SUPERPOWERS (SLOTS S4-01 TO S4-04)</span>
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            High-Impact Academic Tools. Zero Distractions.
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Engineered from real candidate examination room data to build authentic speed, eliminate guessing traps, and guarantee syllabus readiness.
          </p>

          {/* View Mode Switcher */}
          <div className="mt-7 inline-flex p-1.5 rounded-2xl bg-slate-100 border-2 border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("pillars")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "pillars"
                  ? "bg-blue-600 text-white font-black shadow-md border-b-2 border-blue-800"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              4 Core Exam Superpowers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "products"
                  ? "bg-blue-600 text-white font-black shadow-md border-b-2 border-blue-800"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Full 6-Product Ecosystem
            </button>
          </div>
        </div>

        {/* MODE 1: 4 HIGH-VOLTAGE VISUAL SUPERPOWER STUDIOS */}
        {activeTab === "pillars" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 min-h-[420px]">
            {/* CARD 1: JAMB 8-KEY SPEED ENGINE (cbt-simulator) */}
            <div
              id="cbt-simulator"
              className="flex flex-col justify-between rounded-3xl border-2 border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-blue-400 dark:hover:border-blue-500"
            >
              {/* Subtle ambient cyan glow */}
              <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-blue-500/15 dark:bg-blue-600/20 blur-3xl" aria-hidden="true" />

              <div>
                {/* Header Pills */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 dark:bg-blue-950/80 px-3.5 py-1 text-xs font-bold text-blue-800 dark:text-cyan-300 border border-blue-300 dark:border-blue-700/60 shadow-xs">
                    <span className="h-2 w-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                    <span>100% Exam Hall Parity</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-700/60 shadow-xs flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 inline-block text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    <span>+15 Min Speed Advantage</span>
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Official JAMB 8-Key Exam Engine
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal min-h-[40px]">
                  Speed-train without touching the mouse. Answer with <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-slate-800 border border-blue-300 dark:border-slate-700 font-mono text-xs text-blue-800 dark:text-cyan-300 font-bold">A</kbd> <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-slate-800 border border-blue-300 dark:border-slate-700 font-mono text-xs text-blue-800 dark:text-cyan-300 font-bold">B</kbd> <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-slate-800 border border-blue-300 dark:border-slate-700 font-mono text-xs text-blue-800 dark:text-cyan-300 font-bold">C</kbd> <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-slate-800 border border-blue-300 dark:border-slate-700 font-mono text-xs text-blue-800 dark:text-cyan-300 font-bold">D</kbd> and navigate with <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">P</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">N</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">S</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">R</kbd> — real muscle memory for exam day.
                </p>

                {/* Tactile Hardware Terminal Widget (Rock-solid static box) */}
                <div className="mt-4 rounded-2xl border-2 border-blue-200/80 dark:border-blue-800/60 bg-white/95 dark:bg-[#080E1C] p-4 sm:p-5 shadow-inner h-[395px] flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-200 dark:border-slate-800/80 pb-2 text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 text-blue-700 dark:text-cyan-400 font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {currentQ.subject} &bull; Q{activeQuestionIndex + 1} of {SHOWCASE_QUESTIONS.length}
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold font-mono flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>01:42:15</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400 truncate">
                      Topic: {currentQ.topic}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-medium leading-snug line-clamp-2">
                      {currentQ.question}
                    </p>
                  </div>

                  {/* Interactive Options HUD (2x2 grid with tactile springy keycaps) */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {currentQ.options.map((opt) => {
                      const isSelected = userChoice === opt.key || selectedKeyStroke === opt.key;
                      const isCorrect = opt.key === currentQ.correct;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleKeyClick(opt.key)}
                          className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all border-2 border-b-4 cursor-pointer active:border-b-2 active:translate-y-0.5 ${
                            isSelected
                              ? isCorrect
                                ? "bg-emerald-50 border-emerald-600 dark:bg-emerald-950/60 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold shadow-xs"
                                : "bg-rose-50 border-rose-500 dark:bg-rose-950/60 dark:border-rose-500 text-rose-950 dark:text-rose-100 font-bold shadow-xs"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-600"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-black shadow-xs ${
                              isSelected
                                ? isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "bg-rose-600 text-white"
                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-xs truncate font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Reserved Static Derivation & Trap Slot (Permanent h-[92px] - zero page shifting) */}
                  <div className="h-[92px] rounded-xl border border-blue-200/90 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/40 p-2.5 text-xs flex flex-col justify-center overflow-hidden">
                    {userChoice ? (
                      <div className="space-y-1 animate-bl-fade-in">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-cyan-400" />
                            <span>Step-by-Step Derivation:</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200">
                              Key [{currentQ.correct}]
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Press [N] next
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                          {currentQ.derivation}
                        </p>
                        <div className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1 truncate">
                          <span><svg className="h-3 w-3 inline-block mr-1 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{currentQ.examinerTrap}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-1 text-slate-500 dark:text-slate-400 py-1">
                        <div className="text-xs font-bold text-blue-700 dark:text-cyan-300 flex items-center justify-center gap-1.5">
                          <span><svg className="h-3 w-3 inline-block mr-1 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>Official JAMB Speed Trainer</span>
                        </div>
                        <p className="text-[11px] leading-tight">
                          Press physical keys <kbd className="px-1 py-0.2 bg-white dark:bg-slate-800 border rounded font-mono text-[10px] font-bold">A-D</kbd> or tap keycaps below to reveal step-by-step derivation &amp; trap detection.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Physical 3D Beveled Mechanical Keycaps */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold hidden sm:inline">
                      Physical Keycaps:
                    </span>
                    <div className="flex gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
                      {["A", "B", "C", "D", "P", "N", "S", "R"].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleKeyClick(k)}
                          className={`h-7 w-7 rounded-lg font-mono text-xs font-black transition-all cursor-pointer border-2 border-b-4 active:border-b-2 active:translate-y-0.5 shadow-xs ${
                            selectedKeyStroke === k
                              ? "bg-blue-600 text-white border-blue-800 dark:border-blue-950 scale-105"
                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400"
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="mt-4 pt-3.5 border-t border-blue-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Official 2026/2027 Keyboard Mapping
                </span>
                <Link
                  href="/cbt"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-xs sm:text-sm font-black border-2 border-blue-700 border-b-4 active:border-b-2 active:translate-y-0.5 shadow-md transition-all bl-focus-ring"
                >
                  <span>Launch 8-Key CBT</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* CARD 2: INSTANT AI DIAGNOSTICS & LEARNING DNA */}
            <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-purple-200/90 dark:border-purple-900/60 bg-gradient-to-b from-purple-50/70 via-white to-fuchsia-50/30 dark:from-[#150B28] dark:via-[#0B0718] dark:to-[#080514] p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-purple-500/80 transition-all duration-300 min-h-[660px] lg:h-[680px] overflow-hidden">
              {/* Subtle ambient purple glow */}
              <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-purple-500/15 dark:bg-purple-600/20 blur-3xl" aria-hidden="true" />

              <div>
                {/* Header Pills */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-purple-100/80 dark:bg-purple-950/80 px-3.5 py-1 text-xs font-bold text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60 shadow-xs">
                    <span className="h-2 w-2 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse" />
                    <span>Precision Topic Mastery</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-800 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/80 px-3 py-1 rounded-full border border-purple-300 dark:border-purple-700/60 shadow-xs flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 inline-block text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                    <span>Cognitive DNA Radar</span>
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Instant AI Diagnostics &amp; Learning DNA
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal min-h-[40px]">
                  Never practice blindly. Our diagnostic engine evaluates response patterns and latency across the NERDC syllabus, pinpointing hidden weak spots before exam day.
                </p>

                {/* Interactive Diagnostic Radar Matrix (Rock-solid static box) */}
                <div className="mt-4 rounded-2xl border-2 border-purple-200/80 dark:border-purple-800/60 bg-white/95 dark:bg-[#100820] p-4 sm:p-5 shadow-inner h-[395px] flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-200 dark:border-slate-800/80 pb-2 text-slate-600 dark:text-slate-400">
                    <span className="text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                      NERDC Syllabus Diagnostic Telemetry
                    </span>
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded text-purple-800 dark:text-purple-200 font-bold">
                      Live Scan
                    </span>
                  </div>

                  {/* Topic Mastery Bars with Interactive Selector Tabs */}
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tap topic to inspect AI diagnostic breakdown:
                    </div>

                    {/* Topic 1: Chemistry */}
                    <button
                      type="button"
                      onClick={() => setActiveDiagnosticTopic("chem")}
                      className={`w-full text-left p-2 rounded-xl transition-all border cursor-pointer ${
                        activeDiagnosticTopic === "chem"
                          ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 shadow-xs"
                          : "bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-800 dark:text-slate-200 font-bold">Organic Chemistry (Alkanols &amp; Esters)</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">42% (Needs Review)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 w-[42%] rounded-full shadow-xs" />
                      </div>
                    </button>

                    {/* Topic 2: Calculus */}
                    <button
                      type="button"
                      onClick={() => setActiveDiagnosticTopic("calc")}
                      className={`w-full text-left p-2 rounded-xl transition-all border cursor-pointer ${
                        activeDiagnosticTopic === "calc"
                          ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 shadow-xs"
                          : "bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-800 dark:text-slate-200 font-bold">Calculus &amp; Differentiation</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">68% (Moderate)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 w-[68%] rounded-full shadow-xs" />
                      </div>
                    </button>

                    {/* Topic 3: English */}
                    <button
                      type="button"
                      onClick={() => setActiveDiagnosticTopic("eng")}
                      className={`w-full text-left p-2 rounded-xl transition-all border cursor-pointer ${
                        activeDiagnosticTopic === "eng"
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 shadow-xs"
                          : "bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-800 dark:text-slate-200 font-bold">Lexis, Structure &amp; Oral English</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">89% (Mastered)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-[89%] rounded-full shadow-xs" />
                      </div>
                    </button>
                  </div>

                  {/* Socratic AI Insight Chip (Permanent static h-[86px]) */}
                  <div className="h-[86px] rounded-xl bg-purple-50/90 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 p-2.5 text-[11px] text-purple-950 dark:text-purple-200 flex items-start gap-2.5 overflow-hidden shadow-xs">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white font-bold text-xs mt-0.5">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </span>
                    <div className="leading-snug space-y-0.5">
                      <strong className="text-purple-950 dark:text-white font-bold block">
                        {activeDiagnosticTopic === "chem" && "AI Examiner Insight: Organic Chemistry"}
                        {activeDiagnosticTopic === "calc" && "AI Examiner Insight: Calculus & Limits"}
                        {activeDiagnosticTopic === "eng" && "AI Examiner Insight: Oral English & Stress"}
                      </strong>
                      <p className="text-slate-700 dark:text-purple-200 text-[11px] line-clamp-2">
                        {activeDiagnosticTopic === "chem" && "You lose marks due to confusing IUPAC functional priority rules. Focus on 5 targeted drills to boost chemistry score by +18 marks."}
                        {activeDiagnosticTopic === "calc" && "Derivative foundations are solid, but chain-rule trig substitutions require 2 more drills to lock in high accuracy."}
                        {activeDiagnosticTopic === "eng" && "Vocabulary mastery is outstanding (89%). Maintain this baseline with 5 quick daily vocabulary drills."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="mt-4 pt-3.5 border-t border-purple-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Dynamic weakness tracking on every drill
                </span>
                <Link
                  href="/learning-dna"
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 text-xs sm:text-sm font-black border-2 border-purple-700 border-b-4 active:border-b-2 active:translate-y-0.5 shadow-md transition-all bl-focus-ring"
                >
                  <span>Explore Learning DNA</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* CARD 3: NATIONAL ARENA & DAILY QUESTS */}
            <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-emerald-200/90 dark:border-emerald-900/60 bg-gradient-to-b from-emerald-50/70 via-white to-amber-50/30 dark:from-[#081C15] dark:via-[#07130F] dark:to-[#040D0A] p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-emerald-500/80 transition-all duration-300 min-h-[660px] lg:h-[680px] overflow-hidden">
              {/* Subtle ambient emerald glow */}
              <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-emerald-500/15 dark:bg-emerald-600/20 blur-3xl" aria-hidden="true" />

              <div>
                {/* Header Pills */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 px-3.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span>Synchronous 1v1 Arena Duels</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700/60 shadow-xs flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                    <span>5-Day Flame Streak</span>
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  National Arena &amp; Daily Quests
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal min-h-[40px]">
                  Turn exam prep into an exciting game. Compete head-to-head in real-time academic sprints against students across Nigeria and maintain your daily study streak.
                </p>

                {/* Interactive Duel & Quest Widget (Rock-solid static box) */}
                <div className="mt-4 rounded-2xl border-2 border-emerald-200/80 dark:border-emerald-800/60 bg-white/95 dark:bg-[#071610] p-4 sm:p-5 shadow-inner h-[395px] flex flex-col justify-between overflow-hidden">
                  {/* Live Duel Header */}
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-amber-900 dark:text-amber-300">Live 1v1 Arena Matchup</span>
                    </div>
                    <span className="font-mono text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md font-bold">
                      Round 4 of 5 &bull; Speed Sprint
                    </span>
                  </div>

                  {/* Duel Scores */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80">
                      <span className="block text-[11px] text-blue-700 dark:text-blue-300 font-bold">You (Candidate)</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">850 pts</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono font-bold">Streak: 5 Days</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="block text-[11px] text-slate-600 dark:text-slate-300 font-bold">Abuja High-Scorer</span>
                      <span className="text-base font-black text-slate-700 dark:text-slate-300">720 pts</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">Streak: 3 Days</span>
                    </div>
                  </div>

                  {/* Interactive Daily Quests (Click to toggle) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">
                      Daily Quests (Tap to complete):
                    </span>
                    {[
                      { id: "quest1", title: "Complete 20 Physics CBT practice questions", xp: "+50 XP" },
                      { id: "quest2", title: "Review 1 Socratic AI weak topic correction", xp: "+50 XP" },
                      { id: "quest3", title: "Win 1 Synchronous Challenge Arena duel", xp: "+100 XP" },
                    ].map((q) => {
                      const isDone = completedQuests[q.id];
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => toggleQuest(q.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-[11px] transition-all border cursor-pointer ${
                            isDone
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 font-semibold"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className={isDone ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400 font-bold"}>
                              {isDone ? (
                                <svg className="h-3.5 w-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <span className="h-3.5 w-3.5 rounded-full border border-slate-400 block" />
                              )}
                            </span>
                            <span className={isDone ? "line-through opacity-75" : ""}>{q.title}</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                            {q.xp}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Interactive Claim Bonus Button (Fixed h-[36px] - zero layout shift) */}
                  <div className="h-[36px]">
                    <button
                      type="button"
                      onClick={() => setStreakBonusClaimed(!streakBonusClaimed)}
                      className="w-full h-full rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer active:scale-[0.99]"
                    >
                      {streakBonusClaimed ? (
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>+250 XP Claimed! Ranked #14 Nationwide</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                          </svg>
                          <span>Tap to Claim Today&apos;s +250 XP Daily Bonus</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="mt-4 pt-3.5 border-t border-emerald-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  State &amp; National Leaderboards
                </span>
                <Link
                  href="/challenge-arena"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs sm:text-sm font-black border-2 border-emerald-700 border-b-4 active:border-b-2 active:translate-y-0.5 shadow-md transition-all bl-focus-ring"
                >
                  <span>Enter Challenge Arena</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* CARD 4: ZERO-DATA OFFLINE PWA SYNC */}
            <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-cyan-200/90 dark:border-cyan-900/60 bg-gradient-to-b from-cyan-50/70 via-white to-teal-50/30 dark:from-[#081820] dark:via-[#061117] dark:to-[#030B10] p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-cyan-500/80 transition-all duration-300 min-h-[660px] lg:h-[680px] overflow-hidden">
              {/* Subtle ambient cyan glow */}
              <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-cyan-500/15 dark:bg-cyan-600/20 blur-3xl" aria-hidden="true" />

              <div>
                {/* Header Pills */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100/80 dark:bg-cyan-950/80 px-3.5 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/60 shadow-xs">
                    <span className="h-2 w-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                    <span>Zero-Data PWA Sync</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-950/80 px-3 py-1 rounded-full border border-teal-300 dark:border-teal-700/60 shadow-xs flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                      <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                    <span>Works on 2G / 3G / Offline</span>
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Offline PWA &amp; Low-Data Mode
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal min-h-[40px]">
                  Poor or expensive internet? Zero barrier. BrainLab installs directly on Android, iOS, and PC, caching practice questions locally so studying never stops.
                </p>

                {/* Interactive Offline Engine Simulation (Rock-solid static box) */}
                <div className="mt-4 rounded-2xl border-2 border-cyan-200/80 dark:border-cyan-800/60 bg-white/95 dark:bg-[#061218] p-4 sm:p-5 shadow-inner h-[395px] flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-200 dark:border-slate-800/80 pb-2 text-slate-600 dark:text-slate-400">
                    <span className="text-cyan-700 dark:text-cyan-300 font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                      Offline Storage &amp; Sync Engine
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-b-4 border-slate-300 dark:border-slate-700 active:border-b-2 active:translate-y-0.5 text-xs font-mono text-cyan-700 dark:text-cyan-300 hover:border-slate-400 cursor-pointer font-bold"
                    >
                      {isOfflineSimulated ? "Switch: Online Mode" : "Simulate: Offline Mode"}
                    </button>
                  </div>

                  {/* Status Banner (Permanent static h-[120px] - zero layout shift) */}
                  <div
                    className={`h-[120px] rounded-xl p-3 border text-xs transition-all flex flex-col justify-between ${
                      isOfflineSimulated
                        ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200"
                        : "bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800/60 text-blue-950 dark:text-blue-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold flex items-center gap-1.5 text-xs">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isOfflineSimulated ? "bg-emerald-500" : "bg-blue-500"
                            } animate-pulse`}
                          />
                          {isOfflineSimulated ? "Offline Mode Active (Zero Cellular Data)" : "Online Cloud Sync Active"}
                        </span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-current">
                          {isOfflineSimulated ? "0.00 KB/s" : "Connected"}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed line-clamp-2">
                        {isOfflineSimulated
                          ? "Questions, timer countdowns, and answer selections save directly to browser IndexedDB storage without dropping connection."
                          : "Synchronizing practice drills, accuracy scores, and study streak milestones with your central national profile."}
                      </p>
                    </div>

                    <div className="text-[10px] font-mono flex items-center justify-between border-t border-current/20 pt-1">
                      <span>Local Cache Status:</span>
                      <span className="font-bold">1,200 Questions (42 MB) Ready</span>
                    </div>
                  </div>

                  {/* Data Efficiency Comparison */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-bold">BrainLab CBT Practice</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">&lt; 1.2 MB data / session</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-bold">Typical Video Class</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">~45 MB - 120 MB data</span>
                    </div>
                  </div>

                  {/* Device Compatibility Badges */}
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/80">
                    <span>Devices Supported:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold">Android &bull; iOS &bull; Windows &bull; Mac</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="mt-4 pt-3.5 border-t border-cyan-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Installable PWA with IndexedDB
                </span>
                <Link
                  href="/cbt"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 text-xs sm:text-sm font-black border-2 border-cyan-700 border-b-4 active:border-b-2 active:translate-y-0.5 shadow-md transition-all bl-focus-ring"
                >
                  <span>Launch Offline CBT</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: FULL 6-PRODUCT ECOSYSTEM PREVIEW (PRESERVED) */}
        {activeTab === "products" && (
          <div className="space-y-8 min-h-[420px]">
            {/* Product Selector Tabs */}
            <div
              role="tablist"
              aria-label="Product Showcase Previews"
              className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none justify-start lg:justify-center"
            >
              {products.map((prod) => {
                const isSelected = prod.id === selectedProductId;
                return (
                  <button
                    key={prod.id}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-150 bl-focus-ring min-h-[44px] flex items-center gap-2 cursor-pointer border-2 border-b-4 active:border-b-2 active:translate-y-0.5 ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-800 dark:border-blue-950 font-black shadow-sm"
                        : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <span className="opacity-75">{prod.badge || "Product"}</span>
                    <span className="font-extrabold">{prod.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Product Detailed Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border-2 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-10 shadow-sm">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <span>{activeProduct.category}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {activeProduct.name}
                </h3>

                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {resolveClaimValue(activeProduct.tagline, "")}
                </p>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {resolveClaimValue(activeProduct.description, "")}
                </p>

                <div>
                  <Link
                    href={activeProduct.href}
                    className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-blue-600 hover:bg-blue-500 active:border-b-2 active:translate-y-0.5 px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-md transition-all bl-focus-ring min-h-[46px]"
                  >
                    <span>Launch {activeProduct.name}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-white min-h-[280px] flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-800 pb-3">
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{activeProduct.name} Live Engine</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[10px] font-bold inline-flex items-center gap-1">
                      <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>WCAG 2.1 AA Compliant</span>
                    </span>
                  </div>
                  <div className="py-6 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{activeProduct.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      Fully integrated with your central profile, learning DNA, and national ranking.
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between">
                    <span>Synchronized with central database</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">Low-Latency WebSockets</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
