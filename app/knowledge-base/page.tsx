import type { Metadata } from "next";
import Link from "next/link";
import { getWhatsAppChatUrl } from "../lib/whatsapp";

export const metadata: Metadata = {
  title: "Knowledge Base | BrainLab Academy",
  description:
    "Explore BrainLab Academy's centralized knowledge directory for subject formula sheets, exam FAQs, syllabus blueprints, and video tutorials.",
};

type KnowledgeSectionKey = "formulas" | "cbt" | "payments" | "streaks" | "classroom" | "support";

interface KnowledgeSectionItem {
  id: KnowledgeSectionKey;
  title: string;
  description: string;
  href: string;
  badge: string;
  action: string;
}

const KNOWLEDGE_SECTIONS: KnowledgeSectionItem[] = [
  {
    id: "formulas",
    title: "Formula Cheat Sheets & High-Yield Cards",
    description: "Curated equations for Mathematics, Physics, Chemistry, Biology, and English grammatical concord.",
    href: "/resources",
    badge: "15+ Guides",
    action: "Browse Formulas",
  },
  {
    id: "cbt",
    title: "CBT Examination & Scoring FAQs",
    description: "Instant answers regarding access codes, offline exam recovery, released scorecards, and corrections.",
    href: "/faq?category=cbt",
    badge: "Verified FAQ",
    action: "Read CBT FAQs",
  },
  {
    id: "payments",
    title: "Payments, Subscriptions & Bachs",
    description: "Payment methods, instant checkout with Bachs or Paystack, receipt retrieval, and tier limits.",
    href: "/faq?category=payments",
    badge: "Billing Guide",
    action: "Payment Answers",
  },
  {
    id: "streaks",
    title: "Learning Streaks & Gamification Hub",
    description: "How to maintain daily streaks, set streak reminder notification alarms, and earn badges.",
    href: "/learning/achievements",
    badge: "Gamification",
    action: "Streak Guide",
  },
  {
    id: "classroom",
    title: "Live Classroom Timetable & Masterclasses",
    description: "Schedule of weekly live tutor sessions, interactive whiteboard stages, and past lecture recordings.",
    href: "/learn?tab=timetable",
    badge: "Classroom Stage",
    action: "View Timetable",
  },
  {
    id: "support",
    title: "Verified Support & Helpdesk Directory",
    description: "Direct phone lines, instant WhatsApp dispatch, and official social media channels.",
    href: "/contact",
    badge: "Direct Contact",
    action: "Contact Directory",
  },
];

function KnowledgeIcon({ id }: { id: KnowledgeSectionKey }) {
  switch (id) {
    case "formulas":
      return (
        <svg className="h-6 w-6 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      );
    case "cbt":
      return (
        <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "payments":
      return (
        <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case "streaks":
      return (
        <svg className="h-6 w-6 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case "classroom":
      return (
        <svg className="h-6 w-6 text-rose-500 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    case "support":
    default:
      return (
        <svg className="h-6 w-6 text-cyan-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
  }
}

export default function KnowledgeBasePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      
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
            <span>BrainLab Knowledge Base</span>
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
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                    <KnowledgeIcon id={sec.id} />
                  </span>
                  <span className="rounded-full bg-blue-50 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:text-cyan-300">
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
            href={getWhatsAppChatUrl("Hello BrainLab Support, I need help with knowledge base articles.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-xs font-bold text-white transition active:scale-95 shadow-sm shrink-0"
          >
            <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Message Support on WhatsApp</span>
          </a>
        </div>
      </main>

          </div>
  );
}
