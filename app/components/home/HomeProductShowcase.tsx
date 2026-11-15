"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";

interface ShowcaseQuestion {
  id: number;
  subject: string;
  topic: string;
  question: string;
  options: { key: "A" | "B" | "C" | "D"; label: string }[];
  correct: "A" | "B" | "C" | "D";
  derivation: string;
  examinerTrap: string;
}

const SHOWCASE_QUESTIONS: ShowcaseQuestion[] = [
  {
    id: 1,
    subject: "Use of English",
    topic: "Lexis & Concord (Rule of Proximity)",
    question: "Choose the correct verb: 'Neither the principal nor the teachers _______ present at the annual valedictory service.'",
    options: [
      { key: "A", label: "were" },
      { key: "B", label: "was" },
      { key: "C", label: "is" },
      { key: "D", label: "are being" },
    ],
    correct: "A",
    derivation: "Under the grammatical rule of proximity, with 'neither... nor', the verb agrees with the closer plural subject 'teachers' ⟹ 'were'.",
    examinerTrap: "Trap: Instinctively agreeing with the distant singular subject 'principal'.",
  },
  {
    id: 2,
    subject: "Mathematics",
    topic: "Quadratic Equations & Roots",
    question: "Find the values of x that satisfy: 2x² + 5x + 3 = 0.",
    options: [
      { key: "A", label: "x = -1 or x = -3/2" },
      { key: "B", label: "x = 1 or x = 3/2" },
      { key: "C", label: "x = -1 or x = 3/2" },
      { key: "D", label: "x = 1 or x = -3/2" },
    ],
    correct: "A",
    derivation: "Factorise: 2x² + 2x + 3x + 3 = 0 ⟹ (2x + 3)(x + 1) = 0 ⟹ x = -3/2 or -1.",
    examinerTrap: "Trap: Sign inversion error when solving linear factors to roots.",
  },
  {
    id: 3,
    subject: "Physics",
    topic: "Current Electricity & Internal Resistance",
    question: "A cell of e.m.f. 2.0 V and internal resistance 1.0 Ω is connected to a 4.0 Ω load. Find the terminal p.d.",
    options: [
      { key: "A", label: "1.60 V" },
      { key: "B", label: "2.00 V" },
      { key: "C", label: "0.40 V" },
      { key: "D", label: "0.80 V" },
    ],
    correct: "A",
    derivation: "Current I = E / (R + r) = 2.0 / 5 = 0.4 A. Terminal p.d. V = I × R = 0.4 × 4 = 1.6 V.",
    examinerTrap: "Trap: Confusing terminal potential difference (1.6V) with internal lost volts (0.4V).",
  },
];

