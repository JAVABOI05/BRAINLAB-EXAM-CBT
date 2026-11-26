"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  fetchPublishedExamEvents,
  calculateExamCountdown,
  formatLagosDate,
  type ExamCalendarEvent,
  type TimeRemaining,
} from "@/app/lib/services/examCalendarService";

const PROGRAMME_FILTERS = [
  { id: "all", label: "All Examinations" },
  { id: "utme", label: "JAMB UTME" },
  { id: "waec", label: "WAEC SSCE" },
  { id: "neco", label: "NECO SSCE" },
  { id: "post_utme", label: "Post-UTME" },
];

export default function ExamCalendarPage() {
  const [events, setEvents] = useState<ExamCalendarEvent[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await fetchPublishedExamEvents();
        if (mounted) {
          setEvents(data);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();

    // 1-minute ticker for countdowns to avoid excessive re-renders
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (selectedProgramme === "all") return events;
    return events.filter(
      (e) => e.programme.toLowerCase() === selectedProgramme.toLowerCase() || e.programme === "all"
    );
  }, [events, selectedProgramme]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Header Banner */}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/70 dark:text-blue-300">
                Official National Examination Schedule
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                National Examination Calendar
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Verified timetable dates, official registration deadlines, and countdowns for JAMB UTME, WAEC, NECO, and Post-UTME examinations across Nigeria (Africa/Lagos WAT).
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/resources"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                ← Academic Resources
              </Link>
              <Link
                href="/cbt"
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-900 px-4 py-2.5 text-xs font-black text-white shadow-sm transition dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                Start CBT Practice →
              </Link>
            </div>
          </div>

          {/* Programme Filter Tabs */}
          <div className="mt-8 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {PROGRAMME_FILTERS.map((filter) => {
              const isActive = selectedProgramme === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedProgramme(filter.id)}
                  className={`rounded-xl px-3.5 py-2 font-bold whitespace-nowrap transition ${
                    isActive
                      ? "bg-[#012153] text-white shadow-xs dark:bg-blue-600"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Events List */}
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">Loading verified examination calendar...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No examination events currently published for this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const countdown: TimeRemaining = calculateExamCountdown(event, nowMs);

              let badgeStyle = "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800";
              let statusLabel = "UPCOMING";

              if (countdown.state === "IN_PROGRESS") {
                badgeStyle = "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800";
                statusLabel = "IN PROGRESS";
              } else if (countdown.state === "ENDED") {
                badgeStyle = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
                statusLabel = "COMPLETED";
              }

              return (
                <div
                  key={event.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 sm:p-8"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeStyle}`}>
                          {statusLabel}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {event.programme.toUpperCase()}
                        </span>
                      </div>

                      <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                        {event.name}
                      </h2>

                      {event.short_note && (
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                          {event.short_note}
                        </p>
                      )}
                    </div>

                    {/* Countdown Pill */}
                    {countdown.state === "UPCOMING" && (
                      <div className="shrink-0 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-center dark:border-blue-900 dark:bg-blue-950/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-300">
                          Time Remaining
                        </p>
                        <p className="mt-1 font-mono text-lg font-black text-blue-950 dark:text-white">
                          {countdown.days}d {countdown.hours}h {countdown.minutes}m
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dates & Source Link */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                    <div className="space-y-1">
                      <p className="text-slate-500 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200">Start Date:</strong>{" "}
                        {formatLagosDate(event.start_time)}
                      </p>
                      {event.end_time && (
                        <p className="text-slate-500 dark:text-slate-400">
                          <strong className="text-slate-800 dark:text-slate-200">End Date:</strong>{" "}
                          {formatLagosDate(event.end_time)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {event.official_source_url && (
                        <a
                          href={event.official_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-bold text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition"
                        >
                          <span>Official Portal Source</span>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                      )}
                      <Link
                        href="/cbt"
                        className="rounded-xl bg-[#012153] hover:bg-blue-900 px-3.5 py-1.5 font-bold text-white transition dark:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        Prepare with CBT
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
