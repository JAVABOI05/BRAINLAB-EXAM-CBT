"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";
import "./home-motion.css";
import "./home-loop.css";

/** Compact single-path icon set (24x24, stroke). */
const STAGE_ICONS: Record<string, string> = {
  learn: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5ZM6 6h10M6 10h10",
  practise:
    "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10",
  diagnose: "M22 12h-4l-3 9L9 3l-3 9H2",
  improve: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  master: "M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1Z",
  check: "M20 6 9 17l-5-5",
  bolt: "M13 2 3 14h9l-1 8 10-12h-9z",
  swords: "M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2",
  gauge: "M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0",
  ladder: "M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8",
};

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const d = STAGE_ICONS[name];
  if (!d) return null;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const STAGE_ROUTE_MAP: Record<string, { href: string; label: string; previewBadge: string }> = {
  learn: { href: "/learn", label: "Explore Curriculum Lessons", previewBadge: "Interactive Theory & Formulas" },
  practise: { href: "/cbt", label: "Launch Timed CBT Simulator", previewBadge: "Timed Exam Practice" },
  diagnose: { href: "/learning-dna", label: "Inspect Weak Subtopics", previewBadge: "Diagnostic Radar" },
  improve: { href: "/ai-learning", label: "Launch Socratic AI Drills", previewBadge: "Step-by-Step Guidance" },
  master: { href: "/challenge-arena", label: "Join 1v1 National Arena", previewBadge: "Live Synchronous Duels" },
};

const PRACTISE_OPTIONS = [
  { k: "A", val: "pH = 1.0" },
  { k: "B", val: "pH = 3.0" },
  { k: "C", val: "pH = 7.0" },
  { k: "D", val: "pH = 11.0" },
];

const WAVE = [40, 75, 55, 90, 60, 30, 80, 100, 45, 70, 85, 40];

