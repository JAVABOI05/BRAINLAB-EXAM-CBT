"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  type ExamCalendarEvent,
  type TimeRemaining,
  CANONICAL_UTME_EVENT,
  calculateExamCountdown,
  getActiveExamEvent,
  formatLagosDate,
} from "../lib/services/examCalendarService";

export interface ExamCountdownBannerProps {
  initialEvent?: ExamCalendarEvent | null;
  events?: ExamCalendarEvent[];
  serverTimestamp?: number; // Server-authoritative epoch timestamp (ms)
  studentProgramme?: string; // e.g. "utme", "waec"
  variant?: "hero" | "dashboard" | "compact";
  showCta?: boolean;
}

export default function ExamCountdownBanner({
  initialEvent,
  events: initialEvents,
  serverTimestamp,
  studentProgramme,
  variant = "hero",
  showCta = true,
}: ExamCountdownBannerProps) {
  // 1. Skew offset between client device clock and authoritative server clock
  const skewOffsetMsRef = useRef<number>(
    typeof serverTimestamp === "number" ? serverTimestamp - Date.now() : 0
  );

  // 2. Events state
  const [eventsList, setEventsList] = useState<ExamCalendarEvent[]>(() => {
    if (initialEvents && initialEvents.length > 0) return initialEvents;
    if (initialEvent) return [initialEvent];
    return [CANONICAL_UTME_EVENT];
  });

  // 3. Active event selection
  const [activeEvent, setActiveEvent] = useState<ExamCalendarEvent | null>(() => {
    if (initialEvent) return initialEvent;
    const pool = initialEvents && initialEvents.length > 0 ? initialEvents : [CANONICAL_UTME_EVENT];
    return getActiveExamEvent(pool, Date.now() + skewOffsetMsRef.current, studentProgramme);
  });

  // 4. Initial countdown calculation
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() => {
    if (!activeEvent) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, state: "ENDED", isExpired: true };
    }
    return calculateExamCountdown(activeEvent, Date.now() + skewOffsetMsRef.current);
  });

  const [srAnnouncement, setSrAnnouncement] = useState<string>("");
  const lastAnnouncedStateRef = useRef<string>("");

  // 5. Fetch published events from API if none passed via SSR props
  useEffect(() => {
    if (!initialEvents || initialEvents.length === 0) {
      const placementParam = variant === "dashboard" ? "dashboard" : "landing";
      const programmeParam = studentProgramme ? `&programme=${encodeURIComponent(studentProgramme)}` : "";

      fetch(`/api/exam-calendar?placement=${placementParam}${programmeParam}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.events && Array.isArray(data.events) && data.events.length > 0) {
            if (typeof data.serverTimestamp === "number") {
              skewOffsetMsRef.current = data.serverTimestamp - Date.now();
            }
            setEventsList(data.events);
            const currentEffectiveNow = Date.now() + skewOffsetMsRef.current;
            const currentActive = getActiveExamEvent(data.events, currentEffectiveNow, studentProgramme);
            setActiveEvent(currentActive);
            if (currentActive) {
              setTimeLeft(calculateExamCountdown(currentActive, currentEffectiveNow));
            }
          }
        })
        .catch(() => {
          // Keep canonical fallback if network unavailable
        });
    }
  }, [variant, studentProgramme, initialEvents]);

  // 6. Clock tick every second with server-skew correction and auto-advance
  useEffect(() => {
    if (!activeEvent) return;

    const interval = setInterval(() => {
      const effectiveNow = Date.now() + skewOffsetMsRef.current;
      const nextTime = calculateExamCountdown(activeEvent, effectiveNow);

      if (nextTime.state === "ENDED") {
        // Event ended -> auto-advance to next event in queue
        const nextActive = getActiveExamEvent(eventsList, effectiveNow, studentProgramme);
        if (nextActive && nextActive.id !== activeEvent.id) {
          setActiveEvent(nextActive);
          setTimeLeft(calculateExamCountdown(nextActive, effectiveNow));
        } else {
          setActiveEvent(null);
          setTimeLeft(nextTime);
        }
      } else {
        setTimeLeft(nextTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeEvent, eventsList, studentProgramme]);

  // 7. WCAG 2.1 AA screen reader announcement generator (announces on state changes and major milestones only)
  useEffect(() => {
    if (!activeEvent || timeLeft.isExpired) return;

    const stateKey = `${activeEvent.name}-${timeLeft.state}-${timeLeft.days}d`;
    if (stateKey !== lastAnnouncedStateRef.current) {
      lastAnnouncedStateRef.current = stateKey;
      if (timeLeft.state === "IN_PROGRESS") {
        setSrAnnouncement(`${activeEvent.name} is currently in progress.`);
      } else {
        setSrAnnouncement(
          `${activeEvent.name} begins in ${timeLeft.days} days, ${timeLeft.hours} hours, and ${timeLeft.minutes} minutes.`
        );
      }
    }
  }, [activeEvent, timeLeft.state, timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.isExpired]);

  // If no upcoming or in-progress event exists, hide the banner completely
  if (!activeEvent || (timeLeft.state === "ENDED" && timeLeft.isExpired)) {
    return null;
  }

  const lagosFormattedDate = formatLagosDate(activeEvent.start_time);

  // DASHBOARD VARIANT
  if (variant === "dashboard") {
    return (
      <aside
        aria-label="Target Examination Schedule"
        className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-[#0b1536] via-[#102256] to-[#0b1536] p-4 sm:p-5 text-white shadow-md dark:border-blue-900/50"
      >
        {/* Screen Reader Polite Live Region (Milestone updates only, zero second-tick clutter) */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {srAnnouncement}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200 border border-blue-400/30 shadow-inner"
              aria-hidden="true"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 16 14" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                  National Exam Schedule
                </span>
                {timeLeft.state === "IN_PROGRESS" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-reduce:animate-none animate-ping" />
                    In Progress
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 text-[9px] font-black uppercase text-rose-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 motion-reduce:animate-none animate-ping" />
                    Official Countdown
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white mt-0.5">
                {activeEvent.name}
              </h2>
              <p className="text-[11px] text-blue-200/90 font-medium">
                Commencing: {lagosFormattedDate} (WAT)
              </p>
            </div>
          </div>

          {/* Countdown Clock Digits - Tabular Numerals (CLS = 0) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 min-w-[50px] border border-white/10">
              <span className="text-base sm:text-lg font-black text-white leading-none font-mono tabular-nums">
                {timeLeft.days}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 mt-1">
                Days
              </span>
            </div>
            <span className="text-white/60 font-black text-sm" aria-hidden="true">:</span>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 min-w-[45px] border border-white/10">
              <span className="text-base sm:text-lg font-black text-white leading-none font-mono tabular-nums">
                {String(timeLeft.hours).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 mt-1">
                Hours
              </span>
            </div>
            <span className="text-white/60 font-black text-sm" aria-hidden="true">:</span>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 min-w-[45px] border border-white/10">
              <span className="text-base sm:text-lg font-black text-white leading-none font-mono tabular-nums">
                {String(timeLeft.minutes).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 mt-1">
                Mins
              </span>
            </div>
            <span className="text-white/60 font-black text-sm" aria-hidden="true">:</span>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-2.5 py-1.5 min-w-[45px] border border-white/10">
              <span className="text-base sm:text-lg font-black text-cyan-300 leading-none font-mono tabular-nums">
                {String(timeLeft.seconds).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 mt-1">
                Secs
              </span>
            </div>

            {showCta && (
              <Link
                href="/cbt"
                className="ml-2 hidden lg:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black px-4 py-2.5 text-xs shadow-md transition active:scale-95 shrink-0"
              >
                <span>Launch CBT Drill</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // HERO PILL VARIANT (LANDING PAGE)
  return (
    <div
      aria-label="National Examination Schedule Countdown"
      className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-full border border-blue-200/90 bg-white/95 px-3.5 py-2 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-md dark:border-blue-900/60 dark:bg-slate-900/90 dark:text-slate-100"
    >
      {/* Polite Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {srAnnouncement}
      </div>

      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 items-center justify-center" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full motion-reduce:animate-none animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
        </span>
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-blue-900 dark:text-cyan-300">
          {activeEvent.short_name || "UTME"} Countdown:
        </span>
      </div>

      <div className="flex items-center gap-1.5 font-mono tabular-nums text-[11px] sm:text-xs font-black">
        <span className="rounded-md bg-blue-100 dark:bg-blue-950/80 px-1.5 py-0.5 text-blue-950 dark:text-cyan-200 min-w-[28px] text-center">
          {timeLeft.days}d
        </span>
        <span className="text-slate-400" aria-hidden="true">:</span>
        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-slate-900 dark:text-slate-200 min-w-[28px] text-center">
          {String(timeLeft.hours).padStart(2, "0")}h
        </span>
        <span className="text-slate-400" aria-hidden="true">:</span>
        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-slate-900 dark:text-slate-200 min-w-[28px] text-center">
          {String(timeLeft.minutes).padStart(2, "0")}m
        </span>
        <span className="text-slate-400" aria-hidden="true">:</span>
        <span className="rounded-md bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 text-rose-700 dark:text-rose-300 min-w-[28px] text-center">
          {String(timeLeft.seconds).padStart(2, "0")}s
        </span>
      </div>

      {activeEvent.official_source_url ? (
        <a
          href={activeEvent.official_source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-block text-[11px] font-semibold text-blue-600 hover:text-blue-800 dark:text-cyan-400 underline decoration-blue-300 underline-offset-2"
        >
          Official Schedule (WAT)
        </a>
      ) : (
        <span className="hidden sm:inline-block text-[11px] font-medium text-slate-500 dark:text-slate-400">
          &bull; Official Session
        </span>
      )}
    </div>
  );
}
