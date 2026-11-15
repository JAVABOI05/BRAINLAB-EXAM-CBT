"use client";

import React, { useState } from "react";
import Link from "next/link";

interface UniversityTarget {
  id: string;
  shortName: string;
  fullName: string;
  location: string;
  targetScore: string;
  cutoffBadge: string;
  accentColor: string;
  tagline: string;
  popularCourses: string[];
  recommendedDrills: string;
  recommendedCombo: string;
}

const UNIVERSITIES: UniversityTarget[] = [
  {
    id: "unilag",
    shortName: "UNILAG",
    fullName: "University of Lagos",
    location: "Akoka, Lagos",
    targetScore: "290+ Target",
    cutoffBadge: "High Merit",
    accentColor: "border-amber-500/50 text-amber-500 bg-amber-500/10",
    tagline: "In Deed and in Truth",
    popularCourses: ["Medicine & Surgery", "Law", "Computer Science", "Finance"],
    recommendedDrills: "3 Timed Mocks / Week + English Lexis Mastery",
    recommendedCombo: "Use of English, Mathematics, Physics, Chemistry",
  },
  {
    id: "ui",
    shortName: "UI",
    fullName: "University of Ibadan",
    location: "Ibadan, Oyo",
    targetScore: "285+ Target",
    cutoffBadge: "Premier Tier",
    accentColor: "border-sky-500/50 text-sky-400 bg-sky-500/10",
    tagline: "Recte Sapere Fons (To Think Straight Is The Well-Spring of Wisdom)",
    popularCourses: ["MBBS", "Pharmacy", "Nursing Science", "Veterinary Medicine"],
    recommendedDrills: "Post-UTME High Accuracy Sprint + Biology Topic Radar",
    recommendedCombo: "Use of English, Biology, Chemistry, Physics",
  },
  {
    id: "oau",
    shortName: "OAU",
    fullName: "Obafemi Awolowo University",
    location: "Ile-Ife, Osun",
    targetScore: "280+ Target",
    cutoffBadge: "Great Ife",
    accentColor: "border-blue-500/50 text-blue-400 bg-blue-500/10",
    tagline: "For Learning and Culture",
    popularCourses: ["Health Sciences", "Electrical Engineering", "Law", "Economics"],
    recommendedDrills: "Speed Drills on Chemistry Calculations & Physics Mechanics",
    recommendedCombo: "Use of English, Mathematics, Physics, Chemistry",
  },
  {
    id: "unn",
    shortName: "UNN",
    fullName: "University of Nigeria, Nsukka",
    location: "Nsukka, Enugu",
    targetScore: "285+ Target",
    cutoffBadge: "Lions Den",
    accentColor: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
    tagline: "To Restore the Dignity of Man",
    popularCourses: ["Pharmacy", "Medical Laboratory", "Law", "Civil Engineering"],
    recommendedDrills: "Full Blueprint 4-Subject Drills + Diagnostic Corrections",
    recommendedCombo: "Use of English, Chemistry, Physics, Biology",
  },
  {
    id: "abu",
    shortName: "ABU",
    fullName: "Ahmadu Bello University",
    location: "Zaria, Kaduna",
    targetScore: "270+ Target",
    cutoffBadge: "Northern Premier",
    accentColor: "border-teal-500/50 text-teal-400 bg-teal-500/10",
    tagline: "Congregation of Scholars",
    popularCourses: ["Mechanical Engineering", "Architecture", "Medicine", "Agriculture"],
    recommendedDrills: "Past Paper Question Re-tests & Quantitative Speed Drills",
    recommendedCombo: "Use of English, Mathematics, Physics, Chemistry",
  },
  {
    id: "uniben",
    shortName: "UNIBEN",
    fullName: "University of Benin",
    location: "Benin City, Edo",
    targetScore: "275+ Target",
    cutoffBadge: "Unibest",
    accentColor: "border-purple-500/50 text-purple-400 bg-purple-500/10",
    tagline: "Knowledge for Service",
    popularCourses: ["Dentistry", "Pharmacy", "Chemical Engineering", "Biochemistry"],
    recommendedDrills: "Science Formula Practice in STEM Studio + Timed Drills",
    recommendedCombo: "Use of English, Biology, Chemistry, Physics",
  },
  {
    id: "unilorin",
    shortName: "UNILORIN",
    fullName: "University of Ilorin",
    location: "Ilorin, Kwara",
    targetScore: "280+ Target",
    cutoffBadge: "Better by Far",
    accentColor: "border-indigo-500/50 text-indigo-400 bg-indigo-500/10",
    tagline: "Probitas Doctrina (Character and Learning)",
    popularCourses: ["Law", "Nursing", "Accounting", "Computer Science"],
    recommendedDrills: "Standard CBT Speed Optimization & Comprehension Drills",
    recommendedCombo: "Use of English, Economics, Government, Literature",
  },
  {
    id: "futa",
    shortName: "FUTA",
    fullName: "Fed. University of Technology Akure",
    location: "Akure, Ondo",
    targetScore: "270+ Target",
    cutoffBadge: "Tech Leaders",
    accentColor: "border-cyan-500/50 text-cyan-400 bg-cyan-500/10",
    tagline: "Technology for Self-Reliance",
    popularCourses: ["Software Engineering", "Cybersecurity", "Electrical Eng", "Physics"],
    recommendedDrills: "Calculus & Logic Gates Practice in STEM Studio",
    recommendedCombo: "Use of English, Mathematics, Physics, Chemistry",
  },
  {
    id: "covenant",
    shortName: "COVENANT",
    fullName: "Covenant University",
    location: "Ota, Ogun",
    targetScore: "280+ Target",
    cutoffBadge: "Top Private",
    accentColor: "border-rose-500/50 text-rose-400 bg-rose-500/10",
    tagline: "Raising a New Generation of Leaders",
    popularCourses: ["Computer Science", "Accounting", "Petroleum Engineering", "MIS"],
    recommendedDrills: "High-Fluency CBT Simulations & General Knowledge Review",
    recommendedCombo: "Use of English, Mathematics, Economics, Commerce",
  },
];

