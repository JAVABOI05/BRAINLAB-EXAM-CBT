"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PrototypeHero() {
  // Live demo countdown timer to target UTME date (Admin-set placeholder)
  const [timeLeft, setTimeLeft] = useState({
    days: 142,
    hours: 14,
    minutes: 36,
    seconds: 45,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white py-14 sm:py-20 lg:py-24 dark:border-slate-800 dark:bg-[#070B14]">
      {/* Background glow anchor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[380px] w-full max-w-7xl bg-radial from-blue-500/10 via-transparent to-transparent pointer-events-none dark:from-sky-500/10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Main Hero Column */}
          <div className="lg:col-span-7">
            {/* Positioning Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-blue-800 dark:border-sky-500/30 dark:bg-sky-950/60 dark:text-sky-300">
              <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-sky-400 animate-pulse" />
              <span>One Intelligent Learning Ecosystem</span>
            </div>

            {/* Strategic Headline */}
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white leading-[1.12]">
              A Complete Journey from Learning to{" "}
              <span className="text-blue-600 dark:text-sky-400">Mastery.</span>
            </h1>

            {/* Subtitle Value Proposition */}
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl">
              Authentic JAMB UTME timed CBT simulations, syllabus-aligned Learning Hub lessons, hands-on STEM Studio experiments, and instant AI diagnostics designed for Nigerian candidates.
            </p>

            {/* Two Primary Actions Only (Eliminates Clutter) */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3.5 sm:items-center">
              <Link
                href="/cbt"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Start Practising (1 Free Daily Mock)
              </Link>
              <Link
                href="/syllabus"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 shadow-xs transition-colors hover:bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Official UTME Syllabus
              </Link>
            </div>

            {/* Honest Free Tier Truth Marker (Rule S6) */}
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              ✓ Free tier includes 1 full simulation daily &amp; 50 AI hints/mo. Step-by-step corrections require Premium.
            </p>
          </div>

          {/* National Exam Countdown & Artifact Card Column */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900/90">
              {/* Header with Coral Alert */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#FF5238]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Official Exam Target
                  </span>
                </div>
                <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  UTME 2027
                </span>
              </div>

              {/* Ticking Tabular Countdown */}
              <div className="mt-5 text-center">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  National Examination Countdown Clock
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2 font-mono">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {String(timeLeft.days).padStart(2, "0")}
                    </span>
                    <span className="mt-1 block text-[10px] font-sans font-bold uppercase text-slate-400">
                      Days
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </span>
                    <span className="mt-1 block text-[10px] font-sans font-bold uppercase text-slate-400">
                      Hours
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </span>
                    <span className="mt-1 block text-[10px] font-sans font-bold uppercase text-slate-400">
                      Mins
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="text-2xl sm:text-3xl font-black text-[#FF5238] dark:text-[#FF6B55]">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </span>
                    <span className="mt-1 block text-[10px] font-sans font-bold uppercase text-slate-400">
                      Secs
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-left dark:border-amber-900/60 dark:bg-amber-950/30">
                  <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong className="font-bold">DESIGN PLACEHOLDER:</strong> Countdown dynamically targets the official examination date configured in platform settings. Automatically hides if unset.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Standard 400-Point Scoring</span>
                  <span>180 Questions • 120 Mins</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
