"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ExamCountdownBannerProps {
  targetDate?: string; // ISO date string e.g. "2027-04-18T08:00:00Z"
  examLabel?: string;
  variant?: "hero" | "dashboard" | "compact";
  showCta?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

// Fallback target: 2027 JAMB UTME Official Mock & Main Exam Period
const DEFAULT_TARGET_DATE = "2027-04-18T08:00:00Z";
const DEFAULT_EXAM_LABEL = "2027 JAMB UTME National Examination";

function calculateTimeRemaining(targetDateIso: string): TimeRemaining {
  const target = new Date(targetDateIso).getTime();
  const now = Date.now();
  const diff = target - now;

  if (isNaN(target) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, isExpired: false };
}

export default function ExamCountdownBanner({
  targetDate = DEFAULT_TARGET_DATE,
  examLabel = DEFAULT_EXAM_LABEL,
  variant = "hero",
  showCta = true,
}: ExamCountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(targetDate)
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  // Prevent hydration mismatch on initial SSR
  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-4 py-1.5 text-xs font-bold text-blue-900 shadow-2xs backdrop-blur-xs">
        <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
        <span>Countdown to {examLabel}</span>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <aside
        aria-label="Target Examination Countdown"
        className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-900 via-indigo-900 to-[#0b1536] p-4 sm:p-5 text-white shadow-md dark:border-blue-900/50"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200 border border-blue-400/30 shadow-inner"
              aria-hidden="true"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                  Target Exam Schedule
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 text-[9px] font-black uppercase text-rose-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
                  Live Timer
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white mt-0.5">
                {examLabel}
              </h2>
            </div>
          </div>

          {/* Countdown Clock Digits */}
          <div className="flex items-center gap-2 sm:gap-3" aria-live="polite">
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 min-w-[50px] border border-white/10">
              <span className="text-base sm:text-lg font-black text-white leading-none">
                {timeLeft.days}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 mt-1">
                Days
              </span>
            </div>
            <span className="text-white/60 font-black text-sm">:</span>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 min-w-[45px] border border-white/10">
              <span className="text-base sm:text-lg font-black text-white leading-none">
                {String(timeLeft.hours).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 mt-1">
                Hours
              </span>
            </div>
            <span className="text-white/60 font-black text-sm">:</span>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 min-w-[45px] border border-white/10">
              <span className="text-base sm:text-lg font-black text-white leading-none">
                {String(timeLeft.minutes).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 mt-1">
                Mins
              </span>
            </div>
            <span className="text-white/60 font-black text-sm">:</span>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 min-w-[45px] border border-white/10">
              <span className="text-base sm:text-lg font-black text-cyan-300 leading-none">
                {String(timeLeft.seconds).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 mt-1">
                Secs
              </span>
            </div>

            {showCta && (
              <Link
                href="/exam"
                className="ml-2 hidden lg:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black px-4 py-2.5 text-xs shadow-md transition active:scale-95 shrink-0"
              >
                <span>Launch Mock Exam</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // Hero Pill Variant
  return (
    <div
      aria-label="Exam Target Countdown"
      className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-full border border-blue-200/90 bg-white/95 px-3.5 py-2 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-md dark:border-blue-900/60 dark:bg-slate-900/90 dark:text-slate-100"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
        </span>
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-blue-900 dark:text-cyan-300">
          UTME Countdown:
        </span>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs font-black">
        <span className="rounded-md bg-blue-100 dark:bg-blue-950/80 px-1.5 py-0.5 text-blue-950 dark:text-cyan-200">
          {timeLeft.days}d
        </span>
        <span className="text-slate-400">:</span>
        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-slate-900 dark:text-slate-200">
          {String(timeLeft.hours).padStart(2, "0")}h
        </span>
        <span className="text-slate-400">:</span>
        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-slate-900 dark:text-slate-200">
          {String(timeLeft.minutes).padStart(2, "0")}m
        </span>
        <span className="text-slate-400">:</span>
        <span className="rounded-md bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 text-rose-700 dark:text-rose-300">
          {String(timeLeft.seconds).padStart(2, "0")}s
        </span>
      </div>

      <span className="hidden sm:inline-block text-[11px] font-medium text-slate-500 dark:text-slate-400">
        &bull; 2027 JAMB Session
      </span>
    </div>
  );
}
