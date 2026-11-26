"use client";

import React, { useState } from "react";
import Link from "next/link";

/**
 * Clean Vector SVG Icons (Zero external dependency bloat)
 */
function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StarIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function AwardIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RotateCcwIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CompassIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ZapIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function AtomIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(90 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(150 12 12)" />
    </svg>
  );
}

function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function GraduationCapIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

// 1. Perspective Fan Cards Dataset
const FAN_CARDS = [
  {
    id: "geom",
    subject: "Mathematics",
    title: "Coordinate Geometry",
    badge: "Linear Graphs",
    icon: CompassIcon,
    accent: "from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-700",
    pill: "bg-blue-50 text-blue-700",
  },
  {
    id: "circ",
    subject: "Physics",
    title: "Ohm's Circuit Lab",
    badge: "Live Switch",
    icon: ZapIcon,
    accent: "from-amber-500/10 to-orange-500/10 border-amber-200 text-amber-700",
    pill: "bg-amber-50 text-amber-700",
  },
  {
    id: "mol",
    subject: "Biology & Chemistry",
    title: "Glucose Molecule (C₆H₁₂O₆)",
    badge: "3D Molecular",
    icon: AtomIcon,
    accent: "from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-700",
    pill: "bg-emerald-50 text-emerald-700",
  },
  {
    id: "chem",
    subject: "Chemistry",
    title: "Reaction Stoichiometry",
    badge: "Balanced Equ.",
    icon: LayersIcon,
    accent: "from-purple-500/10 to-fuchsia-500/10 border-purple-200 text-purple-700",
    pill: "bg-purple-50 text-purple-700",
  },
  {
    id: "cbt",
    subject: "JAMB UTME",
    title: "English Concord Simulation",
    badge: "Real Exam",
    icon: GraduationCapIcon,
    accent: "from-rose-500/10 to-pink-500/10 border-rose-200 text-rose-700",
    pill: "bg-rose-50 text-rose-700",
  },
];

