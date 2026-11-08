"use client";

import React from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";

export function HomeProductShowcase() {
  const products = HOMEPAGE_CONTENT_CONFIG.products;

  const PRODUCT_VISUAL_MAP: Record<string, { icon: string; previewBadge: string; features: string[] }> = {
    "cbt-simulator": {
      icon: "⏱️",
      previewBadge: "UTME Blueprint",
      features: [
        "Standard 4-subject combination selection",
        "Official on-screen calculator & palette",
        "Offline-resilient answer caching",
      ],
    },
    "learning-hub": {
      icon: "📚",
      previewBadge: "Curriculum Notes",
      features: [
        "Topic-by-topic structured lesson blocks",
        "Audio explainers for auditory learners",
        "Curriculum objectives aligned with NERDC",
      ],
    },
    "stem-studio": {
      icon: "🔬",
      previewBadge: "Virtual Labs",
      features: [
        "Interactive circuit & logic simulation",
        "Kinematics & reaction parameter sandboxes",
        "Visual 3D organelle and biological models",
      ],
    },
    "ai-tutor": {
      icon: "🤖",
      previewBadge: "Socratic AI",
      features: [
        "Step-by-step hint assistance without spoil",
        "Diagnostic error identification from mock tests",
        "Automated reinforcement drill packs",
      ],
    },
    "live-classroom": {
      icon: "👨‍🏫",
      previewBadge: "Live Stage",
      features: [
        "Low-bandwidth live tutor audio/video",
        "Interactive collaborative whiteboard stage",
        "Full session archive recording playback",
      ],
    },
    "challenge-arena": {
      icon: "⚡",
      previewBadge: "Live 1v1",
      features: [
        "Head-to-head live academic sprint duels",
        "Institutional school tournaments",
        "Real-time speed & accuracy rating leaderboards",
      ],
    },
  };

  return (
    <section
      id="products"
      aria-label="Integrated Learning Products"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-[#070e1e]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-3">
            PRODUCT SHOWCASE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
            Six Purpose-Built Products. Zero Disconnected Tools.
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Every product connects directly to your central learning profile, synchronizing your strengths, weaknesses, and exam trajectory across all subjects.
          </p>
        </div>

        {/* 6 Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {products.map((prod) => {
            const visual = PRODUCT_VISUAL_MAP[prod.id] || {
              icon: "✨",
              previewBadge: "Tool",
              features: [],
            };
            const tagline = resolveClaimValue(prod.tagline, "");
            const description = resolveClaimValue(prod.description, "");

            return (
              <div
                key={prod.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-[var(--bl-color-surface)] p-6 sm:p-8 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 dark:border-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl" role="img" aria-hidden="true">
                      {visual.icon}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                      {prod.badge || visual.previewBadge}
                    </span>
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    {prod.category}
                  </span>

                  <h3 className="text-xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
                    {prod.name}
                  </h3>

                  <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {tagline}
                  </p>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {description}
                  </p>

                  {/* Highlighted Feature Bullets */}
                  <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                    {visual.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <svg
                          className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <Link
                    href={prod.href}
                    className="inline-flex w-full items-center justify-between rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-[var(--bl-color-brand-primary)] dark:bg-slate-800/80 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition bl-focus-ring min-h-[44px]"
                  >
                    <span>Explore {prod.name}</span>
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
