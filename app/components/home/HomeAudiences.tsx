"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";
import { Reveal } from "./Reveal";
import "./home-motion.css";

/** Compact single-path icon set (24x24, stroke). */
const ICONS: Record<string, string> = {
  target:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  book: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5ZM6 6h10M6 10h10",
  school: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM9 22V12h6v10",
  keyboard:
    "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10",
  bank: "M4 21V10M20 21V10M12 21V10M2 10h20M12 3l10 7H2ZM2 21h20",
  offline:
    "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  star: "M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1Z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  check: "M20 6 9 17l-5-5",
};

/** Audience ids from the content config mapped to icons. */
const AUDIENCE_ICON: Record<string, string> = {
  students: "target",
  secondary: "book",
  parents: "user",
  schools: "school",
  tutors: "users",
  stem: "pulse",
  independent: "star",
};

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

type TrackId = "utme" | "olevel" | "post_utme";

interface CandidateTrack {
  id: TrackId;
  tag: string;
  short: string;
  badge: string;
  headline: string;
  body: string;
  cta: { label: string; href: string };
  icon: string;
  features: { icon: string; title: string; desc: string }[];
}

const CANDIDATE_TRACKS: CandidateTrack[] = [
  {
    id: "utme",
    tag: "UTME Candidates",
    short: "UTME",
    badge: "JAMB 2027 Blueprint Standard",
    headline: "Target 300+ with Official 4-Subject Combinations & 8-Key Speed Parity",
    body: "Simulate the authentic JAMB CBT terminal experience. Master 180 questions across your chosen 4-subject combination with 120-minute countdowns, official A, B, C, D, P, N, S, R keyboard controls, negative marking analysis, and Tier-1 university cut-off benchmarking.",
    cta: { label: "Launch UTME Exam Simulator", href: "/cbt" },
    icon: "target",
    features: [
      {
        icon: "keyboard",
        title: "Authentic 8-Key Exam Parity",
        desc: "Practice with the exact A, B, C, D, P, N, S, R keyboard controls used in the official CBT center without mouse dependency.",
      },
      {
        icon: "bank",
        title: "Tier-1 University Target Radar",
        desc: "Benchmark scores against official merit cut-offs for UNILAG, UI, OAU, UNN, and ABU.",
      },
      {
        icon: "offline",
        title: "Zero-Data Offline Exam Mode",
        desc: "Download full 4-subject exam packages to your device; practise anywhere without network lag.",
      },
    ],
  },
  {
    id: "olevel",
    tag: "O Level Candidates",
    short: "O Level",
    badge: "WAEC SSCE & NECO Standard",
    headline: "Master Senior Secondary Theory Derivations & Objective Papers",
    body: "Comprehensive syllabus coverage for SS1–SS3 candidates across Science, Commercial, and Arts streams. Practice with verified 2015–2026 past questions, step-by-step mathematical working, and WAEC Chief Examiner standards to secure distinctions.",
    cta: { label: "Explore O Level Curriculum Hub", href: "/learn" },
    icon: "book",
    features: [
      {
        icon: "book",
        title: "Science, Arts & Commercial Streams",
        desc: "Complete NERDC curriculum syllabi with structured lessons, definitions, formula sheets, and solved exercises.",
      },
      {
        icon: "doc",
        title: "Master Step-by-Step Derivations",
        desc: "Detailed working for WAEC & NECO theory and objective papers across Mathematics, Sciences, and Humanities.",
      },
      {
        icon: "pulse",
        title: "Topic-by-Topic Mastery Diagnostic",
        desc: "Pinpoint exact syllabus gaps before senior secondary certificate exams with continuous diagnostic tracking.",
      },
    ],
  },
  {
    id: "post_utme",
    tag: "Post-UTME Candidates",
    short: "Post-UTME",
    badge: "University Screening Accelerator",
    headline: "Crush University Screening CBTs with Institutional Time Formats",
    body: "University screening formats differ drastically from UTME. Train under institution-specific constraints for UNILAG (30-min 40-question sprints), UI, OAU, UNIBEN, UNN, and ABU with our composite aggregate admission calculator.",
    cta: { label: "Start Post-UTME Screening Drills", href: "/programmes/post-utme" },
    icon: "school",
    features: [
      {
        icon: "bank",
        title: "Institution-Specific Timed Formats",
        desc: "Tailored 30–45 minute speed papers reflecting UNILAG 30-min 40-question sprints, UI general paper, and OAU faculty screenings.",
      },
      {
        icon: "pulse",
        title: "Composite Admission Merit Calculator",
        desc: "Dynamically calculate weighted aggregate scores across 50% UTME, 30% Post-UTME, and 20% O-Level points.",
      },
      {
        icon: "star",
        title: "High-Pressure Speed & Accuracy Drills",
        desc: "High-yield drills focused on rapid numerical reasoning, verbal logic, and faculty core subjects under time pressure.",
      },
    ],
  },
];

