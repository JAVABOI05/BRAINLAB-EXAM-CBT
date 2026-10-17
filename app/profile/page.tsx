"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

function getDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const value = metadata.full_name ?? metadata.name;
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "BL";
}

export default function LearnerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !currentUser) { router.replace("/account"); return; }
      setUser(currentUser);
      setName(getDisplayName(currentUser));
      setLoading(false);
    }
    void loadProfile().catch(() => {
      if (active) { setError("We could not load your profile. Please refresh and try again."); setLoading(false); }
    });
    return () => { active = false; };
  }, [router]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (!cleanName) { setError("Enter the name you want shown on your profile."); return; }
    if (cleanName.length > 100) { setError("Keep your display name to 100 characters or fewer."); return; }
    setSaving(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { ...(user?.user_metadata ?? {}), full_name: cleanName },
      });
      if (updateError || !data.user) { setError("We could not save your profile changes. Please try again."); return; }
      setUser(data.user);
      setName(getDisplayName(data.user));
      setMessage("Your profile has been updated. Your name will appear in your learner space.");
    } catch {
      setError("We could not save your profile changes. Please check your connection and try again.");
    } finally { setSaving(false); }
  }

  if (loading) return <main id="main" className="min-h-[70vh] bg-[#f5f7fb] px-5 py-16"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-44 rounded-3xl bg-slate-200" /><div className="mt-5 h-64 rounded-3xl bg-slate-200" /></div></main>;

  const display = name.trim() || user?.email?.split("@")[0] || "Learner";
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;

  return (
    <main id="main" className="min-h-[75vh] bg-[#f5f7fb] px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-900"><span aria-hidden="true">←</span> Back to my learning</Link><p className="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-800">Your learner identity</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Profile & account</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Make your learner space feel like yours. Manage the name people see and check which account is signed in.</p></div>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="relative overflow-hidden bg-[#071c43] px-6 py-8 text-white sm:px-9 sm:py-10">
            <div aria-hidden="true" className="absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/10" /><div aria-hidden="true" className="absolute right-20 top-8 h-32 w-32 rounded-full border border-white/10" />
            <div className="relative flex flex-wrap items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] border border-white/20 bg-white/10 text-2xl font-black text-cyan-100 shadow-inner sm:h-24 sm:w-24">
                {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initials(display)}
              </div>
              <div className="min-w-0 flex-1"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Signed-in account</span><h2 className="mt-3 break-words text-2xl font-extrabold sm:text-3xl">{display}</h2><p className="mt-1 break-all text-sm text-blue-100/80">{user?.email ?? "Email unavailable"}</p></div>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <h3 className="text-xl font-extrabold">Personal details</h3><p className="mt-2 text-sm leading-6 text-slate-600">Your display name is saved to your signed-in account through Supabase Auth. Your email is managed by your sign-in provider.</p>
              <form onSubmit={saveProfile} className="mt-6 space-y-5">
                <div><label htmlFor="profile-name" className="mb-2 block text-sm font-bold text-slate-800">Display name</label><input id="profile-name" autoComplete="name" required maxLength={100} value={name} onChange={(event) => { setName(event.target.value); setError(""); setMessage(""); }} className="min-h-13 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100" placeholder="How should we address you?" /><p className="mt-2 text-xs text-slate-500">Up to 100 characters. You can change this whenever you like.</p></div>
                <div><label className="mb-2 block text-sm font-bold text-slate-800">Sign-in email</label><div className="flex min-h-13 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"><span aria-hidden="true" className="text-lg">✉</span><span className="break-all">{user?.email ?? "Not available"}</span></div></div>
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}
                {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">{message}</p>}
                <button type="submit" disabled={saving || !name.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b2a5b] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving your profile…" : "Save profile changes"} {!saving && <span aria-hidden="true">→</span>}</button>
              </form>
            </div>

            <aside className="h-fit rounded-2xl border border-blue-100 bg-[#f0f5ff] p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-800">Your account, at a glance</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-900">✓</span><div><p className="text-sm font-bold text-slate-900">Account connected</p><p className="mt-1 text-xs leading-5 text-slate-600">This profile is linked to your current sign-in session.</p></div></div>
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-900">↗</span><div><p className="text-sm font-bold text-slate-900">Keep learning</p><p className="mt-1 text-xs leading-5 text-slate-600">Your dashboard brings together the learning tools currently available.</p></div></div>
              </div>
              <Link href="/settings" className="mt-6 flex min-h-11 items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-950 transition hover:bg-blue-50">Account settings</Link>
            </aside>
          </div>
        </section>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2a5b] px-4 py-2 text-sm font-bold text-white hover:bg-blue-900">Return to dashboard</Link><Link href="/support" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Need help?</Link></div>
      </div>
    </main>
  );
}
