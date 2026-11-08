"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { isGovernanceAdminRole, isInstructorRole } from "../lib/adminRoles";
import { useLearnerTheme, type AppearancePreference } from "../components/LearnerThemeProvider";

interface SubNavItem {
  href: string;
  label: string;
  desc: string;
}

const AUTHORING_MENU: SubNavItem[] = [
  { href: "/tutor/questions", label: "Question Bank", desc: "CBT questions, bulk import & option rules" },
  { href: "/tutor/syllabus", label: "Curriculum & Syllabus", desc: "JAMB/WAEC topics & learning milestones" },
  { href: "/tutor/content", label: "Lessons & Content", desc: "Interactive modules, draft & publish" },
  { href: "/tutor/lesson-blocks", label: "Lesson Blocks", desc: "Reusable formulas, proofs & widgets" },
  { href: "/tutor/academic", label: "Academic Directory", desc: "Taxonomy & curriculum coverage audit" },
];

const TEACHING_MENU: SubNavItem[] = [
  { href: "/calendar", label: "Timetable & Classes", desc: "Live lectures, schedule & attendance" },
  { href: "/classroom/studio", label: "Lesson Studio", desc: "Broadcast stage, multi-stream & board" },
  { href: "/classroom/stem", label: "STEM Studio", desc: "Virtual labs & scientific simulations" },
  { href: "/recordings", label: "Class Recordings", desc: "Cloud videos, transcripts & notes" },
];

const EVALUATION_MENU: SubNavItem[] = [
  { href: "/tutor/groups", label: "Student Cohorts", desc: "Academic groups, daily tests & rosters" },
  { href: "/tutor/assignments", label: "Assignments & Grading", desc: "Homework review & rubric scoring" },
  { href: "/tutor/stem-grading", label: "Virtual Lab Grading", desc: "Hypothesis review & experiment scoring" },
];

