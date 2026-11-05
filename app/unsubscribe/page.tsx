"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { NotificationPreferences } from "@/app/lib/notificationPreferences";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const paramEmail = searchParams.get("email") || "";
  const paramToken = searchParams.get("token") || "";

  const [emailInput, setEmailInput] = useState(paramEmail);
  const [activeEmail, setActiveEmail] = useState(paramEmail);
  const [token, setToken] = useState(paramToken);
  const [loading, setLoading] = useState(Boolean(paramEmail || paramToken));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email: paramEmail,
    exam_results: true,
    classroom_alerts: true,
    streak_reminders: true,
    assignments: true,
    marketing_announcements: true,
    sms_alerts: true,
    unsubscribed_all: false,
  });

  useEffect(() => {
    if (!paramEmail && !paramToken) return;

    let active = true;
    async function fetchStatus() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (paramToken) query.set("token", paramToken);
        else if (paramEmail) query.set("email", paramEmail);

        const res = await fetch(`/api/notifications/unsubscribe?${query.toString()}`);
        const data = await res.json();

        if (active && res.ok && data.success) {
          setActiveEmail(data.email);
          setEmailInput(data.email);
          setPrefs(data.preferences);
          if (data.preferences.unsubscribed_all) {
            setMessage({
              text: "You are currently unsubscribed from BrainLab notification dispatches.",
              type: "info",
            });
          }
        }
      } catch {
        if (active) {
          setMessage({
            text: "Unable to load subscription details. Please check your network or enter your email below.",
            type: "error",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchStatus();
    return () => { active = false; };
  }, [paramEmail, paramToken]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setMessage({ text: "Please enter a valid candidate email address.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/notifications/unsubscribe?email=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveEmail(data.email);
        setPrefs(data.preferences);
        setToken("");
        if (data.preferences.unsubscribed_all) {
          setMessage({ text: "This email is currently unsubscribed.", type: "info" });
        } else {
          setMessage({ text: "Found your subscription record. Choose your preferences below.", type: "info" });
        }
      } else {
        setMessage({ text: data.error || "Unable to find subscription record.", type: "error" });
      }
    } catch {
      setMessage({ text: "Failed to connect to the subscription service.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    const targetEmail = activeEmail || emailInput.trim().toLowerCase();
    if (!targetEmail) {
      setMessage({ text: "Please provide an email address first.", type: "error" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, token, unsubscribeAll: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPrefs(data.preferences);
        setMessage({
          text: "You have been unsubscribed from all BrainLab notification dispatches.",
          type: "success",
        });
      } else {
        setMessage({ text: data.error || "Unsubscribe failed. Please retry.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error processing unsubscribe request.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleResubscribe = async () => {
    const targetEmail = activeEmail || emailInput.trim().toLowerCase();
    if (!targetEmail) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, token, resubscribe: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPrefs(data.preferences);
        setMessage({
          text: "Welcome back! You have successfully resubscribed to notifications.",
          type: "success",
        });
      } else {
        setMessage({ text: data.error || "Resubscribe failed.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error processing resubscribe request.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChannel = async (channel: keyof NotificationPreferences) => {
    const targetEmail = activeEmail || emailInput.trim().toLowerCase();
    if (!targetEmail) return;

    const nextVal = !prefs[channel];
    const updatedLocal = { ...prefs, [channel]: nextVal, unsubscribed_all: false };
    setPrefs(updatedLocal);
    setSaving(true);

    try {
      const res = await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          token,
          unsubscribeAll: false,
          [channel]: nextVal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPrefs(data.preferences);
        setMessage({ text: "Preferences updated.", type: "success" });
      }
    } catch {
      setMessage({ text: "Could not save channel preference.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-[#071127]/80 backdrop-blur-md px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black shadow-md group-hover:bg-blue-500 transition">
              B
            </span>
            <span className="text-base font-black tracking-tight text-white">BrainLab Academy</span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-bold text-blue-300 hover:text-white transition"
          >
            Learner Account &rarr;
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/30 text-2xl mb-3">
              📬
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Notification Preferences &amp; Unsubscribe
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
              Control which exam alerts, live class reminders, and revision updates you receive from BrainLab Academy.
            </p>
          </div>

          {/* Email Selector Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-md shadow-xl mb-6">
            <form onSubmit={handleLookup} className="space-y-4">
              <label htmlFor="email-lookup" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Candidate or Subscriber Email
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="email-lookup"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. candidate@gmail.com"
                  required
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-3 text-sm font-bold text-white transition disabled:opacity-50 shrink-0"
                >
                  {loading ? "Checking…" : "Look Up"}
                </button>
              </div>
            </form>

            {/* Alert Message Banner */}
            {message && (
              <div
                className={`mt-4 rounded-xl p-3 text-xs font-bold flex items-center justify-between ${
                  message.type === "success"
                    ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-200"
                    : message.type === "error"
                    ? "bg-rose-950/60 border border-rose-500/40 text-rose-200"
                    : "bg-blue-950/60 border border-blue-500/40 text-blue-200"
                }`}
              >
                <span>{message.text}</span>
                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  className="opacity-60 hover:opacity-100 text-sm ml-2 font-black"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Subscription Status & 1-Click Master Control */}
          {activeEmail && (
            <div className="space-y-6">
              {/* Master Action Banner */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Current Status for</span>
                      <span className="font-mono text-xs font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30 truncate max-w-[220px]">
                        {activeEmail}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${
                          prefs.unsubscribed_all ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
                        }`}
                      />
                      <span className="text-base font-bold text-white">
                        {prefs.unsubscribed_all
                          ? "Unsubscribed from all notifications"
                          : "Active Subscriber"}
                      </span>
                    </div>
                  </div>

                  {prefs.unsubscribed_all ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleResubscribe}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-xs font-black text-white transition active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      {saving ? "Updating…" : "Resubscribe to All"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleUnsubscribeAll}
                      className="rounded-xl border border-rose-500/40 bg-rose-950/50 hover:bg-rose-900/60 px-5 py-3 text-xs font-black text-rose-200 transition active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      {saving ? "Updating…" : "Unsubscribe from All"}
                    </button>
                  )}
                </div>
              </div>

              {/* Granular Channel Controls */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-md">
                <h2 className="text-base font-black text-white mb-1">
                  Customize Specific Notifications
                </h2>
                <p className="text-xs text-slate-400 mb-6">
                  You can toggle off individual alert types while keeping important score releases or classroom notices active.
                </p>

                <div className="space-y-4 divide-y divide-white/5">
                  {/* Channel 1: Exam Results */}
                  <div className="pt-4 first:pt-0 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                      <div>
                        <p className="text-sm font-bold text-white">Exam &amp; Mock Results</p>
                        <p className="text-xs text-slate-400">
                          Receive notifications when your CBT mock exam scores, ranking, and slips are released.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleChannel("exam_results")}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        prefs.exam_results && !prefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          prefs.exam_results && !prefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Channel 2: Live Classes */}
                  <div className="pt-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                      <div>
                        <p className="text-sm font-bold text-white">Live Classroom &amp; Masterclasses</p>
                        <p className="text-xs text-slate-400">
                          Alerts when instructors start a live interactive revision class or schedule a new masterclass.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleChannel("classroom_alerts")}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        prefs.classroom_alerts && !prefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          prefs.classroom_alerts && !prefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Channel 3: Study Streaks & Practice */}
                  <div className="pt-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                      <div>
                        <p className="text-sm font-bold text-white">Daily Revision Streaks</p>
                        <p className="text-xs text-slate-400">
                          Spaced repetition recalls and streak-saver reminders to keep your exam preparation consistent.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleChannel("streak_reminders")}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        prefs.streak_reminders && !prefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          prefs.streak_reminders && !prefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Channel 4: Assignments */}
                  <div className="pt-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      <div>
                        <p className="text-sm font-bold text-white">Assignments &amp; Grading</p>
                        <p className="text-xs text-slate-400">
                          Notifications when tutors grade your submitted homework or provide written corrections.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleChannel("assignments")}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        prefs.assignments && !prefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          prefs.assignments && !prefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Channel 5: Platform Updates */}
                  <div className="pt-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                      <div>
                        <p className="text-sm font-bold text-white">Platform Updates &amp; Announcements</p>
                        <p className="text-xs text-slate-400">
                          Free mock exam events, new JAMB syllabus features, and system maintenance advisories.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleChannel("marketing_announcements")}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        prefs.marketing_announcements && !prefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          prefs.marketing_announcements && !prefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Channel 6: SMS Notifications */}
                  <div className="pt-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                      <div>
                        <p className="text-sm font-bold text-white">SMS Text Alerts</p>
                        <p className="text-xs text-slate-400">
                          Direct SMS dispatches to your mobile number with exam access pins and emergency schedule changes.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleChannel("sms_alerts")}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        prefs.sms_alerts && !prefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          prefs.sms_alerts && !prefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Legal & Security Compliance Footer Notice */}
          <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>NDPA 2023 &amp; Anti-Spam Compliance:</strong> Unsubscribing stops all promotional, practice, and announcement dispatches. Essential security messages (such as password recovery codes and payment receipts) remain active for account protection.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} BrainLab Academy. All rights reserved.</p>
      </footer>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 p-8 text-white text-center">Loading notification preferences…</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
