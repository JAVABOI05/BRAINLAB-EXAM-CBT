import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Curriculum Learning Hub & Subject Lessons | BrainLab Academy",
  description:
    "Master secondary and JAMB UTME subjects with curriculum-aligned lessons, structured syllabus modules, learning objectives, recommended textbooks, and tutor-guided study materials.",
  alternates: { canonical: "/products/learning-hub" },
  openGraph: {
    title: "Curriculum Learning Hub — BrainLab Academy",
    description:
      "Structured syllabus lessons, topic notes, specific learning goals, and recommended textbooks across Science, Commercial, and Art disciplines.",
    url: "https://www.brainlabacademy.com.ng/products/learning-hub",
  },
};

const SUBJECT_AREAS = [
  {
    category: "Science Disciplines",
    icon: "🔬",
    color: "border-blue-500/20 bg-blue-500/5",
    badge: "High Competition",
    subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "Agricultural Science"],
    description: "Deep conceptual foundations, step-by-step mathematical proofs, laboratory principles, and standard notations.",
  },
  {
    category: "Commercial & Social Sciences",
    icon: "📈",
    color: "border-emerald-500/20 bg-emerald-500/5",
    badge: "Career Focused",
    subjects: ["Economics", "Principles of Accounts", "Commerce", "Government", "Geography"],
    description: "Financial calculations, economic models, governance structures, and international trade mechanisms.",
  },
  {
    category: "Arts & Humanities",
    icon: "📖",
    color: "border-purple-500/20 bg-purple-500/5",
    badge: "Critical Analysis",
    subjects: ["Use of English", "Literature in English", "Christian Religious Studies", "Islamic Studies", "History"],
    description: "Grammatical concord, prescribed prose/drama/poetry analysis, literary devices, and historical contexts.",
  },
];

const HUB_FEATURES = [
  {
    icon: "🎯",
    title: "Official Exam Board Alignment",
    description:
      "Every module and topic aligns strictly with the official Joint Admissions and Matriculation Board syllabus and Senior Secondary curriculum guidelines.",
  },
  {
    icon: "📋",
    title: "Specific Learning Objectives",
    description:
      "Each topic outlines clear cognitive goals so you know exactly what concepts, calculations, or definitions you must master before examination day.",
  },
  {
    icon: "📚",
    title: "Recommended Textbook Bibliographies",
    description:
      "Consult the exact reference texts recommended by examiners (e.g. New School Physics, Ababio Chemistry, Essential Biology) for deeper background study.",
  },
  {
    icon: "🔗",
    title: "Deep-Linked CBT Practice Drills",
    description:
      "Connect theory to practice immediately. Click any topic to test your knowledge against verified past questions directly addressing that subtopic.",
  },
  {
    icon: "📅",
    title: "Integrated Revision Timetable",
    description:
      "Follow structured daily study schedules and synchronized masterclass timetables to cover the complete 4-subject curriculum without last-minute cramming.",
  },
  {
    icon: "📝",
    title: "Downloadable Topic Summaries & Notes",
    description:
      "Access high-yield formula sheets and concise summary notes engineered for rapid review on mobile devices during daily transit or offline revision.",
  },
];

export default function LearningHubProductPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-[#091325]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-blue-700 dark:hover:text-cyan-400">Products</Link>
            <span>/</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Learning Hub</span>
          </div>
          <Link
            href="/learn"
            className="font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Open Learning Hub →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(16,185,129,0.08),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            Curriculum Mastery Engine
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            Move beyond memorization. <br />
            <span className="text-emerald-700 dark:text-emerald-400">Understand the underlying concepts.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            BrainLab&apos;s Curriculum Learning Hub provides comprehensive, structured syllabus modules across Science, Commercial, and Art subjects. Master topics systematically with specific learning goals and verified reading references.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3.5 pt-2">
            <Link
              href="/learn"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 hover:bg-emerald-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Explore Subject Curriculum <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link
              href="/syllabus"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Browse Official Syllabus Breakdown
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Discipline Categories */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Comprehensive Multi-Discipline Coverage
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Structured modules for every secondary school and university matriculation pathway.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SUBJECT_AREAS.map((area, idx) => (
              <div
                key={idx}
                className={`rounded-3xl border ${area.color} bg-white p-7 shadow-xs dark:bg-slate-900/90 space-y-5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{area.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {area.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">
                    {area.category}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {area.description}
                  </p>
                </div>
                <div className="space-y-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Core Subjects:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {area.subjects.map((s, sIdx) => (
                      <span
                        key={sIdx}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-[#0a152b]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Engineered for Deep Academic Retention
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              How the Learning Hub turns raw syllabus outlines into active learning mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {HUB_FEATURES.map((feat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/60 space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl dark:bg-emerald-950/60">
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
      <section className="py-16 sm:py-24 border-t border-slate-200 dark:border-slate-800 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Start mastering your syllabus topics today.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Browse official learning objectives and topic summaries completely free.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/learn"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 hover:bg-emerald-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Open Learning Hub →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
