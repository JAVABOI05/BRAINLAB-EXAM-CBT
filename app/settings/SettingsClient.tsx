"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
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

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        router.replace("/account");
        return;
      }
      setUser(data.user);
      setLoading(false);
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
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) setResetError("We could not send a password recovery email. Please try again.");
      else setResetMessage("If this account can receive recovery messages, a password reset link will be sent to your email.");
    } catch {
      setResetError("We could not contact the account service. Check your connection and try again.");
    } finally {
      setResetBusy(false);
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
    <main id="main" data-theme={resolvedTheme} className="learner-theme min-h-[75vh] bg-[#f5f7fb] px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-900"><span aria-hidden="true">←</span> Back to my learning</Link>
        <header className="mb-8 mt-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-800">Make it yours</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Account settings</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Choose how BrainLab looks, manage your account and keep control of your learning space.</p>
        </header>

        <section aria-labelledby="appearance-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-900">◐</span>
            <div><h2 id="appearance-heading" className="text-xl font-extrabold">Appearance</h2><p className="mt-1 text-sm leading-6 text-slate-600">Your choice is saved in this browser and applies to the learner dashboard, profile and settings. System mode follows your device preference.</p></div>
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

        <section aria-labelledby="profile-heading" className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 text-xl font-black text-blue-950">{avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initials(displayName)}</div>
            <div className="min-w-0 flex-1"><h2 id="profile-heading" className="text-xl font-extrabold">Profile and identity</h2><p className="mt-1 break-all text-sm text-slate-600">{displayName} · {user?.email ?? "Email unavailable"}</p><p className="mt-1 text-xs leading-5 text-slate-500">Your existing Google profile photo is shown when your sign-in provider supplies one.</p></div>
            <Link href="/profile" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50">Edit profile</Link>
          </div>
        </section>

        <section aria-labelledby="security-heading" className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4"><span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-800">⌑</span><div><h2 id="security-heading" className="text-xl font-extrabold">Password and security</h2><p className="mt-1 text-sm leading-6 text-slate-600">Send a password recovery link to the email address on this account. BrainLab will not display or ask you to share your current password here.</p></div></div>
          <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" disabled={resetBusy || !user?.email} onClick={() => void sendPasswordReset()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2a5b] px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">{resetBusy ? "Sending recovery link…" : "Email me a password reset link"}</button><Link href="/account" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Account sign-in</Link></div>
          {resetError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{resetError}</p>}
          {resetMessage && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{resetMessage}</p>}
        </section>

        <section aria-labelledby="privacy-heading" className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4"><span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-2xl text-violet-800">◇</span><div className="min-w-0"><h2 id="privacy-heading" className="text-xl font-extrabold">Privacy and preferences</h2><p className="mt-1 text-sm leading-6 text-slate-600">Review the current privacy notice. Notification preferences and account-linked learning history are not available as editable settings yet, so we do not show controls that cannot save anything.</p><Link href="/privacy" className="mt-3 inline-flex min-h-10 items-center text-sm font-extrabold text-blue-800 underline underline-offset-4">Review privacy information</Link></div></div>
        </section>

        <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 sm:p-8">
          <div><h2 className="text-lg font-extrabold text-rose-950">Sign out of BrainLab</h2><p className="mt-1 text-sm leading-6 text-rose-900">End this account session on this device.</p></div>
          <button type="button" disabled={signingOut} onClick={() => void signOut()} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-extrabold text-rose-900 hover:bg-rose-100 disabled:opacity-60">{signingOut ? "Signing out…" : "Sign out"}</button>
        </section>
      </div>
    </main>
  );
}
