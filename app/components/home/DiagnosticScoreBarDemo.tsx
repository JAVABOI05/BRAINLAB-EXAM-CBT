"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./DiagnosticScoreBarDemo.module.css";

interface DiagnosticSubject {
  name: string;
  subtopic: string;
  score: number;
  grade: "Strong" | "On Track" | "Needs Review";
  theme: "emerald" | "blue" | "rose";
}

const ILLUSTRATIVE_SUBJECTS: DiagnosticSubject[] = [
  {
    name: "Use of English",
    subtopic: "Concord & Lexis Mastery",
    score: 91,
    grade: "Strong",
    theme: "emerald",
  },
  {
    name: "Mathematics",
    subtopic: "Algebra & Coordinate Geometry",
    score: 88,
    grade: "Strong",
    theme: "emerald",
  },
  {
    name: "Physics",
    subtopic: "Current Electricity & Circuits",
    score: 82,
    grade: "On Track",
    theme: "blue",
  },
  {
    name: "Chemistry",
    subtopic: "Organic Chemistry (Alkanols & Esters)",
    score: 42,
    grade: "Needs Review",
    theme: "rose",
  },
];

export function DiagnosticScoreBarDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"bars" | "radar">("bars");

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) {
      setHasStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || hasAnimatedRef.current) return;
        hasAnimatedRef.current = true;
        setHasStarted(true);
        observer.disconnect();
      },
      { threshold: 0.25 }
    );

    observer.observe(node);

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setHasStarted(true);
        observer.disconnect();
      }
    };

    motionPreference.addEventListener("change", handleMotionPreference);
    return () => {
      observer.disconnect();
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.container}
      data-testid="brainlab-diagnostic-score-bars"
      aria-label="Illustrative Diagnostic Subject Performance Preview"
      data-claim-type="ILLUSTRATIVE_DEMO"
    >
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span>Diagnostic Performance Insights</span>
        </div>
        <div className={styles.modeToggle} role="tablist" aria-label="Diagnostic Visualization View">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "bars"}
            onClick={() => setViewMode("bars")}
            className={`${styles.toggleButton} ${viewMode === "bars" ? styles.toggleButtonActive : ""}`}
          >
            Score Bars
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "radar"}
            onClick={() => setViewMode("radar")}
            className={`${styles.toggleButton} ${viewMode === "radar" ? styles.toggleButtonActive : ""}`}
          >
            Radar Matrix
          </button>
        </div>
      </div>

      {viewMode === "bars" ? (
        <div className={styles.card}>
          {ILLUSTRATIVE_SUBJECTS.map((sub) => {
            const gradeClass =
              sub.theme === "emerald"
                ? styles.scoreStrong
                : sub.theme === "blue"
                ? styles.scoreOnTrack
                : styles.scoreWarning;

            const fillThemeClass =
              sub.theme === "emerald"
                ? styles.fillEmerald
                : sub.theme === "blue"
                ? styles.fillBlue
                : styles.fillRose;

            return (
              <div key={sub.name} className={styles.subjectRow}>
                <div className={styles.subjectMeta}>
                  <div className={styles.subjectName}>
                    <span>{sub.name}</span>
                    <span className={styles.subjectSub}>&bull; {sub.subtopic}</span>
                  </div>
                  <span className={`${styles.scorePill} ${gradeClass}`}>
                    {sub.score}% {sub.grade}
                  </span>
                </div>
                <div
                  className={styles.track}
                  role="progressbar"
                  aria-valuenow={hasStarted ? sub.score : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${sub.name}: ${sub.score} percent, ${sub.grade}`}
                >
                  <div
                    className={`${styles.fill} ${fillThemeClass} ${
                      !hasStarted ? styles.fillZero : ""
                    }`}
                    style={{ width: hasStarted ? `${sub.score}%` : "0%" }}
                  />
                </div>
              </div>
            );
          })}

          <div className={styles.previewNotice}>
            <div className={styles.noticeLeft}>
              <span className={styles.noticeDot} aria-hidden="true" />
              <span>Illustrative preview &bull; No candidate session recorded</span>
            </div>
            <span>Calibrates from real mock attempts</span>
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-center h-44 shadow-xs">
          <svg viewBox="0 0 200 200" className="w-44 h-44 overflow-visible" aria-label="5-axis radar chart showing subject performance">
            {/* Radar Grid Rings */}
            <polygon points="100,20 176,75 147,165 53,165 24,75" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            <polygon points="100,50 148,85 130,145 70,145 52,85" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            <polygon points="100,75 124,92 115,122 85,122 76,92" fill="none" stroke="#e2e8f0" strokeWidth="1" />

            {/* Axis Lines */}
            <line x1="100" y1="100" x2="100" y2="20" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="100" y1="100" x2="176" y2="75" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="100" y1="100" x2="147" y2="165" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="100" y1="100" x2="53" y2="165" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="100" y1="100" x2="24" y2="75" stroke="#cbd5e1" strokeWidth="1" />

            {/* Candidate Performance Polygon */}
            <polygon
              points="100,32 165,80 135,155 60,140 38,82"
              fill="rgba(37, 99, 235, 0.2)"
              stroke="#2563eb"
              strokeWidth="2"
            />

            {/* Data Points */}
            <circle cx="100" cy="32" r="3" fill="#2563eb" />
            <circle cx="165" cy="80" r="3" fill="#2563eb" />
            <circle cx="135" cy="155" r="3" fill="#2563eb" />
            <circle cx="60" cy="140" r="3" fill="#e11d48" />
            <circle cx="38" cy="82" r="3" fill="#2563eb" />

            {/* Axis Labels */}
            <text x="100" y="14" fill="#64748b" fontSize="8" textAnchor="middle">Math (88%)</text>
            <text x="180" y="75" fill="#64748b" fontSize="8">Physics (82%)</text>
            <text x="150" y="178" fill="#64748b" fontSize="8">English (91%)</text>
            <text x="50" y="178" fill="#e11d48" fontSize="8" fontWeight="bold">Chemistry (42%)</text>
            <text x="10" y="75" fill="#64748b" fontSize="8">Biology (78%)</text>
          </svg>
        </div>
      )}

      {/* Flagged Targeted Action */}
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs flex items-center justify-between shadow-xs">
        <div>
          <span className="text-rose-700 font-bold block text-[11px]">Flagged Diagnostic Weakness:</span>
          <span className="text-slate-900 text-[11px] font-semibold">Organic Chemistry (Alkanols &amp; Esters)</span>
        </div>
        <span className="rounded-md bg-rose-600 text-white px-2 py-1 text-[10px] font-black shadow-xs">
          5 Remedial Drills
        </span>
      </div>
    </div>
  );
}
