"use client";

import Link from "next/link";
import { useEffect } from "react";
import InteractiveSampleQuestion from "./components/InteractiveSampleQuestion";

const pathways = [
  {
    number: "01",
    title: "CBT Examination Practice",
    description:
      "Sit timed JAMB UTME, WAEC, and NECO practice tests with authentic 4-subject papers, instant automatic scoring, and offline safety backup.",
    action: "Enter CBT Portal",
    href: "/login",
    status: "Active · Instant Practice",
  },
  {
    number: "02",
    title: "Learning Hub Curriculum",
    description:
      "Review Nigerian secondary school subjects topic by topic with structured syllabus notes, worked examples, and checkpoint tests.",
    action: "Browse Subject Syllabus",
    href: "/learn",
    status: "Active · Self-Paced",
  },
  {
    number: "03",
    title: "AI Weak-Topic Drills",
    description:
      "Diagnose your test mistakes, generate targeted 5-question reinforcement drills, and retain formulas with daily SM-2 spaced repetition.",
    action: "Generate AI Drill",
    href: "/learning/revision",
    status: "Active · On-Demand",
  },
  {
    number: "04",
    title: "Interactive Live Classroom",
    description:
      "Attend scheduled tutor masterclasses featuring our responsive Smart Whiteboard, participate in live polls, and access lesson recordings.",
    action: "View Class Timetable",
    href: "/learn?tab=timetable",
    status: "Scheduled Masterclasses",
  },
];

const features = [
  {
    title: "Syllabus-Aligned Questions",
    description: "Authentic questions formatted according to current JAMB UTME, WAEC, and NECO standards with detailed worked explanations.",
    badge: "Verified Curriculum",
  },
  {
    title: "Instant Scoring & Subject Breakdown",
    description: "Review your performance across individual subjects immediately after submitting your timed examination attempt.",
    badge: "Transparent Grading",
  },
  {
    title: "Low-Bandwidth Offline Protection",
    description: "Your answers are continuously queued in local browser storage so fluctuating Nigerian 3G/4G networks will not erase your work.",
    badge: "Offline Auto-Sync",
  },
  {
    title: "Accessible on Everyday Devices",
    description: "Engineered to run smoothly on desktop browsers, laptops, tablets, and budget smartphone touchscreens.",
    badge: "Mobile-First",
  },
];

