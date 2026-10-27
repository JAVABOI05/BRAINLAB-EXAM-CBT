"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getAuthRedirectUrl } from "../lib/authRedirect";
import { useLearnerTheme, type AppearancePreference } from "../components/LearnerThemeProvider";

const appearanceChoices: { value: AppearancePreference; title: string; description: string; icon: string }[] = [
  { value: "light", title: "Light", description: "A bright, clear learning space.", icon: "☀" },
  { value: "dark", title: "Dark", description: "A darker screen for low-light study.", icon: "☾" },
  { value: "system", title: "System", description: "Follow your device appearance automatically.", icon: "◐" },
];

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "BL";
}

export default function LearnerSettingsClient() {
  const router = useRouter();
  const { appearance, resolvedTheme, setAppearance } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetBusy, setResetBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  // Privacy & Profile Customization State
  const [customName, setCustomName] = useState("");
  const [hideEmail, setHideEmail] = useState(true);
  const [requireMessageRequest, setRequireMessageRequest] = useState(true);
  const [requireGroupApproval, setRequireGroupApproval] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState("");
  const [privacyError, setPrivacyError] = useState("");

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<{
    exam_results: boolean;
    classroom_alerts: boolean;
    streak_reminders: boolean;
    assignments: boolean;
    marketing_announcements: boolean;
    sms_alerts: boolean;
    unsubscribed_all: boolean;
  }>({
    exam_results: true,
    classroom_alerts: true,
    streak_reminders: true,
    assignments: true,
    marketing_announcements: true,
    sms_alerts: true,
    unsubscribed_all: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState("");
  const [notifError, setNotifError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        router.replace("/account");
        return;
      }
      setUser(data.user);
      const meta = data.user.user_metadata || {};
      setCustomName(meta.full_name || meta.name || "");
      setHideEmail(meta.hide_email !== false);
      setRequireMessageRequest(meta.require_message_request !== false);
      setRequireGroupApproval(meta.require_group_approval !== false);
      setReadReceipts(meta.read_receipts !== false);
      setLoading(false);

      // Load notification preferences
      fetch("/api/notifications/preferences")
        .then((r) => r.json())
        .then((prefData) => {
          if (active && prefData.success && prefData.preferences) {
            setNotifPrefs(prefData.preferences);
          }
        })
        .catch(() => {});

      // Load blocked users
      fetch("/api/messages/block")
        .then((r) => r.json())
        .then((blockData) => {
          if (active && blockData.success && Array.isArray(blockData.blockedUsers)) {
            setBlockedUsers(blockData.blockedUsers);
          }
        })
        .catch(() => {});
    }).catch(() => {
      if (active) router.replace("/account");
    });
    return () => { active = false; };
  }, [router]);

  async function sendPasswordReset() {
    if (!user?.email) {
      setResetError("Your account email is unavailable. Please use the account recovery page.");
      return;
    }
    setResetBusy(true);
    setResetError("");
    setResetMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: getAuthRedirectUrl("/auth/reset-password"),
      });
      if (error) setResetError("We could not send a password recovery email. Please try again.");
      else setResetMessage("If this account can receive recovery messages, a password reset link will be sent to your email.");
    } catch {
      setResetError("We could not contact the account service. Check your connection and try again.");
    } finally {
      setResetBusy(false);
    }
  }

  async function savePrivacySettings(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setPrivacySaving(true);
    setPrivacySuccess("");
    setPrivacyError("");

    try {
      const trimmedName = customName.trim();
      const nextMetadata = {
        ...(user.user_metadata || {}),
        full_name: trimmedName || user.user_metadata?.full_name || "Learner",
        name: trimmedName || user.user_metadata?.name || "Learner",
        hide_email: hideEmail,
        require_message_request: requireMessageRequest,
        require_group_approval: requireGroupApproval,
        read_receipts: readReceipts,
      };

      const { data, error } = await supabase.auth.updateUser({
        data: nextMetadata,
      });

      if (error || !data.user) {
        setPrivacyError(error?.message || "Could not save privacy preferences.");
      } else {
        setUser(data.user);
        try {
          const savedCandidate = localStorage.getItem("candidate");
          if (savedCandidate) {
            const parsed = JSON.parse(savedCandidate);
            parsed.name = trimmedName || parsed.name;
            localStorage.setItem("candidate", JSON.stringify(parsed));
          }
        } catch {
          // ignore localStorage parsing errors
        }
        setPrivacySuccess("Privacy and profile preferences saved successfully!");
      }
    } catch {
      setPrivacyError("Network error while saving privacy settings. Please try again.");
    } finally {
      setPrivacySaving(false);
    }
  }

  async function toggleNotifChannel(channel: keyof typeof notifPrefs) {
    if (!user) return;
    const nextVal = !notifPrefs[channel];
    const nextPrefs = { ...notifPrefs, [channel]: nextVal, unsubscribed_all: false };
    setNotifPrefs(nextPrefs);
    setNotifSaving(true);
    setNotifSuccess("");
    setNotifError("");

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPrefs),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifPrefs(data.preferences);
        setNotifSuccess("✓ Notification preference updated.");
      } else {
        setNotifError(data.error || "Could not update preference.");
      }
    } catch {
      setNotifError("Network error while updating notification preference.");
    } finally {
      setNotifSaving(false);
    }
  }

  async function toggleUnsubscribeAll() {
    if (!user) return;
    const isUnsub = !notifPrefs.unsubscribed_all;
    setNotifSaving(true);
    setNotifSuccess("");
    setNotifError("");

    try {
      const payload = isUnsub
        ? { unsubscribed_all: true }
        : {
            unsubscribed_all: false,
            exam_results: true,
            classroom_alerts: true,
            streak_reminders: true,
            assignments: true,
            marketing_announcements: true,
            sms_alerts: true,
          };

      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifPrefs(data.preferences);
        setNotifSuccess(
          isUnsub
            ? "✓ You have unsubscribed from all notifications."
            : "✓ You have resubscribed to BrainLab notifications."
        );
      } else {
        setNotifError(data.error || "Could not update subscription status.");
      }
    } catch {
      setNotifError("Network error while updating subscription.");
    } finally {
      setNotifSaving(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/operator-gate", { method: "DELETE", cache: "no-store" });
    } catch {
      // Continue with account sign-out if the optional operator cookie cannot be cleared.
    }
    await supabase.auth.signOut();
    router.replace("/account");
    router.refresh();
  }

  if (loading) {
    return <main id="main" className="learner-theme min-h-[65vh] px-5 py-16"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-10 w-72 rounded bg-slate-200" /><div className="mt-6 h-56 rounded-3xl bg-slate-200" /><div className="mt-5 h-48 rounded-3xl bg-slate-200" /></div></main>;
  }

  const displayNameValue = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  const displayName = typeof displayNameValue === "string" && displayNameValue.trim() ? displayNameValue.trim() : "Learner";
  const avatar = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;

  return (
    <main id="main" data-theme={resolvedTheme} className="learner-theme min-h-[75vh] px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-900"><span aria-hidden="true">←</span> Back to my learning</Link>
        <header className="mb-8 mt-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-800">Make it yours</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Account &amp; Privacy Settings</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Choose how BrainLab looks, customize your public profile name, and control who can message or add you to groups.</p>
        </header>

        {/* 1. Appearance Section */}
        <section aria-labelledby="appearance-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-900">◐</span>
            <div><h2 id="appearance-heading" className="text-xl font-extrabold">Appearance</h2><p className="mt-1 text-sm leading-6 text-slate-600">Your choice is saved in this browser and applies across BrainLab pages, including the CBT exam interface. System mode follows your device preference.</p></div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {appearanceChoices.map((choice) => {
              const selected = appearance === choice.value;
              return <button key={choice.value} type="button" aria-pressed={selected} onClick={() => setAppearance(choice.value)} className={`min-h-36 rounded-2xl border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${selected ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"}`}>
                <span className="flex items-center justify-between gap-3"><span className="text-2xl" aria-hidden="true">{choice.icon}</span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-blue-800 bg-blue-800 text-white" : "border-slate-300"}`}>{selected ? <span aria-hidden="true" className="text-xs">✓</span> : null}</span></span>
                <span className="mt-4 block text-base font-extrabold">{choice.title}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">{choice.description}</span>
              </button>;
            })}
          </div>
          <p className="mt-4 text-xs text-slate-500" role="status">Current appearance: {resolvedTheme === "dark" ? "Dark" : "Light"}.</p>
        </section>

        {/* 2. Privacy & Communication Controls */}
        <section aria-labelledby="privacy-heading" className="rounded-3xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-900">🔒</span>
            <div className="flex-1 min-w-0">
              <h2 id="privacy-heading" className="text-xl font-extrabold">Privacy &amp; Communication Preferences</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Keep your Gmail address private. Choose what name is shown in live classes and who is permitted to send you direct messages or add you to study circles.
              </p>
            </div>
          </div>

          <form onSubmit={savePrivacySettings} className="mt-6 space-y-5">
            {/* Display Name Input */}
            <div>
              <label htmlFor="custom-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Custom Public Profile Name
              </label>
              <input
                id="custom-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. BrainLab Scholar"
                maxLength={60}
                className="w-full max-w-md rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                This customized name is displayed across live classrooms, study circles, and peer lists instead of your email address.
              </p>
            </div>

            {/* Privacy Checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideEmail}
                  onChange={(e) => setHideEmail(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900">Hide my email address publicly</span>
                  <p className="text-xs text-slate-500">
                    Never reveal your Gmail address to other students or in classroom message logs.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireMessageRequest}
                  onChange={(e) => setRequireMessageRequest(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900">Require message requests before chatting</span>
                  <p className="text-xs text-slate-500">
                    When someone sends you a direct message for the first time, you must accept their message request before regular messaging begins.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireGroupApproval}
                  onChange={(e) => setRequireGroupApproval(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900">Require permission before adding me to study groups</span>
                  <p className="text-xs text-slate-500">
                    You will receive an invitation request that you can review and accept before being added to any study circle.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900">Read receipts (blue ticks)</span>
                  <p className="text-xs text-slate-500">
                    Show blue checkmarks (✓✓) when messages are read. If turned off, other learners will only see grey delivered ticks (✓✓), and you will not see blue ticks on sent messages.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={privacySaving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60 transition active:scale-95"
              >
                {privacySaving ? "Saving changes…" : "Save Privacy Settings"}
              </button>
            </div>

            {privacySuccess && (
              <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                ✓ {privacySuccess}
              </p>
            )}
            {privacyError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                ⚠ {privacyError}
              </p>
            )}
          </form>
        </section>

        {/* 2b. Blocked Learners Management */}
        <section aria-labelledby="blocked-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="blocked-heading" className="text-xl font-extrabold text-slate-900">
                Blocked Learners
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Learners you have blocked cannot message you or add you to study circles.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {blockedUsers.length} blocked
            </span>
          </div>

          <div className="mt-5 space-y-2">
            {blockedUsers.length === 0 ? (
              <p className="text-xs font-semibold text-slate-500 italic py-2">
                You have not blocked any learners.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/50">
                {blockedUsers.map((blockedId) => (
                  <li key={blockedId} className="flex items-center justify-between p-3 text-xs">
                    <span className="font-mono text-slate-600 truncate max-w-[200px] sm:max-w-xs">
                      {blockedId}
                    </span>
                    <button
                      type="button"
                      disabled={unblockingId === blockedId}
                      onClick={async () => {
                        setUnblockingId(blockedId);
                        try {
                          const res = await fetch("/api/messages/block", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ targetUserId: blockedId, action: "unblock" }),
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            setBlockedUsers((prev) => prev.filter((id) => id !== blockedId));
                          }
                        } finally {
                          setUnblockingId(null);
                        }
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {unblockingId === blockedId ? "Unblocking…" : "Unblock"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 2c. Notification Subscriptions & Channels */}
        <section aria-labelledby="notifications-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-2xl text-purple-900">
                🔔
              </span>
              <div>
                <h2 id="notifications-heading" className="text-xl font-extrabold text-slate-900">
                  Notification Subscriptions
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Manage email, SMS, and in-app alerts. You can pause all non-essential messages or toggle individual channels.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {notifPrefs.unsubscribed_all ? (
                <button
                  type="button"
                  disabled={notifSaving}
                  onClick={toggleUnsubscribeAll}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition active:scale-95 disabled:opacity-60 shadow-sm"
                >
                  {notifSaving ? "Updating…" : "✓ Resubscribe to All"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={notifSaving}
                  onClick={toggleUnsubscribeAll}
                  className="rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 px-4 py-2.5 text-xs font-black text-rose-800 transition active:scale-95 disabled:opacity-60"
                >
                  {notifSaving ? "Updating…" : "Unsubscribe from All"}
                </button>
              )}
            </div>
          </div>

          {/* Current Status Pill */}
          <div className="mt-4 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                notifPrefs.unsubscribed_all ? "bg-rose-500" : "bg-emerald-500"
              }`}
            />
            <span className="text-xs font-bold text-slate-700">
              {notifPrefs.unsubscribed_all
                ? "All non-critical notifications paused"
                : "Active Subscriber — Receiving selected channels"}
            </span>
          </div>

          {/* Channels Grid */}
          <div className="mt-6 space-y-4 divide-y divide-slate-100">
            {/* Exam Results */}
            <div className="pt-4 first:pt-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">🎓</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Exam &amp; Mock Results</p>
                  <p className="text-xs text-slate-500">
                    Instant alerts when mock exam results, aggregate scores, and official verification slips are released.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={notifSaving}
                onClick={() => toggleNotifChannel("exam_results")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifPrefs.exam_results && !notifPrefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notifPrefs.exam_results && !notifPrefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Live Classroom */}
            <div className="pt-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">📹</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Live Classroom &amp; Masterclasses</p>
                  <p className="text-xs text-slate-500">
                    Alerts when tutors go live, whiteboard stages open, or new masterclasses are scheduled.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={notifSaving}
                onClick={() => toggleNotifChannel("classroom_alerts")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifPrefs.classroom_alerts && !notifPrefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notifPrefs.classroom_alerts && !notifPrefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Streaks & Daily Practice */}
            <div className="pt-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔥</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Daily Revision Streaks</p>
                  <p className="text-xs text-slate-500">
                    Spaced repetition reminders and streak rescue notices to maintain your UTME/SSCE daily study momentum.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={notifSaving}
                onClick={() => toggleNotifChannel("streak_reminders")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifPrefs.streak_reminders && !notifPrefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notifPrefs.streak_reminders && !notifPrefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Assignments & Homework */}
            <div className="pt-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">📝</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Assignments &amp; Homework Feedback</p>
                  <p className="text-xs text-slate-500">
                    Notifications when tutors grade submitted assignments or provide individualized corrections.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={notifSaving}
                onClick={() => toggleNotifChannel("assignments")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifPrefs.assignments && !notifPrefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notifPrefs.assignments && !notifPrefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Platform Announcements */}
            <div className="pt-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">📢</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Announcements &amp; Exam Updates</p>
                  <p className="text-xs text-slate-500">
                    National mock test announcements, JAMB exam dates, and BrainLab curriculum updates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={notifSaving}
                onClick={() => toggleNotifChannel("marketing_announcements")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifPrefs.marketing_announcements && !notifPrefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notifPrefs.marketing_announcements && !notifPrefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* SMS Alerts */}
            <div className="pt-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">📱</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">SMS Notifications</p>
                  <p className="text-xs text-slate-500">
                    Direct SMS text messages for exam access codes and emergency scheduling alerts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={notifSaving}
                onClick={() => toggleNotifChannel("sms_alerts")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifPrefs.sms_alerts && !notifPrefs.unsubscribed_all ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notifPrefs.sms_alerts && !notifPrefs.unsubscribed_all ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {notifSuccess && (
            <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              {notifSuccess}
            </p>
          )}
          {notifError && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              ⚠ {notifError}
            </p>
          )}

          <p className="mt-4 text-[11px] text-slate-500">
            Note: Security-critical dispatches (e.g., password reset emails and payment verification receipts) cannot be disabled to protect your account.
          </p>
        </section>

        {/* 3. Profile & Identity Overview */}
        <section aria-labelledby="profile-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 text-xl font-black text-blue-950">{avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initials(displayName)}</div>
            <div className="min-w-0 flex-1">
              <h2 id="profile-heading" className="text-xl font-extrabold">Profile and identity</h2>
              <p className="mt-1 break-all text-sm text-slate-600">
                <span className="font-bold text-slate-900">{displayName}</span>
                {hideEmail ? <span className="ml-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Email Hidden from Peers</span> : ` · ${user?.email ?? "Email unavailable"}`}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Your profile photo is imported from your Google account if available.</p>
            </div>
            <Link href="/profile" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50">Edit full profile</Link>
          </div>
        </section>

        {/* 4. Password & Security */}
        <section aria-labelledby="security-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4"><span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-800">⌑</span><div><h2 id="security-heading" className="text-xl font-extrabold">Password and security</h2><p className="mt-1 text-sm leading-6 text-slate-600">Send a password recovery link to the email address on this account. BrainLab will not display or ask you to share your current password here.</p></div></div>
          <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" disabled={resetBusy || !user?.email} onClick={() => void sendPasswordReset()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2a5b] px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">{resetBusy ? "Sending recovery link…" : "Email me a password reset link"}</button><Link href="/account" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Account sign-in</Link></div>
          {resetError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{resetError}</p>}
          {resetMessage && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{resetMessage}</p>}
        </section>

        {/* 5. Sign Out */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 sm:p-8">
          <div><h2 className="text-lg font-extrabold text-rose-950">Sign out of BrainLab</h2><p className="mt-1 text-sm leading-6 text-rose-900">End this account session on this device.</p></div>
          <button type="button" disabled={signingOut} onClick={() => void signOut()} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-extrabold text-rose-900 hover:bg-rose-100 disabled:opacity-60">{signingOut ? "Signing out…" : "Sign out"}</button>
        </section>
      </div>
    </main>
  );
}
