import type { Metadata } from "next";
import Link from "next/link";
import { TutorSuiteClient } from "./TutorSuiteClient";

export const metadata: Metadata = {
  title: "For Tutors & Educators | BrainLab Academy",
  description:
    "Discover educator opportunities at BrainLab Academy: host live interactive whiteboard masterclasses, author syllabus-aligned lessons, monitor candidate diagnostic analytics, and join verified educators.",
  alternates: { canonical: "/for-tutors" },
  openGraph: {
    title: "Educator & Tutor Suite — BrainLab Academy",
    description:
      "Empower ambitious Nigerian secondary and UTME candidates with modern teaching tools: vector whiteboard masterclasses, curriculum authoring, and student diagnostics.",
    url: "https://www.brainlabacademy.com.ng/for-tutors",
  },
};

export default function ForTutorsPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-[#091325]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">Home</Link>
            <span>/</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">For Tutors</span>
          </div>
          <Link
            href="/tutors"
            className="font-bold text-blue-700 hover:text-blue-900 dark:text-cyan-400 dark:hover:text-cyan-300 inline-flex items-center gap-1"
          >
            <span>Meet Verified Tutors</span>
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
            <span>Educator Workspace &amp; Teaching Tools</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            Amplify your teaching with <br />
            <span className="text-blue-700 dark:text-cyan-400">modern academic technology.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed font-normal">
            BrainLab Academy equips passionate subject educators with specialized authoring studios, multi-surface whiteboard stages, and real-time student diagnostic analytics to elevate teaching across Nigeria.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3.5 pt-2">
            <Link
              href="/for-tutors/apply"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-700 hover:bg-blue-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition active:scale-95"
            >
              <span>Apply to Teach on BrainLab</span>
              <span aria-hidden="true" className="ml-2">&rarr;</span>
            </Link>
            <Link
              href="/products/live-classroom"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Explore Whiteboard Technology
            </Link>
          </div>
        </div>
      </section>

      {/* Main Educator Workspace Client */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <TutorSuiteClient />
      </div>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Interested in teaching with BrainLab?
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
            Submit your subject specialization, teaching background, and credentials to our academic review committee.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3.5">
            <Link
              href="/for-tutors/apply"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-700 hover:bg-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition active:scale-95"
            >
              <span>Submit Tutor Application</span>
              <span aria-hidden="true" className="ml-2">&rarr;</span>
            </Link>
            <Link
              href="/contact?subject=Tutor+Application"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Contact Educator Desk
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