export default function HomePage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    if (code || error) {
      window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
    }
  }, []);

  return (
    <main id="main" className="public-surface bg-white text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(37,99,235,0.08),transparent_50%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:gap-14 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-blue-900">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              JAMB UTME • WAEC • NECO Preparation
            </span>

            <h1 className="mt-5 max-w-2xl text-3xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-5xl">
              Practise with purpose. <br />
              <span className="text-blue-700">Master every subject with confidence.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              BrainLab Academy provides timed CBT exam simulations, curriculum-aligned topic lessons, and step-by-step revision tools designed for Nigerian students.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 active:scale-95"
              >
                Start CBT Practice <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href="/learn"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 transition hover:border-slate-400"
              >
                Explore Learning Hub
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-slate-100 pt-6 text-xs text-slate-600 font-semibold">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Timed standard papers</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Instant score calculation</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Low-data offline auto-sync</span>
              </span>
            </div>
          </div>

          {/* Interactive Question Sandbox */}
          <div>
            <InteractiveSampleQuestion />
          </div>
        </div>
      </section>

      {/* Pathways Section */}
      <section id="learning-paths" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-18">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-wider text-blue-800">
            Platform Capabilities
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Everything you need to prepare thoroughly.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Choose between full exam conditions, structured subject lessons, self-guided practice, and interactive live sessions.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pathways.map((pathway) => (
            <article
              key={pathway.number}
              className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md hover-lift"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 font-black text-xs text-blue-900 border border-blue-100">
                    {pathway.number}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                      pathway.status.includes("Active")
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                        : "bg-blue-50 text-blue-800 border-blue-200/80"
                    }`}
                  >
                    {pathway.status}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-black text-slate-950 tracking-tight">
                  {pathway.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {pathway.description}
                </p>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-3">
                <Link
                  href={pathway.href}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#012153] hover:text-blue-700 transition"
                >
                  <span>{pathway.action}</span>
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Trust & Engineering Highlights */}
      <section className="border-y border-slate-200 bg-slate-50 py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-wider text-blue-800">
              Built for Nigerian Learners
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Reliable, distraction-free examination testing.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Exam practice should be dependable and accurate. BrainLab is built to support your daily preparation without technical interruptions.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition duration-200 hover:border-blue-300 hover:shadow-sm hover-lift"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-900 border border-blue-100/80">
                    {feature.badge}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-blue-700">
                    {idx === 0 && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    )}
                    {idx === 1 && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 3v18h18" />
                        <path d="M18 17V9" />
                        <path d="M13 17V5" />
                        <path d="M8 17v-3" />
                      </svg>
                    )}
                    {idx === 2 && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" />
                        <path d="m8 17 4 4 4-4" />
                      </svg>
                    )}
                    {idx === 3 && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                        <line x1="12" x2="12.01" y1="18" y2="18" />
                      </svg>
                    )}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-black text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Step-by-Step */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-18">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-800">
              Candidate Examination Guide
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              How the CBT Portal Works
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Follow these straightforward steps to enter your practice examination session:
            </p>

            <div className="mt-6 space-y-4">
              {[
                {
                  step: "1",
                  title: "Enter Candidate Details & Subjects",
                  desc: "Select your official 4-subject combination at the portal entrance.",
                },
                {
                  step: "2",
                  title: "Input Valid Access Code",
                  desc: "Provide your examination access PIN to unlock your personalized test paper.",
                },
                {
                  step: "3",
                  title: "Timed Examination Simulation",
                  desc: "Work through questions with the built-in timer, formula sheets, diagram zoom, and offline answer queueing.",
                },
                {
                  step: "4",
                  title: "Instant Score & Worked Solutions",
                  desc: "Submit your paper to record your score and review step-by-step corrections.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#012153] text-xs font-bold text-white">
                    {item.step}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-5 py-3 text-xs font-black text-white shadow-md transition active:scale-95"
              >
                Go to Examination Portal →
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 transition"
              >
                View Practice Plans &amp; Pricing
              </Link>
            </div>
          </div>

          {/* Access Code Box (Polished per user recommendation) */}
          <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-900">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></svg><span>Candidate Access</span>
            </div>
            <h3 className="mt-3 text-lg font-black text-slate-950">
              Need an Access Code?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Some examinations require an official BrainLab access code. Contact our support team for information about eligibility, registration, and available practice options.
            </p>

            <div className="mt-6 rounded-2xl bg-white p-5 border border-blue-100 shadow-xs">
              <p className="text-xs font-bold text-slate-800">Official WhatsApp Support Desk</p>
              <p className="mt-1 text-xs text-slate-500">
                Direct inquiry desk for candidate eligibility, registration PINs, and school licensing.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                <a
                  href="https://wa.me/2349074310204?text=Good%20day%20BrainLab%20Academy,%20I%20would%20like%20to%20inquire%20about%20examination%20access%20codes%20and%20registration."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:shadow active:scale-95"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>Chat on WhatsApp</span>
                  <span aria-hidden="true">↗</span>
                </a>
                <Link
                  href="/access"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition"
                >
                  Redeem Code
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contextual Bottom CTA Banner (Less repetitive) */}
      <section className="border-t border-slate-200 bg-white py-14 text-center sm:py-18">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Ready to Begin Your Preparation?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            Build the speed, conceptual accuracy, and subject mastery needed to excel in your upcoming examinations.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-6 py-3 text-xs font-black text-white shadow-md transition active:scale-95"
            >
              Take a Free Practice Test →
            </Link>
            <Link
              href="/learning/revision"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-3 text-xs font-bold text-slate-800 transition"
            >
              Open Revision Planner
            </Link>
            <Link
              href="/account"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 px-5 py-3 text-xs font-bold text-blue-950 transition"
            >
              Student Account Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
