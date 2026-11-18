"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useLearnerTheme, type AppearancePreference } from "../components/LearnerThemeProvider";
import { isGovernanceAdminRole, isInstructorRole } from "../lib/adminRoles";
import { StudentAvatar } from "../components/ui/StudentAvatar";
import { extractStudentProfile } from "../lib/studentProfile";
import { StudentCommandPalette } from "../components/StudentCommandPalette";

export interface StudentNavItem {
  href: string;
  label: string;
  iconId: string;
}

export const STUDENT_NAV_LINKS: StudentNavItem[] = [
  { href: "/dashboard", label: "Overview", iconId: "dashboard" },
  { href: "/learn", label: "Learning Hub", iconId: "learn" },
  { href: "/community", label: "Communities", iconId: "community" },
  { href: "/ai-learning", label: "AI Tutor", iconId: "ai-learning" },
  { href: "/cbt", label: "CBT Practice", iconId: "cbt" },
  { href: "/challenge-arena", label: "Arena", iconId: "arena" },
  { href: "/classroom", label: "Live Stage", iconId: "classroom" },
  { href: "/messages", label: "Messages", iconId: "messages" },
  { href: "/assignments", label: "Assignments", iconId: "assignments" },
];

function NavIcon({ iconId, className = "h-4 w-4" }: { iconId: string; className?: string }) {
  switch (iconId) {
    case "dashboard":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      );
    case "learn":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      );
    case "community":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "ai-learning":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
          <circle cx="9" cy="13" r="1" />
          <circle cx="15" cy="13" r="1" />
        </svg>
      );
    case "cbt":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case "arena":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "classroom":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect width="14" height="14" x="1" y="5" rx="2" ry="2" />
        </svg>
      );
    case "messages":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "assignments":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    default:
      return null;
  }
}

export const StudentPortalContext = createContext<boolean>(true);
export function useInStudentPortal() {
  return useContext(StudentPortalContext);
}

