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
      className="relative border-b border-slate-200/80 bg-slate-50/70 text-slate-900 dark:border-white/[0.08] dark:bg-[#070e1c] dark:text-white overflow-hidden transition-colors"
    >
      {/* 1. SOCIAL PROOF LIVE METRICS BAR (Luminous & High Contrast) */}
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-white/[0.06] dark:bg-slate-950/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Candidate community & verified curriculum badge */}
            <div className="flex items-center gap-3.5">
              <div className="flex -space-x-2 overflow-hidden">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-xs font-black text-white ring-2 ring-white dark:ring-slate-950 shadow-xs">
                  AO
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-xs font-black text-white ring-2 ring-white dark:ring-slate-950 shadow-xs">
                  CE
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-400 text-xs font-black text-white ring-2 ring-white dark:ring-slate-950 shadow-xs">
                  IK
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-rose-400 text-xs font-black text-white ring-2 ring-white dark:ring-slate-950 shadow-xs">
                  FT
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 ring-2 ring-white dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-950 shadow-xs">
                  CBT
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <span className="flex items-center gap-0.5" aria-label="Student community ratings">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </span>
                  <span className="text-slate-950 dark:text-white font-extrabold">Verified Student Community</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Targeted preparation for candidates across all 36 Nigerian states
                </p>
              </div>
            </div>

            {/* Core Proof Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <svg className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  <span>Syllabus Alignment</span>
                </div>
                <div className="text-sm sm:text-base font-black text-slate-950 dark:text-white">UTME, O Level &amp; Post-UTME</div>
              </div>

              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span>Target Goal</span>
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">Competitive Cut-offs</div>
              </div>

              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <svg className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>
                  </svg>
                  <span>Engine Standard</span>
                </div>
                <div className="text-sm sm:text-base font-black text-slate-950 dark:text-white">8-Key Interface</div>
              </div>

              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <svg className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>Question Bank</span>
                </div>
                <div className="text-sm sm:text-base font-black text-blue-600 dark:text-cyan-400">Past &amp; Model Banks</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. UNIVERSITY TARGET DRILL BENCHMARKS (Clean Card Architecture) */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight">
              Select Your Target Nigerian Institution
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Explore cut-off expectations, faculty combinations, and tailored speed drills.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Click institution to view drill strategy &rarr;
          </span>
        </div>

        {/* Scrollable University Badges Strip */}
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
                className={`group relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 shrink-0 bl-focus-ring cursor-pointer ${
                  isSelected
                    ? "border-blue-600 bg-white text-slate-900 shadow-md ring-2 ring-blue-500/30 scale-102 dark:border-cyan-400 dark:bg-slate-900 dark:text-white dark:ring-cyan-400"
                    : "border-slate-200/80 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white shadow-2xs dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-slate-900"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[11px] font-black tracking-wider text-blue-700 border border-blue-200 shrink-0 transition-transform group-hover:scale-105 dark:bg-slate-800 dark:text-cyan-300 dark:border-white/10" aria-hidden="true">
                  {uni.shortName.slice(0, 3)}
                </span>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white tracking-wide">
                      {uni.shortName}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-blue-600 text-white font-black shadow-xs dark:bg-gradient-to-r dark:from-blue-500 dark:to-cyan-400 dark:text-slate-950"
                          : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                      }`}
                    >
                      {uni.targetScore}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {uni.fullName}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Target Benchmark Dynamic Action Panel (Pure White Surface in Light Mode) */}
        <div className="mt-4 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-lg dark:border-white/15 dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-[#081226]/90 dark:to-[#040814]/95 dark:shadow-2xl relative overflow-hidden">
          {/* Top subtle accent gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-500" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Institution Highlight */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 text-sm font-black shrink-0 dark:bg-gradient-to-br dark:from-blue-600/30 dark:to-cyan-500/20 dark:border-white/15 dark:text-cyan-300" aria-hidden="true">
                  {selectedUni.shortName}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">
                      {selectedUni.fullName} ({selectedUni.shortName})
                    </h3>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                      {selectedUni.cutoffBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic mt-0.5">
                    &ldquo;{selectedUni.tagline}&rdquo; &bull; {selectedUni.location}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  High-Demand Competitive Faculties:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUni.popularCourses.map((c) => (
                    <span
                      key={c}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-800 shadow-2xs dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Target Strategy */}
            <div className="md:col-span-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs shadow-inner dark:border-white/10 dark:bg-slate-950/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400 block">
                  Recommended Target Combo
                </span>
                <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                  {selectedUni.recommendedCombo}
                </p>
              </div>

              <div className="border-t border-slate-200 dark:border-white/10 pt-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  BrainLab Prep Protocol
                </span>
                <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5 leading-relaxed">
                  {selectedUni.recommendedDrills}
                </p>
              </div>
            </div>

            {/* Launch Call To Action */}
            <div className="md:col-span-3 flex flex-col justify-center gap-2.5 text-center md:text-right">
              <Link
                href={`/cbt?target=${selectedUni.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:translate-y-0.5 px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-md shadow-blue-600/25 transition-all bl-focus-ring min-h-[48px]"
              >
                <span>Practice for {selectedUni.shortName}</span>
                <span aria-hidden="true" className="text-base font-bold">&rarr;</span>
              </Link>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Official Combinations &bull; Verified Cut-offs
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
