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
      tag: "Candidates & Learners",
      accent: "from-blue-600 to-sky-500",
      staggerClass: "bl-stagger-1",
      features: [
        "Official 8-key timed CBT simulations",
        "Offline-resilient low data practice (<1.2MB)",
        "Instant Socratic step-by-step solutions",
      ],
      preview: {
        badge: "Low-Data Active",
        title: "Mobile CBT Practice Drill",
        metrics: [
          { label: "Offline Questions", val: "180 Cached" },
          { label: "Data Usage", val: "< 1.2 MB" },
        ],
        footerNotice: "Auto-syncs upon network reconnect",
      },
    },
    parents: {
      icon: "📊",
      tag: "Parents & Guardians",
      accent: "from-emerald-600 to-teal-500",
      staggerClass: "bl-stagger-2",
      features: [
        "Weekly progress dispatches via WhatsApp",
        "Clear subject & topic weakness indicators",
        "Objective merit & cut-off benchmarks",
      ],
      preview: {
        badge: "Weekly Summary",
        title: "Candidate Performance Report",
        metrics: [
          { label: "Syllabus Track", val: "68% Covered" },
          { label: "Priority Topic", val: "Organic Chemistry" },
        ],
        footerNotice: "Sent every Friday 6PM to WhatsApp",
      },
    },
    schools: {
      icon: "🏛️",
      tag: "Institutions & Principals",
      accent: "from-indigo-600 to-blue-500",
      staggerClass: "bl-stagger-3",
      features: [
        "Multi-lab concurrent batch testing mesh",
        "Tamper-evident audit & session telemetries",
        "Centralized institution license management",
      ],
      preview: {
        badge: "Lab Console",
        title: "Batch CBT Examination Room",
        metrics: [
          { label: "Terminals", val: "Multi-lab mesh" },
          { label: "Audit Telemetry", val: "Tamper-evident" },
        ],
        footerNotice: "Local network failover redundancy",
      },
    },
    tutors: {
      icon: "👨‍🏫",
      tag: "Educators & Tutors",
      accent: "from-purple-600 to-pink-500",
      staggerClass: "bl-stagger-4",
      features: [
        "Interactive vector & KaTeX liveboard",
        "Ultra-low bandwidth 24kbps adaptive audio",
        "Real-time diagnostic polling in lectures",
      ],
      preview: {
        badge: "Live Stage",
        title: "Interactive Liveboard Canvas",
        metrics: [
          { label: "Audio Bitrate", val: "24kbps Stream" },
          { label: "Annotation", val: "Vector + LaTeX" },
        ],
        footerNotice: "Instant live diagnostic polls",
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
            TAILORED LEARNING PATHWAYS
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--bl-color-text-primary)] tracking-tight">
            Built for Every Stakeholder in Academic Success
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Dedicated tools engineered for candidate mastery, parental transparency, and institutional scale.
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
                          <span className="text-[8px] uppercase font-bold text-slate-400 block truncate">
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
