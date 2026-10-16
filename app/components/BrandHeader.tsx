"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/#learning-paths", label: "Explore Learning" },
  { href: "/login", label: "CBT Practice" },
  { href: "/#future-learning", label: "AI & Community" },
  { href: "/about", label: "About" },
];

export default function BrandHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" aria-label="BrainLab Academy home">
          <Image src="/brainlab-logo.svg" alt="BrainLab Academy" width={110} height={61} priority className="h-11 w-auto" />
        </Link>
        <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-800 md:hidden" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="brainlab-main-nav" onClick={() => setMenuOpen(!menuOpen)}>
          <span aria-hidden="true" className="text-xl">{menuOpen ? "×" : "☰"}</span>
        </button>
        <nav id="brainlab-main-nav" aria-label="Main navigation" className={menuOpen ? "absolute left-0 right-0 top-[72px] border-b border-slate-200 bg-white p-4 shadow-lg md:static md:flex md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none" : "hidden md:flex md:items-center md:gap-1"}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#012153] md:py-2">
              {link.label}
            </Link>
          ))}
          <Link href="/account" onClick={() => setMenuOpen(false)} className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0a2f72] md:ml-2 md:mt-0">
            Sign in / Create account
          </Link>
        </nav>
      </div>
    </header>
  );
}
