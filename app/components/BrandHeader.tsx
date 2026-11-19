"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { isCurrentUserAdmin } from "../lib/subscriptionEntitlements";
import { useCohortConfig } from "../lib/useCohortConfig";

export interface ExploreCardItem {
  id: string;
  title: string;
  description: string;
  targetId: string;
  badge: string;
  badgeColor: string;
  tierNote: string;
}

export function NavProductIcon({ id }: { id: string }) {
  switch (id) {
    case "cbt-practice":
      return (
        <svg className="h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
        </svg>
      );
    case "learning-hub":
      return (
        <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10M6 10h10" />
        </svg>
      );
    case "stem-studio":
      return (
        <svg className="h-4 w-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 2v7.31L4.2 18.24A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.66-2.76L14 9.31V2" />
          <path d="M8.5 2h7M7 16h10" />
        </svg>
      );
    case "ai-learning":
      return (
        <svg className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
        </svg>
      );
    case "challenge-arena":
      return (
        <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
    case "live-classroom":
      return (
        <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    default:
      return null;
  }
}

export interface DirectNavLinkItem {
  id: string;
  label: string;
  targetId: string;
}

export const EXPLORE_CARDS: ExploreCardItem[] = [
  {
    id: "cbt-practice",
    title: "CBT Practice Simulator",
    description: "Authentic 8-key JAMB exam hall interface with real-time countdown timer, calculator, and offline sync.",
    targetId: "products",
    badge: "8-Key Exam Hall",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300 border-blue-200 dark:border-blue-800/60",
    tierNote: "Free Daily Mocks & Pro Banks",
  },
  {
    id: "learning-hub",
    title: "Curriculum Learning Hub",
    description: "Structured lesson modules across Science, Art, and Commercial with verified WAEC & JAMB past questions.",
    targetId: "products",
    badge: "WAEC / JAMB",
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
    tierNote: "Core Curriculum Included",
  },
  {
    id: "stem-studio",
    title: "Virtual STEM Studio",
    description: "Interactive 3D molecular biology explorer, physics mechanics lab, and chemical dynamics simulations.",
    targetId: "stem-studio",
    badge: "Interactive 3D",
    badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60",
    tierNote: "Visual Science Labs",
  },
  {
    id: "ai-learning",
    title: "AI Diagnostic Studio",
    description: "Socratic weak-topic diagnosis, adaptive remediation prompts, and personal cognitive Learning DNA.",
    targetId: "products",
    badge: "Socratic AI",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60",
    tierNote: "Guided Diagnostics",
  },
  {
    id: "live-classroom",
    title: "Live Classroom & Whiteboard",
    description: "Interactive real-time masterclasses with Smart Whiteboard, 25fps vector sync, and tutor audio guidance.",
    targetId: "products",
    badge: "Smart Board",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
    tierNote: "Live Masterclasses",
  },
  {
    id: "challenge-arena",
    title: "Challenge Arena",
    description: "Head-to-head live 1v1 academic sprint battles, daily quest streaks, and nationwide school rankings.",
    targetId: "products",
    badge: "Live 1v1",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    tierNote: "Free Daily Sprints",
  },
];

export const DIRECT_NAV_LINKS: DirectNavLinkItem[] = [
  { id: "tracks", label: "Exam Tracks", targetId: "audiences" },
  { id: "about", label: "How It Works", targetId: "the-loop" },
  { id: "practice", label: "Free Practice", targetId: "pricing" },
  { id: "faq", label: "FAQ", targetId: "faq" },
];

export const LEGACY_NAV_MAPPING = [
  { href: "/products", label: "Products" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
  { href: "/schools", label: "For Schools" },
  { href: "/cbt", label: "CBT Practice" },
  { href: "/about", label: "About" },
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
  const pathname = usePathname() ?? "/";
  const cohortConfig = useCohortConfig();

  // Menu states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);

  // Scroll experience states
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  // Auth and session states
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const exploreRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Passive, GPU-accelerated scroll progress calculation
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
          setScrollProgress(progress);
          setIsScrolled(scrollTop > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scrollspy observer for active section reflection
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection("");
      return;
    }

    const sectionIds = ["audiences", "the-loop", "products", "stem-studio", "pricing", "faq"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-15% 0px -55% 0px",
        threshold: [0.05, 0.2, 0.5],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  // Click outside listener & Escape key handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setExploreDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setExploreDropdownOpen(false);
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
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
        // silent fallback
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

  // Listen to Supabase auth state
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
      localStorage.removeItem("candidate_subjects");
      localStorage.removeItem("exam_attempt");
      localStorage.removeItem("exam_result");
      localStorage.removeItem("exam_summary");
      localStorage.removeItem("bl_student_xp_cache");
      localStorage.removeItem("brainlab_streak_count");
      localStorage.removeItem("brainlab_last_active_date");
      localStorage.removeItem("brainlab_student_goals_set");
      localStorage.removeItem("brainlab_goal_wizard_dismissed");
      window.dispatchEvent(new Event("brainlab-local-storage"));
      window.dispatchEvent(new CustomEvent("brainlab_xp_awarded", { detail: null }));
    } catch {
      // storage unavailable
    }
    await supabase.auth.signOut();
    setUser(null);
    setUserDropdownOpen(false);
    setExploreDropdownOpen(false);
    setMobileMenuOpen(false);
    router.replace("/");
    router.refresh();
    setSigningOut(false);
  }

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setExploreDropdownOpen(false);
  };

  // Auto-close open menus on navigation
  useEffect(() => {
    closeAllMenus();
  }, [pathname]);

  // Lock background body scroll when mobile navigation drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  // Cross-page navigation and smooth anchor scrolling handler
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (pathname === "/") {
      e.preventDefault();
      closeAllMenus();
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `#${targetId}`);
      }
    } else {
      closeAllMenus();
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      closeAllMenus();
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.pushState(null, "", "/");
    } else {
      closeAllMenus();
    }
  };

  // Determine active section states
  const isExploreActive = activeSection === "products" || activeSection === "stem-studio";
  const isTracksActive = activeSection === "audiences";
  const isAboutActive = activeSection === "the-loop";
  const isPricingActive = activeSection === "pricing";
  const isPracticeActive = activeSection === "pricing" || activeSection === "products";
  const isFaqActive = activeSection === "faq";

  const isHomePage = pathname === "/";

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-200 ${
        isScrolled
          ? "border-slate-200/80 bg-white/95 py-2 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#071328]/95 dark:shadow-lg text-slate-900 dark:text-white"
          : "border-slate-200/60 bg-white/90 py-3 shadow-2xs backdrop-blur-md dark:border-white/10 dark:bg-[#071328]/85 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-slate-900 dark:text-white"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo & Emblem */}
        <Link
          href="/"
          onClick={handleLogoClick}
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
              className="h-8.5 sm:h-9.5 w-auto drop-shadow-sm transition-transform group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center leading-none">
            <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              BrainLab
            </span>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-blue-600 dark:text-cyan-300 mt-0.5">
              ACADEMY
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Pill */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1 shadow-inner backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80 text-slate-900 dark:text-white"
        >
          {/* Primary Explore Dropdown */}
          <div className="relative" ref={exploreRef}>
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={exploreDropdownOpen}
              onClick={() => setExploreDropdownOpen(!exploreDropdownOpen)}
              className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                exploreDropdownOpen || isExploreActive
                  ? "bg-slate-950 text-white shadow-xs font-extrabold dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600"
                  : "text-slate-700 hover:text-slate-950 hover:bg-white dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <span>Explore</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${exploreDropdownOpen ? "rotate-180 text-blue-600 dark:text-cyan-300" : "text-slate-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Desktop Explore Dropdown Mega-Panel */}
            {exploreDropdownOpen && (
              <div
                className="absolute left-0 mt-2.5 w-[580px] rounded-2xl border border-slate-200/90 bg-white/98 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50 text-slate-900 dark:border-white/15 dark:bg-[#0b1528]/95 dark:text-white"
                role="menu"
                aria-label="Explore learning experiences"
              >
                <div className="flex items-center justify-between px-2.5 pb-2 border-b border-slate-100 dark:border-white/10 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    BrainLab Learning Ecosystem
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-cyan-400">
                    Interactive Modules
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {EXPLORE_CARDS.map((card) => (
                    <Link
                      key={card.id}
                      href={pathname === "/" ? `#${card.targetId}` : `/#${card.targetId}`}
                      onClick={(e) => handleAnchorClick(e, card.targetId)}
                      className="group flex flex-col justify-between rounded-xl border border-slate-100 dark:border-white/5 p-2.5 transition hover:border-blue-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                      role="menuitem"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm group-hover:scale-105 transition-transform shrink-0 border border-slate-200 dark:bg-slate-800 dark:border-white/10">
                              <NavProductIcon id={card.id} />
                            </span>
                            <span className="text-xs font-black text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-cyan-300 line-clamp-1">
                              {card.title}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 pl-9">
                          {card.description}
                        </p>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-white/10 text-[10px]">
                        <span className="font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {card.tierNote}
                        </span>
                        <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase ${card.badgeColor}`}>
                          {card.badge}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Dropdown Footer Information Banner */}
                <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between dark:bg-slate-900/90 dark:border-white/10 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 stroke-current stroke-2 fill-none shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Free daily practice drills available for every student.</span>
                  </span>
                  <Link
                    href="/pricing"
                    onClick={closeAllMenus}
                    className="font-bold text-blue-600 dark:text-cyan-400 hover:underline"
                  >
                    Explore All Tracks &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Direct Anchor Links */}
          {DIRECT_NAV_LINKS.map((link) => {
            const isActive =
              (link.id === "tracks" && isTracksActive) ||
              (link.id === "about" && isAboutActive) ||
              (link.id === "practice" && isPracticeActive) ||
              (link.id === "pricing" && isPricingActive) ||
              (link.id === "faq" && isFaqActive);

            return (
              <Link
                key={link.id}
                href={pathname === "/" ? `#${link.targetId}` : `/#${link.targetId}`}
                onClick={(e) => handleAnchorClick(e, link.targetId)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-slate-950 text-white shadow-xs font-extrabold dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600"
                    : "text-slate-700 hover:text-slate-950 hover:bg-white dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Desktop Actions & User Session Controls */}
        <div className="hidden md:flex items-center gap-2">
          {checkingSession ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-200">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
              <span>Checking…</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 ml-1">
              {/* Messages Shortcut */}
              <Link
                href="/messages"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                title="Messages"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
              </Link>

              {/* Notifications Shortcut */}
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
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 hover:text-slate-950 px-3 py-1.5 text-xs font-black text-amber-600 dark:text-amber-300 transition shadow-xs active:scale-95"
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

              {/* User Avatar & Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  aria-expanded={userDropdownOpen}
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
                        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="12" width="4" height="8" rx="1"/>
                          <rect x="10" y="8" width="4" height="12" rx="1"/>
                          <rect x="17" y="4" width="4" height="16" rx="1"/>
                        </svg>
                        <span>Student Dashboard</span>
                      </Link>
                      <Link
                        href="/profile"
                        onClick={closeAllMenus}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>Profile &amp; Bio</span>
                      </Link>
                      <Link
                        href="/apex"
                        onClick={closeAllMenus}
                        className="flex items-center justify-between rounded-xl px-2.5 py-2 font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 21V10M20 21V10M12 21V10M2 10h20M12 3l10 7H2zM2 21h20"/>
                          </svg>
                          <span>{cohortConfig.active_cohort_name}</span>
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
                        <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                        </svg>
                        <span>{signingOut ? "Signing out…" : "Sign Out"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Logged-out state: Single prominent 'Start Free' CTA leading to auth portal */
            <div className="flex items-center gap-2 ml-1">
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-black text-white shadow-xs hover:shadow transition active:scale-95 bl-focus-ring"
              >
                Start Free &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          id="mobile-menu-trigger"
          aria-controls="mobile-navigation-drawer"
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 lg:hidden transition active:scale-95 bl-focus-ring cursor-pointer"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Accessible Mobile Thumb-Friendly Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          role="region"
          aria-label="Mobile Navigation Menu"
          className="border-b border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#071328] lg:hidden animate-in fade-in duration-150 max-h-[85vh] overflow-y-auto"
        >
          {/* Explore Experiences Category */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
              <span>Explore Experiences</span>
              <span className="text-[10px] text-slate-400 font-normal">Student Products</span>
            </div>
            <div className="space-y-1.5 mt-1.5">
              {EXPLORE_CARDS.map((card) => (
                <Link
                  key={card.id}
                  href={pathname === "/" ? `#${card.targetId}` : `/#${card.targetId}`}
                  onClick={(e) => handleAnchorClick(e, card.targetId)}
                  className="flex min-h-[48px] items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/60"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-sm shrink-0">
                      <NavProductIcon id={card.id} />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-extrabold text-slate-900 dark:text-white leading-tight">
                        {card.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal leading-tight">
                        {card.tierNote}
                      </span>
                    </span>
                  </span>
                  <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase shrink-0 ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Direct Navigation Links */}
          <div className="mb-4 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overview &amp; Help
            </div>
            <div className="space-y-1 mt-1">
              {DIRECT_NAV_LINKS.map((link) => (
                <Link
                  key={link.id}
                  href={pathname === "/" ? `#${link.targetId}` : `/#${link.targetId}`}
                  onClick={(e) => handleAnchorClick(e, link.targetId)}
                  className="flex min-h-[48px] items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span>{link.label}</span>
                  <span className="text-slate-400 text-sm">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>

          {/* User actions on mobile */}
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            {checkingSession ? (
              <span className="text-xs text-slate-300">Verifying session…</span>
            ) : user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-900 dark:bg-blue-900 dark:text-cyan-200">
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
                    className="flex min-h-[48px] items-center justify-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs"
                  >
                    Student Portal →
                  </Link>
                  <Link
                    href="/apex"
                    onClick={closeAllMenus}
                    className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 py-2.5 text-xs font-bold"
                  >
                    <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 21V10M20 21V10M12 21V10M2 10h20M12 3l10 7H2zM2 21h20"/>
                    </svg>
                    <span>{cohortConfig.active_cohort_name}</span>
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-1 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={closeAllMenus}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 transition active:scale-98 bl-focus-ring"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?mode=signup"
                  onClick={closeAllMenus}
                  className="flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-900/20 active:scale-98 bl-focus-ring"
                >
                  Start Free &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Distinctive, Subtle Scroll-Progress Indicator Bar (GPU Accelerated) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-200/40 dark:bg-slate-800/50 pointer-events-none overflow-hidden"
        role="progressbar"
        aria-label="Reading progress across page"
        aria-valuenow={Math.round(scrollProgress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400 transition-transform duration-75 ease-out will-change-transform motion-reduce:transition-none"
          style={{
            transform: `scaleX(${scrollProgress})`,
            transformOrigin: "left",
          }}
        />
      </div>
    </header>
  );
}
