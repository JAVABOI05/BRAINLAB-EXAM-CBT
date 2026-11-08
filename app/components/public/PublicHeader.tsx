"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/app/lib/supabase";
import { isCurrentUserAdmin } from "@/app/lib/subscriptionEntitlements";
import { HOMEPAGE_CONTENT_CONFIG, NavItemConfig } from "@/app/lib/contentConfig";
import { Button } from "@/app/components/ui/Button";
import { Link } from "@/app/components/ui/Link";

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const headerRef = useRef<HTMLElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevPathnameRef = useRef(pathname);

  const config = HOMEPAGE_CONTENT_CONFIG.header;

  // Initialize theme from document
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof document !== "undefined") {
        const isDarkMode =
          document.documentElement.classList.contains("dark") ||
          document.documentElement.getAttribute("data-theme") === "dark";
        setIsDark(isDarkMode);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (typeof document !== "undefined") {
      if (nextDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
        try {
          localStorage.setItem("theme", "dark");
        } catch {
          // ignore storage error
        }
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
        try {
          localStorage.setItem("theme", "light");
        } catch {
          // ignore
        }
      }
    }
  };

  // Auth session listener
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
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Close menus on path change
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      const timer = setTimeout(() => {
        setMobileDrawerOpen(false);
        setActiveDropdown(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setMobileDrawerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleDropdownEnter = (id: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(id);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-[var(--bl-color-surface)]/95 backdrop-blur-md dark:border-slate-800 transition-colors"
    >
      {/* Top Utility Bar */}
      <div className="hidden border-b border-slate-100 bg-slate-50/70 px-4 py-1.5 text-xs text-slate-500 sm:block dark:border-slate-800/80 dark:bg-slate-900/50 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              BrainLab Learning Ecosystem
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>JAMB UTME • WAEC SSCE • BECE</span>
          </div>
          <div className="flex items-center gap-5">
            <NextLink
              href={config.actions.pricing.href}
              className="hover:text-[var(--bl-color-brand-primary)] transition-colors"
            >
              {config.actions.pricing.label}
            </NextLink>
            <NextLink
              href={config.actions.teachWithUs.href}
              className="hover:text-[var(--bl-color-brand-primary)] transition-colors"
            >
              {config.actions.teachWithUs.label}
            </NextLink>
            <NextLink
              href={config.actions.support.href}
              className="hover:text-[var(--bl-color-brand-primary)] transition-colors"
            >
              {config.actions.support.label}
            </NextLink>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {isDark ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Light</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <NextLink
          href="/"
          className="flex items-center gap-3 bl-focus-ring rounded-lg shrink-0"
          aria-label="BrainLab Academy Home"
        >
          <Image
            src="/brainlab-logo.svg"
            alt="BrainLab Academy"
            width={140}
            height={36}
            className="h-8 w-auto dark:hidden"
            priority
          />
          <Image
            src="/brainlab-logo-light.svg"
            alt="BrainLab Academy"
            width={140}
            height={36}
            className="h-8 w-auto hidden dark:block"
            priority
          />
        </NextLink>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1 lg:gap-2"
          aria-label="Main Navigation"
        >
          {config.navigation.map((item: NavItemConfig) => {
            const hasDropdown = Boolean(item.dropdown && item.dropdown.length > 0);
            const isOpen = activeDropdown === item.id;

            if (hasDropdown) {
              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(item.id)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setActiveDropdown(isOpen ? null : item.id)}
                    className={`
                      inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl
                      transition-colors bl-focus-ring min-h-[44px]
                      ${
                        isOpen
                          ? "bg-slate-100 text-[var(--bl-color-brand-primary)] dark:bg-slate-800"
                          : "text-slate-700 hover:text-[var(--bl-color-brand-primary)] dark:text-slate-200"
                      }
                    `}
                  >
                    <span>{item.label}</span>
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {/* Dropdown Panel */}
                  {isOpen && (
                    <div
                      className="absolute left-0 mt-1 w-80 rounded-2xl border border-slate-200/90 bg-[var(--bl-color-surface)] p-2 shadow-xl dark:border-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                      role="menu"
                    >
                      {item.dropdown?.map((sub) => (
                        <NextLink
                          key={sub.title}
                          href={sub.href}
                          role="menuitem"
                          className="flex flex-col gap-1 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors bl-focus-ring"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--bl-color-text-primary)]">
                              {sub.title}
                            </span>
                            {sub.badge && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {sub.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {sub.description}
                          </span>
                        </NextLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NextLink
                key={item.id}
                href={item.href}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl text-slate-700 hover:text-[var(--bl-color-brand-primary)] dark:text-slate-200 transition-colors bl-focus-ring min-h-[44px] inline-flex items-center"
              >
                {item.label}
              </NextLink>
            );
          })}
        </nav>

        {/* Desktop Action Buttons & Auth State */}
        <div className="hidden sm:flex items-center gap-3">
          {checkingSession ? (
            <div className="h-9 w-24 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                variant="buttonPrimary"
                className="!py-2 !px-4 text-xs font-semibold"
              >
                Student Portal →
              </Link>
              {isAdmin && (
                <NextLink
                  href="/admin"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Admin
                </NextLink>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-xs text-slate-500 hover:text-red-600"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NextLink
                href={config.actions.signIn.href}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-[var(--bl-color-brand-primary)] dark:text-slate-200 transition-colors bl-focus-ring rounded-xl min-h-[44px] inline-flex items-center"
              >
                {config.actions.signIn.label}
              </NextLink>
              <Link
                href={config.actions.startFree.href}
                variant="buttonPrimary"
                className="!min-h-[40px] !py-2 !px-4 text-sm font-semibold"
              >
                {config.actions.startFree.label}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            aria-expanded={mobileDrawerOpen}
            aria-label="Toggle mobile menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 bl-focus-ring"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              {mobileDrawerOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden border-t border-slate-200 bg-[var(--bl-color-surface)] px-4 py-6 shadow-xl dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-2">
            {config.navigation.map((item) => (
              <div key={item.id} className="border-b border-slate-100 pb-2 dark:border-slate-800/60">
                <NextLink
                  href={item.href}
                  className="flex items-center justify-between py-2 text-base font-bold text-[var(--bl-color-text-primary)]"
                >
                  <span>{item.label}</span>
                </NextLink>
                {item.dropdown && (
                  <div className="pl-3 mt-1 space-y-1">
                    {item.dropdown.map((sub) => (
                      <NextLink
                        key={sub.title}
                        href={sub.href}
                        className="block py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-[var(--bl-color-brand-primary)]"
                      >
                        • {sub.title}
                      </NextLink>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 flex flex-col gap-3">
              {user ? (
                <>
                  <Link href="/dashboard" variant="buttonPrimary" className="w-full text-center">
                    Go to Student Portal
                  </Link>
                  {isAdmin && (
                    <NextLink
                      href="/admin"
                      className="text-center py-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Admin Console
                    </NextLink>
                  )}
                  <Button variant="ghost" onClick={handleSignOut} fullWidth>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href={config.actions.startFree.href}
                    variant="buttonPrimary"
                    className="w-full text-center"
                  >
                    {config.actions.startFree.label}
                  </Link>
                  <NextLink
                    href={config.actions.signIn.href}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 py-2.5 text-center text-sm font-semibold text-[var(--bl-color-text-primary)] dark:border-slate-700"
                  >
                    {config.actions.signIn.label}
                  </NextLink>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
