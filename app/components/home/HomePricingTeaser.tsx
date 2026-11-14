"use client";

import React from "react";
import Link from "next/link";
import { getWhatsAppChatUrl } from "@/app/lib/whatsapp";

export function HomePricingTeaser() {
  const apexWhatsAppUrl = getWhatsAppChatUrl(
    "Hello BrainLab Academy, I am visiting the website and would like to make enquiries about the Apex Cohort intensive JAMB preparatory class."
  );

  return (
    <section
      id="apex-cohort"
      aria-label="BrainLab Intensive Preparatory Class and Open Academic Platform"
      className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-24 border-b border-white/10"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 1. APEX COHORT INTENSIVE JAMB PREPARATORY SHOWCASE BANNER */}
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950 via-[#0a1226] to-[#070b16] p-8 sm:p-12 text-white shadow-2xl mb-16 backdrop-blur-xl">
          {/* Ambient Lighting Accents */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-cyan-300 border border-indigo-400/30 mb-4">
              🏛️ INTENSIVE BRAINLAB JAMB PREPARATORY CLASS
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Targeting 300+ in JAMB? Join the Intensive Apex Cohort.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
              BrainLab&apos;s premier guided preparatory class. Experience daily live subject masterclasses with top tutors, weekly proctored CBT mocks, targeted weakness remediation, and personal academic mentorship to guarantee university merit admission.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={apexWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 px-7 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] bl-focus-ring"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                </svg>
                <span>Enquire on WhatsApp</span>
                <span aria-hidden="true">&rarr;</span>
              </a>

              <Link
                href="/apex"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-indigo-950/50 hover:bg-indigo-900/60 active:scale-95 px-6 py-3.5 text-base font-bold text-white transition bl-focus-ring"
              >
                <span>View Programme Details</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>

              <Link
                href="/cbt"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white active:scale-95 px-6 py-3.5 text-base font-bold transition bl-focus-ring"
              >
                <span>Practice Free CBT Mocks</span>
              </Link>
            </div>
          </div>

          {/* 5 Pillars of the Intensive Preparatory Class */}
          <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl bg-slate-900/70 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">🎯</div>
              <h4 className="text-sm font-bold text-white">Daily Live Classes</h4>
              <p className="text-xs text-slate-300 mt-1">Live subject-by-subject coaching by verified high-scoring tutors.</p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">🗺️</div>
              <h4 className="text-sm font-bold text-white">Syllabus Roadmap</h4>
              <p className="text-xs text-slate-300 mt-1">Structured milestones covering all 4 UTME subjects thoroughly.</p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">📊</div>
              <h4 className="text-sm font-bold text-white">Monitored Mocks</h4>
              <p className="text-xs text-slate-300 mt-1">Weekly full-length proctored tests with direct tutor error analysis.</p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">💡</div>
              <h4 className="text-sm font-bold text-white">Topic Remediation</h4>
              <p className="text-xs text-slate-300 mt-1">Targeted drill sessions to eliminate recurring marks traps.</p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">🤝</div>
              <h4 className="text-sm font-bold text-white">Tutor Mentorship</h4>
              <p className="text-xs text-slate-300 mt-1">Direct WhatsApp desk for question clearance and accountability.</p>
            </div>
          </div>
        </div>

        {/* 2. 100% FREE & OPEN ACADEMIC PLATFORM (IMPROVED BENTO CARDS) */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-cyan-300 border border-blue-400/30 mb-3">
            ✨ 100% FREE FOR EVERY STUDENT &bull; NO SUBSCRIPTION REQUIRED
          </span>
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Complete Academic Superpowers. Open to Every Candidate.
          </h3>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            BrainLab Academy believes every Nigerian student deserves world-class exam preparation without paywalls. All self-study practice drills, full mock exams, past questions, and 3D science labs are completely free at ₦0.
          </p>
        </div>

        {/* Improved Bento Cards Grid (6 Platform Superpowers) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: CBT Mock Simulator */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-blue-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-400/30 text-2xl">
                  ⌨️
                </span>
                <span className="rounded-full bg-blue-900/60 border border-blue-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-cyan-300">
                  100% Exam Parity
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                Authentic 8-Key CBT Simulator
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Full-length 4-subject 400-mark timed mock exams matching official JAMB speed, calculator, and keyboard controls.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Official 120-minute timer countdown</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Instant score breakdown &amp; school cut-offs</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/cbt"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-all"
              >
                <span>Launch Free CBT Exam</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 2: 20,000+ Past Questions */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-indigo-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-400/30 text-2xl">
                  📚
                </span>
                <span className="rounded-full bg-indigo-900/60 border border-indigo-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-300">
                  20,000+ Questions
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                Curriculum Question Bank
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Verified WAEC, JAMB, and NECO question bank organized strictly by syllabus topic with master step-by-step proofs.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>All core Science, Art &amp; Commercial subjects</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Examiner trap warnings &amp; formula sheets</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/learn"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 group-hover:translate-x-1 transition-all"
              >
                <span>Explore Syllabus Bank</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 3: Socratic AI Study Tutor */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-purple-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-400/30 text-2xl">
                  🤖
                </span>
                <span className="rounded-full bg-purple-900/60 border border-purple-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-300">
                  Socratic AI Tutor
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                AI Diagnostic &amp; Study Guide
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Get intelligent Socratic clues and conceptual formula proofs without having the final answers spoiled prematurely.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>3-stage progressive hint guidance</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Pinpoints weak syllabus subtopics automatically</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/learning-dna"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 group-hover:translate-x-1 transition-all"
              >
                <span>Check Your Learning DNA</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 4: STEM Studio 3D Laboratories */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-cyan-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-2xl">
                  🔬
                </span>
                <span className="rounded-full bg-cyan-900/60 border border-cyan-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-cyan-300">
                  Interactive 3D
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                Virtual STEM Studio
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Interact directly with 3D molecular structures (DNA, Hemoglobin, Lysozyme), physics mechanics, and chemistry experiments.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>High-speed Mol* WebGL graphics engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Labelled 2D fallback for low-spec devices</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/products/stem-studio"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-all"
              >
                <span>Launch STEM Studio</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 5: Low-Data Offline PWA */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-emerald-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-2xl">
                  📶
                </span>
                <span className="rounded-full bg-emerald-900/60 border border-emerald-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                  Zero Data Interruption
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                Offline PWA &amp; Low-Data Sync
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Installs on any phone or laptop. Complete practice sets cache locally in IndexedDB (&lt; 1.2 MB total footprint) for zero data usage.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Works seamlessly on slow 2G &amp; 3G mobile data</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Automatic background sync when reconnected</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/for-students"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 group-hover:translate-x-1 transition-all"
              >
                <span>Install Offline App</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 6: National Challenge Arena */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-amber-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30 text-2xl">
                  🏆
                </span>
                <span className="rounded-full bg-amber-900/60 border border-amber-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                  Live 1v1 Duels
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                National Challenge Arena
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Compete against thousands of candidates nationwide in live synchronous 1v1 academic sprint battles and climb school ranks.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Daily quests, study streaks, and badges</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Live leaderboard across all 36 states</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/challenge-arena"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 group-hover:translate-x-1 transition-all"
              >
                <span>Enter National Arena</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Call to Action Ribbon */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-slate-900/70 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-sm font-extrabold text-white">
              Ready to start your exam preparation?
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero payment card required &bull; Free instant practice &bull; Works on phone &amp; laptop
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/cbt"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-blue-600/30 transition active:scale-95"
            >
              <span>Start Free CBT Practice</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>

            <a
              href={apexWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 px-5 py-3 text-xs sm:text-sm font-bold text-emerald-300 transition active:scale-95"
            >
              <span>Apex Cohort Enquiries</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
