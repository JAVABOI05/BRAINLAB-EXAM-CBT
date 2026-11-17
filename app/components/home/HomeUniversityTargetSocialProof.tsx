"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Reveal } from "./Reveal";
import "./home-motion.css";

/**
 * Target institutions. Only identity facts live here (name and location).
 * Cut-off marks, subject combinations and faculty requirements are set each year by JAMB and each
 * institution, so this section sends candidates to the official sources instead of quoting them.
 */
interface UniversityTarget {
  id: string;
  shortName: string;
  fullName: string;
  location: string;
}

const UNIVERSITIES: UniversityTarget[] = [
  { id: "unilag", shortName: "UNILAG", fullName: "University of Lagos", location: "Akoka, Lagos" },
  { id: "ui", shortName: "UI", fullName: "University of Ibadan", location: "Ibadan, Oyo" },
  { id: "oau", shortName: "OAU", fullName: "Obafemi Awolowo University", location: "Ile-Ife, Osun" },
  { id: "unn", shortName: "UNN", fullName: "University of Nigeria, Nsukka", location: "Nsukka, Enugu" },
  { id: "abu", shortName: "ABU", fullName: "Ahmadu Bello University", location: "Zaria, Kaduna" },
  { id: "uniben", shortName: "UNIBEN", fullName: "University of Benin", location: "Benin City, Edo" },
  { id: "unilorin", shortName: "UNILORIN", fullName: "University of Ilorin", location: "Ilorin, Kwara" },
  { id: "futa", shortName: "FUTA", fullName: "Federal University of Technology, Akure", location: "Akure, Ondo" },
  { id: "covenant", shortName: "COVENANT", fullName: "Covenant University", location: "Ota, Ogun" },
];

