"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InteractiveSampleQuestion from "./components/InteractiveSampleQuestion";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Which examinations are currently supported on BrainLab Academy?",
    answer:
      "BrainLab Academy currently provides fully integrated CBT practice and simulated examinations specifically for JAMB UTME, alongside comprehensive senior secondary school syllabus notes and lessons across Science, Commercial, and Art subjects. Full examination mocks for WAEC and NECO are currently in active development and will be released in upcoming updates.",
  },
  {
    question: "Can I practise on my smartphone or tablet?",
    answer:
      "Yes. BrainLab Academy is built mobile-first. The CBT simulator, formula sheets, timer, and question navigation run smoothly on standard smartphone touchscreens, tablets, laptops, and cybercafé desktop computers without requiring any external app installation.",
  },
  {
    question: "Does the exam session continue if my internet connection fluctuates?",
    answer:
      "Yes. The CBT portal features offline auto-sync answer protection. Your responses are recorded instantly in your browser's local cache so fluctuating Nigerian 3G/4G networks or sudden disconnections will not wipe your progress. Answers automatically synchronize with the server upon reconnection.",
  },
  {
    question: "How does the free practice tier work?",
    answer:
      "Every registered candidate can take one complete timed practice test per day and study core subject syllabus notes completely free. No payment or credit card is required to create an account and begin practising.",
  },
  {
    question: "What do I get with a Premium subscription?",
    answer:
      "Premium candidates unlock unlimited daily CBT mock attempts, detailed step-by-step worked explanations for every question, AI-powered diagnostic weak-topic drills, and access to live tutor masterclasses.",
  },
  {
    question: "How do official BrainLab access codes work?",
    answer:
      "Official access codes are issued for school cohorts, tutorials, and licensed practice sessions. If your school or coordinator provided you with a code, you can redeem it directly through the Access Code portal to unlock your assigned test paper.",
  },
];

const PATHWAYS = [
  {
    number: "01",
    title: "JAMB UTME CBT Simulator",
    badge: "Core CBT Engine",
    description:
      "Sit authentic 4-subject combination practice tests under strict 2-hour examination conditions with standard question counts, automatic scoring out of 400, and offline answer caching.",
    action: "Start UTME Practice",
    href: "/login",
  },
  {
    number: "02",
    title: "Official Syllabus & Curriculum Hub",
    badge: "Official Syllabus",
    description:
      "Review official JAMB UTME syllabus modules, subtopic breakdowns, specific learning objectives, and recommended reading texts across Science, Commercial, and Art disciplines.",
    action: "View Official Syllabus",
    href: "/syllabus",
  },
  {
    number: "03",
    title: "AI Weak-Topic Diagnostics",
    badge: "Adaptive Drills",
    description:
      "Analyze your mock exam mistakes automatically. Identify conceptual topic weaknesses and generate targeted 5-question reinforcement drills to close knowledge gaps before exam day.",
    action: "Try Diagnostic Drills",
    href: "/learning/revision",
  },
  {
    number: "04",
    title: "Interactive Tutor Masterclasses",
    badge: "Live Classrooms",
    description:
      "Join scheduled tutor sessions featuring digital whiteboard explanations, recorded audio breakdowns, and real-time checkpoint quizzes to tackle difficult syllabus concepts.",
    action: "View Class Schedule",
    href: "/learn?tab=timetable",
  },
];

const PLATFORM_BENEFITS = [
  {
    title: "Authentic UTME Standards",
    badge: "Curriculum Aligned",
    description:
      "Examination timing, question counts, and 4-subject paper structures are formatted strictly in line with Joint Admissions and Matriculation Board standards.",
  },
  {
    title: "Step-by-Step Worked Solutions",
    badge: "Clear Explanations",
    description:
      "Review why the correct option is right with detailed tutor explanations and mathematical step breakdowns immediately after submitting your paper.",
  },
  {
    title: "Offline Answer Protection",
    badge: "Network Resilient",
    description:
      "Answers are saved continuously to local browser storage so power interruptions or unstable 3G/4G connections will never erase your progress.",
  },
  {
    title: "Mobile-First Accessibility",
    badge: "Low Bandwidth",
    description:
      "Engineered to load fast and navigate seamlessly on budget smartphone touchscreens, laptops, and cybercafé desktop terminals without lag.",
  },
];

