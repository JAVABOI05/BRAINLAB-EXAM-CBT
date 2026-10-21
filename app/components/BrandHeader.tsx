"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import UserBadges from "./UserBadges";

const links = [
  { href: "/login", label: "CBT Practice" },
  { href: "/learn", label: "Learning Hub" },
  { href: "/calendar", label: "Timetable" },
  { href: "/self-practice", label: "Self Practice" },
  { href: "/ai-learning", label: "AI Learning" },
  { href: "/support", label: "Help" },
];

function displayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const name = metadata.full_name ?? metadata.name;
  return typeof name === "string" && name.trim() ? name.trim() : user.email?.split("@")[0] ?? "Learner";
}

export default function BrandHeader() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setUser(error ? null : data.user);
      setCheckingSession(false);
    }).catch(() => {
      if (active) { setUser(null); setCheckingSession(false); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ?? null); setCheckingSession(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/operator-gate", { method: "DELETE", cache: "no-store" });
    } catch {
      // Always proceed to sign out of the learner session.
    }
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    router.replace("/");
    router.refresh();
    setSigningOut(false);
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-[0_3px_18px_rgba(15,23,42,0.035)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
        <Link href="/" onClick={closeMenu} className="flex shrink-0 items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" aria-label="BrainLab Academy home">
          <Image src="/brainlab-logo.svg" alt="BrainLab Academy" width={110} height={61} priority className="h-11 w-auto" />
        </Link>
        <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 xl:hidden" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="brainlab-main-nav" onClick={() => setMenuOpen(!menuOpen)}>
          <span aria-hidden="true" className="text-xl">{menuOpen ? "×" : "☰"}</span>
        </button>
        <nav id="brainlab-main-nav" aria-label="Main navigation" className={menuOpen ? "absolute left-0 right-0 top-[72px] flex max-h-[calc(100dvh-72px)] flex-col gap-1 overflow-y-auto border-b border-slate-200 bg-white p-4 shadow-xl xl:static xl:max-h-none xl:flex-row xl:items-center xl:gap-0 xl:overflow-visible xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none" : "hidden xl:flex xl:items-center xl:gap-0"}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[#0b2a5b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 xl:py-2">
              {link.label}
            </Link>
          ))}
          {checkingSession ? (
            <span className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 xl:ml-2 xl:mt-0" aria-live="polite"><span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" /> Checking account…</span>
          ) : user ? (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3 xl:ml-3 xl:mt-0 xl:flex-row xl:items-center xl:border-0 xl:pt-0">
              <Link href="/dashboard" onClick={closeMenu} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b2a5b] px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-900"><span aria-hidden="true">⌂</span> My learning</Link>
              <Link href="/messages" onClick={closeMenu} className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100" title="Private & Group Messages">
                💬 <span className="xl:hidden ml-1.5">Messages</span>
              </Link>
              <Link href="/notifications" onClick={closeMenu} className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100" title="Notifications">
                🔔 <span className="xl:hidden ml-1.5">Notifications</span>
              </Link>
              <Link href="/profile" onClick={closeMenu} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50" title={user.email ?? "Your profile"}>
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? <img src={user.user_metadata.avatar_url ?? user.user_metadata.picture} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-950">{displayName(user).charAt(0).toUpperCase()}</span>}
                <span className="max-w-[140px] truncate">{displayName(user)}</span>
                <UserBadges userId={user.id} maxVisible={2} size="xs" />
              </Link>
              <button type="button" onClick={() => void signOut()} disabled={signingOut} className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60">{signingOut ? "Signing out…" : "Sign out"}</button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3 xl:ml-3 xl:mt-0 xl:flex-row xl:items-center xl:border-0 xl:pt-0">
              <Link href="/account" onClick={closeMenu} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100">Sign in</Link>
              <Link href="/account?mode=signup" onClick={closeMenu} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2a5b] px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-900">Create account <span aria-hidden="true" className="ml-1">↗</span></Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}


