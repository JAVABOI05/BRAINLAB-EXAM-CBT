"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface PrototypeHeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function PrototypeHeader({ theme, onToggleTheme }: PrototypeHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Programmes", href: "/courses" },
    { name: "Platform", href: "/products" },
    { name: "Schools", href: "/schools" },
    { name: "Resources", href: "/resources" },
    { name: "About", href: "/about" },
  ];

  const actionLinks = [
    { name: "Pricing", href: "/pricing" },
    { name: "Teach with Us", href: "/for-tutors" },
    { name: "Support", href: "/support" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-[#0B1536]/95">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-lg p-1">
          <Image
            src={theme === "dark" ? "/brainlab-logo-light.svg" : "/brainlab-logo.svg"}
            alt="BrainLab Academy"
            width={160}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>

        {/* Primary Desktop Navigation (Rule S10) */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary Navigation">
          {navLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-sky-400"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Action Items & Identity Gateway */}
        <div className="hidden lg:flex items-center gap-3">
          {actionLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-sky-400 px-2 py-1"
            >
              {item.name}
            </Link>
          ))}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme appearance"
            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <Link
            href="/account"
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign In
          </Link>

          <Link
            href="/cbt"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-500 hover:shadow-md dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Start Free
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        {/* Mobile Menu & Theme Controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme appearance"
            className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Accessible >= 44px tap targets) */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-6 shadow-xl lg:hidden dark:border-slate-800 dark:bg-[#0B1536]">
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Primary Navigation
            </p>
            {navLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-12 items-center rounded-xl px-3 text-sm font-bold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/80"
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800 space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Quick Actions
            </p>
            {actionLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 items-center rounded-xl px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80"
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-11 items-center justify-center rounded-xl border border-slate-300 text-xs font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100"
            >
              Sign In
            </Link>
            <Link
              href="/cbt"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-11 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white"
            >
              Start Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
