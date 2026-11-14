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
      accent: "from-blue-600 to-sky-500",
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
      accent: "from-emerald-600 to-teal-500",
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
      accent: "from-indigo-600 to-cyan-500",
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
      accent: "from-purple-600 to-pink-500",
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
          { label: "AI Guidance", val: "24/7 Active" },
        ],
        footerNotice: "Merit badges & scholarships",
      },
    },
  };

  return (
    <section
      id="audiences"
      aria-label="Tailored Experiences for Every Learner"
      className="py-14 sm:py-18 lg:py-20 border-b border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-[#070e1e]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 animate-bl-fade-up">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-2.5">
            LEARNER-FIRST ACADEMY
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--bl-color-text-primary)] tracking-tight">
            Engineered for Every Stage of Your Academic Journey
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Whether you are preparing for high-stakes exams, mastering secondary curriculum, exploring 3D science simulations, or studying at your own pace.
          </p>
        </div>

        {/* 4 Clean Visual Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {audiences.map((aud) => {
            const meta = AUDIENCE_METADATA[aud.id] || {
              icon: "📚",
              tag: aud.label,
              accent: "from-blue-600 to-sky-500",
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
                className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-[var(--bl-color-surface)] p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900/80 bl-interactive-hover animate-bl-fade-up ${meta.staggerClass}`}
              >
                {/* Visual Top Highlight Accent */}
                <div
                  className={`absolute top-0 inset-x-0 h-1 rounded-t-2xl bg-gradient-to-r ${meta.accent} opacity-80 group-hover:opacity-100 transition-opacity`}
                  aria-hidden="true"
                />

                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3.5 pt-1">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-2xl shadow-2xs group-hover:scale-105 transition-transform" role="img" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {meta.tag}
                    </span>
                  </div>

                  {/* Headline */}
                  <h3 className="text-base sm:text-lg font-black text-[var(--bl-color-text-primary)] tracking-tight leading-snug">
                    {headline}
                  </h3>

                  {/* Visual Feature Bullet List */}
                  <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {meta.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Visual Interface Telemetry Pill */}
                  <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-700 dark:text-slate-300 truncate font-semibold">
                        {meta.preview.title}
                      </span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                        {meta.preview.badge}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                      {meta.preview.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="rounded-md border border-slate-200/60 bg-white px-2 py-1 dark:border-slate-800/80 dark:bg-slate-900"
                        >
                          <span className="text-[8px] uppercase font-bold text-slate-600 dark:text-slate-400 block truncate">
                            {m.label}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block text-[10px]">
                            {m.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={aud.cta.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--bl-color-brand-primary)] hover:text-blue-600 dark:hover:text-blue-300 group-hover:translate-x-0.5 transition-all bl-focus-ring rounded-lg"
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