export function HomeProductShowcase() {
  const showcaseConfig = HOMEPAGE_CONTENT_CONFIG.products;

  // Row 1: AI Tutor Socratic Step State
  const [aiTutorStep, setAiTutorStep] = useState<number>(1);
  const [aiSelectedFactor, setAiSelectedFactor] = useState<string | null>(null);

  // Row 2: CBT Question Simulator State (SLOTS S4-01 TO S4-04 / cbt-simulator)
  const [activeQIndex, setActiveQIndex] = useState<number>(0);
  const [cbtAnswers, setCbtAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [isFlagged, setIsFlagged] = useState<boolean>(false);

  // Row 3: STEM Logic Gate Interactive State
  const [stemGate, setStemGate] = useState<"AND" | "OR" | "XOR">("AND");
  const [switchA, setSwitchA] = useState<boolean>(true);
  const [switchB, setSwitchB] = useState<boolean>(false);

  // Row 4: Subject Readiness Filter State
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  const currentQ = SHOWCASE_QUESTIONS[activeQIndex];
  const userChoice = cbtAnswers[currentQ.id];

  const isStemLit =
    stemGate === "AND"
      ? switchA && switchB
      : stemGate === "OR"
      ? switchA || switchB
      : switchA !== switchB;

  function handleSelectCbtAnswer(key: "A" | "B" | "C" | "D") {
    setCbtAnswers((prev) => ({ ...prev, [currentQ.id]: key }));
  }

  return (
    <section
      id="products"
      aria-label="BrainLab Learning Ecosystem Products and Interactive Showcase"
      className="scroll-mt-20 py-16 sm:py-24 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#050811] text-slate-900 dark:text-slate-100 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-28">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div
            data-slot="SLOTS S4-01 TO S4-04 • THE BRAINLAB ECOSYSTEM"
            className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300"
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            <span>CORE LEARNING TOOLS &bull; THE BRAINLAB ECOSYSTEM</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            Everything You Need to Master <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500">
              JAMB, WAEC &amp; STEM Subjects.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Bite-sized, purposeful tools designed to replace passive textbook cramming with active recall, tactile problem-solving, and diagnostic clarity.
          </p>
        </div>

        {/* -------------------------------------------------------------
            ROW 1: 24/7 AI STUDY STUDIO (Text Left, Card Right)
        ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Text Left */}
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <span>01 • 24/7 AI STUDY STUDIO</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Always by your side when you get stuck.
            </h3>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Ask questions in natural conversational language. Instead of simply spoon-feeding final answers, the AI Tutor guides you step-by-step through the underlying theorem and mathematical proofs.
            </p>

            <ul className="space-y-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-md mx-auto lg:mx-0 text-left">
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs">✓</span>
                <span>Socratic question-and-answer hints that build genuine comprehension</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs">✓</span>
                <span>High-resolution LaTeX and KaTeX mathematical equation breakdowns</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs">✓</span>
                <span>Trained specifically on Nigerian Senior Secondary &amp; UTME syllabuses</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/products/ai-learning"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors group"
              >
                <span>Explore AI Study Studio</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Compact Card Right */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-[#070D1A] p-5 sm:p-6 shadow-sm min-h-[420px] flex flex-col justify-between relative overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-black">
                    🤖
                  </span>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">BrainLab AI Tutor</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Socratic Mode
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold">
                  Algebra Drill
                </span>
              </div>

              {/* Chat Thread Dialogue */}
              <div className="space-y-3.5 my-3 text-xs leading-relaxed">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-xs bg-blue-600 text-white px-4 py-2.5 max-w-[85%] shadow-xs font-medium">
                    How do I factorise 2x² + 5x + 3 = 0 without using the quadratic formula?
                  </div>
                </div>

                {/* AI Tutor Message */}
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-4 py-3 max-w-[90%] shadow-xs space-y-2">
                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                      Let&apos;s use factorisation by splitting the middle term!
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      Multiply the first and last coefficients: <strong>2 × 3 = 6</strong>. What two numbers multiply to <strong>6</strong> and add up to <strong>5</strong>?
                    </p>

                    {/* Interactive Choice Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { key: "a", label: "2 and 3", correct: true },
                        { key: "b", label: "1 and 6", correct: false },
                        { key: "c", label: "4 and 1", correct: false },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setAiSelectedFactor(item.label);
                            setAiTutorStep(item.correct ? 2 : 1);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                            aiSelectedFactor === item.label
                              ? item.correct
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-rose-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Follow-up on Correct Selection */}
                {aiSelectedFactor === "2 and 3" && (
                  <div className="flex justify-start animate-bl-fade-in">
                    <div className="rounded-2xl rounded-tl-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 px-4 py-2.5 max-w-[90%] shadow-xs space-y-1 text-emerald-900 dark:text-emerald-200 text-[11px]">
                      <span className="font-black block">Spot on! 2 × 3 = 6 and 2 + 3 = 5.</span>
                      <p>Now rewrite: 2x² + 2x + 3x + 3 = 0 ⟹ 2x(x + 1) + 3(x + 1) = 0 ⟹ <strong>(2x + 3)(x + 1) = 0</strong>.</p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-bold">Roots: x = -3/2 or x = -1</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500">
                <span>Free fair-use tier included</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">No sign-up required for trial</span>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            ROW 2: CBT PRACTICE SIMULATOR (Card Left, Text Right)
        ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Compact Card Left */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div
              className="rounded-3xl border border-blue-400/30 dark:border-blue-500/25 bg-gradient-to-b from-slate-900 via-[#0a1329] to-[#060c18] text-white p-5 sm:p-6 shadow-sm min-h-[420px] flex flex-col justify-between relative overflow-hidden"
              data-testid="cbt-simulator"
            >
              {/* Cockpit Top Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-cyan-300">
                    {currentQ.subject} Cockpit
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isFlagged && (
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
                      FLAGGED [R]
                    </span>
                  )}
                  <span className="font-mono text-amber-400 font-bold text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                    01:42:15
                  </span>
                </div>
              </div>

              {/* Question Body */}
              <div className="space-y-2.5 my-2.5 text-left">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Topic: {currentQ.topic}</span>
                  <span className="font-mono text-cyan-400">Q{currentQ.id} of 40</span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                  {currentQ.question}
                </p>

                {/* Options */}
                <div className="space-y-1.5">
                  {currentQ.options.map((opt) => {
                    const isSelected = userChoice === opt.key;
                    const isCorrect = opt.key === currentQ.correct;

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectCbtAnswer(opt.key)}
                        className={`w-full flex items-center gap-2.5 rounded-xl border p-2 text-left text-xs transition-all cursor-pointer min-h-[44px] ${
                          isSelected
                            ? isCorrect
                              ? "border-emerald-500 bg-emerald-950/60 text-emerald-100 font-bold shadow-xs"
                              : "border-rose-500 bg-rose-950/60 text-rose-100 font-bold shadow-xs"
                            : "border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-900 hover:border-white/20"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-black ${
                            isSelected
                              ? isCorrect
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-rose-500 text-white"
                              : "bg-slate-800 text-slate-300 border border-white/10"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="flex-1 text-[11px] sm:text-xs">{opt.label}</span>
                        {isSelected && (
                          <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                            isCorrect ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                          }`}>
                            {isCorrect ? "Correct" : "Trap"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Examiner Trap & Derivation */}
                {userChoice && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-2.5 text-[11px] text-cyan-200 space-y-1 animate-bl-fade-in">
                    <p className="leading-snug text-[10px] sm:text-[11px]">{currentQ.derivation}</p>
                    <p className="text-[10px] text-amber-300 font-mono italic">{currentQ.examinerTrap}</p>
                  </div>
                )}
              </div>

                {/* 8-Key Controls Strip */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {[
                    { key: "P", label: "Prev" },
                    { key: "N", label: "Next" },
                    { key: "R", label: "Flag" },
                    { key: "S", label: "Cycle" },
                  ].map((k) => (
                    <button
                      key={k.key}
                      type="button"
                      onClick={() => {
                        if (k.key === "N") {
                          setActiveQIndex((prev) => (prev + 1) % SHOWCASE_QUESTIONS.length);
                        } else if (k.key === "P") {
                          setActiveQIndex((prev) => (prev - 1 + SHOWCASE_QUESTIONS.length) % SHOWCASE_QUESTIONS.length);
                        } else if (k.key === "R") {
                          setIsFlagged(!isFlagged);
                        } else if (k.key === "S") {
                          setActiveQIndex((prev) => (prev + 1) % SHOWCASE_QUESTIONS.length);
                        }
                      }}
                      className="px-2 py-1 rounded bg-slate-900 border border-white/15 text-[10px] font-mono font-bold text-slate-300 hover:text-white hover:border-cyan-400 active:translate-y-0.5 transition cursor-pointer"
                    >
                      <span className="text-cyan-400 font-black">[{k.key}]</span> {k.label}
                    </button>
                  ))}
                </div>

                <Link
                  href="/products/cbt"
                  className="text-cyan-400 text-xs font-bold hover:text-cyan-300 transition-colors"
                >
                  Full Mock &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Text Right */}
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
              <span>02 • CBT PRACTICE ENGINE</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Simulate the real JAMB 8-key terminal.
            </h3>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Train under realistic CBT test-center conditions with official 8-key hardware navigation, strict countdown timers, question review flagging, and instant score diagnostics.
            </p>

            <ul className="space-y-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-md mx-auto lg:mx-0 text-left">
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs">✓</span>
                <span>Hardware key emulation (A, B, C, D, P, N, S, R) for rapid answering</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs">✓</span>
                <span>PWA offline resilience: zero answer loss even if internet disconnects</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs">✓</span>
                <span>Topic-by-topic diagnostic breakdown immediately upon submission</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/products/cbt"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors group"
              >
                <span>Launch CBT Simulator</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            ROW 3: STEM VIRTUAL LABS (Text Left, Card Right)
        ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Text Left */}
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <span>03 • STEM STUDIO VIRTUAL LABS</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Touch the science. Not just dry formulas.
            </h3>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Bridge classroom theory with interactive laboratories. From thin-lens optics ray tracing to digital logic gate circuits and volumetric acid-base titrations, watch real physical reactions happen in real time.
            </p>

            <ul className="space-y-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-md mx-auto lg:mx-0 text-left">
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs">✓</span>
                <span>Thin lens ray tracing with real-time focal point and image nature metrics</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs">✓</span>
                <span>Interactive digital logic gate circuit toggles (AND, OR, NOT, XOR)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs">✓</span>
                <span>60 FPS lightweight vector graphics with zero heavy 3D engine bloat</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/products/stem-studio"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors group"
              >
                <span>Explore Virtual Laboratories</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Compact Card Right */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-[#070D1A] p-5 sm:p-6 shadow-sm min-h-[420px] flex flex-col justify-between relative overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-black">
                    ⚡
                  </span>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">Digital Circuit Workbench</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Physics &amp; Computer Studies</span>
                  </div>
                </div>

                {/* Gate Selector */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                  {(["AND", "OR", "XOR"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setStemGate(g)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        stemGate === g
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Circuit Board */}
              <div className="my-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 flex items-center justify-around gap-4 relative">
                {/* Switches */}
                <div className="space-y-3 z-10">
                  <button
                    type="button"
                    onClick={() => setSwitchA(!switchA)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${
                      switchA
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${switchA ? "bg-emerald-500" : "bg-slate-400"}`} />
                    <span>Input A: {switchA ? "1 (ON)" : "0 (OFF)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSwitchB(!switchB)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${
                      switchB
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${switchB ? "bg-emerald-500" : "bg-slate-400"}`} />
                    <span>Input B: {switchB ? "1 (ON)" : "0 (OFF)"}</span>
                  </button>
                </div>

                {/* Gate Chip */}
                <div className={`z-10 px-4 py-3 rounded-2xl border-2 text-center transition-all ${
                  isStemLit
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400"
                }`}>
                  <span className="text-[9px] font-mono uppercase tracking-wider block font-bold text-purple-600 dark:text-purple-400">CHIP</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{stemGate}</span>
                  <span className="text-[9px] font-mono block mt-0.5">Q = A {stemGate} B</span>
                </div>

                {/* Light Output */}
                <div className="z-10 flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    isStemLit
                      ? "border-amber-400 bg-amber-100 dark:bg-amber-400/20 text-amber-500 shadow-lg shadow-amber-400/40 scale-105"
                      : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    <svg className={`h-7 w-7 ${isStemLit ? "text-amber-400 drop-shadow-[0_0_10px_#f59e0b]" : "opacity-30"}`} viewBox="0 0 24 24" fill={isStemLit ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M9 18h6" />
                      <path d="M10 22h4" />
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                    </svg>
                  </div>
                  <span className={`text-[10px] font-mono font-bold mt-1.5 uppercase ${isStemLit ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                    {isStemLit ? "Output = 1" : "Output = 0"}
                  </span>
                </div>
              </div>

              {/* Bottom Rule */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500">
                <span>Rule: <strong>{stemGate}</strong> outputs high (1) when its logic condition is met</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">WAEC Standard</span>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            ROW 4: LEARNING DNA & DIAGNOSTICS (Card Left, Text Right)
        ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Compact Card Left */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-[#070D1A] p-5 sm:p-6 shadow-sm min-h-[420px] flex flex-col justify-between relative overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-cyan-300 text-xs font-black">
                    📊
                  </span>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">Learning DNA Radar</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">4-Subject Readiness Map</span>
                  </div>
                </div>

                <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Overall: 84% Ready
                </span>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3.5 my-3">
                {[
                  { subject: "Use of English", score: 88, target: "290+ High Merit", color: "bg-blue-600" },
                  { subject: "Mathematics", score: 82, target: "Premier Target", color: "bg-cyan-500" },
                  { subject: "Physics", score: 76, target: "Revision Needed", color: "bg-amber-500" },
                  { subject: "Chemistry", score: 90, target: "Distinction", color: "bg-emerald-500" },
                ].map((item) => (
                  <div key={item.subject} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{item.subject}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{item.target}</span>
                        <span className="font-mono font-black text-slate-900 dark:text-white">{item.score}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Diagnostic Recommendation Box */}
              <div className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Adaptive Recommendation:
                </span>
                <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-snug">
                  Strengthen <strong>Physics (Mechanics &amp; Electricity)</strong> to boost your cumulative UTME projection from 276 to <strong>305+</strong>.
                </p>
              </div>

              {/* Bottom Info */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500">
                <span>Updated after every CBT drill</span>
                <Link
                  href="/products/learning-hub"
                  className="text-blue-600 dark:text-cyan-400 font-bold hover:underline"
                >
                  View Full Syllabus Radar &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Text Right */}
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
              <span>04 • LEARNING DNA &amp; DIAGNOSTICS</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Pinpoint exactly where you are losing marks.
            </h3>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Never waste time revising topics you already know. BrainLab&apos;s cognitive diagnostic engine tracks every attempt topic-by-topic, exposing knowledge gaps and recommending targeted drills to maximize your exam score.
            </p>

            <ul className="space-y-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-md mx-auto lg:mx-0 text-left">
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 text-xs">✓</span>
                <span>Cumulative readiness prediction against your dream university cut-off</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 text-xs">✓</span>
                <span>Sub-topic weakness flags identifying your most recurring mistakes</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 text-xs">✓</span>
                <span>Automatic daily sprint recommendations tailored to your syllabus gaps</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/products/learning-hub"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors group"
              >
                <span>Explore Learning DNA</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
