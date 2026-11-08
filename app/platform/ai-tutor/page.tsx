import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/public/Breadcrumbs";
import { PublicAiTutorDemo } from "@/app/components/public/PublicAiTutorDemo";

export const metadata: Metadata = {
  title: "AI Tutor: Capabilities, Pedagogical Philosophy & Boundaries | BrainLab Academy",
  description:
    "An honest, comprehensive breakdown of BrainLab's AI Tutor: what it does, what it does NOT do (not always correct, not a replacement for human teachers), and strict exam integrity lockouts.",
  alternates: { canonical: "/platform/ai-tutor" },
};

const WHAT_IT_DOES = [
  {
    icon: "💡",
    title: "Socratic Step-by-Step Guidance",
    description:
      "Instead of dumping raw answers, the AI provides scaffolded hints and guiding prompts that encourage students to think through the derivation themselves.",
  },
  {
    icon: "⚠️",
    title: "Distractor & Examiner Trap Analysis",
    description:
      "Explains why specific incorrect options were crafted by JAMB/WAEC examiners—identifying common sign errors, misplaced units, or conceptual misconceptions.",
  },
  {
    icon: "🎯",
    title: "5-Question Weakness Reinforcement",
    description:
      "Generates hyper-targeted 5-question problem sets isolating the exact subtopics where a candidate dropped marks in their latest mock examination.",
  },
  {
    icon: "📐",
    title: "Formula Derivations & Unit Checks",
    description:
      "Walks through dimensional analysis and fundamental theorem derivations in physics, mathematics, and chemistry.",
  },
  {
    icon: "🧠",
    title: "SM-2 Spaced Repetition Scheduling",
    description:
      "Organizes high-yield definitions and formulas into active recall intervals (+1, +3, +7, +14 days) to prevent memory decay before exam day.",
  },
];

const WHAT_IT_DOES_NOT_DO = [
  {
    icon: "❌",
    title: "It is NOT Always Correct (Verification Required)",
    description:
      "Large language models can make arithmetic calculation slips or generate plausible-sounding errors. Students are explicitly taught to cross-check calculations with standard textbooks and official syllabus marking keys.",
  },
  {
    icon: "❌",
    title: "It is NOT a Replacement for Human Teachers",
    description:
      "The AI Tutor is an assistive self-study companion designed for late-night revision and immediate practice feedback. It cannot replace the empathy, classroom management, and mentorship of qualified educators.",
  },
  {
    icon: "🔒",
    title: "It is Strictly LOCKED During Live Mock Examinations",
    description:
      "During timed CBT simulations, the AI Tutor is completely disabled. Candidates must rely entirely on their own recall and examination calculator—preventing cheating and preserving testing realism.",
  },
  {
    icon: "🛡️",
    title: "It Will NOT Solve School Homework to Facilitate Cheating",
    description:
      "The AI is instruction-tuned to reject requests for raw assignment dumps. When presented with homework questions, it replies with hints and Socratic questions rather than copy-paste solutions.",
  },
  {
    icon: "🚫",
    title: "It Has Zero Access to Private Student Records",
    description:
      "The inference engine operates on anonymized academic prompts only. It never reads or exposes student profile credentials, passwords, or personal identifying data.",
  },
];

export default function AiTutorPlatformPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Platform", href: "/platform" },
          { label: "AI Tutor" },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-purple-900 dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-300">
            Pedagogical AI Engine
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            The BrainLab AI Tutor: <br />
            <span className="text-purple-700 dark:text-purple-400">Honest Pedagogy, Real Boundaries.</span>
          </h1>

          <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            We believe artificial intelligence in education must be transparent about its capabilities and humble about its limitations. Here is exactly what our AI Tutor does, what it does not do, and how it safeguards academic integrity.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
            <Link
              href="/ai-learning"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-purple-700 hover:bg-purple-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Launch Student AI Study Studio →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Compare Plan Quotas
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Public Demo */}
      <section className="py-12 sm:py-16 bg-slate-100/60 dark:bg-[#060c18] border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PublicAiTutorDemo />
        </div>
      </section>

      {/* Side-by-Side: What It Does vs What It Does Not Do */}
      <section className="py-16 sm:py-24 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Clear Pedagogical Boundaries
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Clear commitments on how AI is integrated into Nigerian secondary and tertiary prep.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* What It Does */}
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/30 p-8 dark:border-emerald-900/40 dark:bg-emerald-950/10 space-y-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">✓</span>
                <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-200">
                  What the AI Tutor Does
                </h3>
              </div>
              <div className="space-y-4">
                {WHAT_IT_DOES.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs dark:border-emerald-900/30 dark:bg-slate-900 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{item.title}</h4>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 pl-6">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* What It Does NOT Do */}
            <div className="rounded-3xl border border-rose-200 bg-rose-50/30 p-8 dark:border-rose-900/40 dark:bg-rose-950/10 space-y-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white font-bold text-sm">✕</span>
                <h3 className="text-xl font-black text-rose-950 dark:text-rose-200">
                  What the AI Tutor Does NOT Do
                </h3>
              </div>
              <div className="space-y-4">
                {WHAT_IT_DOES_NOT_DO.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-rose-100 bg-white p-5 shadow-xs dark:border-rose-900/30 dark:bg-slate-900 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{item.title}</h4>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 pl-6">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Action CTA */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Experience principled academic assistance.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Free accounts receive 50 AI study hints per month. Upgrade to Premium for 500 monthly queries or Pro for unlimited access.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/ai-learning"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-purple-700 hover:bg-purple-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Open AI Study Studio →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