export default function HomePage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    if (code || error) {
      window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
    }
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

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
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              JAMB UTME CBT Practice &amp; Senior Secondary Curriculum
            </span>

            <h1 className="mt-5 max-w-2xl text-3xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-5xl">
              Practise with purpose. <br />
              <span className="text-blue-700">Master your UTME subjects with confidence.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              BrainLab Academy provides authentic timed CBT exam simulations, curriculum-aligned topic notes, instant diagnostic scoring, and low-data offline protection engineered for Nigerian candidates.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 active:scale-95"
              >
                Start Free Practice Test <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href="/learn"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 transition hover:border-slate-400"
              >
                Explore Syllabus Curriculum
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-slate-100 pt-6 text-xs text-slate-600 font-semibold">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Timed 4-subject combination simulation</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Instant score &amp; worked solutions</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Offline auto-sync queue</span>
              </span>
            </div>
          </div>

          {/* Interactive CBT Cockpit Sandbox */}
          <div>
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-1.5 text-blue-900 font-black">
                <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                Interactive CBT Question Sandbox
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                Live Preview
              </span>
            </div>
            <InteractiveSampleQuestion />
          </div>
        </div>
      </section>

      {/* Pathways Section: Real & Verified Learning Tracks */}
      <section id="learning-paths" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-18">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-wider text-blue-800">
            Structured Learning Pathways
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Everything you need for serious UTME preparation.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Choose between full timed exam simulations, structured subject curriculum notes, targeted AI mistake revision, and interactive live tutor masterclasses.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PATHWAYS.map((pathway) => (
            <article
              key={pathway.number}
              className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 font-black text-xs text-blue-900 border border-blue-100">
                    {pathway.number}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800 border border-blue-200/80">
                    {pathway.badge}
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

      {/* Engineering Highlights / Platform Benefits */}
      <section className="border-y border-slate-200 bg-slate-50 py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-wider text-blue-800">
              Built for Nigerian Candidates
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Reliable, distraction-free examination testing.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Exam practice should be dependable and accurate. BrainLab is designed to support your daily preparation without technical friction or network disruptions.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_BENEFITS.map((benefit, idx) => (
              <div
                key={benefit.title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition duration-200 hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-900 border border-blue-100/80">
                    {benefit.badge}
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
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
                  {benefit.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How BrainLab Works: 4-Step Learning Journey */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-18">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-800">
              The Learning Journey
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              How to Prepare on BrainLab Academy
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Follow this structured four-step path to build speed, conceptual mastery, and examination readiness:
            </p>

            <div className="mt-6 space-y-4">
              {[
                {
                  step: "1",
                  title: "Create Your Free Candidate Account",
                  desc: "Sign up in under 60 seconds. Start immediately with free daily practice tests with no credit card required.",
                },
                {
                  step: "2",
                  title: "Select Your 4-Subject Combination",
                  desc: "Configure your official JAMB combination (e.g. English, Mathematics, Physics, Chemistry or Commercial/Arts equivalents).",
                },
                {
                  step: "3",
                  title: "Practise Under Real Exam Conditions",
                  desc: "Answer questions under timed countdown pressure, flag difficult items, and use built-in formula reference sheets.",
                },
                {
                  step: "4",
                  title: "Review Step-by-Step Solutions & Target Weaknesses",
                  desc: "Submit your paper to view your score out of 400, study worked explanations, and generate targeted revision drills.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#012153] text-xs font-bold text-white shadow-xs">
                    {item.step}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
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
                View Plans &amp; Access Details
              </Link>
            </div>
          </div>

          {/* Access Code & Official Helpdesk Card */}
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-slate-50 p-6 sm:p-8 shadow-xs">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-900">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="7.5" cy="15.5" r="5.5" />
                <path d="m21 2-9.6 9.6" />
                <path d="m15.5 7.5 3 3L22 7l-3-3" />
              </svg>
              <span>Candidate Access &amp; Support</span>
            </div>

            <h3 className="mt-3 text-lg font-black text-slate-950">
              Have an Access Code or Need Help?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              If your school or tutorial centre provided you with a BrainLab access code, you can redeem it immediately to unlock your assigned test paper.
            </p>

            <div className="mt-6 rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-900">Official WhatsApp Candidate Desk</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Connect directly with our support desk for registration guidance, school licensing, or PIN assistance.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <a
                  href="https://wa.me/2349074310204?text=Hello%20BrainLab%20Academy,%20I%20have%20an%20inquiry%20regarding%20UTME%20CBT%20practice%20and%20access."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-sm transition active:scale-95"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>WhatsApp Support</span>
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

      {/* Transparent Access Comparison (Free vs Premium) */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-black uppercase tracking-wider text-blue-800">
              Clear &amp; Transparent Access
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Choose the right preparation plan for you.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Practise for free every day or upgrade to full unrestricted CBT simulations, AI diagnostics, and live classrooms.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
            {/* Free Learner Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-950">Free Practice Tier</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    Always Available
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Ideal for candidates starting out and exploring syllabus topics.
                </p>

                <div className="mt-5 border-t border-slate-100 pt-5 space-y-3 text-xs text-slate-700 font-semibold">
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>1 Complete Timed CBT Mock Session per day</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>Core Subject Syllabus Notes &amp; Formulas</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>Instant Score Calculation &amp; Grade Breakdown</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>Discussion Circles &amp; Community Forum</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <svg className="h-4 w-4 text-slate-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    <span>Step-by-step worked solutions locked</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-100">
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-3 text-xs font-bold text-slate-800 transition active:scale-95"
                >
                  Start Free Practice Now
                </Link>
              </div>
            </div>

            {/* Premium Pro Access Card */}
            <div className="rounded-3xl border-2 border-blue-600 bg-white p-7 shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 rounded-bl-xl bg-blue-600 px-3 py-1 text-[10px] font-black uppercase text-white tracking-wider">
                Full CBT Access
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-950">Premium Pro Access</h3>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Comprehensive preparation for candidates targeting top UTME scores.
                </p>

                <div className="mt-5 border-t border-slate-100 pt-5 space-y-3 text-xs text-slate-700 font-semibold">
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span className="font-bold text-slate-900">Unlimited Daily CBT Mock Practice Tests</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>Full Step-by-Step Worked Solutions &amp; Explanations</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>AI Weak-Topic Diagnostic Drills</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>Live Classroom Masterclasses &amp; Whiteboard Replays</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>Official Verified Digital Merit Certificates</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-100">
                <Link
                  href="/pricing"
                  className="flex w-full items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-900 py-3 text-xs font-black text-white shadow-sm transition active:scale-95"
                >
                  View Subscription Options →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions (Homepage Accordion) */}
      <section className="mx-auto max-w-4xl px-5 py-14 sm:px-8 lg:py-18">
        <div className="text-center">
          <span className="text-xs font-black uppercase tracking-wider text-blue-800">
            Frequently Asked Questions
          </span>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Everything you need to know about BrainLab.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Have questions about examinations, device compatibility, or account access? We are here to help.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={faq.question}
                className="rounded-2xl border border-slate-200 bg-white transition shadow-2xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-bold text-slate-900 hover:text-blue-700 transition"
                >
                  <span>{faq.question}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/faq"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 transition hover:underline"
          >
            Visit Full Help &amp; FAQ Directory →
          </Link>
        </div>
      </section>

      {/* Final Action CTA Banner */}
      <section className="border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 py-14 text-center sm:py-18">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Ready to Begin Your Preparation?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            Build the speed, conceptual accuracy, and subject mastery needed to excel in your upcoming examination.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 active:scale-95"
            >
              Start Free Practice Test →
            </Link>
            <Link
              href="/learn"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 transition"
            >
              Explore Syllabus Curriculum
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
