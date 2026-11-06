"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InteractiveSampleQuestion from "./components/InteractiveSampleQuestion";
import { DEFAULT_FOOTER_CONFIG } from "./lib/platformConfig";

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

const ECOSYSTEM_MODULES = [
  {
    number: "01",
    title: "JAMB UTME CBT Practice Simulator",
    badge: "Core CBT Engine",
    description:
      "Sit authentic 4-subject combination practice tests under strict 2-hour examination conditions with standard question counts, automatic scoring out of 400, and offline answer caching.",
    action: "Start CBT Practice",
    href: "/login",
    statusBadge: "Active & Available",
  },
  {
    number: "02",
    title: "Official Curriculum & Syllabus Hub",
    badge: "Official Syllabus",
    description:
      "Review official JAMB UTME syllabus modules, subtopic breakdowns, specific learning objectives, and recommended reading texts across Science, Commercial, and Art disciplines.",
    action: "Explore Syllabus Modules",
    href: "/syllabus",
    statusBadge: "Active & Available",
  },
  {
    number: "03",
    title: "STEM Virtual Laboratories",
    badge: "Interactive Labs",
    description:
      "Conduct virtual experiments in Physics mechanics, Chemistry titrations, and Biology cellular models with real-time parameter tweaking, calculations, and direct CBT practice links.",
    action: "Enter STEM Studio",
    href: "/classroom/stem",
    statusBadge: "Active & Available",
  },
  {
    number: "04",
    title: "AI Weak-Topic Diagnostics & Revision",
    badge: "Adaptive Drills",
    description:
      "Analyze your mock exam mistakes automatically. Identify conceptual topic weaknesses and generate targeted 5-question reinforcement drills to close knowledge gaps before exam day.",
    action: "Try Diagnostic Drills",
    href: "/learning/revision",
    statusBadge: "Active & Available",
  },
  {
    number: "05",
    title: "Live Interactive Classrooms & Masterclasses",
    badge: "Live Classroom",
    description:
      "Join scheduled tutor sessions featuring real-time audio/video, synchronized digital whiteboard explanations, and checkpoint quizzes to tackle difficult syllabus concepts.",
    action: "Join Live Classroom",
    href: "/classroom",
    statusBadge: "Active & Available",
  },
  {
    number: "06",
    title: "Challenge Arena & Academic Battles",
    badge: "Competitive Arena",
    description:
      "Compete head-to-head in real-time 1v1 academic challenges, climb school and national leaderboards, and test your speed under competitive countdown conditions.",
    action: "Enter Challenge Arena",
    href: "/challenge-arena",
    statusBadge: "Active & Available",
  },
];

const PEDAGOGICAL_PILLARS = [
  {
    phase: "PRACTISE",
    title: "Rigorous Exam Simulation",
    subtitle: "Build stamina and time management",
    description:
      "Replicate the exact pressure of the actual examination center with authentic 4-subject papers, 2-hour timers, standard keyboard navigation, and immediate scoring.",
    points: [
      "Authentic 4-subject combination structure",
      "Strict countdown timing and question pacing",
      "Standard UTME scoring and percentile tracking",
    ],
  },
  {
    phase: "UNDERSTAND",
    title: "Deep Conceptual Mastery",
    subtitle: "Move beyond rote memorization",
    description:
      "Unpack complex topics with curriculum-aligned syllabus notes, step-by-step mathematical proofs, and hands-on virtual STEM lab simulations.",
    points: [
      "Official syllabus subtopics & learning goals",
      "Step-by-step worked tutor explanations",
      "Interactive 2D physics and chemistry models",
    ],
  },
  {
    phase: "CONNECT",
    title: "Collaborative Learning & Mentorship",
    subtitle: "Learn with expert tutors and ambitious peers",
    description:
      "Engage directly with experienced subject educators during live classes and test your knowledge against fellow candidates nationwide.",
    points: [
      "Synchronized digital whiteboard masterclasses",
      "Curated peer discussion circles and forums",
      "Real-time 1v1 Arena academic competitions",
    ],
  },
  {
    phase: "PROGRESS",
    title: "Data-Driven Continuous Growth",
    subtitle: "Pinpoint weaknesses before exam day",
    description:
      "Leverage automated diagnostic psychometrics to spot your exact subject blind spots and track verifiable improvement score by score.",
    points: [
      "AI-driven weakness breakdown by subtopic",
      "Targeted 5-question reinforcement drills",
      "Official verified digital merit certificates",
    ],
  },
];