const STREAM_ITEMS: Record<"science" | "arts" | "commercial", string[]> = {
  science: ["General Mathematics", "English Lexis & Structure", "Physics & Chemistry Theory"],
  commercial: ["General Mathematics", "English Lexis & Structure", "Financial Accounting & Commerce"],
  arts: ["General Mathematics", "English Lexis & Structure", "Literature & Government"],
};

/** Slider row used by the aggregate calculator. */
function RangeRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs font-bold text-slate-200">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-white">
          {value}
          <span className="text-slate-400"> {suffix}</span>
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer rounded-lg bg-white/15 accent-[var(--bl-color-brand-orange)]"
      />
    </label>
  );
}

export function HomeAudiences() {
  const [activeTrackId, setActiveTrackId] = useState<TrackId>("utme");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [utmeScore, setUtmeScore] = useState<number>(290);
  const [stream, setStream] = useState<"science" | "arts" | "commercial">("science");
  const [screening, setScreening] = useState<number>(24);
  const [olevelPts, setOlevelPts] = useState<number>(16);

  const activeTrack = CANDIDATE_TRACKS.find((t) => t.id === activeTrackId) || CANDIDATE_TRACKS[0];

  // Plain arithmetic only: each UTME subject is scored out of 100, so a 400 total is four subjects.
  const perSubject = Number((utmeScore / 4).toFixed(1));
  const utmePct = utmeScore / 400;

  // Example 50 / 30 / 20 weighting. Universities set their own formula.
  const utmePoints = Number(((utmeScore / 400) * 50).toFixed(2));
  const aggregate = Number((utmePoints + screening + olevelPts).toFixed(2));

  const handleTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + CANDIDATE_TRACKS.length) % CANDIDATE_TRACKS.length;
    setActiveTrackId(CANDIDATE_TRACKS[next].id);
    tabRefs.current[next]?.focus();
  };

  const presetBtn = (active: boolean) =>
    `rounded-xl px-2 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer min-h-[44px] bl-focus-ring ${
      active
        ? "bl-home-gradient-orange font-black"
        : "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
    }`;

  return (
    <section
      id="audiences"
      aria-label="Tailored Experiences for Every Learner"
      className="scroll-mt-20 sm:scroll-mt-24 relative w-full overflow-hidden py-16 sm:py-24 border-b border-slate-200/80 bg-[#F8FAFC] text-slate-900"
    >
      <div className="bl-home-grid-light pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
          <span className="bl-home-eyebrow">02 &middot; Candidate pathways</span>
          <h2 className="bl-home-ink mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1]">
            Engineered specifically for <span className="bl-home-mark">how you learn</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Pick your candidate category to see the tools built for it.
          </p>
        </div>

        {/* Pathway selector */}
        <div role="tablist" aria-label="Academic Candidate Pathways" className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          {CANDIDATE_TRACKS.map((track, index) => {
            const isActive = track.id === activeTrackId;
            return (
              <button
                key={track.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                id={`tab-${track.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${track.id}`}
                tabIndex={isActive ? 0 : -1}
                type="button"
                onClick={() => setActiveTrackId(track.id)}
                onKeyDown={(e) => handleTabKey(e, index)}
                className={`bl-home-lift bl-focus-ring group relative flex flex-col sm:flex-row items-center gap-2 sm:gap-4 overflow-hidden rounded-2xl border px-2 py-3 sm:px-5 sm:py-4 text-center sm:text-left cursor-pointer ${
                  isActive
                    ? "border-[#0B1536] bg-[#0B1536] text-white shadow-[0_18px_32px_-18px_rgba(11,21,54,0.55)]"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:shadow-md"
                }`}
              >
                <span
                  className={`flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${
                    isActive ? "bl-home-gradient-orange" : "bg-slate-100 text-[#0B1536]"
                  }`}
                  aria-hidden="true"
                >
                  <Icon name={track.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs sm:text-base font-black tracking-tight">
                    <span className="sm:hidden">{track.short}</span>
                    <span className="hidden sm:inline">{track.tag}</span>
                  </span>
                  <span className={`hidden sm:block text-xs font-medium mt-0.5 ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                    {track.badge}
                  </span>
                </span>
                {isActive && (
                  <span className="bl-home-gradient-orange absolute inset-x-0 bottom-0 h-1" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Pathway canvas: editorial copy on the left, interactive navy panel on the right */}
        <div
          key={activeTrack.id}
          role="tabpanel"
          id={`panel-${activeTrack.id}`}
          aria-labelledby={`tab-${activeTrack.id}`}
          className="bl-home-enter grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(11,21,54,0.04),0_32px_56px_-32px_rgba(11,21,54,0.28)]"
        >
          {/* Left: editorial */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 space-y-6">
            <span className="bl-home-chip-light inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black">
              <Icon name={activeTrack.icon} className="h-3.5 w-3.5" />
              {activeTrack.badge}
            </span>

            <h3 className="bl-home-ink text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-[1.15]">
              {activeTrack.headline}
            </h3>

            <p className="text-base text-slate-600 leading-relaxed">{activeTrack.body}</p>

            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {activeTrack.features.map((feat, idx) => (
                <li key={feat.title} className="flex items-start gap-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0B1536]">
                    <Icon name={feat.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#0B1536]">
                      <span className="font-mono text-xs bl-home-eyebrow !tracking-normal !gap-0 before:hidden">0{idx + 1}</span>
                      {feat.title}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                href={activeTrack.cta.href}
                className="bl-home-cta-orange bl-focus-ring inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-base font-black shadow-lg shadow-black/10 active:scale-95 min-h-[52px] group"
              >
                <span>{activeTrack.cta.label}</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
              </Link>
              <span className="text-sm text-slate-500">Instant candidate access</span>
            </div>
          </div>

          {/* Right: interactive navy panel */}
          <div className="lg:col-span-5 relative bg-[#0B1536] p-6 sm:p-10 text-white">
            <div className="bl-home-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

            <div className="relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-200">
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: "var(--bl-color-brand-orange)" }} />
                  Interactive example
                </span>
                <span className="bl-home-tint-orange rounded-full px-2.5 py-0.5 text-xs font-bold">Illustrative</span>
              </div>

              {/* UTME: target score and the arithmetic behind it */}
              {activeTrack.id === "utme" && (
                <div className="space-y-6">
                  <div>
                    <div className="text-xs font-bold text-slate-200 mb-2">Choose a target UTME score</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[260, 290, 320].map((score) => (
                        <button key={score} type="button" onClick={() => setUtmeScore(score)} aria-pressed={utmeScore === score} className={presetBtn(utmeScore === score)}>
                          {score}+
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black tracking-tight tabular-nums">{utmeScore}</span>
                      <span className="text-lg font-bold text-slate-300">/ 400</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-200">
                      That is an average of <strong className="text-white">{perSubject}</strong> per subject. Each of your four subjects is scored out of 100.
                    </p>

                    <div
                      role="img"
                      aria-label={`${utmeScore} out of 400`}
                      className="mt-5 h-3 w-full overflow-hidden rounded-full bg-white/10"
                    >
                      <div
                        className="bl-home-gradient-orange h-full w-full origin-left rounded-full transition-transform duration-500 ease-out"
                        style={{ transform: `scaleX(${utmePct})` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs font-mono text-slate-300" aria-hidden="true">
                      <span>0</span>
                      <span>100</span>
                      <span>200</span>
                      <span>300</span>
                      <span>400</span>
                    </div>
                  </div>
                </div>
              )}

              {/* O Level: stream selector */}
              {activeTrack.id === "olevel" && (
                <div className="space-y-6">
                  <div>
                    <div className="text-xs font-bold text-slate-200 mb-2">Choose your academic stream</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["science", "arts", "commercial"] as const).map((s) => (
                        <button key={s} type="button" onClick={() => setStream(s)} aria-pressed={stream === s} className={`${presetBtn(stream === s)} capitalize`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ul key={stream} className="space-y-2.5">
                    {STREAM_ITEMS[stream].map((item, i) => (
                      <li
                        key={item}
                        className="bl-home-enter flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold"
                        style={{ animationDelay: `${i * 70}ms` }}
                      >
                        <span className="bl-home-gradient-orange flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                          <Icon name="check" className="h-3.5 w-3.5" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Post-UTME: aggregate calculator */}
              {activeTrack.id === "post_utme" && (
                <div className="space-y-5">
                  <RangeRow label="UTME score" value={utmeScore} min={200} max={400} step={5} suffix="/ 400" onChange={setUtmeScore} />
                  <RangeRow label="Screening score" value={screening} min={0} max={30} step={1} suffix="/ 30" onChange={setScreening} />
                  <RangeRow label="O Level points" value={olevelPts} min={0} max={20} step={1} suffix="/ 20" onChange={setOlevelPts} />

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Example aggregate</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tight tabular-nums">{aggregate}</span>
                      <span className="text-lg font-bold text-slate-300">/ 100</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg border border-white/10 bg-white/5 py-2">
                        <span className="block text-slate-300">UTME 50%</span>
                        <span className="font-bold tabular-nums">{utmePoints}</span>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 py-2">
                        <span className="block text-slate-300">Screening 30%</span>
                        <span className="font-bold tabular-nums">{screening}</span>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 py-2">
                        <span className="block text-slate-300">O Level 20%</span>
                        <span className="font-bold tabular-nums">{olevelPts}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-6 text-xs leading-relaxed text-slate-300">
                {activeTrack.id === "post_utme"
                  ? "Example 50/30/20 weighting only. Each university sets its own formula."
                  : "Illustrative example. It does not predict exam or admission outcomes."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick access dock (keeps the audience links from the content config) */}
        <div className="mt-12 sm:mt-16">
          <span className="bl-home-eyebrow">Also built for</span>
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {HOMEPAGE_CONTENT_CONFIG.audiences.map((aud, i) => (
              <Reveal key={aud.id} delay={i * 80}>
                <Link
                  href={aud.cta.href}
                  className="bl-home-lift bl-focus-ring group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-slate-300 hover:shadow-md min-h-[132px]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#0B1536] transition-colors group-hover:bg-[var(--bl-color-brand-orange)] group-hover:text-white">
                    <Icon name={AUDIENCE_ICON[aud.id] ?? "user"} className="h-5 w-5" />
                  </span>
                  <span className="mt-4 block">
                    <span className="block text-sm sm:text-base font-extrabold text-[#0B1536]">{aud.label}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-[var(--bl-color-brand-orange-ink)]">
                      Explore pathway
                      <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