export default function InstructorPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, appearance, setAppearance } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const navDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function fetchUserAndVerifyRole() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      if (!session?.user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      setUser(session.user);

      // Authoritative role check: verify instructor or administrator status
      let roleStr: string | null = null;
      try {
        const { data: role } = await supabase.rpc("get_admin_role");
        if (typeof role === "string") roleStr = role.trim();
      } catch {}
      if (!active) return;

      setUserRole(roleStr);
      const isInstructor = isInstructorRole(roleStr);
      const isAdmin = isGovernanceAdminRole(roleStr);

      if (!isInstructor && !isAdmin) {
        // Check if user has active subject authoring memberships or tutor profile
        const [{ data: memberships }, { data: tutorProfile }] = await Promise.all([
          supabase
            .from("learning_subject_memberships")
            .select("id")
            .eq("user_id", session.user.id)
            .limit(1),
          supabase
            .from("tutor_profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle(),
        ]);

        if (!active) return;

        const hasMembership = Boolean(memberships && memberships.length > 0);
        const hasTutorProfile = Boolean(tutorProfile?.id);

        if (!hasMembership && !hasTutorProfile) {
          // Regular candidate/student — redirect to student workspace
          router.replace("/dashboard");
          return;
        }
      }
    }

    void fetchUserAndVerifyRole();

    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target as Node)) {
        setOpenNavDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      active = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pathname, router]);

  // Close dropdowns on route changes
  useEffect(() => {
    setOpenNavDropdown(null);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setProfileDropdownOpen(false);
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

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "Instructor";

  const isSuperAdmin = userRole === "super_admin" || userRole === "platform_admin";
  const isAdmin = isGovernanceAdminRole(userRole);

  const isOverviewActive = pathname === "/tutor";
  const isAuthoringActive = AUTHORING_MENU.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const isTeachingActive = TEACHING_MENU.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const isEvaluationActive = EVALUATION_MENU.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const isChatActive = pathname === "/messages";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070d18] dark:text-slate-100 transition-colors">
      {/* Instructor Portal Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-indigo-200/50 bg-white/95 backdrop-blur-md dark:border-indigo-950/70 dark:bg-[#070d18]/95 shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <Link href="/tutor" className="flex items-center gap-2.5 transition active:scale-98">
              <Image
                src="/icon-192.png"
                alt="BrainLab Academy"
                width={32}
                height={32}
                className="rounded-xl shadow-xs ring-1 ring-indigo-500/30"
              />
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-slate-950 dark:text-white">BrainLab</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Instructor Studio
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Streamlined Navigation (No Emoji Clutter, Dropdown Categorized) */}
          <nav ref={navDropdownRef} className="hidden lg:flex items-center gap-1.5" aria-label="Instructor navigation">
            {/* Overview / My Subjects */}
            <Link
              href="/tutor"
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                isOverviewActive
                  ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              Overview
            </Link>

            {/* Curriculum & Content Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenNavDropdown(openNavDropdown === "authoring" ? null : "authoring")}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isAuthoringActive
                    ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                    : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
                aria-expanded={openNavDropdown === "authoring"}
              >
                <span>Curriculum & Content</span>
                <span className={`text-[10px] transition-transform duration-200 ${openNavDropdown === "authoring" ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {openNavDropdown === "authoring" && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-xl dark:border-slate-800 dark:bg-[#0c1427] z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Authoring & Pedagogical Tools
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {AUTHORING_MENU.map((item) => {
                      const isItemActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenNavDropdown(null)}
                          className={`block rounded-xl px-3 py-2 transition ${
                            isItemActive
                              ? "bg-indigo-50 text-indigo-900 font-bold dark:bg-indigo-950/60 dark:text-indigo-200"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{item.desc}</div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Live & Studio Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenNavDropdown(openNavDropdown === "teaching" ? null : "teaching")}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isTeachingActive
                    ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                    : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
                aria-expanded={openNavDropdown === "teaching"}
              >
                <span>Live & Studio</span>
                <span className={`text-[10px] transition-transform duration-200 ${openNavDropdown === "teaching" ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {openNavDropdown === "teaching" && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-xl dark:border-slate-800 dark:bg-[#0c1427] z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Live Broadcast & Virtual Labs
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {TEACHING_MENU.map((item) => {
                      const isItemActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenNavDropdown(null)}
                          className={`block rounded-xl px-3 py-2 transition ${
                            isItemActive
                              ? "bg-indigo-50 text-indigo-900 font-bold dark:bg-indigo-950/60 dark:text-indigo-200"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{item.desc}</div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Cohorts & Grading Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenNavDropdown(openNavDropdown === "evaluation" ? null : "evaluation")}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isEvaluationActive
                    ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                    : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
                aria-expanded={openNavDropdown === "evaluation"}
              >
                <span>Cohorts & Grading</span>
                <span className={`text-[10px] transition-transform duration-200 ${openNavDropdown === "evaluation" ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {openNavDropdown === "evaluation" && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-xl dark:border-slate-800 dark:bg-[#0c1427] z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Evaluation & Cohort Operations
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {EVALUATION_MENU.map((item) => {
                      const isItemActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenNavDropdown(null)}
                          className={`block rounded-xl px-3 py-2 transition ${
                            isItemActive
                              ? "bg-indigo-50 text-indigo-900 font-bold dark:bg-indigo-950/60 dark:text-indigo-200"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{item.desc}</div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Learner Chat */}
            <Link
              href="/messages"
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                isChatActive
                  ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              Learner Chat
            </Link>
          </nav>

          {/* Right Controls: Theme, Portal Switchers & Profile Dropdown */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-600 hover:text-white px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 transition shadow-xs active:scale-95"
                title="Return to Admin Command Console"
              >
                Admin Console
              </Link>
            )}
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 hover:bg-blue-600 hover:text-white px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 transition shadow-xs active:scale-95"
              title="Switch to Student Portal View"
            >
              Student View
            </Link>

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

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white py-1.5 pl-2.5 pr-3 text-xs font-bold text-slate-800 hover:bg-indigo-50/50 dark:border-indigo-900 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition active:scale-95"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-[10px] font-black text-white uppercase shadow-xs">
                  {displayName.charAt(0)}
                </div>
                <span className="max-w-[110px] truncate hidden md:inline-block">{displayName}</span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-xl dark:border-slate-800 dark:bg-[#0c1427] z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="border-b border-slate-100 p-2.5 dark:border-slate-800">
                    <p className="font-extrabold text-slate-900 dark:text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <span className="mt-1.5 inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                      {isSuperAdmin ? "Super Admin (Full Access)" : isAdmin ? "Platform Administrator" : "Instructor / Author"}
                    </span>
                  </div>
                  <div className="py-1 space-y-0.5">
                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-bold text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 dark:text-amber-300 transition"
                      >
                        Return to Admin Console
                      </Link>
                    )}
                    <Link
                      href="/tutor/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Instructor Profile
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Switch to Student View
                    </Link>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-left"
                    >
                      Sign Out
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

        {/* Mobile Categorized Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-[#070d18] lg:hidden animate-in fade-in max-h-[80vh] overflow-y-auto space-y-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Workspace</div>
              <div className="grid grid-cols-2 gap-1.5">
                <Link
                  href="/tutor"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl p-2.5 text-xs font-bold transition ${
                    isOverviewActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  Overview
                </Link>
                <Link
                  href="/messages"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl p-2.5 text-xs font-bold transition ${
                    isChatActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  Learner Chat
                </Link>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Curriculum & Content</div>
              <div className="grid grid-cols-1 gap-1">
                {AUTHORING_MENU.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex flex-col rounded-xl p-2 bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Live & Virtual Labs</div>
              <div className="grid grid-cols-1 gap-1">
                {TEACHING_MENU.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex flex-col rounded-xl p-2 bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Cohorts & Grading</div>
              <div className="grid grid-cols-1 gap-1">
                {EVALUATION_MENU.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex flex-col rounded-xl p-2 bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 rounded-xl p-2.5 text-center text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300"
                >
                  Admin Console
                </Link>
              )}
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 rounded-xl p-2.5 text-center text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300"
              >
                Student View
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Instructor Portal Content */}
      <div className="flex-1">
        {children}
      </div>

      {/* Minimal Instructor Portal Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 dark:border-slate-800/80 dark:bg-[#070d18] text-slate-500 text-xs transition-colors">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 dark:text-slate-200">BrainLab Academy</span>
            <span>·</span>
            <span>Instructor Studio &amp; Authoring Portal</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/faq" className="hover:text-slate-900 dark:hover:text-white transition">Instructor Guide</Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition">Privacy</Link>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
