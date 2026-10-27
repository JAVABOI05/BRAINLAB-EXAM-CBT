"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { isCurrentUserAdmin } from "../lib/subscriptionEntitlements";
import UserBadges from "./UserBadges";

const NAV_LINKS = [
  { href: "/cbt", label: "CBT Practice" },
  { href: "/learn", label: "Curriculum" },
  { href: "/classroom", label: "Live Classes", badge: "Live" },
  { href: "/challenge-arena", label: "1v1 Arena" },
  { href: "/ai-learning", label: "AI Studio" },
  { href: "/pricing", label: "Plans" },
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
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen to auth state
  useEffect(() => {
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;
        const currentUser = error ? null : data.user;
        setUser(currentUser);
        if (currentUser) {
          void isCurrentUserAdmin(currentUser.id).then((adminRes) => {
            if (active) setIsAdmin(adminRes);
          });
        } else {
          setIsAdmin(false);
        }
        setCheckingSession(false);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setIsAdmin(false);
          setCheckingSession(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          void isCurrentUserAdmin(currentUser.id).then((adminRes) => {
            if (active) setIsAdmin(adminRes);
          });
        } else {
          setIsAdmin(false);
        }
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
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    router.replace("/");
    router.refresh();
    setSigningOut(false);
  }

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 text-slate-900 shadow-[0_2px_14px_rgba(15,23,42,0.04)] backdrop-blur-md dark:border-slate-800/80 dark:bg-[#071328]/85 dark:text-slate-100 dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-colors">
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo & Emblem */}
        <Link
          href="/"
          onClick={closeAllMenus}
          className="group flex shrink-0 items-center gap-2.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="BrainLab Academy home"
        >
          <div className="relative flex items-center justify-center">
            <Image
              src="/brainlab-mark.png"
              alt="BrainLab Emblem"
              width={42}
              height={38}
              priority
              className="h-9 sm:h-10 w-auto drop-shadow-sm transition-transform group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center leading-none">
            <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              BrainLab
            </span>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-blue-700 dark:text-cyan-400 mt-0.5">
              ACADEMY
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Pills */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-1 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-1 dark:border-slate-800 dark:bg-slate-900/60"
        >
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href + "/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? "bg-white text-blue-900 shadow-xs dark:bg-slate-800 dark:text-cyan-300 font-extrabold"
                    : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                      link.badge === "Live"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-cyan-300"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Desktop Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {checkingSession ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-600" />
              <span>Verifying session…</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              {/* Quick Messages Icon */}
              <Link
                href="/messages"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                title="Messages"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
              </Link>

              {/* Quick Notifications Icon */}
              <Link
                href="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                title="Notifications"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </Link>

              {/* Quick Admin Portal Pill if Administrator */}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 hover:text-slate-950 px-3 py-1.5 text-xs font-black text-amber-600 dark:text-amber-300 transition shadow-sm active:scale-95"
                  title="Open Administrator Portal"
                >
                  <svg className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>Admin Portal</span>
                </Link>
              )}

              {/* Primary "My Learning" Quick Pill */}
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 px-3.5 py-2 text-xs font-black text-white shadow-xs transition hover:shadow-sm active:scale-95"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="7" height="9" x="3" y="3" rx="1.5" />
                  <rect width="7" height="5" x="14" y="3" rx="1.5" />
                  <rect width="7" height="9" x="14" y="12" rx="1.5" />
                  <rect width="7" height="5" x="3" y="16" rx="1.5" />
                </svg>
                <span>Dashboard</span>
              </Link>

              {/* User Dropdown Pill */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-1.5 pr-2.5 text-xs font-bold text-slate-800 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 transition active:scale-95"
                >
                  {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    <img
                      src={user.user_metadata.avatar_url ?? user.user_metadata.picture}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-6 w-6 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-[11px] font-black text-blue-900 dark:bg-blue-900 dark:text-cyan-200">
                      {displayName(user).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[100px] truncate">{displayName(user)}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-400 transition-transform ${userDropdownOpen ? "rotate-180" : ""}`}>
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                {/* Dropdown Menu Overlay */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    <div className="border-b border-slate-100 p-2.5 dark:border-slate-800">
                      <p className="font-extrabold text-slate-950 dark:text-white truncate">{displayName(user)}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1.5">
                        <UserBadges userId={user.id} maxVisible={2} size="xs" />
                      </div>
                    </div>

                    <div className="py-1">
                      {isAdmin && (
                        <Link
                          href="/admin/dashboard"
                          onClick={closeAllMenus}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-black text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 transition mb-1"
                        >
                          <svg className="h-4 w-4 text-amber-600 dark:text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          <span>Admin Portal Command</span>
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        onClick={closeAllMenus}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <span>👤</span> Profile &amp; Bio
                      </Link>
                      <Link
                        href="/skills-passport"
                        onClick={closeAllMenus}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <span>🏅</span> Performance &amp; Badges
                      </Link>
                      <Link
                        href="/pricing"
                        onClick={closeAllMenus}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <span>⚡</span> Subscription &amp; Plans
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        disabled={signingOut}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <span>🚪</span>
                        <span>{signingOut ? "Signing out…" : "Sign Out"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Logged-out state */
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Sign In
              </Link>
              <Link
                href="/account"
                className="rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:shadow-sm active:scale-95"
              >
                Get Started Free →
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:hidden transition active:scale-95"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="text-lg leading-none">{mobileMenuOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Modern Mobile Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#071328] md:hidden animate-in fade-in duration-150">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href + "/"));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeAllMenus}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold ${
                    isActive
                      ? "bg-blue-50 text-blue-900 font-extrabold dark:bg-blue-950/80 dark:text-cyan-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-800 dark:bg-blue-900 dark:text-cyan-300">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User actions on mobile */}
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            {checkingSession ? (
              <span className="text-xs text-slate-400">Verifying session…</span>
            ) : user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-900 dark:bg-blue-900 dark:text-cyan-200">
                    {displayName(user).charAt(0).toUpperCase()}
                  </span>
                  <div className="truncate text-xs">
                    <p className="font-extrabold text-slate-900 dark:text-white truncate">{displayName(user)}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={closeAllMenus}
                    className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 py-2.5 text-xs font-black text-amber-700 dark:text-amber-300 shadow-xs mb-2 active:scale-95 transition"
                  >
                    <svg className="h-4 w-4 text-amber-600 dark:text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>Open Admin Portal →</span>
                  </Link>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/dashboard"
                    onClick={closeAllMenus}
                    className="flex items-center justify-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs"
                  >
                    Dashboard →
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex items-center justify-center rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/account"
                  onClick={closeAllMenus}
                  className="flex items-center justify-center rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/account"
                  onClick={closeAllMenus}
                  className="flex items-center justify-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white"
                >
                  Get Started →
                </Link>
              </div>
            )}

            {/* Quick Community Channels */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-400">Official Channels:</span>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-500 hover:text-emerald-400 font-bold"
                  title="WhatsApp Channel"
                >
                  WhatsApp
                </a>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <a
                  href="https://www.instagram.com/brain_labacademy?dlrf=NGJzcmFnaGcwZHV4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 hover:text-pink-400 font-bold"
                  title="Instagram"
                >
                  Instagram
                </a>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <a
                  href="https://www.tiktok.com/@brainlabacademy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-500 hover:text-cyan-400 font-bold"
                  title="TikTok"
                >
                  TikTok
                </a>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <a
                  href="https://youtube.com/@thebrainlabhub?si=z4sAVuNmJUdPom_u"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:text-red-400 font-bold"
                  title="YouTube"
                >
                  YouTube
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
