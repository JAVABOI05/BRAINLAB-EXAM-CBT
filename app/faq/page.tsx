"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface FAQItem {
  id: string;
  category: "cbt" | "payments" | "gamification" | "classes" | "account";
  categoryLabel: string;
  question: string;
  answer: string;
  actionHref?: string;
  actionLabel?: string;
}

const FAQ_DATABASE: FAQItem[] = [
  // CBT & Examination
  {
    id: "cbt-start",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "How do I begin CBT practice or start an official mock examination?",
    answer: "Visit the CBT portal at /cbt. If signed in, your candidate profile is recognized automatically. Enter your elective subject (Mathematics or Biology). If your session requires an access code, enter the 6-character code provided by your school administrator or BrainLab support, then proceed to the Candidate Briefing instructions.",
    actionHref: "/cbt",
    actionLabel: "Open CBT Portal",
  },
  {
    id: "cbt-access-code",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "What is an Access Code and how do I get one?",
    answer: "An Access Code is a unique alphanumeric key that grants access to specific examination sessions, institutional mock tests, or subscription question banks. If you don't have a code, you can request one instantly by messaging our dedicated WhatsApp helpline or redeeming a code card under Account Access.",
    actionHref: "https://wa.me/2349074310204",
    actionLabel: "Request Code on WhatsApp",
  },
  {
    id: "cbt-results",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "Why can't I see my exam results or detailed question corrections immediately?",
    answer: "Examination results and solution corrections follow the administrative release settings set by BrainLab. When an exam window is active, answer keys remain cryptographically locked to ensure fair testing for all candidates. Once the administrator enables score release, you can look up your scorecard anytime using your phone number at /result or review step-by-step solutions at /corrections.",
    actionHref: "/result",
    actionLabel: "Lookup Scorecard",
  },
  {
    id: "cbt-offline",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "What happens if my phone dies or my internet disconnects during an exam?",
    answer: "BrainLab features automatic offline local recovery. Your answers are cached immediately in local storage on your device. When your connection is restored, the exam topbar displays '↻ Syncing...' and synchronizes your progress to the server. If your device restarts, simply re-enter your details at /login to resume where you left off within the remaining timer window.",
  },
  {
    id: "cbt-keyboard",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "Can I use keyboard shortcuts during the CBT examination?",
    answer: "Yes! BrainLab supports standard UTME keyboard navigation: Press A, B, C, or D to choose options; N for Next Question; P for Previous Question; F to Flag for Review; and S to trigger the submission modal. You can also toggle the on-screen digital calculator.",
  },

  // Payments & Subscriptions
  {
    id: "pay-gateways",
    category: "payments",
    categoryLabel: "Payments & Bachs",
    question: "What payment gateways are supported on BrainLab?",
    answer: "BrainLab currently uses BACHS for payment processing. Check the Pricing page for the plans and payment options currently available to your account. If a payment or subscription does not appear correctly, contact BrainLab support before attempting another payment.",
    actionHref: "/pricing",
    actionLabel: "View Subscription Plans",
  },
  {
    id: "pay-security",
    category: "payments",
    categoryLabel: "Payments & Bachs",
    question: "Is it safe to pay online on BrainLab Academy?",
    answer: "Use the payment flow presented on BrainLab's official website and review the provider's checkout details before confirming. Never share your card PIN, one-time password, or banking password with anyone claiming to be BrainLab support. For a payment concern, contact BrainLab support and do not retry a transaction until its status is clear.",
  },
  {
    id: "pay-receipt",
    category: "payments",
    categoryLabel: "Payments & Bachs",
    question: "How do I verify or retrieve my subscription status after payment?",
    answer: "Upon completing your transaction, you are redirected back to your subscription callback page which automatically finalizes your entitlement on Supabase. You can also verify your current access tier and question allowance anytime under My Learning Space at /account/access.",
    actionHref: "/account/access",
    actionLabel: "Check My Access",
  },

  // Gamification, Streaks & Badges
  {
    id: "game-streaks",
    category: "gamification",
    categoryLabel: "Streaks & Badges",
    question: "How does the Learning Streak work and how do I prevent it from resetting?",
    answer: "Your learning streak counts consecutive days on which you complete at least one substantive academic activity (e.g. finishing a 5-minute Daily Blitz in the Challenge Arena, completing a CBT quiz, or mastering a lesson topic). To protect your streak flame (🔥), practice every day before midnight. You can also activate the daily reminder alarm to receive browser notification reminders.",
    actionHref: "/challenge-arena",
    actionLabel: "Enter Challenge Arena",
  },
  {
    id: "game-reminder",
    category: "gamification",
    categoryLabel: "Streaks & Badges",
    question: "How do I turn on daily streak reminder notifications?",
    answer: "Open either the Challenge Arena (/challenge-arena) or Achievements Hub (/learning/achievements). On the Daily Streak card, click 'Reminder Settings', allow browser notifications, and pick your preferred study alarm time (e.g. 19:00 / 7:00 PM). BrainLab will notify you to keep your flame glowing.",
    actionHref: "/learning/achievements",
    actionLabel: "Achievements & Streak Hub",
  },
  {
    id: "game-xp",
    category: "gamification",
    categoryLabel: "Streaks & Badges",
    question: "What is XP and how does it advance my academic rank?",
    answer: "Experience Points (XP) reflect your continuous effort and mastery. You earn XP by practicing questions (+10 XP per correct question, +50 XP excellence bonus for 80%+ scores, and 2× multiplier during the Daily Blitz). As your lifetime XP grows, you rank up from Novice Learner to Scholar, Master, and Grand Academician, unlocking rare profile badges.",
    actionHref: "/leaderboard",
    actionLabel: "View Leaderboard",
  },

  // Live Classes & Timetable
  {
    id: "class-join",
    category: "classes",
    categoryLabel: "Classes & Timetable",
    question: "How do I join a live interactive tutor masterclass?",
    answer: "Navigate to the Live Classroom Stage from your dashboard or click 'Timetable & Schedule' under the Learning Hub. When a class is scheduled or active, click 'Enter Live Room' to join the live audio stream, interactive digital whiteboard, and class chat discussions.",
    actionHref: "/classroom/BL-LIVE-101",
    actionLabel: "Live Classroom Stage",
  },
  {
    id: "class-recordings",
    category: "classes",
    categoryLabel: "Classes & Timetable",
    question: "What if I miss a live tutor session?",
    answer: "All major syllabus masterclasses and revision sessions are recorded. You can watch past lectures, download tutor whiteboard notes, and review class questions at /recordings.",
    actionHref: "/recordings",
    actionLabel: "Open Class Recordings",
  },

  // Account & Support
  {
    id: "acc-password",
    category: "account",
    categoryLabel: "Account & Support",
    question: "How do I reset my account password?",
    answer: "Go to /account, click 'Forgot Password', and enter your registered email address. You will receive an instant secure reset link from Supabase to create a new password. If you encounter any difficulty, our WhatsApp helpdesk is available daily.",
    actionHref: "/account",
    actionLabel: "Account Sign In",
  },
  {
    id: "acc-contact",
    category: "account",
    categoryLabel: "Account & Support",
    question: "What are the official BrainLab customer support channels?",
    answer: "You can reach BrainLab Academy via our verified phone lines: 0907 431 0204 or 0902 111 8231, or chat directly with our support team on WhatsApp at +234 907 431 0204. You can also follow our official social channels on X, Instagram, Facebook, YouTube, and TikTok.",
    actionHref: "/contact",
    actionLabel: "View Contact Directory",
  },
];

