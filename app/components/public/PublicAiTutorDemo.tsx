"use client";
import { trackEvent } from "@/app/lib/analytics";

import React, { useState } from "react";
import Link from "next/link";

interface CuratedExample {
  id: string;
  subject: string;
  exam: string;
  title: string;
  question: string;
  socraticSteps: string[];
  examinerTrap: string;
  checkQuestion: string;
}

const CURATED_EXAMPLES: CuratedExample[] = [
  {
    id: "math-quadratic",
    subject: "Mathematics",
    exam: "JAMB UTME Algebra",
    title: "Factorising Non-Monic Quadratics",
    question: "Find the roots of the equation 2x² + 5x + 3 = 0 using factorisation.",
    socraticSteps: [
      "Identify the product and sum pair: We need two integers that multiply to a × c = (2)(3) = 6, and add up to b = 5.",
      "The factors of 6 that sum to 5 are 2 and 3 (since 2 × 3 = 6 and 2 + 3 = 5).",
      "Split the middle term: 2x² + 2x + 3x + 3 = 0.",
      "Factorise by grouping: 2x(x + 1) + 3(x + 1) = 0  ⟹  (2x + 3)(x + 1) = 0.",
      "Solve for roots: 2x + 3 = 0 ⟹ x = -3/2 (-1.5), and x + 1 = 0 ⟹ x = -1.",
    ],
    examinerTrap: "Common candidate error: dividing only by 2 without distributing to both terms, or mixing up the signs when moving constants across the equality sign.",
    checkQuestion: "Quick check: If the middle term was -5x, what signs would the factors 2 and 3 require?",
  },
  {
    id: "physics-kinematics",
    subject: "Physics",
    exam: "WAEC SSCE Mechanics",
    title: "Horizontal Projectile Velocity",
    question: "A stone is thrown horizontally from the top of a 20m high cliff with an initial velocity of 15 m/s. Calculate the time taken to reach the ground. (Take g = 10 m/s²)",
    socraticSteps: [
      "Separate motion into orthogonal components: Horizontal velocity (ux = 15 m/s) does not affect the vertical fall time under uniform gravity.",
      "Analyze vertical motion: Initial vertical velocity uy = 0 m/s, vertical displacement s = 20 m, downward acceleration a = 10 m/s².",
      "Apply the second equation of motion vertically: s = uy(t) + ½gt².",
      "Substitute values: 20 = 0(t) + ½(10)(t²)  ⟹  20 = 5t²  ⟹  t² = 4.",
      "Take the positive square root for time: t = 2.0 seconds.",
    ],
    examinerTrap: "Examiner trap: Candidates often mistakenly combine the horizontal speed (15 m/s) into the vertical fall equation, obtaining distorted times.",
    checkQuestion: "Follow-up: How far from the base of the cliff does the stone land horizontally?",
  },
  {
    id: "chem-oxidation",
    subject: "Chemistry",
    exam: "JAMB UTME Inorganic",
    title: "Oxidation Number of Manganese in KMnO₄",
    question: "Determine the oxidation state of Manganese (Mn) in Potassium Permanganate, KMnO₄.",
    socraticSteps: [
      "Recall fundamental oxidation rules: The overall charge of a neutral compound equals 0.",
      "Assign known fixed oxidation numbers: Potassium (Group 1 alkali metal) is always +1.",
      "Oxygen in typical compounds (non-peroxides) is almost always -2.",
      "Set up the balance algebraic equation: (+1) + (Mn) + 4(-2) = 0.",
      "Simplify and solve: 1 + Mn - 8 = 0  ⟹  Mn - 7 = 0  ⟹  Mn = +7.",
    ],
    examinerTrap: "Common error: Forgetting that there are 4 oxygen atoms (giving -8 total), leading candidates to calculate an incorrect state of +3 or +5.",
    checkQuestion: "Self-test: What is the oxidation number of Chromium in the dichromate ion, Cr₂O₇²⁻?",
  },
];

