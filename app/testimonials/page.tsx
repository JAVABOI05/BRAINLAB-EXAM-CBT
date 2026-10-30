import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Stories | BrainLab Academy",
  description: "Student stories are temporarily paused while BrainLab Academy reviews its learner feedback programme.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function TestimonialsPage() {
  return <main id="main" className="public-surface flex min-h-[65vh] items-center bg-slate-50 px-5 py-16 text-slate-900 sm:px-8">
    <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl" aria-hidden="true">✦</span>
      <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-blue-700">BrainLab Academy</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">Student stories are temporarily paused</h1>
      <p className="mt-4 text-base leading-7 text-slate-600">We are reviewing how learner experiences are collected and published. No student testimonials are currently being displayed or accepted for publication.</p>
      <Link href="/tutors" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B1536] px-5 py-3 text-sm font-bold text-white hover:bg-blue-900">Meet our tutors →</Link>
    </section>
  </main>;
}
