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
      staggerClass: string;
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
      staggerClass: "bl-stagger-1",
      preview: {
        badge: "Low-Data Sync Active",
        title: "Mobile CBT Practice Drill",
        metrics: [
          { label: "Offline Questions", val: "180 Cached" },
          { label: "Data Usage", val: "< 1.2 MB" },
        ],
        footerNotice: "Auto-syncs answers upon network reconnection",
      },
    },
    parents: {
      icon: "📊",
      tag: "Parents & Guardians",
      staggerClass: "bl-stagger-2",
      preview: {
        badge: "WhatsApp Summary Card",
        title: "Weekly Performance Report",
        metrics: [
          { label: "Syllabus Coverage", val: "68% on track" },
          { label: "Weakness Focus", val: "Organic Chemistry" },
        ],
        footerNotice: "Dispatched every Friday evening to parent WhatsApp",
      },
    },
    schools: {
      icon: "🏛️",
      tag: "Institutions & Principals",
      staggerClass: "bl-stagger-3",
      preview: {
        badge: "Institutional Console",
        title: "Batch CBT Examination Room",
        metrics: [
          { label: "Simultaneous Terminals", val: "Multi-lab support" },
          { label: "Audit Telemetry", val: "Tamper-evident logs" },
        ],
        footerNotice: "Centralized licensing with offline local-mesh fallback",
      },
    },
    tutors: {
      icon: "👨‍🏫",
      tag: "Educators & Tutors",
      staggerClass: "bl-stagger-4",
      preview: {
        badge: "Live Stage Canvas",
        title: "Interactive Classroom Liveboard",
        metrics: [
          { label: "Audio Bitrate", val: "Optimized 24kbps" },
          { label: "Annotation Tools", val: "LaTeX + Vector" },
        ],
        footerNotice: "Real-time candidate diagnostic polling during lecture",
      },
    },
  };

  return (
    <section
      id="audiences"
      aria-label="Tailored Experiences for Every Learner"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-[#070e1e]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 animate-bl-fade-up">
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

        {/* 4 Audience Cards Grid (Slots S2-01 to S2-04) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {audiences.map((aud) => {
            const meta = AUDIENCE_METADATA[aud.id] || {
              icon: "📚",
              tag: aud.label,
              staggerClass: "",
              preview: {
                badge: "Designed State",
                title: aud.label,
                metrics: [],
                footerNotice: "Authentic platform interface",
              },
            };
            const headline = resolveClaimValue(aud.headline, aud.label);
            const body = resolveClaimValue(aud.body, "");

            return (
              <div
                key={aud.id}
                className={`relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-[var(--bl-color-surface)] p-6 sm:p-7 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 dark:border-slate-800 bl-interactive-hover animate-bl-fade-up ${meta.staggerClass}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl" role="img" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {meta.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--bl-color-text-primary)] tracking-tight leading-snug">
                    {headline}
                  </h3>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {body}
                  </p>

                  {/* Designed Authentic UI Preview Card (Neutral State, Zero Stock Photography) */}
                  <div
                    className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 text-left min-h-[135px]"
                    role="region"
                    aria-label={`${aud.label} Interface Mockup`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-700 dark:text-slate-300">
                        {meta.preview.title}
                      </span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {meta.preview.badge}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                      {meta.preview.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="rounded-lg border border-slate-200/60 bg-white p-2 dark:border-slate-800 dark:bg-slate-800"
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">
                            {m.label}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {m.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 pt-1.5 dark:border-slate-800 truncate">
                      {meta.preview.footerNotice}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
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
