"use client";

import React from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";

export function HomeAudiences() {
  const audiences = HOMEPAGE_CONTENT_CONFIG.audiences;

  const AUDIENCE_METADATA: Record<
    string,
    {
      icon: string;
      tag: string;
      accent: string;
      glowColor: string;
      staggerClass: string;
      features: string[];
      preview: {
        badge: string;
        title: string;
        metrics: { label: string; val: string }[];
        footerNotice: string;
      };
    }
  > = {
    students: {
      icon: "🎯",
      tag: "UTME & JAMB Candidates",
      accent: "from-blue-600 via-indigo-500 to-sky-400",
      glowColor: "group-hover:border-blue-500/40 group-hover:shadow-blue-900/25",
      staggerClass: "bl-stagger-1",
      features: [
        "Authentic 4-subject 400-mark timed simulations",
        "Step-by-step master derivations & explanations",
        "Low-data offline sync (< 1.2 MB data usage)",
      ],
      preview: {
        badge: "CBT Mode",
        title: "Official 4-Subject Simulator",
        metrics: [
          { label: "Standard Time", val: "120 Mins" },
          { label: "Question Pool", val: "Verified 2027" },
        ],
        footerNotice: "Instant score & speed analysis",
      },
    },
    secondary: {
      icon: "📚",
      tag: "SS1–SS3, WAEC & NECO",
      accent: "from-emerald-500 via-teal-500 to-cyan-400",
      glowColor: "group-hover:border-emerald-500/40 group-hover:shadow-emerald-900/25",
      staggerClass: "bl-stagger-2",
      features: [
        "Complete curriculum modules (Science, Arts, Commercial)",
        "Formula sheets, definitions & theory breakdowns",
        "Topical quizzes and past examination revisions",
      ],
      preview: {
        badge: "Syllabus Aligned",
        title: "Senior Secondary Hub",
        metrics: [
          { label: "NERDC Curriculum", val: "100% Tracked" },
          { label: "Theory & OBJ", val: "Full Solutions" },
        ],
        footerNotice: "Step-by-step curriculum mastery",
      },
    },
    stem: {
      icon: "🔬",
      tag: "STEM & Science Explorers",
      accent: "from-cyan-500 via-blue-500 to-indigo-500",
      glowColor: "group-hover:border-cyan-500/40 group-hover:shadow-cyan-900/25",
      staggerClass: "bl-stagger-3",
      features: [
        "3D biological organs, circuits & chemical structures",
        "Interactive parameter sliders for physics & mechanics",
        "Kinesthetic visual learning turning formulas into intuition",
      ],
      preview: {
        badge: "3D Virtual Lab",
        title: "Virtual Science Atlas",
        metrics: [
          { label: "Simulations", val: "Touch & Rotate" },
          { label: "Visual Depth", val: "Real 3D Atlas" },
        ],
        footerNotice: "Interactive tactile experiments",
      },
    },
    independent: {
      icon: "⚡",
      tag: "Higher Ed & Self-Paced",
      accent: "from-purple-500 via-pink-500 to-amber-400",
      glowColor: "group-hover:border-purple-500/40 group-hover:shadow-purple-900/25",
      staggerClass: "bl-stagger-4",
      features: [
        "National Competition Arena with 1v1 sprint battles",
        "24/7 AI Tutor with hints without spoiling answers",
        "Verified skills passports and learning milestones",
      ],
      preview: {
        badge: "Live 1v1 Sprint",
        title: "National Challenge Arena",
        metrics: [
          { label: "Multiplayer", val: "Real-time 1v1" },
          { label: "Daily Streaks", val: "XP & Badges" },
        ],
        footerNotice: "Competitive academic leagues",
      },
    },
  };

  return (
    <section
      id="audiences"
      aria-label="Tailored Experiences for Every Learner"
      className="scroll-mt-20 sm:scroll-mt-24 relative w-full overflow-hidden py-14 sm:py-18 lg:py-20 border-b border-white/10"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 animate-bl-fade-up">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-300 border border-blue-400/30 mb-2.5">
            LEARNER-FIRST ACADEMY
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Engineered for Every Stage of Your Academic Journey
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Whether you are preparing for high-stakes exams, mastering secondary curriculum, exploring 3D science simulations, or studying at your own pace.
          </p>
        </div>

        {/* 4 Clean Visual Bento Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {audiences.map((aud) => {
            const meta = AUDIENCE_METADATA[aud.id] || {
              icon: "📚",
              tag: aud.label,
              accent: "from-blue-600 via-indigo-500 to-sky-400",
              glowColor: "group-hover:border-blue-500/40 group-hover:shadow-blue-900/25",
              staggerClass: "",
              features: [
                "Full syllabus topic coverage",
                "Real examination practice drills",
                "Instant performance analytics",
              ],
              preview: {
                badge: "Designed State",
                title: aud.label,
                metrics: [],
                footerNotice: "Authentic platform interface",
              },
            };
            const headline = resolveClaimValue(aud.headline, aud.label);

            return (
              <div
                key={aud.id}
                className={`group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${meta.glowColor} bl-interactive-hover animate-bl-fade-up ${meta.staggerClass}`}
              >
                {/* Visual Top Highlight Accent Rail */}
                <div
                  className={`absolute top-0 inset-x-0 h-1.5 rounded-t-3xl bg-gradient-to-r ${meta.accent} opacity-90 group-hover:opacity-100 transition-opacity`}
                  aria-hidden="true"
                />

                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4 pt-1">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-800/90 text-2xl shadow-md group-hover:scale-105 transition-transform" role="img" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300">
                      {meta.tag}
                    </span>
                  </div>

                  {/* Headline */}
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                    {headline}
                  </h3>

                  {/* Visual Feature Bullet List */}
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    {meta.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-950/80 text-[10px] font-bold text-emerald-400 mt-0.5 border border-emerald-800/60">✓</span>
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Visual Interface Telemetry Pill */}
                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-3 shadow-inner">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-300 truncate font-semibold">
                        {meta.preview.title}
                      </span>
                      <span className="rounded-md bg-blue-900/60 border border-blue-700/60 px-2 py-0.5 text-[9px] font-black text-cyan-300 shrink-0">
                        {meta.preview.badge}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px]">
                      {meta.preview.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="rounded-xl border border-white/10 bg-slate-900/90 p-2 shadow-2xs"
                        >
                          <span className="text-[8px] uppercase font-bold text-slate-400 block truncate">
                            {m.label}
                          </span>
                          <span className="font-bold text-white truncate block text-[11px] mt-0.5">
                            {m.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3.5 border-t border-white/10">
                  <Link
                    href={aud.cta.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-all bl-focus-ring rounded-lg"
                  >
                    <span>{aud.cta.label}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
