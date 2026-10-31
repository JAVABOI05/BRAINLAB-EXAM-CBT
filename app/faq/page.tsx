"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getWhatsAppChatUrl, DEFAULT_WHATSAPP_NUMBER } from "../lib/whatsapp";
import { getFooterConfig } from "../lib/platformConfig";

interface FAQItem {
  id: string;
  category: "cbt" | "payments" | "gamification" | "classes" | "account" | "ai";
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
    answer: "Visit the CBT portal at /cbt. If signed in, your candidate profile is recognized automatically. Select your subject combinations (including English and Mathematics or Biology). If your session requires an access code, enter the 6-character code provided by your school coordinator or BrainLab support, then proceed through the Candidate Briefing instructions to launch the exam simulator.",
    actionHref: "/cbt",
    actionLabel: "Open CBT Portal",
  },
  {
    id: "cbt-access-code",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "What is an Access Code and how do I get one?",
    answer: "An Access Code is a unique alphanumeric key that grants access to specific examination sessions, institutional mock tests, or subscription question banks. If you don't have a code, you can request one instantly by messaging our dedicated WhatsApp helpline or redeeming a voucher card under Account Access.",
    actionHref: getWhatsAppChatUrl("Hello BrainLab, I need an Access Code for CBT practice."),
    actionLabel: "Request Code on WhatsApp",
  },
  {
    id: "cbt-calculator",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "Is there a digital calculator available during calculations in the CBT exam?",
    answer: "Yes! BrainLab provides a built-in scientific/standard on-screen digital calculator. You can access it anytime during an active exam by clicking the 'Calculator' button in the topbar or the floating launcher at the bottom-left of the screen. You can also drag, minimize, or close it when not needed.",
    actionHref: "/cbt",
    actionLabel: "Try CBT Simulator",
  },
  {
    id: "cbt-offline",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "What happens if my internet disconnects or my device turns off during an exam?",
    answer: "BrainLab features robust local recovery. Every answer you click is cached immediately in local memory on your device. When connection resumes, the exam topbar automatically syncs your progress to the server. If your browser or device restarts, simply sign back in at /login to resume where you left off within the remaining timer window.",
  },
  {
    id: "cbt-results",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "How and when can I view my scorecard and question corrections?",
    answer: "During active testing windows, answer keys are cryptographically guarded to ensure competitive fairness. Once released by administrators, you can view your verified scorecard anytime by entering your registered phone number at /result, or inspect detailed step-by-step pedagogical explanations at /corrections.",
    actionHref: "/result",
    actionLabel: "Lookup Scorecard",
  },
  {
    id: "cbt-keyboard",
    category: "cbt",
    categoryLabel: "CBT & Exams",
    question: "Can I use standard JAMB UTME 8-key keyboard navigation?",
    answer: "Yes! The BrainLab exam engine natively supports UTME keyboard navigation: Press A, B, C, or D to select an option; N for Next Question; P for Previous Question; F to Flag for Review; and S to trigger the submission modal.",
  },

  // Payments & Subscriptions
  {
    id: "pay-gateways",
    category: "payments",
    categoryLabel: "Payments & Billing",
    question: "What payment methods are supported on BrainLab Academy?",
    answer: "BrainLab supports multiple secure payment channels: CBN-licensed Paystack (Debit/Credit Cards, USSD, Bank Account Transfer), Flutterwave, Direct GTBank Transfer (with account verification drawer), and Bachs Gateway. All payments are encrypted with PCI-DSS Level 1 compliance and activated immediately upon confirmation.",
    actionHref: "/pricing",
    actionLabel: "View Subscription Plans",
  },
  {
    id: "pay-refund",
    category: "payments",
    categoryLabel: "Payments & Billing",
    question: "What is your refund policy if I am double-charged or face an issue?",
    answer: "We maintain a dedicated 24-Hour Refund Portal. If you experience duplicate billing or technical platform unavailability verified within 48 hours, submit your transaction reference at /account/subscription/refund for swift review and reimbursement.",
    actionHref: "/account/subscription/refund",
    actionLabel: "Visit Refund Portal",
  },
  {
    id: "pay-receipt",
    category: "payments",
    categoryLabel: "Payments & Billing",
    question: "How do I verify my active subscription and question allowance?",
    answer: "Upon completing any subscription or code redemption, your entitlements are immediately updated in your profile. You can check your active tier, expiration date, and remaining mock quota anytime under My Account at /account/access.",
    actionHref: "/account/access",
    actionLabel: "Check My Access Tier",
  },

  // AI Tutor & Study Studio
  {
    id: "ai-tutor",
    category: "ai",
    categoryLabel: "AI Tutor & Ethics",
    question: "How does the BrainLab AI Tutor work and does it train on my data?",
    answer: "BrainLab AI Tutor uses a multi-provider intelligent router calibrated to Nigerian curricula (NERDC, JAMB, WAEC). Under our strict NDPA 2023 commitment, candidate queries are processed ephemerally with zero client identification. Student inputs are NEVER harvested or used to train external AI foundation models.",
    actionHref: "/privacy",
    actionLabel: "Read AI Privacy Commitments",
  },
  {
    id: "ai-step-by-step",
    category: "ai",
    categoryLabel: "AI Tutor & Ethics",
    question: "Can the AI tutor help me solve step-by-step math and physics calculations?",
    answer: "Yes! In the AI Study Studio and question corrections hub, the tutor provides complete mathematical derivations, formula breakdowns, and pedagogical hints to help you understand underlying concepts rather than just memorizing answers.",
    actionHref: "/learning",
    actionLabel: "Open Learning Hub",
  },

  // Gamification, Streaks & Arena
  {
    id: "game-streaks",
    category: "gamification",
    categoryLabel: "Streaks & Arena",
    question: "How do daily learning streaks work and how do I protect my flame?",
    answer: "Your learning streak counts consecutive days on which you complete at least one substantive academic task (a 5-minute Daily Blitz in the Challenge Arena, completing a CBT mock, or studying a lesson). Practice every day before midnight to protect your flame  and earn streak bonus XP.",
    actionHref: "/challenge-arena",
    actionLabel: "Enter Challenge Arena",
  },
  {
    id: "game-arena",
    category: "gamification",
    categoryLabel: "Streaks & Arena",
    question: "What is the 1v1 Challenge Arena?",
    answer: "The Challenge Arena allows you to go head-to-head in real-time academic speed duels against fellow candidates nationwide or invite classmates to private room battles. Compete on speed, accuracy, and syllabus mastery to climb the national leaderboard.",
    actionHref: "/challenge-arena",
    actionLabel: "Play 1v1 Challenge",
  },
  {
    id: "game-xp",
    category: "gamification",
    categoryLabel: "Streaks & Arena",
    question: "What is XP and how does it advance my rank on the leaderboard?",
    answer: "Experience Points (XP) reward academic consistency. Earn +10 XP per correct question, +50 XP for scoring 80%+, and 2× multiplier during the Daily Blitz. Level up from Novice Learner to Master Scholar and unlock badges on the National Leaderboard.",
    actionHref: "/leaderboard",
    actionLabel: "View National Leaderboard",
  },

  // Live Classes & Timetable
  {
    id: "class-join",
    category: "classes",
    categoryLabel: "Live Classes",
    question: "How do I attend a live interactive masterclass with tutors?",
    answer: "Check the Live Masterclass timetable on your dashboard or navigate to /classroom. When a masterclass is in session, click 'Enter Live Room' to join the live audio stream, interactive digital whiteboard, and class group discussion.",
    actionHref: "/classroom/BL-LIVE-101",
    actionLabel: "Enter Classroom Stage",
  },
  {
    id: "class-recordings",
    category: "classes",
    categoryLabel: "Live Classes",
    question: "What happens if I miss a live scheduled class?",
    answer: "All major syllabus masterclasses and revision series are automatically recorded. You can watch archived lectures, download tutor whiteboard notes, and practice class questions at /recordings.",
    actionHref: "/recordings",
    actionLabel: "Browse Class Recordings",
  },

  // Account & Support
  {
    id: "acc-password",
    category: "account",
    categoryLabel: "Account & Help",
    question: "How do I reset my password or recover my account?",
    answer: "Visit /account, click 'Forgot Password', and enter your registered email. You will receive an instant password reset link. If you signed up via phone number or cannot access your email, message our WhatsApp helpline for identity verification.",
    actionHref: "/account",
    actionLabel: "Account Portal",
  },
  {
    id: "acc-contact",
    category: "account",
    categoryLabel: "Account & Help",
    question: "What are the verified BrainLab customer support channels?",
    answer: "Official phone lines: +234 907 431 0204 and +234 902 111 8231. WhatsApp Desk: +234 907 431 0204. Official Email: support@brainlabacademy.com.ng. We also run active student communities on WhatsApp, Instagram, TikTok, and YouTube.",
    actionHref: "/contact",
    actionLabel: "Contact Directory",
  },
];

