"use client";

import Link from "next/link";
import { useEffect } from "react";
import InteractiveSampleQuestion from "./components/InteractiveSampleQuestion";

const pathways = [
  {
    number: "01",
    title: "CBT Examination Practice",
    description: "Sit timed JAMB UTME, WAEC, and NECO practice tests with realistic exam conditions, automatic scoring, and offline safety backup.",
    action: "Open CBT Portal",
    href: "/login",
    status: "Active",
  },
  {
    number: "02",
    title: "Learning Hub Curriculum",
    description: "Review secondary school subjects topic by topic with structured syllabus lessons, worked examples, and topic-level tests.",
    action: "Open Learning Hub",
    href: "/learn",
    status: "Active",
  },
  {
    number: "03",
    title: "AI Learning Studio",
    description: "Work through difficult concepts, decode tricky questions, understand mistakes, and receive guided revision explanations.",
    action: "Launch AI Studio",
    href: "/ai-learning",
    status: "Active",
  },
  {
    number: "04",
    title: "Interactive Live Classroom",
    description: "Attend interactive live video lessons with tutors, participate in real-time multiple-choice polls, and rewatch recorded classes.",
    action: "Enter Classroom",
    href: "/learn?tab=live",
    status: "Active",
  },
];

const features = [
  {
    title: "Syllabus-Aligned Questions",
    description: "Practice questions formatted according to current JAMB, WAEC, and NECO requirements with authentic options.",
    badge: "Accurate",
  },
  {
    title: "Instant Scoring & Subject Breakdown",
    description: "Review your performance across individual subjects immediately after submitting your timed examination attempt.",
    badge: "Transparent",
  },
  {
    title: "Offline Network Protection",
    description: "Your answers are continuously cached on your device so weak or fluctuating mobile connections will not erase your work.",
    badge: "Reliable",
  },
  {
    title: "Accessible on Any Device",
    description: "Engineered to run smoothly on desktop browsers, laptops, tablets, and everyday mobile phone screens.",
    badge: "Responsive",
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

            <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-slate-100 pt-6 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-black">✓</span> Timed standard papers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-black">✓</span> Instant score calculation
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-black">✓</span> Offline answer caching
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
              className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black tracking-wider text-slate-400">
                    {pathway.number}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-100">
                    {pathway.status}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-950">
                  {pathway.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {pathway.description}
                </p>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-3">
                <Link
                  href={pathway.href}
                  className="inline-flex items-center text-xs font-extrabold text-blue-800 hover:text-blue-950"
                >
                  {pathway.action} <span aria-hidden="true" className="ml-1">→</span>
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
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-blue-900 border border-blue-100">
                  {feature.badge}
                </span>
                <h3 className="mt-3 text-sm font-extrabold text-slate-950">
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
        <div className="grid gap-10 lg:grid-cols-[1fr_.9fr] lg:items-center">
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
                  title: "Enter Candidate Information",
                  desc: "Provide your name, phone number, and subject combination at the portal entrance.",
                },
                {
                  step: "2",
                  title: "Input Valid Access Code",
                  desc: "Enter your official exam access code to unlock your personalized test paper.",
                },
                {
                  step: "3",
                  title: "Timed Examination Session",
                  desc: "Answer the questions with the built-in timer, question palette, and offline answer sync.",
                },
                {
                  step: "4",
                  title: "Instant Score & Corrections",
                  desc: "Submit your paper to record your score and review step-by-step question solutions.",
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

            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-5 py-3 text-xs font-black text-white shadow-md transition active:scale-95"
              >
                Go to Examination Portal →
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6 sm:p-8">
            <h3 className="text-lg font-black text-slate-950">
              Need an Access Code?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Official BrainLab access codes are distributed through school administrators and verified WhatsApp support channels.
            </p>

            <div className="mt-6 rounded-2xl bg-white p-5 border border-blue-100">
              <p className="text-xs font-bold text-slate-700">Access Code Assistance</p>
              <p className="mt-1 text-xs text-slate-500">
                Contact our support desk on WhatsApp for registration and access inquiries.
              </p>
              <a
                href="https://wa.me/2349074310204?text=Good%20day%20BrainLab,%20I%20would%20like%20to%20request%20an%20exam%20access%20code."
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
              >
                Chat on WhatsApp ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="border-t border-slate-200 bg-white py-14 text-center sm:py-18">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Start Your Exam Preparation Today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            Build the speed, accuracy, and subject knowledge needed to perform at your best.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-6 py-3 text-xs font-black text-white shadow-md transition active:scale-95"
            >
              Start CBT Practice Now →
            </Link>
            <Link
              href="/account"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3 text-xs font-bold text-slate-800 transition"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
