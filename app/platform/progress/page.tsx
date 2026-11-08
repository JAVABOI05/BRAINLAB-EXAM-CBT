import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/public/Breadcrumbs";

export const metadata: Metadata = {
  title: "Performance & Progress Telemetry Engine | BrainLab Academy",
  description:
    "Explore BrainLab's analytics: psychometric item difficulty, topic mastery matrices, time-per-question velocity, and score progression trends.",
  alternates: { canonical: "/platform/progress" },
};

const TELEMETRY_FEATURES = [
  {
    icon: "📈",
    title: "Score Trajectory & Velocity Tracking",
    description:
      "Monitor your aggregate score progression across successive mock exams. The engine calculates your score velocity to project your exam-day readiness.",
  },
  {
    icon: "🎯",
    title: "Topic Mastery Heatmaps",
    description:
      "A granular breakdown across every syllabus chapter. Color-coded matrices identify which subtopics are locked into mastery and which need immediate revision.",
  },
  {
    icon: "⏱️",
    title: "Time-per-Question Speed Distribution",
    description:
      "Learn which questions stole your examination time. Our pacing telemetry flags questions where you spent more than 60 seconds and distinguishes calculated pacing from panicked guessing.",
  },
  {
    icon: "🔬",
    title: "Psychometric Item Discrimination",
    description:
      "Based on classical test theory, every question is scored with difficulty ratings (p-value) and discrimination indices—showing how your performance compares to national cohorts.",
  },
  {
    icon: "📜",
    title: "Verified Skills Passport & Certificates",
    description:
      "Earn tamper-proof, cryptographic digital achievement certificates upon completing syllabus milestones and qualifying mock benchmark exams.",
  },
  {
    icon: "📱",
    title: "Parental Progress Telemetry",
    description:
      "Optional termly and weekly digest summaries sent directly to guardians, providing transparent visibility into study hours, completed mocks, and score trends.",
  },
];

export default function ProgressPlatformPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Platform", href: "/platform" },
          { label: "Performance & Progress" },
        ]}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
            Analytics &amp; Psychometrics
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            Performance &amp; Progress Telemetry: <br />
            <span className="text-blue-700 dark:text-cyan-400">Data-Driven Examination Readiness.</span>
          </h1>

          <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            Stop relying on guesswork. BrainLab’s performance engine tracks speed, accuracy, topic retention, and psychometric discrimination—giving you and your educators an exact map of what to revise next.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
            <Link
              href="/result"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              View Student Scorecard Portal →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Compare Analytics Tiers
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Precision Telemetry Across Every Exam Attempt
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Transform every test click into actionable pedagogical intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TELEMETRY_FEATURES.map((feat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-950/60">
                  {feat.icon}
                </div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {feat.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {feat.description}
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
            See your personalized diagnostic profile.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Log in to your authenticated student dashboard or complete a practice exam to generate your first diagnostic report.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Open Student Dashboard →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
