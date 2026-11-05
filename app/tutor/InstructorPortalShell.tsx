"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { isGovernanceAdminRole, isInstructorRole } from "../lib/adminRoles";
import { useLearnerTheme, type AppearancePreference } from "../components/LearnerThemeProvider";

const INSTRUCTOR_NAV_LINKS = [
  { href: "/tutor", label: "My Subjects", icon: "📖" },
  { href: "/calendar", label: "Timetable & Classes", icon: "📅" },
  { href: "/classroom/studio", label: "Lesson Studio", icon: "🎬" },
  { href: "/classroom/stem", label: "STEM Studio", icon: "🧪" },
  { href: "/tutor/assignments", label: "Assignments", icon: "📝" },
  { href: "/recordings", label: "Recordings", icon: "🎥" },
  { href: "/messages", label: "Learner Chat", icon: "💬" },
];

export default function InstructorPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, appearance, setAppearance } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      const { data: role } = await supabase.rpc("get_admin_role");
      if (!active) return;

      const roleStr = typeof role === "string" ? role.trim() : null;
      const isInstructor = isInstructorRole(roleStr);
      const isAdmin = isGovernanceAdminRole(roleStr);

      if (!isInstructor && !isAdmin) {
        // Check if user has active subject authoring memberships
        const { data: memberships } = await supabase
          .from("learning_subject_memberships")
          .select("id")
          .eq("user_id", session.user.id)
          .limit(1);

        if (!active) return;

        if (!memberships || memberships.length === 0) {
          // Regular candidate/student — redirect to student workspace
          router.replace("/dashboard");
          return;
        }
      }
    }

    void fetchUserAndVerifyRole();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      active = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pathname, router]);

  async function handleSignOut() {
    setDropdownOpen(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070d18] dark:text-slate-100 transition-colors">
      {/* Instructor Portal Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-indigo-200/50 bg-white/95 backdrop-blur-md dark:border-indigo-950/70 dark:bg-[#070d18]/95">
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

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {INSTRUCTOR_NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/tutor"
                  ? pathname === "/tutor"
                  : pathname === link.href || pathname.startsWith(link.href + "/");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    isActive
                      ? "bg-indigo-500/15 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                  }`}
                >
                  <span className="text-sm leading-none">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Theme & Profile Dropdown */}
          <div className="flex items-center gap-2.5">
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
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white py-1.5 pl-2.5 pr-3 text-xs font-bold text-slate-800 hover:bg-indigo-50/50 dark:border-indigo-900 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition active:scale-95"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-[10px] font-black text-white uppercase">
                  {displayName.charAt(0)}
                </div>
                <span className="max-w-[110px] truncate hidden sm:inline-block">{displayName}</span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="border-b border-slate-100 p-2.5 dark:border-slate-800">
                    <p className="font-extrabold text-slate-900 dark:text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <span className="mt-1 inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                      Author / Tutor
                    </span>
                  </div>
                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/tutor/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      <span>👤</span> Tutor Profile
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      <span>🎓</span> Switch to Student View
                    </Link>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-left"
                    >
                      <span>🚪</span> Sign Out
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
          <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#070d18] lg:hidden animate-in fade-in">
            <div className="grid grid-cols-2 gap-1.5">
              {INSTRUCTOR_NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/tutor"
                    ? pathname === "/tutor"
                    : pathname === link.href || pathname.startsWith(link.href + "/");

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition ${
                      isActive
                        ? "bg-indigo-500/15 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
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