const ICONS: Record<string, string> = {
  keyboard:
    "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10",
  offline:
    "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  book: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5ZM6 6h10M6 10h10",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const FACTS = [
  { icon: "shield", title: "JAMB-style CBT", desc: "Timed, exam-hall style practice" },
  { icon: "keyboard", title: "8-key controls", desc: "A, B, C, D, P, N, S, R" },
  { icon: "offline", title: "Offline-safe", desc: "Answers sync on reconnect" },
  { icon: "pulse", title: "Instant diagnostics", desc: "Topic-by-topic breakdown" },
];

export function HomeUniversityTargetSocialProof() {
  const [selectedUniId, setSelectedUniId] = useState<string>("unilag");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedUni = UNIVERSITIES.find((u) => u.id === selectedUniId) || UNIVERSITIES[0];

  const steps = [
    {
      icon: "book",
      title: "Check the official requirements",
      desc: `Look up the cut-off mark and subject combination for your course in the JAMB brochure and on the ${selectedUni.shortName} admissions page. They are set each year and differ by course.`,
    },
    {
      icon: "keyboard",
      title: "Practise under exam conditions",
      desc: "Take timed, JAMB-style CBT sessions with 8-key controls, so exam day feels familiar.",
    },
    {
      icon: "pulse",
      title: "Fix what is weak",
      desc: "Use topic-by-topic diagnostics and step-by-step explanations to close gaps before the exam.",
    },
  ];

  const handleTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + UNIVERSITIES.length) % UNIVERSITIES.length;
    setSelectedUniId(UNIVERSITIES[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      id="university-targets"
      aria-label="Practise for your target Nigerian institution"
      className="relative scroll-mt-20 sm:scroll-mt-24 overflow-hidden border-b border-slate-200 bg-[#F8FAFC] py-16 sm:py-24 text-slate-900"
    >
      <div className="bl-home-grid-light pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <span className="bl-home-eyebrow">06 &middot; Your target institution</span>
          <h2 className="bl-home-ink mt-4 text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
            Practise for the <span className="bl-home-mark">university you want</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Pick your target institution and get a simple plan. Cut-off marks and subject combinations are set each year by JAMB and by each institution, so always confirm them for your course.
          </p>
        </div>

        {/* Fact tiles */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:mb-14 sm:grid-cols-4 sm:gap-4">
          {FACTS.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="bl-home-lift flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <span className="bl-home-gradient-orange flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon name={f.icon} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-[#0B1536] sm:text-base">{f.title}</div>
                  <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{f.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Institution selector */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Select your institution</span>
            <span className="lg:hidden" aria-hidden="true">Swipe &rarr;</span>
          </div>
          <div
            role="tablist"
            aria-label="Target institution"
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {UNIVERSITIES.map((uni, index) => {
              const isSelected = uni.id === selectedUniId;
              return (
                <button
                  key={uni.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  id={`uni-tab-${uni.id}`}
                  aria-selected={isSelected}
                  aria-controls="uni-panel"
                  tabIndex={isSelected ? 0 : -1}
                  type="button"
                  onClick={() => setSelectedUniId(uni.id)}
                  onKeyDown={(e) => handleTabKey(e, index)}
                  className={`bl-home-lift bl-focus-ring flex shrink-0 snap-start cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                    isSelected
                      ? "border-[#0B1536] bg-[#0B1536] text-white shadow-[0_18px_32px_-18px_rgba(11,21,54,0.55)]"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black tracking-wide ${
                      isSelected ? "bl-home-gradient-orange" : "bg-slate-100 text-[#0B1536]"
                    }`}
                    aria-hidden="true"
                  >
                    {uni.shortName.slice(0, 3)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black tracking-wide">{uni.shortName}</span>
                    <span className={`block max-w-[11rem] truncate text-xs font-medium ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                      {uni.fullName}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel: identity on navy, plan on white */}
        <div
          key={selectedUni.id}
          id="uni-panel"
          role="tabpanel"
          aria-labelledby={`uni-tab-${selectedUni.id}`}
          className="bl-home-enter grid grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(11,21,54,0.04),0_32px_56px_-32px_rgba(11,21,54,0.28)] lg:grid-cols-12"
        >
          <div className="relative flex flex-col justify-between gap-8 overflow-hidden bg-[#0B1536] p-6 text-white sm:p-10 lg:col-span-5">
            <div className="bl-home-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <span
              className="pointer-events-none absolute -bottom-6 -right-2 select-none text-[5.5rem] font-black leading-none text-white/[0.06] sm:text-[8rem]"
              aria-hidden="true"
            >
              {selectedUni.shortName}
            </span>

            <div className="relative space-y-4">
              <span className="bl-home-eyebrow bl-home-eyebrow-dark">Target institution</span>
              <h3 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                {selectedUni.fullName}
              </h3>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <span className="bl-home-accent-orange">
                  <Icon name="pin" className="h-4 w-4" />
                </span>
                {selectedUni.location}
              </p>
            </div>

            <p className="relative rounded-xl border border-white/10 border-l-4 border-l-[var(--bl-color-brand-orange)] bg-white/5 p-4 text-sm leading-relaxed text-slate-200">
              Cut-off marks and subject combinations change every year and differ by course. Always confirm them with JAMB and {selectedUni.shortName} before you plan.
            </p>
          </div>

          <div className="p-6 sm:p-10 lg:col-span-7 lg:p-12">
            <ol className="relative space-y-8">
              <span className="absolute bottom-6 left-5 top-6 w-px bg-slate-200" aria-hidden="true" />
              {steps.map((step, index) => (
                <li key={step.title} className="relative flex items-start gap-5">
                  <span className="bl-home-gradient-orange relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black">
                    {index + 1}
                  </span>
                  <div className="min-w-0 pt-1">
                    <h4 className="text-base font-extrabold text-[#0B1536] sm:text-lg">{step.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 sm:text-base">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/cbt?target=${selectedUni.id}`}
                className="bl-home-cta-orange bl-focus-ring group inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full px-8 py-3.5 text-base font-black shadow-lg shadow-black/10 active:scale-95 sm:w-auto"
              >
                <span>Practise for {selectedUni.shortName}</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
              </Link>
              <span className="text-sm text-slate-500">JAMB-style timed CBT with 8-key controls</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