export function HomeBrainLabLoop(): React.JSX.Element {
  const loopStages = HOMEPAGE_CONTENT_CONFIG.loopStages;
  const [activeStageId, setActiveStageId] = useState<string>("learn");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [learnMode, setLearnMode] = useState<"formula" | "derivation">("formula");
  const [practiseOption, setPractiseOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);

  const activeIndex = Math.max(
    0,
    loopStages.findIndex((s) => s.id === activeStageId)
  );
  const activeStage = loopStages[activeIndex] || loopStages[0];
  const activeRoute = STAGE_ROUTE_MAP[activeStage.id] || STAGE_ROUTE_MAP.learn;
  const progress = loopStages.length > 1 ? activeIndex / (loopStages.length - 1) : 0;

  const handleTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + loopStages.length) % loopStages.length;
    setActiveStageId(loopStages[next].id);
    tabRefs.current[next]?.focus();
  };

  const toggleBtn = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
      active ? "bl-home-gradient-orange font-black" : "text-slate-200 hover:text-white"
    }`;

  return (
    <section
      id="the-loop"
      data-slot="THE BRAINLAB LOOP (SLOTS S3-01 & S3-02)"
      aria-label="How BrainLab Works - The 5-Step Learning Method"
      className="scroll-mt-20 sm:scroll-mt-24 relative w-full overflow-hidden py-16 sm:py-24 border-b border-white/10 bg-[#060D20] text-white"
    >
      <div className="bl-home-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <span className="bl-home-eyebrow bl-home-eyebrow-dark">03 &middot; The BrainLab Loop</span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] text-white">
            From fundamental concept to <span className="bl-home-mark">complete exam mastery</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            A simple 5-step learning system: understand each topic, practise with confidence, find what is weak, fix it, and repeat.
          </p>
        </div>

        {/* Connected stepper with an orange progress line */}
        <div role="tablist" aria-label="Loop Stages" className="relative mb-10 sm:mb-14">
          <div className="absolute left-[10%] right-[10%] top-6 sm:top-7 h-0.5 bg-white/15" aria-hidden="true" />
          <div className="absolute left-[10%] right-[10%] top-6 sm:top-7 h-0.5 overflow-hidden" aria-hidden="true">
            <div
              className="bl-home-gradient-orange h-full w-full origin-left transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>

          <div className="relative grid grid-cols-5 gap-1 sm:gap-3">
            {loopStages.map((stage, index) => {
              const isActive = stage.id === activeStageId;
              const isDone = index < activeIndex;
              return (
                <button
                  key={stage.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  id={`tab-${stage.id}`}
                  aria-controls={`panel-${stage.id}`}
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  type="button"
                  onClick={() => setActiveStageId(stage.id)}
                  onKeyDown={(e) => handleTabKey(e, index)}
                  className="group flex flex-col items-center gap-2.5 rounded-2xl px-1 py-1 text-center cursor-pointer bl-focus-ring"
                >
                  <span
                    className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isActive
                        ? "bl-home-gradient-orange border-transparent bl-loop-node-active"
                        : isDone
                        ? "bl-home-gradient-orange border-transparent"
                        : "border-white/20 bg-[#0B1426] text-slate-200 group-hover:border-white/40"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon name={stage.id} className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-xs sm:text-base font-extrabold tracking-tight ${isActive ? "text-white" : "text-slate-300"}`}>
                      {stage.title}
                    </span>
                    <span className="hidden sm:block text-xs font-medium text-slate-400 mt-0.5">{stage.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex justify-center">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-300">
              <svg className="h-4 w-4 bl-home-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
              </svg>
              Then the loop repeats with every topic
            </span>
          </div>
        </div>

        {/* Stage canvas */}
        <div
          key={activeStage.id}
          id={`panel-${activeStage.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeStage.id}`}
          className="bl-home-enter relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B1426] p-5 sm:p-8 lg:p-10 shadow-[0_32px_64px_-32px_rgba(0,0,0,0.9)]"
        >
          <span
            className="pointer-events-none absolute -top-6 right-5 select-none text-[9rem] sm:text-[12rem] font-black leading-none text-white/[0.035]"
            aria-hidden="true"
          >
            {activeStage.number}
          </span>

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left: narrative */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="bl-home-gradient-orange flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black">
                  {activeStage.number}
                </span>
                <span className="bl-home-eyebrow bl-home-eyebrow-dark">Step {activeStage.number} of 5</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-[1.15] text-white">
                {activeStage.title}: {activeStage.subtitle}
              </h3>

              <p className="text-base text-slate-300 leading-relaxed">{activeStage.description}</p>

              <div className="space-y-2.5">
                <span className="block text-xs font-black uppercase tracking-wider text-slate-300">Platform tools at this step</span>
                <div className="flex flex-wrap gap-2">
                  {activeStage.products.map((prod) => (
                    <span
                      key={prod}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-100"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--bl-color-brand-orange)" }} />
                      {prod}
                    </span>
                  ))}
                </div>
              </div>

              {activeStage.stemRole && (
                <div className="rounded-xl border border-white/10 border-l-4 border-l-[var(--bl-color-brand-orange)] bg-white/5 p-4">
                  <span className="bl-home-eyebrow bl-home-eyebrow-dark !text-[0.7rem]">Interactive science &amp; STEM lab</span>
                  <p className="mt-2 text-sm text-slate-200 leading-relaxed">{activeStage.stemRole}</p>
                </div>
              )}

              <Link
                href={activeRoute.href}
                className="bl-home-cta-orange bl-focus-ring group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-base font-black shadow-lg shadow-black/30 active:scale-95 min-h-[52px]"
              >
                <span>{activeRoute.label}</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            {/* Right: sample preview */}
            <div className="lg:col-span-6">
              <div
                className="flex min-h-[430px] flex-col rounded-2xl border border-white/10 bg-[#060D20] p-5 sm:p-6"
                role="region"
                aria-label={`Preview of ${activeStage.title} Stage Output`}
                data-slot="Diagnostic Cognitive Radar (Slot S3-02)"
              >
                <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="bl-home-accent-orange">
                      <Icon name={activeStage.id} className="h-5 w-5" />
                    </span>
                    <span className="truncate text-sm font-extrabold text-white">{activeRoute.previewBadge}</span>
                  </div>
                  <span className="bl-home-tint-orange shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold">Sample preview</span>
                </div>

                {/* LEARN */}
                {activeStage.id === "learn" && (
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-200">Formula view</span>
                      <div className="flex rounded-lg border border-white/15 bg-white/5 p-0.5" role="group" aria-label="Formula view">
                        <button type="button" aria-pressed={learnMode === "formula"} onClick={() => setLearnMode("formula")} className={toggleBtn(learnMode === "formula")}>
                          Equation
                        </button>
                        <button type="button" aria-pressed={learnMode === "derivation"} onClick={() => setLearnMode("derivation")} className={toggleBtn(learnMode === "derivation")}>
                          Derivation
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                        <span>Physics &bull; Motion &amp; Kinematics</span>
                      </div>
                      <div key={learnMode} className="bl-home-enter mt-3 rounded-lg border border-white/10 bg-[#0B1426] py-5 text-center font-mono text-2xl sm:text-3xl font-black text-white">
                        {learnMode === "formula" ? "v² = u² + 2as" : "s = ut + ½at²"}
                      </div>
                      <p className="mt-3 min-h-[60px] text-sm text-slate-300 leading-relaxed text-center">
                        {learnMode === "formula"
                          ? "Relates final velocity to initial velocity, acceleration and displacement, without needing the time variable (t)."
                          : "Gives the displacement covered under uniform acceleration over a period of time (t)."}
                      </p>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                      <div className="flex items-center gap-3">
                        <span className="bl-home-gradient-orange flex h-8 w-8 items-center justify-center rounded-lg" aria-hidden="true">
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <polygon points="6 3 20 12 6 21 6 3" />
                          </svg>
                        </span>
                        <span className="text-sm font-bold text-white">Audio walkthrough</span>
                      </div>
                      <div className="flex h-6 items-end gap-0.5" aria-hidden="true">
                        {WAVE.map((h, i) => (
                          <span
                            key={i}
                            className="bl-loop-bar w-1 rounded-full"
                            style={{ height: `${h}%`, animationDelay: `${i * 90}ms`, background: "var(--bl-color-brand-orange)" }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PRACTISE */}
                {activeStage.id === "practise" && (
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs">
                      <span className="font-mono font-semibold text-slate-200">Timed practice</span>
                      <span className="font-bold text-slate-200">Sample question</span>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                      <div className="text-xs font-bold text-slate-300">Chemistry &bull; Acids &amp; Bases</div>
                      <p className="text-sm font-semibold text-white leading-relaxed">
                        What is the pH of a 0.001 M solution of hydrochloric acid (HCl)?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {PRACTISE_OPTIONS.map((opt) => {
                          const chosen = practiseOption === opt.k;
                          const correct = opt.k === "B";
                          return (
                            <button
                              key={opt.k}
                              type="button"
                              onClick={() => setPractiseOption(opt.k)}
                              aria-pressed={chosen}
                              className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left text-sm transition-all cursor-pointer ${
                                chosen
                                  ? correct
                                    ? "border-emerald-400 bg-emerald-500/15 font-bold text-emerald-100"
                                    : "border-red-400 bg-red-500/15 font-bold text-red-100"
                                  : "border-white/15 bg-white/5 text-slate-100 hover:border-white/35"
                              }`}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 font-mono text-xs font-black">
                                {opt.k}
                              </span>
                              {opt.val}
                            </button>
                          );
                        })}
                      </div>

                      <div className="min-h-[44px] text-sm leading-relaxed" aria-live="polite">
                        {practiseOption === null && <span className="text-slate-300">Pick an option to see how feedback works.</span>}
                        {practiseOption === "B" && (
                          <span className="text-emerald-200">Correct. pH = &minus;log&#8321;&#8320;(0.001) = 3.</span>
                        )}
                        {practiseOption !== null && practiseOption !== "B" && (
                          <span className="text-red-200">Not quite. Remember pH = &minus;log&#8321;&#8320;[H&#8314;]. Try again.</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto" aria-hidden="true">
                      <span className="mb-1.5 block text-xs font-mono font-bold uppercase text-slate-300">8-key practice controls</span>
                      <div className="grid grid-cols-8 gap-1.5 text-center font-mono text-xs font-black">
                        {["A", "B", "C", "D", "P", "N", "S", "R"].map((key) => (
                          <span
                            key={key}
                            className={`flex h-8 items-center justify-center rounded-lg border-2 ${
                              practiseOption === key ? "bl-home-gradient-orange border-transparent" : "border-white/15 bg-white/5 text-slate-200"
                            }`}
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* DIAGNOSE */}
                {activeStage.id === "diagnose" && (
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-200">Strengths and weak areas by subject</span>
                    </div>

                    <div className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3">
                      <svg viewBox="0 0 280 210" className="h-auto w-full max-w-[340px]" role="img" aria-label="Sample five-subject radar chart with one weak area highlighted">
                        <g fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="1">
                          <polygon points="140,27 214.2,80.9 185.8,168.1 94.2,168.1 65.8,80.9" />
                          <polygon points="140,51 191.4,88.3 171.7,148.7 108.3,148.7 88.6,88.3" />
                          <polygon points="140,75 168.5,95.7 157.6,129.3 122.4,129.3 111.5,95.7" />
                          <path d="M140 105 140 27M140 105 214.2 80.9M140 105 185.8 168.1M140 105 94.2 168.1M140 105 65.8 80.9" />
                        </g>

                        <g className="bl-loop-grow">
                          <polygon
                            points="140,36.4 200.9,85.2 181.3,161.8 120.7,131.5 82.2,86.2"
                            style={{ fill: "color-mix(in srgb, #60a5fa 24%, transparent)", stroke: "#60a5fa" }}
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                          <circle cx="140" cy="36.4" r="3.5" fill="#60a5fa" />
                          <circle cx="200.9" cy="85.2" r="3.5" fill="#60a5fa" />
                          <circle cx="181.3" cy="161.8" r="3.5" fill="#60a5fa" />
                          <circle cx="82.2" cy="86.2" r="3.5" fill="#60a5fa" />
                          <circle cx="120.7" cy="131.5" r="9" style={{ fill: "color-mix(in srgb, var(--bl-color-brand-orange) 30%, transparent)" }} />
                          <circle cx="120.7" cy="131.5" r="4.5" style={{ fill: "var(--bl-color-brand-orange)" }} />
                        </g>

                        <g fill="#e2e8f0" fontSize="12" fontWeight="700">
                          <text x="140" y="17" textAnchor="middle">Math</text>
                          <text x="224" y="84">Physics</text>
                          <text x="190" y="190" textAnchor="middle">English</text>
                          <text x="90" y="190" textAnchor="middle" style={{ fill: "var(--bl-color-brand-orange-light)" }}>Chemistry</text>
                          <text x="56" y="84" textAnchor="end">Biology</text>
                        </g>
                      </svg>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 border-l-4 border-l-[var(--bl-color-brand-orange)] bg-white/5 p-3.5">
                      <div className="min-w-0">
                        <span className="block text-xs font-bold uppercase tracking-wider bl-home-accent-orange">Weak area flagged</span>
                        <span className="block text-sm font-semibold text-white">Organic Chemistry (Alkanols &amp; Esters)</span>
                      </div>
                      <span className="bl-home-gradient-orange shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-black">Targeted drills</span>
                    </div>
                  </div>
                )}

                {/* IMPROVE */}
                {activeStage.id === "improve" && (
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-200">Socratic guidance</span>
                      <span className="text-xs font-bold text-slate-300">Guides, does not give the answer away</span>
                    </div>

                    <div className="flex flex-1 flex-col justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-xs font-bold text-slate-100">You</span>
                          <p className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-slate-100">
                            &ldquo;Why is option B incorrect in the esterification question?&rdquo;
                          </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="bl-home-gradient-orange flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-black">AI</span>
                          <p className="rounded-lg border border-white/10 bg-white/10 p-2.5 text-sm leading-relaxed text-white">
                            Look at the sulfuric acid carefully. Is concentrated H&#8322;SO&#8324; acting as an oxidising agent or as a dehydrating catalyst at this temperature?
                          </p>
                        </div>
                      </div>

                      <div className="min-h-[64px]" aria-live="polite">
                        {showHint ? (
                          <div className="bl-home-enter flex items-start gap-2 rounded-lg border border-white/10 border-l-4 border-l-[var(--bl-color-brand-orange)] bg-[#0B1426] p-3 text-sm text-slate-100">
                            <span className="bl-home-tint-orange shrink-0 rounded px-1.5 py-0.5 text-xs font-black uppercase">Hint</span>
                            <span>At 170&deg;C, concentrated sulfuric acid removes water completely to give an alkene (ethene), not an ester.</span>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-white/20 p-3 text-center text-sm italic text-slate-300">
                            Tap below to reveal the first Socratic hint.
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      aria-pressed={showHint}
                      className="bl-home-cta-orange bl-focus-ring flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-sm font-black cursor-pointer active:scale-95"
                    >
                      {showHint ? "Hide hint" : "Reveal Socratic hint"}
                    </button>
                  </div>
                )}

                {/* MASTER */}
                {activeStage.id === "master" && (
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex flex-1 flex-col items-center justify-center gap-5 rounded-xl border border-white/10 bg-white/5 p-5">
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/25 bg-[#0B1426] font-black text-white">You</span>
                          <span className="text-xs font-bold text-slate-200">Your side</span>
                        </div>
                        <span className="bl-loop-vs bl-home-gradient-orange flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black">VS</span>
                        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/25 bg-[#0B1426] font-black text-white">?</span>
                          <span className="text-xs font-bold text-slate-200">Live opponent</span>
                        </div>
                      </div>

                      <ul className="w-full space-y-2.5">
                        {[
                          { icon: "swords", text: "Live synchronous 1v1 duels" },
                          { icon: "gauge", text: "Speed and accuracy both count" },
                          { icon: "ladder", text: "Climb the ranked ladder" },
                        ].map((row) => (
                          <li key={row.text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B1426] px-4 py-3 text-sm font-semibold text-white">
                            <span className="bl-home-accent-orange">
                              <Icon name={row.icon} className="h-5 w-5" />
                            </span>
                            {row.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
