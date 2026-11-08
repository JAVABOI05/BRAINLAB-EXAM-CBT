"use client";

import React from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";

export function HomeAudiences() {
  const audiences = HOMEPAGE_CONTENT_CONFIG.audiences;

  const AUDIENCE_METADATA = [
    {
      id: "students",
      icon: "🎯",
      tag: "Candidates & Learners",
      color: "from-blue-600/10 to-indigo-600/5",
    },
    {
      id: "parents",
      icon: "📊",
      tag: "Parents & Guardians",
      color: "from-emerald-600/10 to-teal-600/5",
    },
    {
      id: "schools",
      icon: "🏛️",
      tag: "Institutions & Principals",
      color: "from-amber-600/10 to-orange-600/5",
    },
    {
      id: "tutors",
      icon: "👨‍🏫",
      tag: "Educators & Tutors",
      color: "from-purple-600/10 to-pink-600/5",
    },
  ];

  return (
    <section
      id="audiences"
      aria-label="Tailored Experiences for Every Learner"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-[#070e1e]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-3">
            AUDIENCE ENTRY POINTS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
            Designed for Every Stakeholder in Academic Success
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Whether preparing for competitive examinations, monitoring child progress, managing school-wide testing, or teaching curriculum topics.
          </p>
        </div>

        {/* 4 Audience Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {audiences.map((aud) => {
            const meta = AUDIENCE_METADATA.find((m) => m.id === aud.id);
            const headline = resolveClaimValue(aud.headline, aud.label);
            const body = resolveClaimValue(aud.body, "");

            return (
              <div
                key={aud.id}
                className={`relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-[var(--bl-color-surface)] p-6 sm:p-7 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 dark:border-slate-800`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl" role="img" aria-hidden="true">
                      {meta?.icon || "📚"}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {meta?.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--bl-color-text-primary)] tracking-tight leading-snug">
                    {headline}
                  </h3>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {body}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <Link
                    href={aud.cta.href}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--bl-color-brand-primary)] hover:underline bl-focus-ring rounded-lg"
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
