"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";

export function HomeBrainLabLoop() {
  const loopStages = HOMEPAGE_CONTENT_CONFIG.loopStages;
  const [activeStageId, setActiveStageId] = useState<string>("learn");

  const STAGE_ROUTE_MAP: Record<string, { href: string; label: string; icon: string }> = {
    learn: { href: "/learn", label: "Explore Learning Hub", icon: "📖" },
    practise: { href: "/cbt", label: "Launch CBT Simulator", icon: "⏱️" },
    diagnose: { href: "/learning-dna", label: "View Diagnostic DNA", icon: "🔍" },
    improve: { href: "/ai-learning", label: "Start AI Socratic Drill", icon: "🤖" },
    master: { href: "/challenge-arena", label: "Enter Challenge Arena", icon: "🏆" },
  };

  const activeStage =
    loopStages.find((s) => s.id === activeStageId) || loopStages[0];
  const activeRoute = STAGE_ROUTE_MAP[activeStage.id] || {
    href: "/products",
    label: "Explore Products",
    icon: "🚀",
  };

  return (
    <section
      id="the-loop"
      aria-label="The BrainLab Pedagogical Loop"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#070D18]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-3">
            THE BRAINLAB LOOP
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
            A Continuous 5-Stage Journey from Concept to Mastery
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Every product in the ecosystem maps to a vital pedagogical phase, ensuring students never practice blindly without understanding root causes.
          </p>
        </div>

        {/* 5-Stage Stepper Navigation */}
        <div
          role="tablist"
          aria-label="Loop Stages"
          className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-10"
        >
          {loopStages.map((stage) => {
            const isSelected = stage.id === activeStageId;
            const route = STAGE_ROUTE_MAP[stage.id];

            return (
              <button
                key={stage.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => setActiveStageId(stage.id)}
                className={`
                  flex flex-col items-center sm:items-start text-center sm:text-left p-4 rounded-2xl border transition-all duration-180 bl-focus-ring
                  ${
                    isSelected
                      ? "border-[var(--bl-color-brand-primary)] bg-blue-50/70 shadow-sm dark:bg-blue-950/40 dark:border-blue-500"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/60"
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm sm:text-base">{route?.icon}</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    STAGE {stage.number}
                  </span>
                </div>
                <span
                  className={`text-sm sm:text-base font-extrabold tracking-tight ${
                    isSelected
                      ? "text-[var(--bl-color-brand-primary)] dark:text-blue-400"
                      : "text-[var(--bl-color-text-primary)]"
                  }`}
                >
                  {stage.title}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 hidden sm:block mt-0.5">
                  {stage.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detailed Panel */}
        <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-10 lg:p-12 shadow-sm dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-950/80">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Stage Info */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bl-color-brand-primary)] text-white text-base font-black">
                  {activeStage.number}
                </span>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--bl-color-text-primary)]">
                    {activeStage.title}: {activeStage.subtitle}
                  </h3>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Stage {activeStage.number} of 05 in the BrainLab Cycle
                  </span>
                </div>
              </div>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeStage.description}
              </p>

              {/* Mapped Products Pills */}
              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2.5">
                  Integrated Products in this Stage:
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeStage.products.map((prod) => (
                    <span
                      key={prod}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>{prod}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* STEM Studio Integration Callout */}
              {activeStage.stemRole && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-4 text-xs sm:text-sm text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    STEM Studio Role:{" "}
                  </span>
                  <span>{activeStage.stemRole}</span>
                </div>
              )}
            </div>

            {/* Right Column: Stage Direct Entry Trigger */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
              <span className="text-5xl" role="img" aria-hidden="true">
                {activeRoute.icon}
              </span>
              <div>
                <h4 className="text-lg font-bold text-[var(--bl-color-text-primary)]">
                  Ready to {activeStage.title.toLowerCase()}?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Launch the dedicated workflow for this pedagogical stage.
                </p>
              </div>
              <Link
                href={activeRoute.href}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--bl-color-brand-primary)] hover:bg-[var(--bl-color-brand-primary-hover)] px-6 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] bl-focus-ring min-h-[44px]"
              >
                <span>{activeRoute.label}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
