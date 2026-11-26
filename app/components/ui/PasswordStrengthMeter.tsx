"use client";

import { useMemo } from "react";
import { evaluatePasswordStrength, type PasswordRole } from "@/app/lib/passwordStrength";

interface PasswordStrengthMeterProps {
  password: string;
  role?: PasswordRole;
  showRequirements?: boolean;
  className?: string;
}

export function PasswordStrengthMeter({
  password,
  role = "student",
  showRequirements = true,
  className = "",
}: PasswordStrengthMeterProps) {
  const result = useMemo(() => {
    return evaluatePasswordStrength(password, role);
  }, [password, role]);

  if (!password) {
    return null;
  }

  const { level, label, color, feedback, requirements } = result;

  // Segment styling
  const isWeak = level === "weak" || level === "good" || level === "strong";
  const isGood = level === "good" || level === "strong";
  const isStrong = level === "strong";

  const badgeStyles = {
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    slate: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  }[color];

  return (
    <div className={`mt-2 space-y-2 text-left ${className}`} aria-live="polite">
      {/* Header: Label and Progress Level */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Password Strength:
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badgeStyles}`}
        >
          {label}
        </span>
      </div>

      {/* 3-Segment Progress Indicator */}
      <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
        <div
          className={`rounded-full transition-all duration-300 ${
            isWeak
              ? level === "weak"
                ? "bg-rose-500"
                : level === "good"
                ? "bg-amber-500"
                : "bg-emerald-500"
              : "bg-slate-200 dark:bg-slate-800"
          }`}
        />
        <div
          className={`rounded-full transition-all duration-300 ${
            isGood
              ? level === "good"
                ? "bg-amber-500"
                : "bg-emerald-500"
              : "bg-slate-200 dark:bg-slate-800"
          }`}
        />
        <div
          className={`rounded-full transition-all duration-300 ${
            isStrong ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
          }`}
        />
      </div>

      {/* Helpful Feedback Tip */}
      {feedback && (
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
          {feedback}
        </p>
      )}

      {/* Structured Requirements Checklist */}
      {showRequirements && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 border-t border-slate-100 dark:border-white/5">
          {requirements.map((req) => (
            <li
              key={req.id}
              className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                req.met
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-slate-500 dark:text-slate-500"
              }`}
            >
              <span
                className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold ${
                  req.met
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                }`}
                aria-hidden="true"
              >
                {req.met ? "✓" : "○"}
              </span>
              <span>{req.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
