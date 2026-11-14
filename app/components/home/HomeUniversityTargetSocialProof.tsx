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
  icon: string;
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
    icon: "🏛️",
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
    icon: "🎓",
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
    icon: "⚡",
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
    icon: "🦁",
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
    icon: "🕌",
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
    icon: "🛡️",
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
    icon: "⚖️",
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
    icon: "💻",
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
    icon: "🌟",
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
                  <span>★★★★★</span>
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
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>🎯</span> Syllabus Alignment
                </div>
                <div className="text-sm sm:text-base font-black text-white">JAMB &amp; WAEC</div>
              </div>

              <div className="border-l border-slate-800 pl-3">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>⚡</span> Target Goal
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-400">Competitive Cut-offs</div>
              </div>

              <div className="border-l border-slate-800 pl-3">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>⌨️</span> Engine Standard
                </div>
                <div className="text-sm sm:text-base font-black text-white">8-Key Interface</div>
              </div>

              <div className="border-l border-slate-800 pl-3">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>📖</span> Privacy Standard
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
              <span>🏛️ TARGET YOUR DREAM INSTITUTION</span>
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
          className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none"
        >
          {UNIVERSITIES.map((uni) => {
            const isSelected = uni.id === selectedUniId;
            return (
              <button
                key={uni.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedUniId(uni.id)}
                className={`group relative flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-200 shrink-0 bl-focus-ring ${
                  isSelected
                    ? "border-blue-500 bg-blue-600/20 text-white shadow-lg shadow-blue-900/40 ring-1 ring-blue-400"
                    : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <span className="text-xl shrink-0" aria-hidden="true">
                  {uni.icon}
                </span>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-white tracking-wide">
                      {uni.shortName}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {uni.targetScore}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-1">
                    {uni.fullName}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Target Benchmark Dynamic Action Panel */}
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 backdrop-blur-md shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Institution Highlight */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl" aria-hidden="true">
                  {selectedUni.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">
                      {selectedUni.fullName} ({selectedUni.shortName})
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {selectedUni.cutoffBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 italic">
                    &ldquo;{selectedUni.tagline}&rdquo; &bull; {selectedUni.location}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  High-Demand Competitive Faculties:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUni.popularCourses.map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Target Strategy */}
            <div className="md:col-span-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                  Recommended Target Combo
                </span>
                <p className="font-semibold text-slate-200 text-[11px] mt-0.5">
                  {selectedUni.recommendedCombo}
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  BrainLab Prep Protocol
                </span>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  {selectedUni.recommendedDrills}
                </p>
              </div>
            </div>

            {/* Launch Call To Action */}
            <div className="md:col-span-3 flex flex-col justify-center gap-2 text-center md:text-right">
              <Link
                href="/cbt"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition-all bl-focus-ring"
              >
                <span>Practice for {selectedUni.shortName}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <span className="text-[10px] text-slate-400">
                Includes 1 full simulation daily on Free Tier
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
