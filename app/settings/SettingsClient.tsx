"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getAuthRedirectUrl } from "../lib/authRedirect";
import { useLearnerTheme, type AppearancePreference } from "../components/LearnerThemeProvider";
import PasswordStrengthMeter from "@/app/components/ui/PasswordStrengthMeter";
import { evaluatePasswordStrength } from "@/app/lib/passwordStrength";
import {
  isNotificationSupported,
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  sendWelcomeTestAlert,
  type DevicePermissionStatus,
} from "../lib/clientNotifications";


function SettingsIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  switch (name) {
    case "sun":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
        </svg>
      );
    case "moon":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      );
    case "system":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case "lock":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "bell":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "phone":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />
        </svg>
      );
    case "zap":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "cap":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case "video":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="23 7 16 12 23 17 23 7" /><rect width="15" height="14" x="1" y="5" rx="2" ry="2" />
        </svg>
      );
    case "flame":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
        </svg>
      );
    case "doc":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "megaphone":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 11 18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "alert":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    default:
      return null;
  }
}

const appearanceChoices: { value: AppearancePreference; title: string; description: string; icon: string }[] = [
  { value: "light", title: "Light", description: "A bright, clear learning space.", icon: "sun" },
  { value: "dark", title: "Dark", description: "A darker screen for low-light study.", icon: "moon" },
  { value: "system", title: "System", description: "Follow your device appearance automatically.", icon: "system" },
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

  // Direct Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChangeBusy, setPasswordChangeBusy] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");

  // Email Change State
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const [emailChangeBusy, setEmailChangeBusy] = useState(false);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState("");
  const [emailChangeError, setEmailChangeError] = useState("");

  // Session Security & Devices State
  const [sessionActionBusy, setSessionActionBusy] = useState(false);
  const [sessionActionMessage, setSessionActionMessage] = useState("");
  const [sessionActionError, setSessionActionError] = useState("");

  // Privacy & Profile Customization State
  const [customName, setCustomName] = useState("");
  const [hideEmail, setHideEmail] = useState(true);
  const [shareOnlinePresence, setShareOnlinePresence] = useState(true);
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
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    timezone?: string;
  }>({
    exam_results: true,
    classroom_alerts: true,
    streak_reminders: true,
    assignments: true,
    marketing_announcements: true,
    sms_alerts: true,
    unsubscribed_all: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    timezone: "Africa/Lagos",
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState("");
  const [notifError, setNotifError] = useState("");
  const [devicePerm, setDevicePerm] = useState<DevicePermissionStatus>("default");
  const [testingAlert, setTestingAlert] = useState(false);

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
      setShareOnlinePresence(meta.share_online_presence !== false);
      setRequireMessageRequest(meta.require_message_request !== false);
      setRequireGroupApproval(meta.require_group_approval !== false);
      setReadReceipts(meta.read_receipts !== false);
      setLoading(false);

      // Check device notification permission
      if (isNotificationSupported()) {
        setDevicePerm(getDeviceNotificationPermission());
      }

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

  async function handleDirectPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordChangeError("");
    setPasswordChangeSuccess("");

    if (!newPassword) {
      setPasswordChangeError("Please enter a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    const strength = evaluatePasswordStrength(newPassword, "student");
    if (!strength.isValid) {
      setPasswordChangeError(strength.feedback || "Password must be at least 8 characters long.");
      return;
    }

    setPasswordChangeBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordChangeError(error.message);
        return;
      }

      setPasswordChangeSuccess("Your password has been changed successfully! Keep it safe.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordChangeError("Could not update password. Please check your connection and try again.");
    } finally {
      setPasswordChangeBusy(false);
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailChangeError("");
    setEmailChangeSuccess("");

    const clean = newEmailAddress.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setEmailChangeError("Please enter a valid new email address (e.g. name@gmail.com).");
      return;
    }

    if (clean === user?.email?.toLowerCase()) {
      setEmailChangeError("The new email address cannot be the same as your current email.");
      return;
    }

    setEmailChangeBusy(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: clean },
        { emailRedirectTo: getAuthRedirectUrl("/auth/callback") }
      );

      if (error) {
        setEmailChangeError(error.message);
        return;
      }

      setEmailChangeSuccess(
        `Confirmation emails sent to both ${user?.email} and ${clean}. Please click the verification link in both inboxes to complete the change.`
      );
      setNewEmailAddress("");
    } catch {
      setEmailChangeError("Could not submit email change request. Please try again later.");
    } finally {
      setEmailChangeBusy(false);
    }
  }

  async function handleSignOutAllOtherDevices() {
    setSessionActionBusy(true);
    setSessionActionError("");
    setSessionActionMessage("");

    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) {
        setSessionActionError(error.message);
        return;
      }
      setSessionActionMessage("Successfully signed out of all other active sessions and devices!");
    } catch {
      setSessionActionError("Could not sign out of other devices. Please try again.");
    } finally {
      setSessionActionBusy(false);
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
        share_online_presence: shareOnlinePresence,
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
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (token) {
            void fetch("/api/presence", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                status: shareOnlinePresence ? "online" : "offline",
                isVisible: shareOnlinePresence,
                activityContext: shareOnlinePresence ? "Active on BrainLab" : "Offline",
              }),
            });
          }
        } catch {
          // ignore
        }
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
        setNotifSuccess("Notification preference updated.");
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
            ? "You have unsubscribed from all notifications."
            : "You have resubscribed to BrainLab notifications."
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

  async function updateQuietHours(start: string, end: string, tz: string) {
    setNotifSaving(true);
    setNotifSuccess("");
    setNotifError("");

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiet_hours_start: start,
          quiet_hours_end: end,
          timezone: tz,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifPrefs((prev) => ({
          ...prev,
          quiet_hours_start: start,
          quiet_hours_end: end,
          timezone: tz,
        }));
        setNotifSuccess("Quiet hours and timezone updated successfully.");
      } else {
        setNotifError(data.error || "Could not update quiet hours.");
      }
    } catch {
      setNotifError("Network error while updating quiet hours.");
    } finally {
      setNotifSaving(false);
    }
  }

  async function signOut(scope: "local" | "global" = "local") {
    setSigningOut(true);
    try {
      localStorage.removeItem("candidate");
      localStorage.removeItem("candidate_subjects");
      localStorage.removeItem("bl_student_xp_cache");
      localStorage.removeItem("brainlab_streak_count");
      localStorage.removeItem("brainlab_last_active_date");
      localStorage.removeItem("brainlab_student_goals_set");
      localStorage.removeItem("brainlab_goal_wizard_dismissed");
      window.dispatchEvent(new Event("brainlab-local-storage"));
      window.dispatchEvent(new CustomEvent("brainlab_xp_awarded", { detail: null }));
    } catch {}
    try {
      await fetch("/api/auth/operator-gate", { method: "DELETE", cache: "no-store" });
    } catch {
      // Continue with account sign-out if the optional operator cookie cannot be cleared.
    }
    await supabase.auth.signOut({ scope });
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
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-900"><SettingsIcon name="system" className="h-6 w-6" /></span>
            <div><h2 id="appearance-heading" className="text-xl font-extrabold">Appearance</h2><p className="mt-1 text-sm leading-6 text-slate-600">Your choice is saved in this browser and applies across BrainLab pages, including the CBT exam interface. System mode follows your device preference.</p></div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {appearanceChoices.map((choice) => {
              const selected = appearance === choice.value;
              return <button key={choice.value} type="button" aria-pressed={selected} onClick={() => setAppearance(choice.value)} className={`min-h-36 rounded-2xl border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${selected ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"}`}>
                <span className="flex items-center justify-between gap-3"><span className="text-blue-900" aria-hidden="true"><SettingsIcon name={choice.icon} className="h-6 w-6" /></span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-blue-800 bg-blue-800 text-white" : "border-slate-300"}`}>{selected ? <SettingsIcon name="check" className="h-3 w-3" /> : null}</span></span>
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
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-900"><SettingsIcon name="lock" className="h-6 w-6" /></span>
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
                  checked={shareOnlinePresence}
                  onChange={(e) => setShareOnlinePresence(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900">Show online status &amp; last seen</span>
                  <p className="text-xs text-slate-500">
                    Allow study circle peers and tutors to see when you are actively learning on BrainLab or when you were last online. If turned off, you will appear offline and your last seen timestamp will be hidden.
                  </p>
                </div>
              </label>

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
                    Show double checkmarks when messages are read. If turned off, other learners will only see delivered ticks, and you will not see read receipts on sent messages.
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
                <span className="inline-flex items-center gap-1.5"><SettingsIcon name="check" className="h-3 w-3 inline" />{privacySuccess}</span>
              </p>
            )}
            {privacyError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                <span className="inline-flex items-center gap-1.5"><SettingsIcon name="alert" className="h-3.5 w-3.5 inline" />{privacyError}</span>
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
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-900"><SettingsIcon name="bell" className="h-6 w-6" /></span>
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
                  {notifSaving ? "Updating…" : "Resubscribe to All"}
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

          {/* Device Push Notifications Status & Activation Card */}
          <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm"><SettingsIcon name="phone" className="h-5 w-5" /></span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Device Push Notifications</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      devicePerm === "granted"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : devicePerm === "denied"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {devicePerm === "granted"
                      ? "Allowed"
                      : devicePerm === "denied"
                      ? "Blocked in Browser"
                      : "Not Yet Allowed"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-lg">
                  {devicePerm === "granted"
                    ? "This device is registered to receive instant alerts when tutors start live classes and when your daily practice streak is at risk."
                    : devicePerm === "denied"
                    ? "Notifications were blocked in your browser. Click the lock/site icon beside the URL bar to set Notifications to 'Allow'."
                    : "Allow notifications on this device to get ring alerts for live masterclasses and timed revision streak reminders."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {devicePerm === "granted" ? (
                <button
                  type="button"
                  disabled={testingAlert}
                  onClick={async () => {
                    setTestingAlert(true);
                    await sendWelcomeTestAlert();
                    setTimeout(() => setTestingAlert(false), 1500);
                  }}
                  className="rounded-xl border border-purple-300 bg-white hover:bg-purple-100 px-3.5 py-2 text-xs font-bold text-purple-900 shadow-xs transition active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <SettingsIcon name="zap" className="h-3.5 w-3.5" /><span>{testingAlert ? "Sending…" : "Test Device Alert"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const { granted, status } = await requestDeviceNotificationPermission();
                    setDevicePerm(status);
                    if (granted) {
                      await sendWelcomeTestAlert();
                    }
                  }}
                  className="rounded-xl bg-purple-700 hover:bg-purple-600 px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95 inline-flex items-center gap-1.5"
                >
                  <SettingsIcon name="bell" className="h-3.5 w-3.5" /><span>Enable on this Device</span>
                </button>
              )}
            </div>
          </div>

          {/* Channels Grid */}
          <div className="mt-6 space-y-4 divide-y divide-slate-100">
            {/* Exam Results */}
            <div className="pt-4 first:pt-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-700 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50"><SettingsIcon name="cap" className="h-4 w-4" /></span>
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
                <span className="text-indigo-700 flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50"><SettingsIcon name="video" className="h-4 w-4" /></span>
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
                <span className="text-rose-600 flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50"><SettingsIcon name="flame" className="h-4 w-4" /></span>
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
                <span className="text-amber-700 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50"><SettingsIcon name="doc" className="h-4 w-4" /></span>
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
                <span className="text-purple-700 flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50"><SettingsIcon name="megaphone" className="h-4 w-4" /></span>
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
                <span className="text-emerald-700 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50"><SettingsIcon name="phone" className="h-4 w-4" /></span>
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

          {/* Quiet Hours & Timezone Configuration */}
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="text-indigo-600 flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50"><SettingsIcon name="moon" className="h-4 w-4" /></span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">Quiet Hours &amp; Study Schedule</h3>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  During quiet hours, non-critical push notifications and email study reminders are paused so your rest is protected.
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Quiet Starts
                    </label>
                    <input
                      type="time"
                      value={notifPrefs.quiet_hours_start || "22:00"}
                      onChange={(e) => updateQuietHours(e.target.value, notifPrefs.quiet_hours_end || "07:00", notifPrefs.timezone || "Africa/Lagos")}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Quiet Ends
                    </label>
                    <input
                      type="time"
                      value={notifPrefs.quiet_hours_end || "07:00"}
                      onChange={(e) => updateQuietHours(notifPrefs.quiet_hours_start || "22:00", e.target.value, notifPrefs.timezone || "Africa/Lagos")}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Your Timezone
                    </label>
                    <select
                      value={notifPrefs.timezone || "Africa/Lagos"}
                      onChange={(e) => updateQuietHours(notifPrefs.quiet_hours_start || "22:00", notifPrefs.quiet_hours_end || "07:00", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs"
                    >
                      <option value="Africa/Lagos">West Africa Time (Lagos, UTC+1)</option>
                      <option value="Africa/Accra">GMT / Accra (UTC+0)</option>
                      <option value="Africa/Johannesburg">South Africa Time (UTC+2)</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                      <option value="Europe/London">UK Time (London)</option>
                      <option value="America/New_York">US Eastern (New York)</option>
                    </select>
                  </div>
                </div>
              </div>
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
              <span className="inline-flex items-center gap-1.5"><SettingsIcon name="alert" className="h-3.5 w-3.5 inline" />{notifError}</span>
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
        <section aria-labelledby="security-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
              <SettingsIcon name="lock" className="h-6 w-6" />
            </span>
            <div>
              <h2 id="security-heading" className="text-xl font-extrabold text-slate-900">Password and security</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Update your account password, manage your registered email address, or send an account recovery link.
              </p>
            </div>
          </div>

          {/* Sub-item A: Direct In-App Password Change */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set a strong password containing at least 8 characters.
              </p>
            </div>

            {passwordChangeError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {passwordChangeError}
              </p>
            )}
            {passwordChangeSuccess && (
              <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                {passwordChangeSuccess}
              </p>
            )}

            <form onSubmit={handleDirectPasswordChange} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 pr-10 min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <PasswordStrengthMeter password={newPassword} role="student" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Confirm New Password</label>
                  {newPassword && confirmPassword && (
                    <span className={`text-[11px] font-bold ${newPassword === confirmPassword ? "text-emerald-600" : "text-amber-600"}`}>
                      {newPassword === confirmPassword ? "✓ Passwords match" : "✕ Do not match"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 pr-10 min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordChangeBusy || !newPassword || newPassword !== confirmPassword}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2a5b] px-5 py-2 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {passwordChangeBusy ? "Updating Password…" : "Update Password"}
              </button>
            </form>
          </div>

          {/* Sub-item B: Change Registered Email Address */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Email Address</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current email: <strong className="text-slate-800">{user?.email || "Unavailable"}</strong>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Verified ✓
                </span>
              </p>
            </div>

            {emailChangeError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {emailChangeError}
              </p>
            )}
            {emailChangeSuccess && (
              <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 leading-relaxed">
                {emailChangeSuccess}
              </p>
            )}

            <form onSubmit={handleEmailChange} className="space-y-3 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmailAddress}
                  onChange={(e) => setNewEmailAddress(e.target.value)}
                  placeholder="new-address@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 min-h-[42px]"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Security note: Both your current address and the new address will receive verification links that must be clicked to complete the transfer.
              </p>
              <button
                type="submit"
                disabled={emailChangeBusy || !newEmailAddress}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {emailChangeBusy ? "Sending Verification…" : "Send Email Change Verification"}
              </button>
            </form>
          </div>

          {/* Sub-item C: Forgotten Password Recovery Email */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Alternative Recovery Option</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={resetBusy || !user?.email}
                onClick={() => void sendPasswordReset()}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetBusy ? "Sending recovery link…" : "Email me a password reset link instead"}
              </button>
              <Link href="/account" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Account sign-in
              </Link>
            </div>
            {resetError && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">{resetError}</p>}
            {resetMessage && <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900">{resetMessage}</p>}
          </div>
        </section>

        {/* 5. Sessions & Sign Out */}
        <section aria-labelledby="sessions-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-800">
              <SettingsIcon name="lock" className="h-6 w-6" />
            </span>
            <div>
              <h2 id="sessions-heading" className="text-xl font-extrabold text-slate-900">Active sessions &amp; sign out</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Manage your active logins. If you practised on a public CBT center terminal, cybercafe, or borrowed computer, you can sign out of all other sessions remotely.
              </p>
            </div>
          </div>

          {sessionActionError && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {sessionActionError}
            </p>
          )}
          {sessionActionMessage && (
            <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              {sessionActionMessage}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Action 1: Sign out on this device */}
            <div className="rounded-2xl border border-slate-200 p-4 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">This Device</h3>
                <p className="text-xs text-slate-500 mt-1">End your session on this current browser window.</p>
              </div>
              <button
                type="button"
                disabled={signingOut}
                onClick={() => void signOut('local')}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60 transition"
              >
                {signingOut ? "Signing out…" : "Sign out on this device"}
              </button>
            </div>

            {/* Action 2: Sign out from all other devices */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-amber-950">Other Devices &amp; Public Terminals</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">Cybercafe Mode</span>
                </div>
                <p className="text-xs text-amber-800/90 mt-1">Revoke access on all other phones, cybercafes, and public lab terminals while keeping this session open.</p>
              </div>
              <button
                type="button"
                disabled={sessionActionBusy}
                onClick={() => void handleSignOutAllOtherDevices()}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60 transition shadow-xs cursor-pointer"
              >
                {sessionActionBusy ? "Revoking Other Sessions…" : "Sign out of all other devices"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