const AUDIENCES = [
  {
    role: "For Students & Candidates",
    badge: "Learner Portal",
    tagline: "Master your subjects and secure university admission.",
    description:
      "Engineered specifically for Nigerian secondary and UTME candidates who need dependable practice tools that work seamlessly even with erratic power and network connectivity.",
    features: [
      "Daily free full-length CBT practice session",
      "Offline auto-sync answer queue on 3G/4G networks",
      "Targeted AI revision drills on weak topics",
      "Integrated formula sheets and scientific tools",
    ],
    ctaText: "Start Free Practice",
    ctaHref: "/login",
  },
  {
    role: "For Tutors & Instructors",
    badge: "Instructor Studio",
    tagline: "Teach with modern digital whiteboard tools and live media.",
    description:
      "Equip educators with professional teaching workspaces to deliver synchronized masterclasses, distribute practice materials, and track individual student outcomes.",
    features: [
      "Live classroom streaming with audio/video",
      "Collaborative digital whiteboard with drawing tools",
      "Automated assessment authoring and distribution",
      "Student completion and performance diagnostics",
    ],
    ctaText: "Instructor Portal",
    ctaHref: "/login",
  },
  {
    role: "For Schools & Principals",
    badge: "Institutional Licensing",
    tagline: "Elevate your school's official examination outcomes.",
    description:
      "Provide your entire graduating class or tutorial cohort with standardized CBT testing, customized school access codes, and comparative academic analytics.",
    features: [
      "Bulk student access code generation and management",
      "Centralized school-wide mock examinations",
      "Cohort subject pass-rate and performance reports",
      "Dedicated institutional account support",
    ],
    ctaText: "School Solutions",
    ctaHref: "/schools",
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

  const whatsappNumber = DEFAULT_FOOTER_CONFIG.whatsapp_number || "2349074310204";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hello%20BrainLab%20Academy,%20I%20have%20an%20inquiry%20regarding%20UTME%20CBT%20practice%20and%20access.`;

  return (
    <main id="main" className="public-surface bg-white text-slate-900">
      {/* =========================================================================
          SECTION 2: ECOSYSTEM HERO
          High-impact presentation of BrainLab's complete educational ecosystem
          ========================================================================= */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(37,99,235,0.08),transparent_50%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
        />

        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-blue-900 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Unified Secondary &amp; UTME Learning Ecosystem</span>
            </div>

            <h1 className="mt-6 text-3xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Practise with purpose. <br />
              <span className="text-blue-700">Master your UTME subjects with confidence.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              BrainLab Academy is Nigeria&apos;s unified educational ecosystem — combining authentic timed CBT exam simulations, curriculum-aligned senior secondary notes, interactive STEM laboratories, AI diagnostics, and live masterclasses.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3.5 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 active:scale-95"
              >
                Start Free Practice Test <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <a
                href="#ecosystem"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 transition hover:border-slate-400"
              >
                Explore Learning Ecosystem
              </a>
            </div>

            {/* Ecosystem Core Metrics */}
            <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-200 pt-8 sm:grid-cols-4 sm:gap-6">
              <div className="rounded-xl border border-slate-100 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs">
                <div className="text-2xl font-black text-[#012153] sm:text-3xl">5,600+</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Authentic Questions</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs">
                <div className="text-2xl font-black text-blue-700 sm:text-3xl">98%</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Pass Benchmark</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs">
                <div className="text-2xl font-black text-emerald-700 sm:text-3xl">20+</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Virtual STEM Labs</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs">
                <div className="text-2xl font-black text-purple-700 sm:text-3xl">Instant</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Diagnostic Feedback</div>
              </div>
            </div>

            {/* Trust Highlights */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Authentic 4-subject combination structure</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Instant score &amp; worked explanations</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Offline auto-sync queue for 3G/4G networks</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: INTRODUCING THE BRAINLAB LEARNING ECOSYSTEM
          Six integrated pillars covering all academic tracks
          ========================================================================= */}
      <section id="ecosystem" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-wider text-blue-800">
            Unified Educational Architecture
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Six Integrated Learning Modules. One Complete Academy.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            From foundational syllabus comprehension to rigorous timed examination pressure, BrainLab brings together every pillar of secondary and tertiary academic preparation.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ECOSYSTEM_MODULES.map((module) => (
            <article
              key={module.number}
              className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 font-black text-xs text-blue-900 border border-blue-100">
                    {module.number}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800 border border-blue-200/80">
                    {module.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-black text-slate-950 tracking-tight">
                  {module.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {module.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <Link
                  href={module.href}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#012153] hover:text-blue-700 transition"
                >
                  <span>{module.action}</span>
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
                </Link>
                <span className="text-[10px] font-bold text-slate-600">
                  {module.statusBadge}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: PRACTISE, UNDERSTAND, CONNECT AND PROGRESS
          Pedagogical methodology and learning philosophy
          ========================================================================= */}
      <section id="philosophy" className="border-t border-slate-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-wider text-blue-800">
              Our Pedagogical Framework
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              The Four Pillars of Academic Excellence
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Every feature in BrainLab is engineered around a coherent learning methodology that turns examination anxiety into competence, speed, and consistent mastery.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PEDAGOGICAL_PILLARS.map((pillar, idx) => (
              <div
                key={pillar.phase}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition duration-200 hover:border-blue-300 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black tracking-wider text-blue-900 border border-blue-100">
                      0{idx + 1} • {pillar.phase}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-950">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    {pillar.subtitle}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600">
                    {pillar.description}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 space-y-2">
                  {pillar.points.map((point) => (
                    <div key={point} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <svg className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: HOW BRAINLAB WORKS
          Structured 4-step candidate journey
          ========================================================================= */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-800">
              The Learning Journey
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              How to Prepare on BrainLab Academy
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Follow this structured four-step path to build speed, conceptual mastery, and confident examination readiness:
            </p>

            <div className="mt-8 space-y-5">
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
                <div key={item.step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#012153] text-xs font-bold text-white shadow-xs">
                    {item.step}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
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
                href="/syllabus"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 transition"
              >
                View Syllabus Modules
              </Link>
            </div>
          </div>

          {/* Workflow Diagram & Platform Architecture Callout */}
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-slate-50 p-6 sm:p-8 shadow-xs">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-900">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Cycle of Continuous Improvement</span>
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-950">
              From Practice to Mastery
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Every completed practice test feeds your personal diagnostic profile, updating your topic breakdown so you spend study time only where it counts.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800 font-black text-xs">A</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Diagnostic Weakness Tagging</div>
                  <div className="text-[11px] text-slate-500">Mistakes automatically grouped by syllabus topic</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs">B</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Adaptive Revision Drills</div>
                  <div className="text-[11px] text-slate-500">5-question quick drills to convert red topics to green</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-2xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-800 font-black text-xs">C</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Live Classroom Resolution</div>
                  <div className="text-[11px] text-slate-500">Ask tutors directly in live whiteboard sessions</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <Link
                href="/learning/revision"
                className="text-xs font-bold text-blue-700 hover:text-blue-900 transition hover:underline"
              >
                Learn more about AI Diagnostics →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: EXPERIENCE BRAINLAB IN ACTION
          Dedicated interactive question sandbox showcase
          ========================================================================= */}
      <section id="experience" className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-900">
              <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              Live Interactive Demonstration
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Experience the BrainLab Exam Cockpit
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Try an authentic JAMB UTME English question right now. Select your answer, submit your choice, and review the detailed tutor explanation:
            </p>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
            <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 pb-3">
              <span className="inline-flex items-center gap-1.5 text-blue-900 font-black">
                Interactive CBT Question Sandbox
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                Live Interactive Sandbox
              </span>
            </div>
            <InteractiveSampleQuestion />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: BUILT FOR STUDENTS, TUTORS AND SCHOOLS
          Three dedicated audience columns
          ========================================================================= */}
      <section id="audiences" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-wider text-blue-800">
            Ecosystem Stakeholders
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Built for Students, Tutors and Schools
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            BrainLab delivers purpose-built experiences designed specifically for learners, educators, and secondary academic institutions.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.role}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition duration-200 hover:border-blue-300 hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-900 border border-blue-100">
                    {audience.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  {audience.role}
                </h3>
                <p className="mt-1 text-xs font-semibold text-blue-700">
                  {audience.tagline}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  {audience.description}
                </p>

                <div className="mt-6 border-t border-slate-100 pt-4 space-y-2.5">
                  {audience.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <svg className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-5">
                <Link
                  href={audience.ctaHref}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 py-3 text-xs font-bold text-slate-900 hover:text-blue-900 transition"
                >
                  {audience.ctaText} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: WHY BRAINLAB? (ENGINEERING & ACADEMIC RIGOR)
          Engineering pillars & platform reliability
          ========================================================================= */}
      <section id="why-brainlab" className="border-t border-slate-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-wider text-blue-800">
              Built for Nigerian Candidates
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Reliable, Distraction-Free Examination Testing
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Exam practice should be dependable and accurate. BrainLab is designed to support your daily preparation without technical friction or network disruptions.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_BENEFITS.map((benefit, idx) => (
              <div
                key={benefit.title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition duration-200 hover:border-blue-300 hover:shadow-sm"
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

      {/* =========================================================================
          SECTION 9: PLANS AND ACCESS
          Transparent comparison: Free vs Premium vs School Cohort
          ========================================================================= */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-black uppercase tracking-wider text-blue-800">
            Clear &amp; Transparent Access
          </span>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Choose the Right Preparation Plan for You
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Practise for free every day or upgrade to full unrestricted CBT simulations, AI diagnostics, and live masterclasses.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
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

              <div className="mt-6 border-t border-slate-100 pt-5 space-y-3 text-xs text-slate-700 font-semibold">
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

              <div className="mt-6 border-t border-slate-100 pt-5 space-y-3 text-xs text-slate-700 font-semibold">
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

          {/* School & Cohort Licensing Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-950">School &amp; Cohort</h3>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  Institutional
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                For secondary schools, academies, and tutorial centres.
              </p>

              <div className="mt-6 border-t border-slate-100 pt-5 space-y-3 text-xs text-slate-700 font-semibold">
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>Bulk Student Access Code Generation</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>Centralized School-Wide Mock Examinations</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>Cohort Performance &amp; Subject Analytics</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>Custom School Mock Papers &amp; Tutors</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>Dedicated Coordinator &amp; Priority Helpdesk</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100">
              <Link
                href="/schools"
                className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-3 text-xs font-bold text-slate-800 transition active:scale-95"
              >
                School Inquiry &amp; Licensing →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 10: TRUST, SUPPORT AND FAQ
          Accordion FAQs + Official WhatsApp Helpdesk & Access Code Redemption
          ========================================================================= */}
      <section id="faq" className="border-t border-slate-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="text-center">
            <span className="text-xs font-black uppercase tracking-wider text-blue-800">
              Support &amp; Helpdesk
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Have questions about examinations, device compatibility, access codes, or subscriptions? We are here to help.
            </p>
          </div>

          <div className="mt-10 space-y-3">
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

          {/* Access Code & Official Helpdesk Banner */}
          <div className="mt-12 rounded-3xl border border-blue-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-900">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="7.5" cy="15.5" r="5.5" />
                    <path d="m21 2-9.6 9.6" />
                    <path d="m15.5 7.5 3 3L22 7l-3-3" />
                  </svg>
                  <span>Candidate Access &amp; Support Desk</span>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-950">
                  Have an Access Code or Need Registration Support?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 max-w-xl">
                  Connect with our official candidate desk on WhatsApp for immediate onboarding guidance, or redeem your school access code to start your test paper.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-xs font-black text-white shadow-sm transition active:scale-95"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>WhatsApp Support Desk</span>
                  <span aria-hidden="true">↗</span>
                </a>

                <Link
                  href="/access"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 transition"
                >
                  Redeem Access Code
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="text-xs font-bold text-blue-700 hover:text-blue-900 transition hover:underline"
            >
              Visit Full Help &amp; FAQ Directory →
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 11: FINAL CALL TO ACTION
          Closing conversion anchor
          ========================================================================= */}
      <section id="cta" className="border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Ready to Master Your UTME &amp; Secondary Subjects?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Join thousands of candidates preparing with purpose. Build speed, conceptual mastery, and the exam confidence needed to secure university admission.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3.5 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-950 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 active:scale-95"
            >
              Start Free Practice Test <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link
              href="/learn"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 transition"
            >
              Explore Syllabus Curriculum
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            No credit card required • Instant account setup • Engineered for low-bandwidth Nigerian networks
          </p>
        </div>
      </section>
    </main>
  );
}
