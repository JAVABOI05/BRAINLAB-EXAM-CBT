import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Live Interactive Classroom & Whiteboard Stage",
  description:
    "Tutor-led live interactive masterclasses featuring BrainLab's vector academic whiteboard, multi-surface drawing grids, real-time checkpoint polls, and low-data audio lectures.",
  alternates: { canonical: "https://www.brainlabacademy.com.ng/products/live-classroom" },
  openGraph: {
    title: "Live Classroom & Whiteboard Stage — BrainLab Academy",
    description:
      "Tutor-led masterclasses with synchronized vector whiteboard, coordinate grid plotting, live checkpoint quizzes, and low-data audio.",
    url: "https://www.brainlabacademy.com.ng/products/live-classroom",
  },
};

interface ClassroomFeatureItem {
  iconId: "whiteboard" | "katex" | "poll" | "audio" | "archive" | "community";
  title: string;
  description: string;
}

const CLASSROOM_FEATURES: ClassroomFeatureItem[] = [
  {
    iconId: "whiteboard",
    title: "Multi-Surface Academic Whiteboard",
    description:
      "Switch effortlessly between dark academic chalkboard, millimeter coordinate graphing planes for physics/calculus, and ruled notebook lines for literature and essays.",
  },
  {
    iconId: "katex",
    title: "KaTeX Math & Vector Science Stamps",
    description:
      "Tutors insert crisp vector science diagrams (electrical resistors, batteries, chemical beakers, benzene rings) and complex KaTeX formulas with zero drawing lag.",
  },
  {
    iconId: "poll",
    title: "Live Checkpoint Comprehension Polls",
    description:
      "Tutors fire instant 60-second multiple-choice checkpoint questions during lectures to immediately gauge student retention and re-explain confusing steps.",
  },
  {
    iconId: "audio",
    title: "Low-Bandwidth Audio Lecture Stream",
    description:
      "Optimized for varying Nigerian internet connections. Live voice explanations run smoothly on low-bandwidth 3G connections without chewing through heavy mobile data bundles.",
  },
  {
    iconId: "archive",
    title: "Synchronized Lecture Replay Archive",
    description:
      "Missed a scheduled masterclass? Review recorded whiteboard strokes alongside tutor audio annotations anytime from your student portal dashboard.",
  },
  {
    iconId: "community",
    title: "Dedicated Tutor-Student Interaction",
    description:
      "Ask questions in live chat, raise hands for voice participation, and participate in guided problem-solving alongside top candidates from across the country.",
  },
];