export default function StudentPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, appearance, setAppearance } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        try {
          const { data: role } = await supabase.rpc("get_admin_role");
          if (active && typeof role === "string" && role.trim()) {
            setUserRole(role.trim());
          }
        } catch {}
      }
    }
    void fetchUser();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      active = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleSignOut() {
    setUserDropdownOpen(false);
    try {
      localStorage.removeItem("bl_student_xp_cache");
      localStorage.removeItem("brainlab_streak_count");
      localStorage.removeItem("brainlab_last_active_date");
      localStorage.removeItem("candidate");
      localStorage.removeItem("candidate_subjects");
      localStorage.removeItem("brainlab_student_goals_set");
      localStorage.removeItem("brainlab_goal_wizard_dismissed");
      window.dispatchEvent(new Event("brainlab-local-storage"));
      window.dispatchEvent(new CustomEvent("brainlab_xp_awarded", { detail: null }));
    } catch {}
    try {
      await fetch("/api/auth/operator-gate", { method: "DELETE" });
    } catch {}
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function cycleTheme() {
    const next: Record<AppearancePreference, AppearancePreference> = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    setAppearance(next[appearance] ?? "light");
  }

  const studentProfile = extractStudentProfile(user);
  const displayName = studentProfile.displayName;

  return (
    <StudentPortalContext.Provider value={true}>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#050811] dark:text-slate-100 transition-colors">
        {/* Student Portal Navigation Bar with Glassmorphic Depth */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#070D18]/90 shadow-xs">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo & Portal Branding */}
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2.5 transition active:scale-95 group">
                <Image
                  src="/icon-192.png"
                  alt="BrainLab Academy"
                  width={34}
                  height={34}
                  className="rounded-xl shadow-xs ring-1 ring-cyan-500/30 group-hover:ring-cyan-400 transition"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-tight text-slate-950 dark:text-white">BrainLab</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Student Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Nav Items: Sleek Icon Dock with Tooltip on Hover */}
            <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-100/60 dark:bg-white/[0.03] backdrop-blur-md" aria-label="Student navigation">
              {STUDENT_NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === link.href || pathname.startsWith(link.href + "/");

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={link.label}
                    aria-label={link.label}
                    className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm ring-1 ring-cyan-500/30"
                        : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    <NavIcon iconId={link.iconId} className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />

                    {/* Floating Hover Tooltip Pill */}
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900/95 dark:bg-[#0E172A]/95 px-2.5 py-1 text-[11px] font-bold text-white dark:text-cyan-200 opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-xl z-50 border border-slate-700/80 dark:border-white/10"
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Action Controls: Theme, Admin Switches & Profile Dropdown */}
            <div className="flex items-center gap-2">
              {/* Super Admin / Admin Cross-Portal Switchers */}
              {isGovernanceAdminRole(userRole) && (
                <div className="hidden sm:flex items-center gap-1.5 mr-1">
                  <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-black text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition shadow-xs"
                    title="Open Administrator Command Center"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Admin</span>
                  </Link>
                  <Link
                    href="/tutor"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition shadow-xs"
                    title="Open Instructor & Tutor Studio"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <span>Studio</span>
                  </Link>
                </div>
              )}
              {!isGovernanceAdminRole(userRole) && isInstructorRole(userRole) && (
                <Link
                  href="/tutor"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition shadow-xs mr-1"
                  title="Open Instructor Studio"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  <span>Studio</span>
                </Link>
              )}

              {/* Quick Search Button (⌘K) */}
              <button
                type="button"
                onClick={() => setSearchPaletteOpen(true)}
                title="Search subjects, topics, tools, or cut-offs (Ctrl+K)"
                className="flex h-10 sm:h-9 min-h-[44px] sm:min-h-0 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/90 hover:bg-slate-100 hover:border-slate-300 px-2.5 sm:px-3 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] transition shadow-xs cursor-pointer bl-focus-ring"
                aria-label="Open global study search"
              >
                <svg className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="hidden md:inline font-semibold">Search...</span>
                <kbd className="hidden lg:inline-block rounded border border-slate-300 dark:border-white/10 px-1 py-0.5 text-[9px] font-mono bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  ⌘K
                </kbd>
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={cycleTheme}
                title={`Theme: ${appearance} (Click to toggle)`}
                className="flex h-10 w-10 sm:h-9 sm:w-9 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-slate-600 hover:bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] transition active:scale-95 text-sm bl-focus-ring shadow-xs"
                aria-label="Toggle visual theme"
              >
                {resolvedTheme === "dark" ? (
                  <svg className="h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                  </svg>
                )}
              </button>

              {/* Profile Menu Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 py-1 pl-1.5 pr-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.1] transition active:scale-95 shadow-xs min-h-[44px] sm:min-h-[38px] bl-focus-ring"
                  aria-label="Open student profile menu"
                >
                  <StudentAvatar profile={studentProfile} size="xs" showOnlineDot={true} />
                  <span className="max-w-[110px] truncate hidden sm:inline-block font-extrabold text-slate-800 dark:text-slate-100">
                    {displayName}
                  </span>
                  <svg className="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-72 rounded-3xl border border-slate-200/90 bg-white/98 p-3 text-xs shadow-2xl backdrop-blur-xl dark:border-white/[0.1] dark:bg-[#0B132B]/98 z-50 animate-in fade-in slide-in-from-top-2">
                    {/* Modern Profile Header */}
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/40 p-3.5 dark:border-white/[0.06] dark:from-slate-900/80 dark:to-blue-950/30">
                      <div className="flex items-center gap-3">
                        <StudentAvatar profile={studentProfile} size="md" showOnlineDot={true} />
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-900 dark:text-white truncate text-sm">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>

                      {/* Student Target & Dream School Pill */}
                      {(studentProfile.targetCourse || studentProfile.dreamSchool) ? (
                        <div className="mt-3 rounded-xl border border-blue-200/60 bg-blue-50/80 px-2.5 py-1.5 dark:border-blue-900/50 dark:bg-blue-950/40">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
                            <svg className="h-3 w-3 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="6" />
                              <circle cx="12" cy="12" r="2" />
                            </svg>
                            <span className="truncate">{studentProfile.targetCourse || "Academic Mastery"}</span>
                          </div>
                          {studentProfile.dreamSchool && (
                            <p className="mt-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate flex items-center gap-1">
                              <svg className="h-3 w-3 text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                              </svg>
                              <span>{studentProfile.dreamSchool}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <Link
                          href="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="mt-2.5 flex items-center justify-between rounded-xl border border-dashed border-cyan-400/50 bg-cyan-50/40 px-2.5 py-1.5 text-[11px] font-bold text-cyan-800 dark:border-cyan-700/50 dark:bg-cyan-950/30 dark:text-cyan-300 hover:bg-cyan-100/50 transition"
                        >
                          <span className="flex items-center gap-1.5">
                            <svg className="h-3 w-3 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                            </svg>
                            <span>Set Dream School &amp; Course</span>
                          </span>
                          <span>&rarr;</span>
                        </Link>
                      )}
                    </div>

                    <div className="py-2 space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06] transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>My Learner Profile</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50">
                          Customise
                        </span>
                      </Link>

                      <Link
                        href="/skills-passport"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06] transition"
                      >
                        <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="8" r="6" />
                          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                        </svg>
                        <span>Badges &amp; Passport</span>
                      </Link>

                      <Link
                        href="/student/exams"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06] transition"
                      >
                        <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <span>Exam History &amp; Certificates</span>
                      </Link>

                      <Link
                        href="/learning-dna"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06] transition"
                      >
                        <svg className="h-4 w-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                        <span>Learning DNA</span>
                      </Link>

                      <Link
                        href="/pricing"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
                      >
                        <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        <span>Subscriptions &amp; Plans</span>
                      </Link>

                      {isGovernanceAdminRole(userRole) && (
                        <>
                          <div className="border-t border-amber-200/40 dark:border-amber-900/40 my-1.5" />
                          <div className="px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Staff Governance
                          </div>
                          <Link
                            href="/admin/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition"
                          >
                            <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span>Admin Command Centre</span>
                          </Link>
                          <Link
                            href="/tutor"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition"
                          >
                            <svg className="h-4 w-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                            <span>Instructor Studio</span>
                          </Link>
                        </>
                      )}

                      <div className="border-t border-slate-100 dark:border-white/[0.08] my-1.5" />

                      <Link
                        href="/"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <svg className="h-4 w-4 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                          </svg>
                          <span>Public Website ↗</span>
                        </div>
                        <span className="text-xs">&rarr;</span>
                      </Link>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-left cursor-pointer"
                      >
                        <svg className="h-4 w-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300 lg:hidden transition active:scale-95 text-base bl-focus-ring shadow-xs"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer with Uniform Dimensions */}
          {mobileMenuOpen && (
            <div className="border-t border-slate-200/80 bg-white/95 px-4 py-3.5 dark:border-white/[0.08] dark:bg-[#070D18]/95 backdrop-blur-xl lg:hidden animate-in fade-in">
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                {STUDENT_NAV_LINKS.map((link) => {
                  const isActive =
                    link.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === link.href || pathname.startsWith(link.href + "/");

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`h-12 w-full flex items-center gap-2.5 rounded-xl px-3 border transition active:scale-98 ${
                        isActive
                          ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-300 dark:border-cyan-500/40 font-black shadow-xs"
                          : "border-slate-200/80 bg-slate-50/70 text-slate-700 hover:bg-slate-100 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06] font-bold"
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/90 dark:bg-white/[0.06] shadow-2xs border border-slate-200/60 dark:border-white/[0.06]">
                        <NavIcon iconId={link.iconId} className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                      </span>
                      <span className="text-[11px] font-bold tracking-tight truncate leading-tight">
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="pt-2.5 flex flex-col gap-1.5 text-xs">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-10 w-full flex items-center gap-2.5 px-3 rounded-xl border border-slate-100 dark:border-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] font-bold text-xs transition"
                >
                  <svg className="h-4 w-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>My Profile</span>
                </Link>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-10 w-full flex items-center justify-between px-3 rounded-xl border border-cyan-100 dark:border-cyan-950/40 text-cyan-700 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20 hover:bg-cyan-100/50 font-bold text-xs transition"
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-cyan-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span>Public Website ↗</span>
                  </div>
                  <span className="text-xs">&rarr;</span>
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* Main Student Portal Content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Minimal Student Portal Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-6 dark:border-white/[0.08] dark:bg-[#070e1b] text-slate-500 text-xs transition-colors">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 dark:text-slate-200">BrainLab Academy</span>
              <span>·</span>
              <span>Learner Workspace</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1">
                <svg className="h-3 w-3 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>Public Site</span>
              </Link>
              <Link href="/faq" className="hover:text-slate-900 dark:hover:text-white transition">FAQ &amp; Help</Link>
              <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition">Terms</Link>
              <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition">Privacy</Link>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>

        {/* Global Student Study Navigator Command Palette */}
        <StudentCommandPalette
          isOpen={searchPaletteOpen}
          onClose={() => setSearchPaletteOpen(false)}
        />
      </div>
    </StudentPortalContext.Provider>
  );
}