export function HomeUniversityTargetSocialProof() {
  const [selectedUniId, setSelectedUniId] = useState<string>("unilag");

  const selectedUni =
    UNIVERSITIES.find((u) => u.id === selectedUniId) || UNIVERSITIES[0];

  return (
    <section
      aria-label="University Target Benchmarks and Social Proof"
      className="relative border-b border-slate-200/80 bg-slate-900 text-white dark:border-slate-800 dark:bg-[#070e1c] overflow-hidden"
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-44 w-full max-w-7xl bg-radial from-blue-500/10 via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* 1. SOCIAL PROOF LIVE METRICS BAR */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Candidate community & verified curriculum badge */}
            <div className="flex items-center gap-3.5">
              <div className="flex -space-x-2 overflow-hidden">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-xs font-black text-white ring-2 ring-slate-950 shadow-xs">
                  AO
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-xs font-black text-white ring-2 ring-slate-950 shadow-xs">
                  CE
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-400 text-xs font-black text-white ring-2 ring-slate-950 shadow-xs">
                  IK
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-rose-400 text-xs font-black text-white ring-2 ring-slate-950 shadow-xs">
                  FT
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 ring-2 ring-slate-950 shadow-xs">
                  CBT
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-0.5" aria-label="Student community ratings">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="h-3 w-3 fill-amber-400 text-amber-400" viewBox="0 0 24 24" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </span>
                  <span className="text-white font-extrabold">Verified Student Community</span>
                </div>
                <p className="text-xs text-slate-300">
                  Targeted preparation for candidates across all 36 Nigerian states
                </p>
              </div>
            </div>

            {/* Core Proof Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="border-l border-slate-800 pl-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <svg className="h-3.5 w-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  <span>Syllabus Alignment</span>
                </div>
                <div className="text-sm sm:text-base font-black text-white">JAMB &amp; WAEC</div>
              </div>

              <div className="border-l border-slate-800 pl-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span>Target Goal</span>
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-400">Competitive Cut-offs</div>
              </div>

              <div className="border-l border-slate-800 pl-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <svg className="h-3.5 w-3.5 text-slate-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>
                  </svg>
                  <span>Engine Standard</span>
                </div>
                <div className="text-sm sm:text-base font-black text-white">8-Key Interface</div>
              </div>

              <div className="border-l border-slate-800 pl-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <svg className="h-3.5 w-3.5 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>Privacy Standard</span>
                </div>
                <div className="text-sm sm:text-base font-black text-sky-400">NDPA 2023</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. UNIVERSITY TARGET BADGES & INTERACTIVE BENCHMARK STRIP */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-300 mb-2">
              <span>TARGET YOUR DREAM INSTITUTION</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Preset Target Cut-Offs for Nigeria&apos;s Most Competitive Campuses
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Select your aspiration below to benchmark your daily CBT scores against verified merit cut-offs and faculty requirements.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Benchmarks Ready</span>
          </div>
        </div>

        {/* University Badges Horizontal Scroller / Grid */}
        <div
          role="tablist"
          aria-label="Target University Badges"
          className="flex items-center gap-3 overflow-x-auto pb-4 pt-1 scrollbar-none"
        >
          {UNIVERSITIES.map((uni) => {
            const isSelected = uni.id === selectedUniId;
            return (
              <button
                key={uni.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedUniId(uni.id)}
                className={`group relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300 shrink-0 bl-focus-ring cursor-pointer ${
                  isSelected
                    ? "border-cyan-400 bg-slate-900 text-white shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-400 scale-102"
                    : "border-white/10 bg-slate-950/70 text-slate-300 hover:border-white/20 hover:bg-slate-900"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-[11px] font-black tracking-wider text-cyan-300 border border-white/10 shrink-0 transition-transform group-hover:scale-105" aria-hidden="true">
                  {uni.shortName.slice(0, 3)}
                </span>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white tracking-wide">
                      {uni.shortName}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 font-black shadow-xs"
                          : "bg-white/10 text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {uni.targetScore}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {uni.fullName}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Target Benchmark Dynamic Action Panel */}
        <div className="mt-4 rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-[#081226]/90 to-[#040814]/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Top subtle accent gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Institution Highlight */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-white/15 text-sm font-black text-cyan-300 shrink-0" aria-hidden="true">
                  {selectedUni.shortName}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">
                      {selectedUni.fullName} ({selectedUni.shortName})
                    </h3>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {selectedUni.cutoffBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 italic mt-0.5">
                    &ldquo;{selectedUni.tagline}&rdquo; &bull; {selectedUni.location}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  High-Demand Competitive Faculties:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUni.popularCourses.map((c) => (
                    <span
                      key={c}
                      className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-1 text-xs font-bold text-slate-200 shadow-2xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Target Strategy */}
            <div className="md:col-span-4 rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-2.5 text-xs shadow-inner">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">
                  Recommended Target Combo
                </span>
                <p className="font-bold text-white text-xs mt-0.5">
                  {selectedUni.recommendedCombo}
                </p>
              </div>

              <div className="border-t border-white/10 pt-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                  BrainLab Prep Protocol
                </span>
                <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                  {selectedUni.recommendedDrills}
                </p>
              </div>
            </div>

            {/* Launch Call To Action */}
            <div className="md:col-span-3 flex flex-col justify-center gap-2.5 text-center md:text-right">
              <Link
                href="/cbt"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 active:translate-y-0.5 px-6 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition-all bl-focus-ring min-h-[48px]"
              >
                <span>Practice for {selectedUni.shortName}</span>
                <span aria-hidden="true" className="text-base font-bold">&rarr;</span>
              </Link>
              <span className="text-[11px] text-slate-400 font-mono">
                100% Free Starter CBT Simulation Included
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