export function PublicAiTutorDemo() {
  const [activeTab, setActiveTab] = useState<"curated" | "sandbox">("curated");
  const [selectedCuratedId, setSelectedCuratedId] = useState<string>("math-quadratic");

  // Sandbox state
  const [guestQuestion, setGuestQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sandboxAnswer, setSandboxAnswer] = useState<string | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [remainingQueries, setRemainingQueries] = useState<number | null>(null);

  const selectedCurated = CURATED_EXAMPLES.find((item) => item.id === selectedCuratedId) || CURATED_EXAMPLES[0];

  const handleSandboxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestQuestion.trim() || submitting) return;

    setSubmitting(true);
    setSandboxError(null);
    setSandboxAnswer(null);

    try {
      const res = await fetch("/api/ai-tutor/public-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: guestQuestion.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Unable to retrieve response from AI Tutor demo.");
      }

      setSandboxAnswer(data.answer);
      trackEvent("demo_completed", { demo_type: "ai_tutor_socratic" });
      if (typeof data.remainingGuestQueries === "number") {
        setRemainingQueries(data.remainingGuestQueries);
      }
    } catch (err: unknown) {
      setSandboxError(err instanceof Error ? err.message : "Failed to connect to the AI Tutor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-label="BrainLab AI Study Studio Demonstration"
      className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-lg transition-colors dark:border-slate-800 dark:bg-[#0b1328]"
    >
      {/* Honest Pedagogical Boundaries Banner */}
      <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">⚖️</span>
          <div className="space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
            <h4 className="font-black text-sm uppercase tracking-wide text-amber-900 dark:text-amber-300">
              Honest Pedagogical Boundaries & Limitations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="rounded-xl border border-amber-200/80 bg-white/60 p-2.5 dark:border-amber-800/40 dark:bg-slate-900/50">
                <span className="font-bold block text-slate-900 dark:text-white">⚠️ Verification Required</span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Generative models can make arithmetic or conceptual errors. Always cross-check calculations with official syllabus marking schemes.
                </span>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-white/60 p-2.5 dark:border-amber-800/40 dark:bg-slate-900/50">
                <span className="font-bold block text-slate-900 dark:text-white">🧑‍🏫 Not a Teacher Replacement</span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  The AI Tutor is an assistive self-study companion for late-night practice, not a replacement for qualified human educators.
                </span>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-white/60 p-2.5 dark:border-amber-800/40 dark:bg-slate-900/50">
                <span className="font-bold block text-slate-900 dark:text-white">🔒 Locked in Live Exams</span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  To protect academic honesty, the AI Tutor is strictly disabled during active, proctored UTME mock examinations.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800/80">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-purple-600 dark:bg-purple-400/10 dark:text-purple-400">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            Interactive Learning Preview
          </span>
          <h3 className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Experience Step-by-Step Socratic Tutoring
          </h3>
        </div>

        <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("curated")}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === "curated"
                ? "bg-white text-purple-700 shadow-xs dark:bg-slate-800 dark:text-purple-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            📚 Curated Problem Walkthroughs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sandbox")}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === "sandbox"
                ? "bg-white text-purple-700 shadow-xs dark:bg-slate-800 dark:text-purple-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            ⚡ Live Guest Sandbox (2 Free)
          </button>
        </div>
      </div>

      {/* TAB 1: CURATED EXAMPLES */}
      {activeTab === "curated" && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Question Selector List */}
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
              Select Verified Syllabus Question
            </h4>
            {CURATED_EXAMPLES.map((item) => {
              const isSelected = item.id === selectedCuratedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCuratedId(item.id)}
                  className={`text-left p-3.5 rounded-2xl border transition flex flex-col gap-1 ${
                    isSelected
                      ? "border-purple-500 bg-purple-50/50 dark:border-purple-400 dark:bg-purple-950/30 ring-1 ring-purple-500"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                    <span className="text-purple-600 dark:text-purple-400">{item.subject}</span>
                    <span className="text-slate-400">{item.exam}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Socratic Step-by-Step Display */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-[#070e1b]/60 flex flex-col gap-5">
            {/* The Question Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0a1226]">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Official Examination Prompt
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                {selectedCurated.question}
              </p>
            </div>

            {/* Socratic Steps */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Step-by-Step Reasoned Breakdown
              </h5>
              <ol className="space-y-2 text-xs">
                {selectedCurated.socraticSteps.map((step, idx) => (
                  <li
                    key={idx}
                    className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800/80 dark:bg-[#0a1226]/80 flex items-start gap-3"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-black text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                      {idx + 1}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Examiner Trap Warning */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs dark:border-rose-900/50 dark:bg-rose-950/20 flex items-start gap-2.5">
              <span className="text-base" aria-hidden="true">🚨</span>
              <div>
                <span className="font-bold text-rose-900 dark:text-rose-300 block">Typical Candidate Trap:</span>
                <span className="text-rose-800 dark:text-rose-200 text-[11px] leading-relaxed">
                  {selectedCurated.examinerTrap}
                </span>
              </div>
            </div>

            {/* Socratic Check Question */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/20 flex items-start gap-2.5">
              <span className="text-base" aria-hidden="true">💡</span>
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-300 block">Socratic Knowledge Check:</span>
                <span className="text-emerald-800 dark:text-emerald-200 text-[11px] leading-relaxed">
                  {selectedCurated.checkQuestion}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE GUEST SANDBOX */}
      {activeTab === "sandbox" && (
        <div className="mt-6 max-w-2xl mx-auto space-y-5">
          <form onSubmit={handleSandboxSubmit} className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="guest-ai-question" className="font-bold text-slate-700 dark:text-slate-300">
                Ask a specific concept or calculation question:
              </label>
              <span className="font-mono text-slate-400 text-[11px]">
                {guestQuestion.length} / 250 max
              </span>
            </div>

            <textarea
              id="guest-ai-question"
              rows={3}
              maxLength={250}
              value={guestQuestion}
              onChange={(e) => setGuestQuestion(e.target.value)}
              placeholder="e.g. How do I determine the limiting reactant in a chemical reaction?"
              className="w-full rounded-2xl border border-slate-300 bg-white p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 dark:border-slate-700 dark:bg-[#070e1b] dark:text-white"
              aria-label="Ask the AI Tutor a question"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {remainingQueries !== null
                  ? `Guest queries left today: ${remainingQueries}/2`
                  : "Guest demo: 2 queries per day per visitor."}
              </span>

              <button
                type="submit"
                disabled={submitting || !guestQuestion.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black transition shadow-sm"
              >
                {submitting ? "Analyzing Concept..." : "Ask AI Tutor →"}
              </button>
            </div>
          </form>

          {/* Sandbox Feedback Result */}
          {sandboxAnswer && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-slate-800 dark:border-purple-900/60 dark:bg-purple-950/20 dark:text-slate-200 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                AI Tutor Response (Preview Mode):
              </span>
              <p className="whitespace-pre-wrap leading-relaxed font-sans">{sandboxAnswer}</p>
            </div>
          )}

          {sandboxError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
              <span className="font-bold block mb-1">Notice:</span>
              <p>{sandboxError}</p>
              <div className="mt-3">
                <Link
                  href="/login"
                  className="inline-block text-xs font-black text-rose-700 underline dark:text-rose-400"
                >
                  Sign in or register for 10 free daily questions →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default PublicAiTutorDemo;