type CategoryFilter = "all" | "cbt" | "payments" | "ai" | "gamification" | "classes" | "account";

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ "cbt-start": true });
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);

  useEffect(() => {
    let mounted = true;
    void getFooterConfig().then((cfg) => {
      if (mounted && cfg?.whatsapp_number) {
        setWhatsappNumber(cfg.whatsapp_number);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#060e1a] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071328]/90 py-12 sm:py-16">
        {/* Ambient Gradient Glow */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl dark:bg-cyan-500/10"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          {/* Breadcrumbs */}
          <nav className="mb-4 flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span>Support</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-cyan-400">Frequently Asked Questions</span>
          </nav>

          <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-bold text-blue-900 dark:text-cyan-300 mb-3">
            Knowledge Base &amp; Help Desk
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Instant answers about CBT examinations, digital calculators, Paystack &amp; Flutterwave subscriptions, AI Tutor ethics, and learning streaks.
          </p>

          {/* Live Search Bar */}
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 text-lg" aria-hidden="true">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search questions (e.g. calculator, Paystack, access code, offline, streak)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-16 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            {[
              { id: "all", label: "All Questions" },
              { id: "cbt", label: "CBT & Exams" },
              { id: "payments", label: "Payments & Billing" },
              { id: "ai", label: "AI Tutor & Ethics" },
              { id: "gamification", label: "Streaks & Arena" },
              { id: "classes", label: "Live Classes" },
              { id: "account", label: "Account & Help" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as CategoryFilter)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 active:scale-95 ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Results Count & Query Notice */}
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
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition"
                  >
                    <button
                      onClick={() => toggleItem(faq.id)}
                      className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
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
                      <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-4">
                        <p>{faq.answer}</p>
                        {faq.actionHref && (
                          <div>
                            <Link
                              href={faq.actionHref}
                              className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-cyan-400 hover:underline"
                            >
                              <span>{faq.actionLabel || "Learn more"}</span>
                              <span aria-hidden="true">&rarr;</span>
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
                We could not find an answer matching &quot;{searchQuery}&quot;. Connect with our academic coordinators directly on WhatsApp.
              </p>
              <div className="pt-2">
                <a
                  href={getWhatsAppChatUrl(`Hello BrainLab Helpdesk, I have a question about: ${searchQuery}`, whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                >
                  <span>Ask on WhatsApp</span> &rarr;
                </a>
              </div>
            </div>
          )}

          {/* Direct Support Card */}
          <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-slate-900 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white">
                Still need help or have a custom inquiry?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Our academic desk is online Monday through Saturday to assist with access codes, syllabus revision, and payments.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={getWhatsAppChatUrl("Hello BrainLab Helpdesk, I need assistance.", whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition active:scale-95 shadow-sm"
              >
                <span>WhatsApp Helpdesk</span>
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
              >
                Contact Directory
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
