"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import UserBadges from "./UserBadges";
import { useLearnerTheme } from "./LearnerThemeProvider";

const links = [
  { href: "/cbt", label: "CBT Practice" },
  { href: "/learn", label: "Learning Hub" },
  { href: "/challenge-arena", label: "Challenge Arena" },
  { href: "/ai-learning", label: "AI Learning" },
  { href: "/support", label: "Help" },
];

function displayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const name = metadata.full_name ?? metadata.name;
  return typeof name === "string" && name.trim()
    ? name.trim()
    : user.email?.split("@")[0] ?? "Learner";
}

export default function BrandHeader() {
  const router = useRouter();
  const { resolvedTheme } = useLearnerTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;
        setUser(error ? null : data.user);
        setCheckingSession(false);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setCheckingSession(false);
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null);
        setCheckingSession(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      localStorage.removeItem("candidate");
      localStorage.removeItem("exam_attempt");
      localStorage.removeItem("exam_result");
      localStorage.removeItem("exam_summary");
    } catch {
      // storage unavailable
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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 text-slate-900 shadow-[0_3px_18px_rgba(15,23,42,0.035)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#071328]/95 dark:text-slate-100 dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)] transition-colors duration-200">
      <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
        <Link
          href="/"
          onClick={closeMenu}
          className="group flex shrink-0 items-center gap-2.5 sm:gap-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          aria-label="BrainLab Academy home"
        >
          <Image
            src="/brainlab-mark.png"
            alt="BrainLab Emblem"
            width={48}
            height={42}
            priority
            className="h-11 sm:h-12 w-auto drop-shadow-xs transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col justify-center leading-none">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              BrainLab
            </span>
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.24em] uppercase text-blue-700 dark:text-cyan-400 mt-1">
              ACADEMY
            </span>
          </div>
        </Link>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 text-base font-bold transition-all duration-150 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 xl:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="brainlab-main-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span aria-hidden="true" className="text-xl">
            {menuOpen ? "×" : "☰"}
          </span>
        </button>

        {/* Navigation links */}
        <nav
          id="brainlab-main-nav"
          aria-label="Main navigation"
          className={
            menuOpen
              ? "absolute left-0 right-0 top-[72px] flex max-h-[calc(100dvh-72px)] flex-col gap-1 overflow-y-auto border-b border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-[#071328] dark:text-slate-100 p-4 shadow-2xl xl:static xl:max-h-none xl:flex-row xl:items-center xl:gap-0 xl:overflow-visible xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none"
              : "hidden xl:flex xl:items-center xl:gap-0"
          }
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all duration-150 active:scale-95 text-slate-700 hover:bg-slate-100 hover:text-[#012153] dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 xl:py-2"
            >
              {link.label}
            </Link>
          ))}

          {checkingSession ? (
            <span
              className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400 px-4 py-2 text-sm xl:ml-2 xl:mt-0"
              aria-live="polite"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" /> Checking account…
            </span>
          ) : user ? (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 xl:ml-3 xl:mt-0 xl:flex-row xl:items-center xl:border-0 xl:pt-0">
              <Link
                href="/dashboard"
                onClick={closeMenu}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#012153] hover:bg-blue-900 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
              >
                <span aria-hidden="true">⌂</span> My learning
              </Link>

              <Link
                href="/messages"
                onClick={closeMenu}
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold transition-all duration-150 active:scale-95 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Private & Group Messages"
              >
                💬 <span className="xl:hidden ml-1.5">Messages</span>
              </Link>

              <Link
                href="/notifications"
                onClick={closeMenu}
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold transition-all duration-150 active:scale-95 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Notifications"
              >
                🔔 <span className="xl:hidden ml-1.5">Notifications</span>
              </Link>

              <Link
                href="/profile"
                onClick={closeMenu}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-700 px-3 py-2 text-sm font-bold transition-all duration-150 active:scale-95"
                title={user.email ?? "Your profile"}
              >
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata.avatar_url ?? user.user_metadata.picture}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-950"
                  >
                    {displayName(user).charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[140px] truncate">{displayName(user)}</span>
                <UserBadges userId={user.id} maxVisible={2} size="xs" />
              </Link>

              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold transition-all duration-150 active:scale-95 disabled:opacity-60 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 xl:ml-3 xl:mt-0 xl:flex-row xl:items-center xl:border-0 xl:pt-0">
              <Link
                href="/account"
                onClick={closeMenu}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-900 px-5 py-2 text-sm font-extrabold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
              >
                Sign In / Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
