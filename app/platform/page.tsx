import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/public/Breadcrumbs";

export const metadata: Metadata = {
  title: "The BrainLab Learning Platform & Ecosystem | BrainLab Academy",
  description:
    "An integrated educational architecture: authentic CBT examination simulator, curriculum learning hub, STEM virtual laboratories, live smart whiteboard, and diagnostic AI tutor.",
  alternates: { canonical: "/platform" },
};

const PLATFORM_MODULES = [
  {
    title: "The BrainLab Loop",
    badge: "Core Architecture",
    tagline: "The closed-loop learning methodology that guarantees continuous score progression.",
    description:
      "Diagnostic Assessment ➔ Weak Topic Identification ➔ Modular Concept Lesson ➔ Spaced Repetition Recall ➔ Live Masterclass ➔ Full Mock Examination.",
    href: "/platform/loop",
    actionLabel: "Explore the Loop →",
    status: "Active Architecture",
  },
  {
    title: "CBT Practice Simulator",
    badge: "Exam Simulation",
    tagline: "Authentic Nigerian CBT testing runtime with offline PWA sync.",
    description:
      "180-question mock exams, 4-subject combos, countdown timers, on-screen standard & scientific calculators, and offline question persistence.",
    href: "/products/cbt",
    actionLabel: "Explore CBT Simulator →",
    status: "Production Ready",
  },
  {
    title: "Curriculum Learning Hub",
    badge: "Syllabus Notes",
    tagline: "Syllabus-aligned structured notes across Science, Commercial, and Arts disciplines.",
    description:
      "Topic breakdowns, learning objectives, recommended textbook citations, and direct links to relevant past examination questions.",
    href: "/products/learning-hub",
    actionLabel: "Explore Learning Hub →",
    status: "Production Ready",
  },
  {
    title: "STEM Studio Virtual Labs",
    badge: "Practical Science",
    tagline: "Interactive 2D physics, chemistry, biology, and digital logic simulation benches.",
    description:
      "Parameter-driven experiments for kinematics, DC circuits, acid-base pH titration, genetics crosses, and logic gate truth tables.",
    href: "/products/stem-studio",
    actionLabel: "Explore STEM Studio →",
    status: "Production Ready",
  },
  {
    title: "Live Interactive Classroom",
    badge: "Smart Whiteboard",
    tagline: "Low-bandwidth virtual lecture stage with interactive vector academic canvas.",
    description:
      "Chalkboard, coordinate graphing grids, ruled lines, KaTeX equations, circuit stamps, live student polling, and low-data audio recording.",
    href: "/products/live-classroom",
    actionLabel: "Explore Live Classroom →",
    status: "Production Ready",
  },
  {
    title: "AI Study Tutor",
    badge: "Diagnostic AI",
    tagline: "Socratic explanation engine with strict academic safety boundaries.",
    description:
      "Pinpoint misconception causes behind wrong choices, generate targeted 5-question drills, and understand what the AI does and does NOT do.",
    href: "/platform/ai-tutor",
    actionLabel: "Explore AI Tutor & Guardrails →",
    status: "Production Ready",
  },
  {
    title: "Challenge Arena",
    badge: "Duels & Speed",
    tagline: "Real-time 1v1 academic speed duels, daily sprints, and verified merit leaderboards.",
    description:
      "Build test pace and decisive time management under pressure with 10-question sprint challenges against peers.",
    href: "/products/challenge-arena",
    actionLabel: "Explore Challenge Arena →",
    status: "Production Ready",
  },
  {
    title: "Performance & Progress Telemetry",
    badge: "Analytics Engine",
    tagline: "Deep psychometric scoring, topic mastery heatmaps, and time-per-question distribution.",
    description:
      "Comprehensive performance analytics tracking question speed, discrimination index, score trajectory, and syllabus completion.",
    href: "/platform/progress",
    actionLabel: "Explore Progress Engine →",
    status: "Production Ready",
  },
];

export default function PlatformOverviewPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Platform" }]} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
            BrainLab Platform Architecture
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            One Unified Architecture. <br />
            <span className="text-blue-700 dark:text-cyan-400">Eight Interlocking Learning Engines.</span>
          </h1>

          <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            BrainLab Academy is not just a question bank. It is an end-to-end educational platform designed to diagnose student weaknesses, reinforce understanding, and build permanent examination confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
            <Link
              href="/platform/loop"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              See The BrainLab Loop In Action →
            </Link>
            <Link
              href="/cbt"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Launch CBT Simulator
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PLATFORM_MODULES.map((mod) => (
              <div
                key={mod.title}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 shadow-xs hover:border-blue-600 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-cyan-500 transition hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 dark:text-cyan-300 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
                      {mod.badge}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                      {mod.status}
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-slate-950 dark:text-white">
                    {mod.title}
                  </h2>

                  <p className="text-xs font-semibold text-blue-700 dark:text-cyan-400">
                    {mod.tagline}
                  </p>

                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {mod.description}
                  </p>
                </div>

                <div className="pt-6">
                  <Link
                    href={mod.href}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 py-3 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-300 transition"
                  >
                    {mod.actionLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
