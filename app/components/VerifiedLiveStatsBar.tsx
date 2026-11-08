"use client";

import { useEffect, useState } from "react";
import type { PlatformVerifiedStats } from "../lib/services/platformStatsService";

interface VerifiedLiveStatsBarProps {
  initialStats?: PlatformVerifiedStats | null;
}

export default function VerifiedLiveStatsBar({ initialStats }: VerifiedLiveStatsBarProps) {
  const [stats, setStats] = useState<PlatformVerifiedStats | null>(initialStats || null);
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    if (!initialStats) {
      fetch("/api/platform-stats")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: PlatformVerifiedStats | null) => {
          if (data && data.isLive) {
            setStats(data);
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [initialStats]);

  if (loading && !stats) return null;
  if (!stats) return null;

  // Build items array only for items with valid formatted numbers (Rule S7: suppressed below threshold)
  const items: Array<{ label: string; value: string; desc: string }> = [];

  if (stats.formattedQuestions) {
    items.push({
      label: "Practice Questions",
      value: stats.formattedQuestions,
      desc: "Curriculum-aligned & verified",
    });
  }

  if (stats.formattedAttempts) {
    items.push({
      label: "Mock Drills Completed",
      value: stats.formattedAttempts,
      desc: "Instant score analytics",
    });
  }

  if (stats.formattedSubjects) {
    items.push({
      label: "Curriculum Subjects",
      value: stats.formattedSubjects,
      desc: "JAMB UTME, WAEC & NECO",
    });
  }

  if (stats.formattedStemResources) {
    items.push({
      label: "STEM Simulations",
      value: stats.formattedStemResources,
      desc: "Interactive 3D & virtual labs",
    });
  }

  if (stats.formattedTutors) {
    items.push({
      label: "Accredited Tutors",
      value: stats.formattedTutors,
      desc: "Vetted subject specialists",
    });
  }

  // If no items pass threshold, hide the section completely
  if (items.length === 0) return null;

  // Format as-of date nicely
  let formattedAsOf = "";
  if (stats.asOfDate) {
    try {
      formattedAsOf = new Intl.DateTimeFormat("en-NG", {
        month: "short",
        year: "numeric",
      }).format(new Date(stats.asOfDate));
    } catch {
      // ignore
    }
  }

  return (
    <section
      aria-label="Authoritative Platform Scale"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="rounded-3xl border border-slate-200/90 bg-white/80 p-6 sm:p-8 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Verified Ecosystem Metrics
            </span>
          </div>
          {formattedAsOf && (
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Verified as of {formattedAsOf}
            </span>
          )}
        </div>

        <div className={`mt-6 grid grid-cols-2 gap-6 sm:grid-cols-${Math.min(items.length, 4)} lg:grid-cols-${items.length}`}>
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-950 dark:text-white font-mono tabular-nums">
                {item.value}
              </span>
              <span className="mt-1 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200">
                {item.label}
              </span>
              <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