type CategoryFilter = "all" | "cbt" | "payments" | "gamification" | "classes" | "account";

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ "cbt-start": true });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFAQs = useMemo(() => {
    return FAQ_DATABASE.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071328]/80 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
            <nav className="mb-4 flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-200">Support</span>
              <span>/</span>
              <span className="text-blue-700 dark:text-cyan-400">Frequently Asked Questions</span>
            </nav>

            <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-cyan-300 mb-3">
              Knowledge Base &amp; Help Desk
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
              Frequently Asked Questions
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Instant answers about CBT examinations, access codes, Bachs &amp; Paystack subscriptions, learning streaks, and score verification.
            </p>

            {/* Live Search Bar */}
            <div className="mt-6 max-w-xl">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 text-lg" aria-hidden="true">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search questions (e.g. access code, Bachs, streak, offline, results)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Categories Bar & FAQ List */}
        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              {[
                { id: "all", label: "All Questions" },
                { id: "cbt", label: "📝 CBT & Exams" },
                { id: "payments", label: "💳 Payments & Bachs" },
                { id: "gamification", label: "🔥 Streaks & Badges" },
                { id: "classes", label: "🎥 Classes & Schedule" },
                { id: "account", label: "🔐 Account & Support" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as CategoryFilter)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 active:scale-95 ${
                    selectedCategory === cat.id
                      ? "bg-[#012153] text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Showing {filteredFAQs.length} {filteredFAQs.length === 1 ? "answer" : "answers"}</span>
              {searchQuery && <span>Filter applied: &quot;{searchQuery}&quot;</span>}
            </div>

            {/* Accordion List */}
            {filteredFAQs.length > 0 ? (
              <div className="space-y-3.5">
                {filteredFAQs.map((faq) => {
                  const isOpen = Boolean(openItems[faq.id]);
                  return (
                    <article
                      key={faq.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition"
                    >
                      <button
                        onClick={() => toggleItem(faq.id)}
                        className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                        aria-expanded={isOpen}
                      >
                        <div className="space-y-1">
                          <span className="inline-block rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-cyan-300">
                            {faq.categoryLabel}
                          </span>
                          <h2 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white leading-snug">
                            {faq.question}
                          </h2>
                        </div>
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 transition-transform duration-200 ${
                            isOpen ? "rotate-180 bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-cyan-300" : ""
                          }`}
                          aria-hidden="true"
                        >
                          ▾
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-4 animate-fade-in">
                          <p>{faq.answer}</p>
                          {faq.actionHref && (
                            <div>
                              <Link
                                href={faq.actionHref}
                                className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 dark:text-cyan-400 hover:underline"
                              >
                                <span>{faq.actionLabel || "Learn more"}</span>
                                <span aria-hidden="true">→</span>
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
                <span className="text-3xl" aria-hidden="true">🔍</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No matching questions found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  We could not find an answer matching &quot;{searchQuery}&quot;. Ask our live support desk on WhatsApp directly.
                </p>
                <div className="pt-2">
                  <a
                    href={`https://wa.me/2349074310204?text=${encodeURIComponent(
                      `Hello BrainLab, I have a question about: ${searchQuery}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition active:scale-95"
                  >
                    <span>💬</span> Ask on WhatsApp
                  </a>
                </div>
              </div>
            )}

            {/* Direct Support Card */}
            <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 dark:from-blue-950/30 dark:to-slate-900 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Still have questions?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Our academic helpdesk is online daily to assist with access codes and exam guidance.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://wa.me/2349074310204"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-900 px-4 py-2.5 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                >
                  WhatsApp Helpdesk
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition active:scale-95"
                >
                  Contact Directory
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