function ClassroomFeatureIcon({ id }: { id: ClassroomFeatureItem["iconId"] }) {
  switch (id) {
    case "whiteboard":
      return (
        <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case "katex":
      return (
        <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
          <line x1="14.5" y1="5.5" x2="18.5" y2="9.5" />
        </svg>
      );
    case "poll":
      return (
        <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "audio":
      return (
        <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      );
    case "archive":
      return (
        <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      );
    case "community":
      return (
        <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
  }
}

export default function LiveClassroomProductPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-[#091325]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-blue-700 dark:hover:text-cyan-400">Products</Link>
            <span>/</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Live Classroom</span>
          </div>
          <Link
            href="/classroom"
            className="font-bold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
          >
            Enter Classroom Stage →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(245,158,11,0.08),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Synchronized Tutor Masterclasses
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
              Learn directly with <br />
              <span className="text-amber-600 dark:text-amber-400">master educators in real time.</span>
            </h1>

            <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
              Step into an interactive virtual lecture hall designed specifically for secondary and UTME concepts. Experience synchronized vector drawing, coordinate graphing, and instant checkpoint quizzes without lag.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
              <Link
                href="/classroom"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                View Live Masterclasses <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href="/learn?tab=timetable"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              >
                Browse Masterclass Schedule
              </Link>
            </div>
          </div>

          {/* Visual Whiteboard Stage Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-[#0d1a33] p-6 text-white shadow-2xl dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs font-mono">
                <span className="text-amber-400 font-bold">SMART WHITEBOARD // ROOM BL-LIVE-101</span>
                <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  LIVE NOW (42 LEARNERS)
                </span>
              </div>

              <div className="h-44 rounded-xl border border-slate-700/80 bg-[#070e1b] p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="text-[11px] font-mono text-cyan-300">
                  Topic: Projectile Trajectory &amp; Time of Flight
                </div>
                <div className="my-auto text-center font-mono text-xs text-amber-200">
                  T = (2u · sin θ) / g
                  <div className="text-[10px] text-slate-400 mt-1">Coordinate Plane Active · Chalk Style</div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <span>Tutor: Engr. Victor (Host)</span>
                  <span className="text-emerald-400">Audio: 24 kbps Opus HD</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-300">Live Checkpoint Poll:</span>
                  <span className="ml-2 text-slate-300">At what angle is maximum range achieved?</span>
                </div>
                <span className="rounded bg-amber-500 px-2 py-0.5 text-slate-950 font-black text-[10px]">45° (88% Correct)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Classroom Capabilities - Compact Alternating Cards */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/60 px-4 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>SYNCHRONOUS LECTURE TECHNOLOGY</span>
            </div>
            <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight sm:text-4xl">
              Engineered for Real-Time Teacher-Student Synchrony
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
              Low-latency vector strokes and optimized audio mean you never miss an explanation due to poor connectivity.
            </p>
          </div>

          <div className="space-y-12 sm:space-y-16">
            {/* Row 1: Multi-Surface Academic Whiteboard (Text Left, Visual Preview Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-amber-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Text Side (Span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Sub-45ms Vector Ink</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    Multi-Surface Academic Whiteboard &amp; KaTeX Stamps
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Switch effortlessly between dark academic chalkboard, millimeter coordinate graphing planes for physics/calculus, and ruled notebook lines for literature and essays.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-bold">✓</span>
                      <span>Sub-45ms drawing latency synchronized across all connected candidate phones</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-bold">✓</span>
                      <span>Instant KaTeX formulas, circuit schematics, benzene rings, and ray diagrams</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-bold">✓</span>
                      <span>Multi-surface toggle: Dark Chalkboard, Cartesian Grid, and Ruled College Sheets</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/classroom"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Enter Classroom Lobby</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Visual Preview Side (Span 5) */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-amber-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                          LECTURE STAGE
                        </span>
                      </div>
                      <span className="text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded text-[11px]">
                        &lt; 45ms Latency
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#070e1b] p-3.5 space-y-2">
                      <div className="text-[11px] text-cyan-300">
                        Topic: Projectile Trajectory &amp; Time of Flight
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10 text-center font-bold text-amber-300 text-sm">
                        T = (2u &middot; sin &theta;) / g
                      </div>
                      <div className="text-[10px] text-slate-400 text-center">
                        Coordinate Plane Active &bull; Vector Chalkboard
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                      <span>Tutor: Engr. Victor (Host)</span>
                      <span className="text-emerald-400 font-bold">42 Connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Live Checkpoint Polls (Visual Preview Left, Text Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-cyan-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Visual Preview Side (Span 5 - Order 2 on mobile, Order 1 on desktop) */}
                <div className="lg:col-span-5 order-2 lg:order-1">
                  <div className="rounded-2xl border border-cyan-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                          LIVE CHECKPOINT POLL
                        </span>
                      </div>
                      <span className="text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded text-[11px]">
                        60s Timer
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2">
                      <p className="text-xs text-white font-bold font-sans">
                        At what angle is maximum horizontal projectile range achieved?
                      </p>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          <span>[A] 30&deg;</span>
                          <span className="text-slate-400">6%</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded bg-cyan-950 border border-cyan-600 text-cyan-300 font-bold">
                          <span>[B] 45&deg; (Optimal)</span>
                          <span className="text-emerald-400">88% Correct ✓</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          <span>[C] 60&deg;</span>
                          <span className="text-slate-400">6%</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 text-center">
                      Instant feedback clarifies misconceptions before progressing
                    </div>
                  </div>
                </div>

                {/* Text Side (Span 7 - Order 1 on mobile, Order 2 on desktop) */}
                <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 dark:border-cyan-700/60 bg-cyan-50 dark:bg-cyan-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span>Active Recall &amp; Socratic Interaction</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    Live Checkpoint Comprehension Polls
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Tutors fire instant 60-second multiple-choice checkpoint questions during lectures to immediately gauge student retention and re-explain confusing steps.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Real-time response tally shows cohort comprehension instantly</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Deconstructs student distractors during live derivation steps</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>100% anonymous submission eliminates student participation anxiety</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/for-tutors"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Explore Educator Suite</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Low-Bandwidth Audio & Replay Archive (Text Left, Visual Preview Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-emerald-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Text Side (Span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Low-Bandwidth Opus Stream</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    Low-Bandwidth Audio &amp; Synchronized Replays
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Optimized for varying Nigerian internet connections. Live voice explanations run smoothly on low-bandwidth 24 kbps Opus audio without chewing through heavy mobile data bundles.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>24 kbps Opus HD voice codec uses under 15 MB data per hour</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Whiteboard vector strokes replay synchronously with teacher voice</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Review recorded lectures on-demand from your candidate dashboard</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/pricing"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Join Live Apex Cohort</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Visual Preview Side (Span 5) */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-emerald-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                          DATA STREAM TELEMETRY
                        </span>
                      </div>
                      <span className="text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded text-[11px]">
                        24 kbps OPUS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Hourly Data</div>
                        <div className="text-base font-black text-cyan-400 mt-0.5">10.8 MB</div>
                        <div className="text-[10px] text-slate-500">Ultra-Lightweight</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Replay Sync</div>
                        <div className="text-base font-black text-emerald-400 mt-0.5">100% Synced</div>
                        <div className="text-[10px] text-slate-500">Vector + Voice</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-200">
                      ✓ Instant replay available immediately following class conclusion
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Join the next live masterclass.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Check the timetable for today&apos;s scheduled sessions and join your fellow candidates.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/classroom"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Enter Classroom Lobby →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