export default function PersonalTutorExperiencePage() {
  // Audience mode toggle
  const [audience, setAudience] = useState<"learner" | "parent">("learner");

  // Subject pill selector for "Meet your tutor"
  const [activeSubject, setActiveSubject] = useState<"math" | "science" | "cbt">("math");

  // Interactive Fan Card selected for expanded view
  const [activeFanCard, setActiveFanCard] = useState<string>("circ");

  // Interactive Circuit Widget State
  const [circuitSwitch, setCircuitSwitch] = useState<boolean>(true);
  const [voltage, setVoltage] = useState<number>(9);
  const resistance = 3;
  const current = circuitSwitch ? (voltage / resistance).toFixed(1) : "0.0";

  // Interactive Socratic Story Card State
  const [socraticStep, setSocraticStep] = useState<number>(1);

  // University Target Selector State (Story Card 2)
  const [selectedUni, setSelectedUni] = useState<{ name: string; cutoff: number; currentScore: number }>({
    name: "University of Lagos (UNILAG)",
    cutoff: 290,
    currentScore: 312,
  });

  // Homework Help Card State (Story Card 3)
  const [promptSelection, setPromptSelection] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 font-sans antialiased selection:bg-emerald-200 selection:text-emerald-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FBFBFA]/85 border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              B
            </div>
            <span className="font-extrabold tracking-tight text-slate-900 text-base">
              BrainLab<span className="text-emerald-600 font-medium ml-1 text-xs uppercase tracking-wider">Tutor</span>
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-slate-900 transition">How it Works</a>
          <a href="#interactive-cards" className="hover:text-slate-900 transition">Visual Cards</a>
          <a href="#adaptive-plan" className="hover:text-slate-900 transition">Adaptive Plan</a>
          <a href="#outcomes" className="hover:text-slate-900 transition">Results</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/cbt"
            className="text-xs font-bold text-slate-700 hover:text-slate-950 px-3 py-1.5 transition"
          >
            Sign In
          </Link>
          <Link
            href="/cbt"
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full shadow-sm hover:shadow transition-all"
          >
            Start Free
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION: Editorial Headline & Segmented Audience Toggle */}
      {/* ========================================================================= */}
      <section className="pt-12 sm:pt-20 pb-12 sm:pb-16 px-4 max-w-5xl mx-auto text-center">
        {/* Editorial Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-slate-900 tracking-tight leading-[1.08] max-w-4xl mx-auto font-normal">
          Your personal tutor for <br />
          <span className="italic font-serif font-normal text-emerald-700 underline decoration-emerald-200 underline-offset-8">
            JAMB and STEM
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          {audience === "learner"
            ? "Start from scratch, work through tricky past questions, and master tough scientific concepts with Labby — your visual, interactive tutor."
            : "Give your child or students personalised 1-on-1 Socratic tutoring that explains foundational reasoning without giving away answers."}
        </p>

        {/* Segmented Audience Toggle Pills */}
        <div className="mt-8 inline-flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-full border border-slate-200 shadow-inner">
          <button
            onClick={() => setAudience("learner")}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
              audience === "learner"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            I'm a learner
          </button>
          <button
            onClick={() => setAudience("parent")}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
              audience === "parent"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            I'm a parent or teacher
          </button>
        </div>

        {/* Primary CTA Button */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/cbt"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
          >
            <span>Start Practice, It's Free</span>
            <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <span className="text-xs text-slate-500 font-medium">No credit card required &bull; 100% Free Tier</span>
        </div>

        {/* Accreditations & Rating Strip */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <AwardIcon className="h-4 w-4 text-emerald-600" />
            <span>JAMB UTME Aligned</span>
          </div>
          <div className="hidden sm:inline-block h-3 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
            <span>NDPA 2023 Compliant</span>
          </div>
          <div className="hidden sm:inline-block h-3 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5 text-amber-500">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-slate-600 normal-case font-bold ml-1 text-xs">4.9 / 5 (45,000+ Students)</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THE PERSPECTIVE FAN DECK (Hero Visual Graphic) */}
      {/* ========================================================================= */}
      <section id="interactive-cards" className="py-8 px-4 max-w-6xl mx-auto overflow-hidden">
        <div className="text-center mb-6">
          <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
            Interactive Visual Curriculum
          </span>
          <h2 className="text-xs text-slate-500 mt-2 font-medium">
            Click any subject card below to preview its live interactive visual engine
          </h2>
        </div>

        {/* Perspective Fan Deck Container */}
        <div className="relative pt-4 pb-8 flex items-center justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 w-full">
            {FAN_CARDS.map((card) => {
              const Icon = card.icon;
              const isSelected = activeFanCard === card.id;

              return (
                <button
                  key={card.id}
                  onClick={() => setActiveFanCard(card.id)}
                  className={`text-left rounded-3xl p-5 border transition-all duration-300 relative flex flex-col justify-between h-64 shadow-sm hover:shadow-md ${
                    isSelected
                      ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg -translate-y-2"
                      : "bg-white/70 hover:bg-white border-slate-200/90 hover:-translate-y-1"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.pill}`}>
                        {card.badge}
                      </span>
                      <Icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4">
                      <span className="text-[11px] text-slate-400 font-medium block">{card.subject}</span>
                      <h3 className="font-bold text-slate-900 text-sm mt-0.5 leading-snug">{card.title}</h3>
                    </div>
                  </div>

                  {/* Micro Visual inside each card */}
                  <div className="my-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center min-h-[90px]">
                    {card.id === "circ" && (
                      <div className="text-center w-full">
                        <div className="flex items-center justify-center gap-2 mb-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${circuitSwitch ? "bg-amber-400 animate-pulse shadow-md shadow-amber-400/50" : "bg-slate-300"}`} />
                          <span className="text-xs font-bold text-slate-700">{current} A</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">I = V / R ({voltage}V / 3Ω)</span>
                      </div>
                    )}

                    {card.id === "geom" && (
                      <div className="w-full text-center">
                        <svg className="w-full h-12" viewBox="0 0 100 40">
                          <line x1="10" y1="35" x2="90" y2="35" stroke="#cbd5e1" strokeWidth="1.5" />
                          <line x1="10" y1="35" x2="10" y2="5" stroke="#cbd5e1" strokeWidth="1.5" />
                          <line x1="10" y1="30" x2="80" y2="10" stroke="#2563eb" strokeWidth="2.5" />
                          <circle cx="80" cy="10" r="3" fill="#2563eb" />
                          <circle cx="10" cy="30" r="3" fill="#2563eb" />
                        </svg>
                        <span className="text-[10px] font-mono text-blue-600 block mt-0.5">m = (y₂ - y₁) / (x₂ - x₁)</span>
                      </div>
                    )}

                    {card.id === "mol" && (
                      <div className="w-full text-center">
                        <div className="flex items-center justify-center gap-1.5 py-1">
                          <span className="h-4 w-4 rounded-full bg-slate-900 text-[9px] font-bold text-white flex items-center justify-center">C</span>
                          <span className="h-3 w-3 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center">O</span>
                          <span className="h-2.5 w-2.5 rounded-full bg-sky-400 text-[7px] font-bold text-white flex items-center justify-center">H</span>
                        </div>
                        <span className="text-[10px] font-medium text-emerald-700 block mt-1">Pyranose Ring (3D)</span>
                      </div>
                    )}

                    {card.id === "chem" && (
                      <div className="w-full text-center font-mono text-[10px] text-purple-700">
                        <span>2H₂ + O₂ &rarr; 2H₂O</span>
                        <div className="text-[9px] text-slate-400 mt-1">Conservation of Mass</div>
                      </div>
                    )}

                    {card.id === "cbt" && (
                      <div className="w-full text-center">
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          JAMB 2026 Ready
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-1.5">Rule of Proximity</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pt-1">
                    <span>{isSelected ? "Active Preview" : "Explore"}</span>
                    <ChevronRightIcon className={`h-3.5 w-3.5 transition-transform ${isSelected ? "text-emerald-600 translate-x-1" : "text-slate-400"}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Interactive Sandbox for Selected Fan Card */}
        <div className="mt-4 rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          {activeFanCard === "circ" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  Physics &bull; Electricity & Circuit Laws
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Interactive Ohm's Law Simulator
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Flip the switch or slide the voltage dial. Current I dynamically recalculates via I = V / R to show how potential difference drives electron flow in secondary-school physics.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => setCircuitSwitch(!circuitSwitch)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      circuitSwitch
                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Switch: {circuitSwitch ? "CLOSED (ON)" : "OPEN (OFF)"}
                  </button>
                </div>
              </div>

              <div className="md:col-span-7 bg-amber-50/50 rounded-2xl p-6 border border-amber-100 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Voltage (V)</span>
                    <span className="text-2xl font-black text-slate-900">{voltage} V</span>
                  </div>
                  <span className="text-slate-300 text-2xl font-light">/</span>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Resistance (R)</span>
                    <span className="text-2xl font-black text-slate-900">{resistance} &Omega;</span>
                  </div>
                  <span className="text-slate-300 text-2xl font-light">=</span>
                  <div className="text-center">
                    <span className="text-[10px] text-amber-600 uppercase font-bold block">Current (I)</span>
                    <span className="text-2xl font-black text-amber-600">{current} A</span>
                  </div>
                </div>

                {/* Voltage Slider */}
                <div className="w-full max-w-xs space-y-1 text-center">
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={voltage}
                    onChange={(e) => setVoltage(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500">Drag to adjust battery voltage (1V &ndash; 24V)</span>
                </div>
              </div>
            </div>
          )}

          {activeFanCard === "mol" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Biochemistry &bull; Carbohydrates
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  D-Glucose (C₆H₁₂O₆) 3D Model
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Inspect the anomeric carbon (C1) and hydroxyl orientations required for WAEC and JAMB cellular respiration and carbohydrate questions.
                </p>
                <Link
                  href="/classroom/stem"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  <span>Open Full 3D Molecular Bank</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="md:col-span-7 bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 flex flex-col items-center justify-center text-center">
                <div className="relative h-28 w-28 rounded-full bg-emerald-100/60 border border-emerald-200 flex items-center justify-center shadow-inner">
                  <div className="animate-spin text-emerald-600" style={{ animationDuration: "16s" }}>
                    <AtomIcon className="h-16 w-16" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-900" /> 6 Carbons</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> 12 Hydrogens</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> 6 Oxygens</span>
                </div>
              </div>
            </div>
          )}

          {activeFanCard === "geom" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  Mathematics &bull; Coordinate Geometry
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Linear Gradient & Intercept
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Understand how slope m dictates steepness, and how perpendicular lines have gradients whose product is -1, frequently tested in JAMB UTME.
                </p>
              </div>

              <div className="md:col-span-7 bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-sm font-bold text-blue-900 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
                  y = mx + c &nbsp;&rarr;&nbsp; y = 2x - 3
                </span>
                <span className="text-xs text-slate-500 mt-2">Gradient (m) = 2 &bull; Y-intercept (c) = -3</span>
              </div>
            </div>
          )}

          {activeFanCard === "chem" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                  Chemistry &bull; Stoichiometry
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Mole Concept & Mass Balancing
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Balance equations by equating molar ratios before tackling limiting reagent problems.
                </p>
              </div>

              <div className="md:col-span-7 bg-purple-50/50 rounded-2xl p-6 border border-purple-100 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-base font-bold text-purple-900 bg-white px-4 py-2.5 rounded-xl border border-purple-200 shadow-sm">
                  2Mg + O₂ &rarr; 2MgO
                </span>
                <span className="text-xs text-slate-500 mt-2">48g Magnesium + 32g Oxygen = 80g Magnesium Oxide</span>
              </div>
            </div>
          )}

          {activeFanCard === "cbt" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                  JAMB UTME &bull; Use of English
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Rule of Proximity Simulator
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  "Neither the student nor the teachers <b>were</b> present." The verb matches the closest subject.
                </p>
              </div>

              <div className="md:col-span-7 bg-rose-50/50 rounded-2xl p-6 border border-rose-100 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-rose-800 font-semibold bg-white p-3 rounded-xl border border-rose-200">
                  &ldquo;Neither the principal nor the teachers [ <span className="text-emerald-600 font-bold">were</span> ] present.&rdquo;
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MEET YOUR PERSONAL TUTOR (Mascot & Socratic Showcase) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="pt-16 pb-12 px-4 max-w-4xl mx-auto text-center">
        {/* Animated Cute Mascot Icon */}
        <div className="inline-flex items-center justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20">
            <div className="h-full w-full rounded-2xl bg-[#FBFBFA] flex items-center justify-center relative">
              <div className="h-7 w-7 rounded-xl bg-emerald-600 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-white flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-900" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <h2 className="text-3xl sm:text-4xl font-serif text-slate-900 font-normal">
          Meet Labby, your personal tutor
        </h2>

        {/* Subject Switcher Pill Toggle */}
        <div className="mt-6 inline-flex p-1 bg-slate-200/70 rounded-full border border-slate-200">
          <button
            onClick={() => setActiveSubject("math")}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeSubject === "math" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mathematics & Physics
          </button>
          <button
            onClick={() => setActiveSubject("science")}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeSubject === "science" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Biology & Chemistry
          </button>
          <button
            onClick={() => setActiveSubject("cbt")}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeSubject === "cbt" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            JAMB UTME CBT
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. THE 3 ALTERNATING APPLE-GRADE STORY CARDS */}
      {/* ========================================================================= */}
      <section className="py-6 px-4 max-w-5xl mx-auto space-y-12">
        {/* STORY CARD 1: Socratic, not a cheating machine (Warm Peach Pastel) */}
        <div className="rounded-3xl bg-[#FFF8F2] border border-amber-200/70 p-6 sm:p-10 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-3 py-1 rounded-full">
              Socratic Pedagogy
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif text-slate-900 font-normal leading-tight">
              A visual, interactive tutor, <br />
              <span className="italic font-serif text-amber-800">not a cheating machine</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Learn with Labby step-by-step like a real human instructor. He asks guiding questions, reacts to what's on your screen, and helps you work through each step without giving the answer away.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-amber-900">
              <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
              <span>Guides student reasoning to build genuine exam confidence</span>
            </div>
          </div>

          {/* Interactive Socratic Dialogue Phone Mockup */}
          <div className="md:col-span-6 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white border border-amber-100 p-5 shadow-lg space-y-3.5">
              {/* Tutor Speech Bubble */}
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  L
                </div>
                <div className="bg-emerald-50 text-emerald-950 p-3 rounded-2xl rounded-tl-sm text-xs font-medium leading-relaxed border border-emerald-100">
                  {socraticStep === 1 && "What does 'proximity' tell us when 'neither... nor' connects two subjects?"}
                  {socraticStep === 2 && "Exactly! So between 'principal' (singular) and 'teachers' (plural), which is closer to the verb?"}
                  {socraticStep === 3 && "Brilliant! 'Teachers' is plural, so we use 'were'. You solved it yourself!"}
                </div>
              </div>

              {/* Socratic Interactive Step Controller */}
              <div className="pt-2 space-y-2">
                {socraticStep === 1 && (
                  <button
                    onClick={() => setSocraticStep(2)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left text-xs font-semibold text-slate-700 flex items-center justify-between transition"
                  >
                    <span>&ldquo;The verb matches the nearer subject.&rdquo;</span>
                    <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}

                {socraticStep === 2 && (
                  <button
                    onClick={() => setSocraticStep(3)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left text-xs font-semibold text-slate-700 flex items-center justify-between transition"
                  >
                    <span>&ldquo;'Teachers' is closer to the verb!&rdquo;</span>
                    <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}

                {socraticStep === 3 && (
                  <button
                    onClick={() => setSocraticStep(1)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-center text-xs font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcwIcon className="h-3 w-3" />
                    <span>Replay Socratic Steps</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STORY CARD 2: Adaptive plan that adapts (Soft Sand / Grey Pastel) */}
        <div id="adaptive-plan" className="rounded-3xl bg-[#F8F9FA] border border-slate-200 p-6 sm:p-10 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Mockup on Left on Desktop */}
          <div className="md:col-span-6 order-2 md:order-1 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Dream School Target</span>
                  <h4 className="text-xs font-bold text-slate-800">{selectedUni.name}</h4>
                </div>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  +{selectedUni.currentScore - selectedUni.cutoff} Margin
                </span>
              </div>

              {/* Score Trajectory Graph */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Target Cut-Off</span>
                  <span className="text-slate-700">{selectedUni.cutoff} pts</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(selectedUni.currentScore / 400) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>Diagnostic Mock: <b>{selectedUni.currentScore} / 400</b></span>
                  <span className="text-emerald-600 font-bold">Safe Admission Band</span>
                </div>
              </div>

              {/* University Selector Toggle */}
              <div className="pt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedUni({ name: "University of Lagos (UNILAG)", cutoff: 290, currentScore: 312 })}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    selectedUni.cutoff === 290 ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600"
                  }`}
                >
                  UNILAG (290)
                </button>
                <button
                  onClick={() => setSelectedUni({ name: "University of Ibadan (UI)", cutoff: 285, currentScore: 304 })}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    selectedUni.cutoff === 285 ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600"
                  }`}
                >
                  UI (285)
                </button>
                <button
                  onClick={() => setSelectedUni({ name: "Obafemi Awolowo Univ (OAU)", cutoff: 280, currentScore: 298 })}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    selectedUni.cutoff === 280 ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600"
                  }`}
                >
                  OAU (280)
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-6 order-1 md:order-2 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-200/80 px-3 py-1 rounded-full">
              Personalised Trajectory
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif text-slate-900 font-normal leading-tight">
              Start at the right level, <br />
              <span className="italic font-serif text-slate-600">with a plan that adapts</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              BrainLab identifies your strengths and exact weak subjects. It builds a practice plan calibrated to your dream institution's departmental cutoff, constantly recalibrating after every mock exam.
            </p>
            <div className="pt-1">
              <Link
                href="/cbt"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-emerald-700 transition"
              >
                <span>Explore Diagnostic Profiling</span>
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* STORY CARD 3: Help on Demand (Soft Ice-Blue Pastel) */}
        <div id="outcomes" className="rounded-3xl bg-[#F0F7FF] border border-blue-200/70 p-6 sm:p-10 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-3 py-1 rounded-full">
              Instant Clarification
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif text-slate-900 font-normal leading-tight">
              Get help on demand, <br />
              <span className="italic font-serif text-blue-800">any time of the night</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Paste or type any past question you are struggling with. Labby breaks down the core scientific principle, provides an interactive diagram, and challenges you with a practice variation.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-blue-950">
              <ClockIcon className="h-4 w-4 text-blue-600" />
              <span>Available 24/7 &bull; Zero waiting time &bull; Instant Socratic breakdown</span>
            </div>
          </div>

          {/* Interactive Chat Prompt Selector Phone Mockup */}
          <div className="md:col-span-6 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white border border-blue-100 p-5 shadow-lg space-y-3">
              {/* Question bubble */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">STUDENT QUERY</span>
                &ldquo;Why does an object float when placed in a denser liquid?&rdquo;
              </div>

              {/* Labby Reply */}
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  L
                </div>
                <div className="p-3 rounded-2xl rounded-tl-sm bg-blue-50 text-blue-950 text-xs border border-blue-100">
                  Think of Archimedes' Principle: what must the upthrust equal for the object to remain in equilibrium?
                </div>
              </div>

              {/* Interactive Student Action Buttons */}
              <div className="pt-1 space-y-1.5">
                <button
                  onClick={() => setPromptSelection(1)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold text-left transition ${
                    promptSelection === 1
                      ? "bg-blue-600 text-white"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  &rarr; &ldquo;The upthrust equals the weight of displaced liquid.&rdquo;
                </button>
                <button
                  onClick={() => setPromptSelection(2)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold text-left transition ${
                    promptSelection === 2
                      ? "bg-blue-600 text-white"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  &rarr; &ldquo;Can you show me a visual diagram of forces?&rdquo;
                </button>
              </div>

              {promptSelection && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 text-center font-bold">
                  ✓ Exactly! Upthrust = Weight of fluid displaced (Flotation Law)
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CALL TO ACTION: Clean, High-Contrast Footer Card */}
      {/* ========================================================================= */}
      <section className="py-16 px-4 max-w-4xl mx-auto text-center">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
              Your Exam Success Starts Here
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-normal tracking-tight">
              Ready to learn smarter <br />
              <span className="italic font-serif text-emerald-400">with your personal AI tutor?</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Join thousands of Nigerian secondary school candidates preparing for JAMB UTME, WAEC, and STEM excellence.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/cbt"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Get Started, It's Free</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Return to BrainLab Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Minimalist Strip */}
      <footer className="border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} BrainLab Academy &bull; Lagos, Nigeria &bull; NDPA 2023 Compliant</p>
      </footer>
    </div>
  );
}
