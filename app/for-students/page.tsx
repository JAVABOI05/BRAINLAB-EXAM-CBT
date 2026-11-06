import type { Metadata } from "next";
import Link from "next/link";

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

const CANDIDATE_BENEFITS = [
  {
    icon: "🆓",
    title: "Daily Free Full-Length Practice Test",
    description:
      "Every registered candidate can take one complete timed 4-subject CBT mock test per day without paying any fee or entering card details.",
  },
  {
    icon: "📡",
    title: "Offline Answer Auto-Sync Protection",
    description:
      "Never lose test answers due to sudden power blackouts or fluctuating 3G/4G connections. Responses are cached locally and synced instantly upon reconnection.",
  },
  {
    icon: "🤖",
    title: "AI Misconception Diagnostics",
    description:
      "Understand exactly why you missed a question. Get targeted 5-question reinforcement drills to turn errors into confident test-day points.",
  },
  {
    icon: "🔬",
    title: "Interactive Virtual STEM Labs",
    description:
      "Visualize complicated physics trajectories, chemical reactions, and circuit diagrams directly in your browser without lab fees.",
  },
  {
    icon: "⏱️",
    title: "True 2-Hour Examination Stamina",
    description:
      "Train with standard 180-question papers and on-screen calculators so exam day feels like routine practice rather than an intimidating obstacle.",
  },
  {
    icon: "🎯",
    title: "Admissions Cut-Off Target Tracking",
    description:
      "Benchmark your scores against historical departmental cut-offs for top federal and state universities (Medicine, Engineering, Law, Accounting).",
  },
];

const STUDY_PHASES = [
  {
    phase: "Phase 1: Diagnostic Assessment",
    title: "Discover Your Baseline Score",
    description:
      "Take your first 4-subject combination mock paper under full 2-hour conditions to reveal your current score aggregate and subject-by-subject strengths.",
  },
  {
    phase: "Phase 2: Curriculum Deep Dives",
    title: "Review High-Yield Syllabus Notes",
    description:
      "Use the Learning Hub to study topic summaries, specific learning objectives, and formulas for the areas flagged as weak during your baseline test.",
  },
  {
    phase: "Phase 3: Targeted AI Drills",
    title: "Reinforce Misconceptions",
    description:
      "Engage with 5-question AI reinforcement drills and daily 10-minute SM-2 formula active recall flashcards to lock rules into long-term memory.",
  },
  {
    phase: "Phase 4: Stamina & Arena Duels",
    title: "Build Test Speed & Stamina",
    description:
      "Sit weekly full mocks and compete in rapid 10-question arena speed duels to achieve calm, decisive accuracy under time pressure.",
  },
];

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
            className="font-bold text-blue-700 hover:text-blue-900 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            Start Free Practice →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(37,99,235,0.08),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Candidate Success Blueprint
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            Built specifically for <br />
            <span className="text-blue-700 dark:text-cyan-400">ambitious Nigerian candidates.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            Examination preparation shouldn&apos;t depend on expensive tutorial centers or fragile internet connections. BrainLab Academy provides every student with dependable, high-yield tools to secure university admission.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3.5 pt-2">
            <Link
              href="/login?mode=signup"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Create Free Candidate Account <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link
              href="/products/cbt"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Explore CBT Simulator Specs
            </Link>
          </div>
        </div>
      </section>

      {/* Candidate Benefits Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Why Candidates Trust BrainLab Academy
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Engineered with practical features that solve real Nigerian studying bottlenecks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CANDIDATE_BENEFITS.map((benefit, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-950/60">
                  {benefit.icon}
                </div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {benefit.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4-Phase Study Roadmap */}
      <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-[#0a152b]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              The 4-Phase Candidate Roadmap
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              How high-scoring candidates structure their study schedule from registration to exam day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STUDY_PHASES.map((phase, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50 space-y-3"
              >
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
                  {phase.phase}
                </span>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {phase.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {phase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Begin your preparation with zero risk.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Join thousands of Nigerian candidates practising daily with purpose.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/login?mode=signup"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Get Started Free →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
