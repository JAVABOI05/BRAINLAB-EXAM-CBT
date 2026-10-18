"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/login", label: "CBT Practice" },
  { href: "/learn", label: "Learning Hub" },
  { href: "/ai-learning", label: "AI Learning" },
  { href: "/courses", label: "Courses" },
  { href: "/community", label: "Community" },
  { href: "/support", label: "Help" },
  { href: "/about", label: "About" },
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" aria-label="BrainLab Academy home">
          <Image src="/brainlab-logo.svg" alt="BrainLab Academy" width={110} height={61} priority className="h-11 w-auto" />
        </Link>
        <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-800 xl:hidden" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="brainlab-main-nav" onClick={() => setMenuOpen(!menuOpen)}>
          <span aria-hidden="true" className="text-xl">{menuOpen ? "×" : "☰"}</span>
        </button>
        <nav id="brainlab-main-nav" aria-label="Main navigation" className={menuOpen ? "absolute left-0 right-0 top-[72px] border-b border-slate-200 bg-white p-4 shadow-lg xl:static xl:flex xl:items-center xl:gap-1 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none" : "hidden xl:flex xl:items-center xl:gap-1"}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#012153] md:py-2">
              {link.label}
            </Link>
          ))}
          {checkingSession ? (
            <span className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 xl:ml-2 xl:mt-0" aria-live="polite">Checking account…</span>
          ) : user ? (
            <div className="mt-2 flex flex-col gap-2 xl:ml-2 xl:mt-0 xl:flex-row xl:items-center">
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0a2f72]">My learning</Link>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" title={user.email ?? "Your profile"}>{displayName(user)}</Link>
              <button type="button" onClick={() => void signOut()} disabled={signingOut} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">{signingOut ? "Signing out…" : "Sign out"}</button>
            </div>
          ) : (
            <Link href="/account" onClick={() => setMenuOpen(false)} className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0a2f72] xl:ml-2 xl:mt-0">Sign in / Create account</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
