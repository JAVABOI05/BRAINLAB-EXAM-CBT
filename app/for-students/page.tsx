import type { Metadata } from "next";
import Link from "next/link";
import { StudentGuideClient } from "./StudentGuideClient";

export const metadata: Metadata = {
  title: "For Students & UTME Candidates | BrainLab Academy",
  description:
    "Discover how secondary and JAMB UTME candidates prepare with BrainLab Academy: daily free CBT practice, offline answer auto-sync, AI error diagnostics, and admissions target pacing.",
  alternates: { canonical: "/for-students" },
  openGraph: {
    title: "Student Guide — BrainLab Academy",
    description:
      "Engineered for Nigerian students: daily free CBT tests, low-data offline protection, curriculum notes, and AI diagnostic drills.",
    url: "https://www.brainlabacademy.com.ng/for-students",
  },
};

export default function ForStudentsPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-[#091325]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">Home</Link>
            <span>/</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">For Students</span>
          </div>
          <Link
            href="/cbt"
            className="font-bold text-blue-700 hover:text-blue-900 dark:text-cyan-400 dark:hover:text-cyan-300 inline-flex items-center gap-1"
          >
            <span>Start Free Practice</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        {/* Subtle geometric dot matrix */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(#1e293b 1.2px, transparent 1.2px)`,
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Candidate Success Blueprint</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            Built specifically for <br />
            <span className="text-blue-700 dark:text-cyan-400">ambitious Nigerian candidates.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed font-normal">
            Examination preparation shouldn&apos;t depend on expensive tutorial centers or fragile internet connections. BrainLab Academy provides every student with dependable, high-yield tools to secure university admission.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3.5 pt-2">
            <Link
              href="/login?mode=signup"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-700 hover:bg-blue-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition active:scale-95"
            >
              <span>Create Free Candidate Account</span>
              <span aria-hidden="true" className="ml-2">&rarr;</span>
            </Link>
            <Link
              href="/products/cbt"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Explore CBT Simulator Specs
            </Link>
          </div>
        </div>
      </section>

      {/* Main Student Guide Client Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <StudentGuideClient />
      </div>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Begin your preparation with zero risk.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
            Join thousands of ambitious Nigerian candidates practising daily with purpose.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/login?mode=signup"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-700 hover:bg-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition active:scale-95"
            >
              <span>Get Started Free</span>
              <span aria-hidden="true" className="ml-2">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
