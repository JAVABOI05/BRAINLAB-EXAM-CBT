import type { Metadata } from "next";
import Link from "next/link";
import BrandHeader from "../components/BrandHeader";
import BrandFooter from "../components/BrandFooter";

export const metadata: Metadata = {
  title: "Knowledge Base | BrainLab Academy",
  description:
    "Explore BrainLab Academy's centralized knowledge directory for subject formula sheets, exam FAQs, syllabus blueprints, and video tutorials.",
};

const KNOWLEDGE_SECTIONS = [
  {
    title: "Formula Cheat Sheets & High-Yield Cards",
    description: "Curated equations for Mathematics, Physics, Chemistry, Biology, and English grammatical concord.",
    icon: "📐",
    href: "/resources",
    badge: "15+ Guides",
    action: "Browse Formulas",
  },
  {
    title: "CBT Examination & Scoring FAQs",
    description: "Instant answers regarding access codes, offline exam recovery, released scorecards, and corrections.",
    icon: "📝",
    href: "/faq?category=cbt",
    badge: "Verified FAQ",
    action: "Read CBT FAQs",
  },
  {
    title: "Payments, Subscriptions & Bachs",
    description: "Payment methods, instant checkout with Bachs or Paystack, receipt retrieval, and tier limits.",
    icon: "💳",
    href: "/faq?category=payments",
    badge: "Billing Guide",
    action: "Payment Answers",
  },
  {
    title: "Learning Streaks & Gamification Hub",
    description: "How to maintain daily streaks, set streak reminder notification alarms, and earn badges.",
    icon: "🔥",
    href: "/learning/achievements",
    badge: "Gamification",
    action: "Streak Guide",
  },
  {
    title: "Live Classroom Timetable & Masterclasses",
    description: "Schedule of weekly live tutor sessions, interactive whiteboard stages, and past lecture recordings.",
    icon: "🎥",
    href: "/learn?tab=timetable",
    badge: "Classroom Stage",
    action: "View Timetable",
  },
  {
    title: "Verified Support & Helpdesk Directory",
    description: "Direct phone lines, instant WhatsApp dispatch, and official social media channels.",
    icon: "📞",
    href: "/contact",
    badge: "Direct Contact",
    action: "Contact Directory",
  },
];

export default function KnowledgeBasePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <BrandHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <nav className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">
              Home
            </Link>
            <span>/</span>
            <span className="text-blue-700 dark:text-cyan-400">Knowledge Base</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white flex items-center gap-3">
            <span>💡 BrainLab Knowledge Base</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Your centralized directory for academic formula cheat sheets, CBT examination procedures, subscription help, and study guides.
          </p>
        </div>

        {/* Directory Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {KNOWLEDGE_SECTIONS.map((sec) => (
            <div
              key={sec.title}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-blue-400 dark:hover:border-blue-600 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-2xl">
                    {sec.icon}
                  </span>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:text-cyan-300">
                    {sec.badge}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  {sec.title}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {sec.description}
                </p>
              </div>

              <Link
                href={sec.href}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-[#012153] hover:text-white dark:bg-slate-800 dark:hover:bg-blue-700 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all duration-150 active:scale-95"
              >
                {sec.action} →
              </Link>
            </div>
          ))}
        </div>

        {/* Assistance Card */}
        <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Can’t find what you need?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Ask our live student helpdesk on WhatsApp for immediate guidance on access codes or test setup.
            </p>
          </div>
          <a
            href="https://wa.me/2349074310204"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-xs font-bold text-white transition active:scale-95 shadow-sm shrink-0"
          >
            <span>💬</span> Message Support on WhatsApp
          </a>
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}
