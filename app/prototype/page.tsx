"use client";

import { useState } from "react";
import PrototypeHeader from "@/app/components/home/PrototypeHeader";
import PrototypeHero from "@/app/components/home/PrototypeHero";
import PrototypeBrainLabLoop from "@/app/components/home/PrototypeBrainLabLoop";
import PrototypeJoinChannel from "@/app/components/home/PrototypeJoinChannel";
import Link from "next/link";

type ViewportMode = "responsive" | "360" | "390" | "1280" | "1440";

export default function PrototypePage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [viewport, setViewport] = useState<ViewportMode>("responsive");
  const [specModalOpen, setSpecModalOpen] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = nextTheme;
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const getViewportWidthClass = () => {
    switch (viewport) {
      case "360":
        return "max-w-[360px] shadow-2xl border-x border-slate-300 dark:border-slate-700";
      case "390":
        return "max-w-[390px] shadow-2xl border-x border-slate-300 dark:border-slate-700";
      case "1280":
        return "max-w-[1280px] shadow-2xl border-x border-slate-300 dark:border-slate-700";
      case "1440":
        return "max-w-[1440px] shadow-2xl border-x border-slate-300 dark:border-slate-700";
      default:
        return "w-full";
    }
  };

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${theme === "dark" ? "dark" : ""}`}>
      {/* -------------------------------------------------------------------
          PROTOTYPE INSPECTION TOOLBAR (Sticky Top)
      ------------------------------------------------------------------- */}
      <aside aria-label="Prototype Evaluation Toolbar" className="sticky top-0 z-[100] border-b border-indigo-200 bg-indigo-900 px-4 py-2.5 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono font-bold tracking-wider uppercase text-indigo-200">
              PROTOTYPE REVIEW
            </span>
            <span className="rounded-md bg-indigo-800 px-2 py-0.5 font-mono text-[10px] text-indigo-100">
              Branch: prototype/homepage-design
            </span>
          </div>

          {/* Viewport Dimension Selectors */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-indigo-200 hidden sm:inline">Viewport:</span>
            <button
              type="button"
              onClick={() => setViewport("responsive")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                viewport === "responsive" ? "bg-white text-indigo-900" : "bg-indigo-800/80 text-white hover:bg-indigo-700"
              }`}
            >
              Fluid Full
            </button>
            <button
              type="button"
              onClick={() => setViewport("360")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                viewport === "360" ? "bg-white text-indigo-900" : "bg-indigo-800/80 text-white hover:bg-indigo-700"
              }`}
            >
              360px (Compact Mobile)
            </button>
            <button
              type="button"
              onClick={() => setViewport("390")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                viewport === "390" ? "bg-white text-indigo-900" : "bg-indigo-800/80 text-white hover:bg-indigo-700"
              }`}
            >
              390px (Modern Mobile)
            </button>
            <button
              type="button"
              onClick={() => setViewport("1280")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                viewport === "1280" ? "bg-white text-indigo-900" : "bg-indigo-800/80 text-white hover:bg-indigo-700"
              }`}
            >
              1280px (Desktop)
            </button>
            <button
              type="button"
              onClick={() => setViewport("1440")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                viewport === "1440" ? "bg-white text-indigo-900" : "bg-indigo-800/80 text-white hover:bg-indigo-700"
              }`}
            >
              1440px (Wide)
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg bg-indigo-800 px-3 py-1 font-bold text-indigo-100 hover:bg-indigo-700"
            >
              Theme: {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
            <button
              type="button"
              onClick={() => setSpecModalOpen(true)}
              className="rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-500"
            >
              View Design Spec
            </button>
            <Link
              href="/"
              className="rounded-lg border border-indigo-400/40 px-2.5 py-1 font-medium text-indigo-200 hover:text-white"
            >
              Exit to Live Site
            </Link>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------------
          PROTOTYPE CANVAS CONTAINER (Viewport Constraint Sim)
      ------------------------------------------------------------------- */}
      <main className="mx-auto flex justify-center py-4 sm:py-8">
        <div className={`transition-all duration-300 ${getViewportWidthClass()} bg-white dark:bg-[#070B14]`}>
          {/* Disclaimer Header Tag */}
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            ⚠️ <strong>DESIGN PROTOTYPE ONLY</strong> — All numbers, countdowns, and claims are design placeholders. Zero hardcoded claims in production.
          </div>

          {/* 1. Header Prototype */}
          <PrototypeHeader theme={theme} onToggleTheme={toggleTheme} />

          {/* 2. Hero Prototype */}
          <PrototypeHero />

          {/* 3. The BrainLab Loop Section Prototype */}
          <PrototypeBrainLabLoop />

          {/* 4. Join Our Channel Block Prototype */}
          <PrototypeJoinChannel />

          {/* Prototype Footer Anchor */}
          <footer className="border-t border-slate-200 bg-slate-50 py-10 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#0B1536] dark:text-slate-400">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              BrainLab Academy Prototype Environment
            </p>
            <p className="mt-1">
              Evaluated across 360px, 390px, 1280px, and 1440px viewport targets in light and dark mode.
            </p>
          </footer>
        </div>
      </main>

      {/* -------------------------------------------------------------------
          DESIGN SPECIFICATION OVERLAY MODAL
      ------------------------------------------------------------------- */}
      {specModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Design Direction &amp; Asset Specification
              </h3>
              <button
                type="button"
                onClick={() => setSpecModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Brand Palette:</p>
                <div className="mt-2 flex gap-2 font-mono text-[10px]">
                  <span className="rounded-md bg-[#0B1536] px-2 py-1 text-white">#0B1536 Deep Navy</span>
                  <span className="rounded-md bg-[#1356E8] px-2 py-1 text-white">#1356E8 Electric Blue</span>
                  <span className="rounded-md bg-[#FF5238] px-2 py-1 text-white">#FF5238 Coral</span>
                  <span className="rounded-md bg-[#25D366] px-2 py-1 text-slate-950">#25D366 WhatsApp</span>
                  <span className="rounded-md bg-[#F4F6FA] px-2 py-1 text-slate-900 border">#F4F6FA Neutral</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 dark:text-white">Typography &amp; Performance Budget:</p>
                <p className="mt-1">
                  Native system font stack (0 KB font blocking). KaTeX formula rendering embedded for math/science. Total homepage JS transfer budgeted at &lt; 180 KB.
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-900 dark:text-white">Motion Spec &amp; Anti-Patterns Avoided:</p>
                <p className="mt-1">
                  Full `@media (prefers-reduced-motion: reduce)` compliance. Zero autoplay video, zero heavy Three.js on marketing page, zero unanchored emojis in primary feature cards.
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 text-right dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSpecModalOpen(false)}
                className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
