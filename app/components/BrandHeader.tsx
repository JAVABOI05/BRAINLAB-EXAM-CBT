"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { isCurrentUserAdmin } from "../lib/subscriptionEntitlements";
import UserBadges from "./UserBadges";

interface DropdownItem {
  title: string;
  description: string;
  href: string;
  badge?: string;
  icon?: string;
}

export const LEGACY_NAV_MAPPING = [
  { href: "/products", label: "Products" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
  { href: "/schools", label: "For Schools" },
  { href: "/cbt", label: "CBT Practice" },
  { href: "/about", label: "About" },
];

const PROGRAMMES_ITEMS: DropdownItem[] = [
  {
    title: "JAMB UTME Accelerator",
    description: "Full-length 4-subject CBT mock exams with standard 2027 question banks and timing.",
    href: "/products/cbt",
    badge: "Primary Focus",
    icon: "🎯",
  },
  {
    title: "Post-UTME Screening Suite",
    description: "Institution-specific university screening tests, aptitude practice, and cut-off guides.",
    href: "/cbt?category=POST_UTME",
    badge: "University Screening",
    icon: "🏛️",
  },
  {
    title: "Apex Cohort Programme",
    description: "Intensive live masterclasses, dedicated tutors, weekly roadmap, and academic accountability.",
    href: "/apex",
    badge: "Enrolment",
    icon: "⚡",
  },
  {
    title: "WAEC SSCE Prep & Past Papers",
    description: "Curriculum theory lessons, formula sheets, and past question analysis.",
    href: "/learn",
    icon: "📚",
  },
  {
    title: "NECO Senior School Certificate",
    description: "Standard national examination practice questions and topic revision.",
    href: "/learn",
    icon: "📝",
  },
  {
    title: "National Competition Arena",
    description: "Head-to-head live 1v1 academic sprint battles and school leaderboards.",
    href: "/products/challenge-arena",
    icon: "🏆",
  },
];

const PLATFORM_ITEMS: DropdownItem[] = [
  {
    title: "CBT Mock Simulator",
    description: "Authentic JAMB exam interface with timer, calculator, and offline sync.",
    href: "/products/cbt",
    icon: "🖥️",
  },
  {
    title: "Curriculum Learning Hub",
    description: "Structured video and text modules across Science, Art, and Commercial.",
    href: "/products/learning-hub",
    icon: "📖",
  },
  {
    title: "Virtual STEM Studio",
    description: "Interactive Physics, Chemistry, and Math parameter simulations.",
    href: "/products/stem-studio",
    badge: "Interactive",
    icon: "🔬",
  },
  {
    title: "Live Interactive Classroom",
    description: "Audio, video, and synchronized whiteboard masterclasses with top tutors.",
    href: "/products/live-classroom",
    icon: "👨‍🏫",
  },
  {
    title: "AI Diagnostic Studio",
    description: "Pinpoint weak subtopics and drill targeted reinforcement questions.",
    href: "/products/ai-learning",
    icon: "🤖",
  },
];

const RESOURCES_ITEMS: DropdownItem[] = [
  {
    title: "Official UTME Syllabus",
    description: "Complete NERDC/JAMB subject syllabus, topics, and recommended texts.",
    href: "/syllabus",
    badge: "Official",
    icon: "📋",
  },
  {
    title: "Downloads & Past Papers",
    description: "Curated PDF revision summaries and official exam timetables.",
    href: "/resources",
    icon: "📥",
  },
  {
    title: "Frequently Asked Questions",
    description: "Common questions about practice codes, offline mode, and payments.",
    href: "/faq",
    icon: "💡",
  },
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
  const [openNavDropdown, setOpenNavDropdown] = useState<"programmes" | "platform" | "resources" | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [isLiveClassOn, setIsLiveClassOn] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navDropdownRef = useRef<HTMLDivElement>(null);

  // Poll for active live classes
  useEffect(() => {
    let isMounted = true;
    const checkLiveClass = async () => {
      try {
        const res = await fetch("/api/classroom/classes?status=live");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.classes)) {
            setIsLiveClassOn(data.classes.length > 0);
          }
        }
      } catch {
        // keep default
      }
    };

    void checkLiveClass();
    const interval = setInterval(checkLiveClass, 60_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (navDropdownRef.current && !navDropdownRef.current.contains(e.target as Node)) {
        setOpenNavDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch unread notifications count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {
        // ignore
      }
    };

    void fetchUnread();

    const handleNewNotification = () => {
      void fetchUnread();
    };

    window.addEventListener("brainlab:notification-received", handleNewNotification);
    return () => {
      isMounted = false;
      window.removeEventListener("brainlab:notification-received", handleNewNotification);
    };
  }, [user]);

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
    setOpenNavDropdown(null);
    setMobileMenuOpen(false);
    router.replace("/");
    router.refresh();
    setSigningOut(false);
  }

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setOpenNavDropdown(null);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 text-slate-900 shadow-[0_2px_14px_rgba(15,23,42,0.04)] backdrop-blur-md dark:border-slate-800/80 dark:bg-[#071328]/90 dark:text-slate-100 dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-colors">
      <div className="mx-auto flex min-h-[70px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        
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

        {/* Center Desktop Navigation Pillars (5 Pillars) */}
        <nav
          ref={navDropdownRef}
          aria-label="Main navigation"
          className="hidden lg:flex items-center gap-1 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-1 dark:border-slate-800 dark:bg-slate-900/60"
        >
          {/* Pillar 1: Programmes Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenNavDropdown(openNavDropdown === "programmes" ? null : "programmes")}
              className={`relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                openNavDropdown === "programmes" || pathname.startsWith("/products/cbt") || pathname.startsWith("/products/challenge-arena")
                  ? "bg-white text-blue-900 shadow-xs dark:bg-slate-800 dark:text-cyan-300 font-extrabold"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <span>Programmes</span>
              <svg className={`h-3 w-3 transition-transform ${openNavDropdown === "programmes" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
            </button>

            {openNavDropdown === "programmes" && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-[#0b1528] animate-in fade-in zoom-in-95 duration-100 z-50">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Targeted Curricula
                </div>
                {PROGRAMMES_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenNavDropdown(null)}
                    className="flex items-start gap-2.5 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group"
                  >
                    <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 text-[9px] font-black uppercase text-blue-800 dark:text-cyan-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pillar 2: Platform Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenNavDropdown(openNavDropdown === "platform" ? null : "platform")}
              className={`relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                openNavDropdown === "platform" || pathname.startsWith("/products")
                  ? "bg-white text-blue-900 shadow-xs dark:bg-slate-800 dark:text-cyan-300 font-extrabold"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <span>Platform</span>
              <svg className={`h-3 w-3 transition-transform ${openNavDropdown === "platform" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
            </button>

            {openNavDropdown === "platform" && (
              <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-[#0b1528] animate-in fade-in zoom-in-95 duration-100 z-50">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Learning &amp; Testing Ecosystem
                </div>
                {PLATFORM_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenNavDropdown(null)}
                    className="flex items-start gap-2.5 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group"
                  >
                    <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pillar 3: CBT Practice Direct Link */}
          <Link
            href="/cbt"
            onClick={() => setOpenNavDropdown(null)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              pathname === "/cbt"
                ? "bg-white text-blue-900 shadow-xs dark:bg-slate-800 dark:text-cyan-300 font-extrabold"
                : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            CBT Practice
          </Link>

          {/* Pillar 4: Resources Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenNavDropdown(openNavDropdown === "resources" ? null : "resources")}
              className={`relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                openNavDropdown === "resources" || pathname.startsWith("/syllabus") || pathname.startsWith("/resources") || pathname.startsWith("/faq")
                  ? "bg-white text-blue-900 shadow-xs dark:bg-slate-800 dark:text-cyan-300 font-extrabold"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <span>Resources</span>
              <svg className={`h-3 w-3 transition-transform ${openNavDropdown === "resources" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
            </button>

            {openNavDropdown === "resources" && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-[#0b1528] animate-in fade-in zoom-in-95 duration-100 z-50">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Student &amp; Academic Tools
                </div>
                {RESOURCES_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenNavDropdown(null)}
                    className="flex items-start gap-2.5 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group"
                  >
                    <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pillar 5: About Direct Link */}
          <Link
            href="/about"
            onClick={() => setOpenNavDropdown(null)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              pathname === "/about"
                ? "bg-white text-blue-900 shadow-xs dark:bg-slate-800 dark:text-cyan-300 font-extrabold"
                : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            About
          </Link>
        </nav>

        {/* Right Desktop Actions & Action Buttons */}
        <div className="hidden md:flex items-center gap-2">

          {checkingSession ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-600" />
              <span>Checking…</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 ml-1">
              {/* Quick Messages */}
              <Link
                href="/messages"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                title="Messages"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
              </Link>

              {/* Quick Notifications */}
              <Link
                href="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                title="Notifications"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Quick Admin Portal Button */}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 hover:text-slate-950 px-3 py-1.5 text-xs font-black text-amber-600 dark:text-amber-300 transition shadow-sm active:scale-95"
                  title="Open Administrator Portal"
                >
                  <svg className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>Admin</span>
                </Link>
              )}

              {/* Student Portal Primary Pill */}
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 px-3.5 py-2 text-xs font-black text-white shadow-xs transition hover:shadow-sm active:scale-95"
              >
                <span>Student Portal →</span>
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
                  <span className="max-w-[80px] truncate text-slate-900 dark:text-slate-100">{displayName(user)}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-[#0b1528] z-50">
                    <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {displayName(user)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1 text-xs">
                      <Link
                        href="/dashboard"
                        onClick={closeAllMenus}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <span>📊</span> Student Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        onClick={closeAllMenus}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <span>👤</span> Profile &amp; Bio
                      </Link>
                      <Link
                        href="/apex"
                        onClick={closeAllMenus}
                        className="flex items-center justify-between rounded-xl px-2.5 py-2 font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      >
                        <span className="flex items-center gap-2">
                          <span>🏛️</span> Apex Cohort
                        </span>
                        <span className="rounded-md bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 text-[9px] font-black uppercase text-indigo-800 dark:text-indigo-200">
                          Cohort
                        </span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        disabled={signingOut}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
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
            <div className="flex items-center gap-2 ml-1">
              <Link
                href="/login"
                className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Sign In
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:shadow-sm active:scale-95"
              >
                Start Free &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 lg:hidden transition active:scale-95"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="text-lg leading-none">{mobileMenuOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Modern Mobile Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#071328] lg:hidden animate-in fade-in duration-150 max-h-[85vh] overflow-y-auto">
          {/* Mobile Programmes Pillar */}
          <div className="mb-3">
            <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
              Programmes
            </div>
            <div className="space-y-1 mt-1">
              {PROGRAMMES_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeAllMenus}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                  </span>
                  {item.badge && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-800 dark:bg-blue-900 dark:text-cyan-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Platform Pillar */}
          <div className="mb-3">
            <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
              Platform Features
            </div>
            <div className="space-y-1 mt-1">
              {PLATFORM_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeAllMenus}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                  </span>
                  {item.badge && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Resources Pillar */}
          <div className="mb-3">
            <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
              Resources &amp; Support
            </div>
            <div className="space-y-1 mt-1">
              <Link
                href="/cbt"
                onClick={closeAllMenus}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>🎯</span>
                <span>CBT Exam Simulator</span>
              </Link>
              {RESOURCES_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeAllMenus}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                  </span>
                </Link>
              ))}
              <Link
                href="/about"
                onClick={closeAllMenus}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>ℹ️</span>
                <span>About BrainLab Academy</span>
              </Link>

              <Link
                href="/contact"
                onClick={closeAllMenus}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>📞</span>
                <span>Contact &amp; Helpdesk</span>
              </Link>
            </div>
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

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/dashboard"
                    onClick={closeAllMenus}
                    className="flex items-center justify-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs"
                  >Student Portal &rarr;</Link>
                  <Link
                    href="/apex"
                    onClick={closeAllMenus}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 py-2.5 text-xs font-bold"
                  >
                    <span>🏛️</span>
                    <span>Apex Cohort</span>
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={closeAllMenus}
                  className="flex items-center justify-center rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?mode=signup"
                  onClick={closeAllMenus}
                  className="flex items-center justify-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white"
                >
                  Start Free &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
