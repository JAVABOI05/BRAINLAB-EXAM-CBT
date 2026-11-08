import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/public/Breadcrumbs";

export const metadata: Metadata = {
  title: "The BrainLab Loop: Closed-Loop Learning Architecture | BrainLab Academy",
  description:
    "How BrainLab turns practice into permanent retention: Diagnostic Mock ➔ Weakness Analysis ➔ Concept Lesson ➔ Spaced Repetition ➔ Live Masterclass ➔ Full CBT Mastery.",
  alternates: { canonical: "/platform/loop" },
};

const LOOP_STAGES = [
  {
    step: "01",
    name: "Diagnostic Baseline Assessment",
    subtitle: "Establish an authentic starting score",
    description:
      "Rather than guessing where to begin, the candidate takes an authentic, timed 180-question mock examination under simulated testing conditions. This creates an unvarnished baseline across speed, accuracy, and subject balance.",
    deliverable: "Baseline Scorecard & Initial Topic Radar",
    linkText: "Try Diagnostic CBT Simulator",
    linkHref: "/products/cbt",
  },
  {
    step: "02",
    name: "Misconception & Error Diagnosis",
    subtitle: "Differentiate slips from knowledge voids",
    description:
      "Our diagnostic engine analyzes incorrect responses to separate careless arithmetic slips from deep conceptual gaps. It categorizes errors into formula errors, sign-convention confusion, distractor traps, or incomplete syllabus reading.",
    deliverable: "Automated Error Taxonomy & Misconception Report",
    linkText: "Explore AI Diagnostics",
    linkHref: "/platform/ai-tutor",
  },
  {
    step: "03",
    name: "Targeted Concept & Syllabus Lessons",
    subtitle: "Rebuild foundation from first principles",
    description:
      "Candidates are directed directly to the exact syllabus modules where they dropped marks. Clear, structured notes with step-by-step mathematical derivations ensure the concept is understood before new practice problems are attempted.",
    deliverable: "Modular Syllabus Notes & Textbook Citations",
    linkText: "Explore Curriculum Hub",
    linkHref: "/products/learning-hub",
  },
  {
    step: "04",
    name: "SM-2 Spaced Repetition Recall",
    subtitle: "Lock formulas into long-term memory",
    description:
      "Formulas and scientific laws fade quickly without scheduled review. BrainLab's SuperMemo (SM-2) engine calculates optimal review intervals—re-prompting high-yield concepts at +1, +3, +7, and +14 days to cement permanent recall.",
    deliverable: "Daily 10-Minute Active Recall Deck",
    linkText: "Explore Spaced Repetition",
    linkHref: "/products/ai-learning",
  },
  {
    step: "05",
    name: "Interactive Masterclasses & Virtual Labs",
    subtitle: "Experience live teaching and experiments",
    description:
      "Students attend interactive whiteboard masterclasses with expert tutors or manipulate variables inside STEM Studio virtual laboratories—adjusting projectile angles, DC circuit resistances, and acid-base titration burettes.",
    deliverable: "Live Whiteboard Polling & 2D Experiment Telemetry",
    linkText: "Explore STEM Studio & Classroom",
    linkHref: "/products/stem-studio",
  },
  {
    step: "06",
    name: "Targeted 5-Question Reinforcement Drills",
    subtitle: "Verify topic mastery before full testing",
    description:
      "Instead of wasting hours re-sitting a 40-question past paper, students solve high-intensity 5-question drills targeted strictly at their previously failed subtopics until they achieve 100% precision.",
    deliverable: "Rapid 5-Question Mastery Verification",
    linkText: "Explore Diagnostic Drills",
    linkHref: "/products/ai-learning",
  },
  {
    step: "07",
    name: "Full CBT Simulation & Psychometric Validation",
    subtitle: "Confirm score growth under authentic exam pressure",
    description:
      "The cycle concludes with a full-length, timed mock examination. Score growth, time-per-question velocity, and topic retention are validated through psychometric telemetry—confirming readiness for the real national exam.",
    deliverable: "Certified Performance Telemetry & Score Growth Curve",
    linkText: "Take Practice Exam",
    linkHref: "/cbt",
  },
];

export default function BrainLabLoopPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Platform", href: "/platform" },
          { label: "The BrainLab Loop" },
        ]}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
            Pedagogical Methodology
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            The BrainLab Loop: <br />
            <span className="text-blue-700 dark:text-cyan-400">How Practice Becomes Mastery.</span>
          </h1>

          <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            Most students fail to improve because they practise blindly: solving past questions, getting marks wrong, glancing at the answer key, and repeating the same mistake next week. The BrainLab Loop closes this gap with a systematic, closed-loop learning cycle.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
            <Link
              href="/cbt"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Start Stage 01: Baseline Diagnostic →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              View Subscription Access
            </Link>
          </div>
        </div>
      </section>

      {/* Sequential Loop Stages */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Seven Continuous Stages of Improvement
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Each stage produces actionable data that directly drives the next step in the student journey.
            </p>
          </div>

          <div className="relative border-l-2 border-blue-200 dark:border-blue-900/60 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-12">
            {LOOP_STAGES.map((stg) => (
              <div key={stg.step} className="relative space-y-3">
                {/* Stage Badge on the vertical line */}
                <div className="absolute -left-[38px] sm:-left-[54px] top-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-blue-700 text-white font-mono text-xs font-black shadow-md">
                  {stg.step}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-950 dark:text-white">
                        {stg.name}
                      </h3>
                      <p className="text-xs font-semibold text-blue-700 dark:text-cyan-400">
                        {stg.subtitle}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-md self-start sm:self-auto">
                      Stage {stg.step}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {stg.description}
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Output:</span>
                      <span>{stg.deliverable}</span>
                    </div>
                    <Link
                      href={stg.linkHref}
                      className="font-bold text-blue-700 hover:text-blue-900 dark:text-cyan-400 dark:hover:text-cyan-300 transition"
                    >
                      {stg.linkText} →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Action CTA */}
      <section className="py-16 sm:py-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Experience the BrainLab Loop yourself.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Take a free diagnostic mock examination today to discover your exact subject strengths and receive your personalized revision loop.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/cbt"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Start Free Diagnostic CBT →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
