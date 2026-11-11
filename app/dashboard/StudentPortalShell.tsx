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

export const STUDENT_NAV_LINKS = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/learn", label: "Learning Hub", icon: "📚" },
  { href: "/community", label: "Communities", icon: "👥" },
  { href: "/ai-learning", label: "AI Tutor", icon: "🤖" },
  { href: "/cbt", label: "CBT Practice", icon: "✍️" },
  { href: "/classroom", label: "Live Stage", icon: "🎥" },
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/assignments", label: "Assignments", icon: "📝" },
];

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
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
        {/* Student Portal Navigation Bar */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#070e1b]/95">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo & Portal Branding */}
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2.5 transition active:scale-98">
                <Image
                  src="/icon-192.png"
                  alt="BrainLab Academy"
                  width={32}
                  height={32}
                  className="rounded-xl shadow-xs ring-1 ring-cyan-500/30"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-tight text-slate-950 dark:text-white">BrainLab</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Student Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Nav Items */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Student navigation">
              {STUDENT_NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === link.href || pathname.startsWith(link.href + "/");

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span>{link.label}</span>
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
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-black text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition shadow-xs"
                    title="Open Administrator Command Center"
                  >
                    <span>🛡️ Admin</span>
                  </Link>
                  <Link
                    href="/tutor"
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[11px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition shadow-xs"
                    title="Open Instructor & Tutor Studio"
                  >
                    <span>👨‍🏫 Studio</span>
                  </Link>
                </div>
              )}
              {!isGovernanceAdminRole(userRole) && isInstructorRole(userRole) && (
                <Link
                  href="/tutor"
                  className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[11px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition shadow-xs mr-1"
                  title="Open Instructor Studio"
                >
                  <span>👨‍🏫 Studio</span>
                </Link>
              )}

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={cycleTheme}
                title={`Theme: ${appearance} (Click to toggle)`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition active:scale-95 text-sm"
                aria-label="Toggle visual theme"
              >
                {resolvedTheme === "dark" ? "🌙" : "☀️"}
              </button>

              {/* Profile Menu Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 py-1 pl-1.5 pr-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800 transition active:scale-95 shadow-xs"
                  aria-label="Open student profile menu"
                >
                  <StudentAvatar profile={studentProfile} size="xs" showOnlineDot={true} />
                  <span className="max-w-[110px] truncate hidden sm:inline-block font-extrabold text-slate-800 dark:text-slate-100">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-72 rounded-3xl border border-slate-200/90 bg-white/95 p-3 text-xs shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-[#0b1528]/95 z-50 animate-in fade-in slide-in-from-top-2">
                    {/* Modern Profile Header */}
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/40 p-3.5 dark:border-slate-800/80 dark:from-slate-900/80 dark:to-blue-950/20">
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
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
                            <span>🎯</span>
                            <span className="truncate">{studentProfile.targetCourse || "Academic Mastery"}</span>
                          </div>
                          {studentProfile.dreamSchool && (
                            <p className="mt-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate">
                              🏛️ {studentProfile.dreamSchool}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Link
                          href="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="mt-2.5 flex items-center justify-between rounded-xl border border-dashed border-cyan-400/50 bg-cyan-50/40 px-2.5 py-1.5 text-[11px] font-bold text-cyan-800 dark:border-cyan-700/50 dark:bg-cyan-950/30 dark:text-cyan-300 hover:bg-cyan-100/50 transition"
                        >
                          <span>✨ Set Dream School & Course</span>
                          <span>→</span>
                        </Link>
                      )}
                    </div>

                    <div className="py-2 space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">👤</span>
                          <span>My Learner Profile</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50">
                          Customise
                        </span>
                      </Link>

                      <Link
                        href="/skills-passport"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80 transition"
                      >
                        <span className="text-base">🏅</span>
                        <span>Badges &amp; Passport</span>
                      </Link>

                      <Link
                        href="/student/exams"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80 transition"
                      >
                        <span className="text-base">📜</span>
                        <span>Exam History &amp; Certificates</span>
                      </Link>

                      <Link
                        href="/learning-dna"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80 transition"
                      >
                        <span className="text-base">🧬</span>
                        <span>Learning DNA</span>
                      </Link>

                      <Link
                        href="/pricing"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
                      >
                        <span className="text-base">⚡</span>
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
                            <span>👑</span> Admin Command Centre
                          </Link>
                          <Link
                            href="/tutor"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition"
                          >
                            <span>👨‍🏫</span> Instructor Studio
                          </Link>
                        </>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />

                      <Link
                        href="/"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <span>🌐</span>
                          <span>Public Website</span>
                        </div>
                        <span className="text-xs">↗</span>
                      </Link>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-left"
                      >
                        <span>🚪</span>
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
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 lg:hidden transition active:scale-95 text-base"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#070e1b] lg:hidden animate-in fade-in">
              <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
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
                      className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition ${
                        isActive
                          ? "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="pt-2 flex flex-col gap-1 text-xs">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  <span>👤</span> My Profile
                </Link>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-slate-800 font-semibold"
                >
                  <span>🌐</span> Public Website ↗
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
        <footer className="border-t border-slate-200/80 bg-white py-6 dark:border-slate-800/80 dark:bg-[#070e1b] text-slate-500 text-xs transition-colors">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 dark:text-slate-200">BrainLab Academy</span>
              <span>·</span>
              <span>Learner Workspace</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition">🌐 Public Site</Link>
              <Link href="/faq" className="hover:text-slate-900 dark:hover:text-white transition">FAQ &amp; Help</Link>
              <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition">Terms</Link>
              <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition">Privacy</Link>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div>
    </StudentPortalContext.Provider>
  );
}
