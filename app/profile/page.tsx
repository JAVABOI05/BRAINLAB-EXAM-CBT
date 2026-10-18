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
    if (!name.trim()) { setError("Enter the name you want shown on your profile."); return; }
    setSaving(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { ...(user?.user_metadata ?? {}), full_name: name.trim() },
      });
      if (updateError || !data.user) { setError("We could not save your profile changes. Please try again."); return; }
      setUser(data.user);
      setName(getDisplayName(data.user));
      setMessage("Your profile name has been updated.");
    } catch {
      setError("We could not save your profile changes. Please check your connection and try again.");
    } finally { setSaving(false); }
  }

  if (loading) return <main id="main" className="mx-auto min-h-[60vh] max-w-4xl px-5 py-16"><p className="text-slate-600">Loading your profile…</p></main>;

  const nameForDisplay = name.trim() || user?.email?.split("@")[0] || "Learner";
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#012153] px-6 py-8 text-white sm:px-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Your learner space</p>
          <div className="mt-4 flex items-center gap-4">
            {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-full border-2 border-white/40 object-cover" /> : <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-2xl font-extrabold">{nameForDisplay.charAt(0).toUpperCase()}</div>}
            <div className="min-w-0"><h1 className="text-3xl font-extrabold sm:text-4xl">Your profile</h1><p className="mt-1 break-all text-sm text-blue-100">{user?.email}</p></div>
          </div>
        </div>
        <div className="p-6 sm:p-9">
          <h2 className="text-xl font-extrabold text-slate-950">Profile details</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Keep your display name up to date. Your email is managed by your sign-in provider.</p>
          <form onSubmit={saveProfile} className="mt-6 max-w-xl space-y-4">
            <div><label htmlFor="profile-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label><input id="profile-name" autoComplete="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" placeholder="Your name" /></div>
            <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label><div className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-600">{user?.email ?? "Not available"}</div></div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}
            {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">{message}</p>}
            <button type="submit" disabled={saving} className="min-h-12 rounded-xl bg-[#012153] px-5 py-3 font-bold text-white hover:bg-blue-900 disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button>
          </form>
          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-4 py-2 text-sm font-bold text-white">My learning dashboard</Link>
            <Link href="/settings" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">Account settings</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
