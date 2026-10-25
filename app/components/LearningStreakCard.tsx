"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "../lib/toast";

interface LearningStreakProps {
  currentStreak?: number;
  longestStreak?: number;
  lastActiveDate?: string | null;
  compact?: boolean;
}

const subscribeToLocalStorage = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("brainlab-local-storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("brainlab-local-storage", callback);
  };
};

const getLastActiveDateSnapshot = () =>
  typeof window === "undefined" ? "" : localStorage.getItem("brainlab_last_active_date") || "";
const getLastActiveDateServerSnapshot = () => "";
const getStreakCountSnapshot = () =>
  typeof window === "undefined" ? 0 : Number.parseInt(localStorage.getItem("brainlab_streak_count") || "0", 10) || 0;
const getStreakCountServerSnapshot = () => 0;
const getReminderSnapshot = () =>
  typeof window === "undefined" ? "" : localStorage.getItem("brainlab_streak_reminder") || "";
const getReminderServerSnapshot = () => "";

export default function LearningStreakCard({
  currentStreak = 0,
  longestStreak = 0,
  lastActiveDate,
  compact = false,
}: LearningStreakProps) {
  const localStreakCount = useSyncExternalStore(
    subscribeToLocalStorage,
    getStreakCountSnapshot,
    getStreakCountServerSnapshot
  );
  const streakDays = currentStreak > 0 ? currentStreak : localStreakCount;
  const maxStreak = Math.max(longestStreak, streakDays);
  const localLastActiveDate = useSyncExternalStore(
    subscribeToLocalStorage,
    getLastActiveDateSnapshot,
    getLastActiveDateServerSnapshot
  );
  const reminderPreferenceRaw = useSyncExternalStore(
    subscribeToLocalStorage,
    getReminderSnapshot,
    getReminderServerSnapshot
  );
  let reminderPreference: { enabled?: boolean; time?: string } = {};
  try {
    reminderPreference = reminderPreferenceRaw ? JSON.parse(reminderPreferenceRaw) : {};
  } catch {
    reminderPreference = {};
  }
  const reminderEnabled = Boolean(reminderPreference.enabled);
  const reminderTime = typeof reminderPreference.time === "string" ? reminderPreference.time : "19:00";
  const todayStr = new Date().toISOString().split("T")[0];
  const effectiveLastActiveDate = lastActiveDate || localLastActiveDate;
  const hasPracticedToday = effectiveLastActiveDate
    ? new Date(effectiveLastActiveDate).toISOString().split("T")[0] === todayStr
    : false;
  const [showReminderSettings, setShowReminderSettings] = useState(false);

  function saveReminderPreference(enabled: boolean, time: string) {
    localStorage.setItem("brainlab_streak_reminder", JSON.stringify({ enabled, time }));
    window.dispatchEvent(new Event("brainlab-local-storage"));
  }

  async function handleToggleReminder() {
    if (!reminderEnabled) {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted") {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") {
            toast.error("Please allow browser notifications to receive daily streak reminders.");
            return;
          }
        }
      }
      saveReminderPreference(true, reminderTime);
      toast.success(`Streak reminder set for ${reminderTime} daily! We'll help protect your flame 🔥.`);
    } else {
      saveReminderPreference(false, reminderTime);
    }
  }

  function handleSaveReminderTime(time: string) {
    saveReminderPreference(reminderEnabled, time);
  }

  // Generate 7-day activity pills for the current week
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday as 0

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 px-3.5 py-2 shadow-sm">
        <span className="text-xl animate-bounce" aria-hidden="true">🔥</span>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-amber-950 dark:text-amber-200">
              {streakDays} {streakDays === 1 ? "Day" : "Days"} Streak
            </span>
            {hasPracticedToday ? (
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 dark:text-rose-300 animate-pulse">
                At Risk
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-md shadow-orange-500/20 text-white">
            🔥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Daily Study Streak
              </span>
              {hasPracticedToday ? (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✓ Extended Today
                </span>
              ) : (
                <span className="rounded-full bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                  ⚠️ At Risk
                </span>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {streakDays} {streakDays === 1 ? "Day" : "Days"} Continuous
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personal Best: <strong className="text-slate-700 dark:text-slate-300">{Math.max(streakDays, maxStreak)} days</strong>
            </p>
          </div>
        </div>

        {/* Streak action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowReminderSettings(!showReminderSettings)}
            className="rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-700 transition active:scale-95 shadow-sm"
          >
            ⏰ {reminderEnabled ? "Alarm: " + reminderTime : "Set Streak Alarm"}
          </button>

          <a
            href="https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition active:scale-95 shadow-sm flex items-center gap-1.5"
            title="Receive streak alarms and live class links via WhatsApp"
          >
            <span>💬</span>
            <span>WhatsApp Alerts</span>
          </a>

          <Link
            href="/challenge-arena"
            className="rounded-xl bg-[#012153] hover:bg-[#071c43] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 active:scale-95"
          >
            Keep Streak Alive →
          </Link>
        </div>
      </div>

      {/* 7-Day Week Dots */}
      <div className="mt-5 border-t border-amber-100 dark:border-slate-800 pt-4">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="font-bold text-slate-700 dark:text-slate-300">This Week&apos;s Activity</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Practise daily to maintain multiplier bonus</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
          {daysOfWeek.map((day, idx) => {
            const isToday = idx === currentDayIndex;
            const isPast = idx < currentDayIndex;
            const activeDot = isToday ? hasPracticedToday : isPast;

            return (
              <div
                key={day}
                className={`rounded-xl p-2 transition-all ${
                  isToday
                    ? "border-2 border-amber-500 bg-amber-100/60 dark:bg-amber-950/60 font-black"
                    : "border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60"
                }`}
              >
                <span className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  {day}
                </span>
                <span className="mt-1 block text-base" aria-hidden="true">
                  {activeDot ? "🔥" : isToday ? "⏳" : "⚪"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak Reminder Settings Panel */}
      {showReminderSettings && (
        <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-950 p-4 shadow-sm text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-white">Daily Streak Alarm &amp; Notification</h4>
            <button
              onClick={() => setShowReminderSettings(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <p className="mt-1 text-slate-600 dark:text-slate-400 text-[11px]">
            We will dispatch an alert to your browser if you haven&apos;t completed a quiz by your chosen time.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={handleToggleReminder}
                className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Enable daily alarm reminder</span>
            </label>

            {reminderEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Alert Time:</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => handleSaveReminderTime(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* WhatsApp Study Alerts Box */}
          <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div>
              <p className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <span>💬</span>
                <span>Get Instant WhatsApp Streak &amp; Class Alerts</span>
              </p>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                Join 5,000+ candidates on the BrainLab WhatsApp Channel for live class schedules, daily quiz reminders, and UTME updates.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 text-[11px] shadow-sm transition active:scale-95 inline-flex items-center gap-1"
              >
                Join Channel ↗
              </a>
              <a
                href="https://wa.me/2348169389816?text=Hi%20BrainLab,%20please%20subscribe%20me%20to%20Daily%20Study%20Streak%20Reminders%20and%20Exam%20Alerts."
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 font-bold px-2.5 py-1.5 text-[11px] hover:bg-emerald-50 transition"
              >
                DM Desk 💬
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
