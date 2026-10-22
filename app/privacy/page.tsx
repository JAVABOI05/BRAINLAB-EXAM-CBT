import type { Metadata } from "next";
import Link from "next/link";
import BrandHeader from "../components/BrandHeader";
import BrandFooter from "../components/BrandFooter";

export const metadata: Metadata = {
  title: "Privacy Notice | BrainLab Academy",
  description:
    "Official BrainLab Academy Privacy Policy. Learn how candidate examination data, learner profiles, payment records, and study progress are protected.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 22, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <BrandHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071328]/80 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <nav className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-200">Legal &amp; Policies</span>
              <span>/</span>
              <span className="text-blue-700 dark:text-cyan-400">Privacy Notice</span>
            </nav>

            <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-cyan-300 mb-3">
              Data Protection &amp; Trust
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
              BrainLab Privacy Notice
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              How BrainLab Academy collects, protects, verifies, and respects your candidate examination data, learning progress, and personal privacy.
            </p>
            <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Effective Date: <span className="text-slate-800 dark:text-slate-200">{lastUpdated}</span> · Version 2.1
            </p>
          </div>
        </section>

        {/* Content Body */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
            {/* Quick Summary Card */}
            <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 p-6 sm:p-8">
              <h2 className="text-base sm:text-lg font-bold text-blue-950 dark:text-cyan-300 mb-2 flex items-center gap-2">
                <span>🛡️</span>
                <span>Our Core Privacy Commitments</span>
              </h2>
              <ul className="mt-3 space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span><strong>Zero Cardholder Storage:</strong> We never process, store, or view your debit/credit card numbers or bank account PINs. All payments are handled directly by PCI-DSS certified gateways (Paystack and Bachs).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span><strong>Exam Integrity with Respect:</strong> Our anti-cheat algorithms monitor tab switching only during an active examination session to maintain academic fairness; we never record your background applications or personal files.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span><strong>Protected Answer Keys:</strong> Examination solution keys and detailed explanations are cryptographically protected on the server until officially released by administrators.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span><strong>No Third-Party Advertising Sale:</strong> We never sell learner emails, phone numbers, or academic test scores to third-party marketing brokers.</span>
                </li>
              </ul>
            </div>

            {/* Section 1: Information We Collect */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                1. Information We Collect
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                BrainLab Academy collects information necessary to deliver authentic CBT mock examinations, personalized study plans, live tutorials, and learning gamification:
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📝</span> Candidate Examination Data
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed list-disc list-inside">
                    <li>Full Name and Phone Number</li>
                    <li>Chosen Elective Subjects (e.g. Mathematics, Biology)</li>
                    <li>Access code tokens used for session authorization</li>
                    <li>Timestamped answers and flagged question bookmarks</li>
                    <li>Time spent per question and aggregate scores</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>👤</span> Registered Account Profiles
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed list-disc list-inside">
                    <li>Verified email address and profile name</li>
                    <li>Learning streak records and last active dates</li>
                    <li>XP progression levels, earned badges, and certificates</li>
                    <li>Revision checklist goals and spaced-repetition bookmarks</li>
                    <li>Direct tutor messages and study forum participations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 2: Payment Processing Security */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                2. Payments &amp; Financial Security
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                BrainLab Academy partners with trusted, CBN-licensed and international payment processors to handle subscriptions and course access fees:
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Supported Gateways:</span>
                  <span className="rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    💳 Paystack (Cards, Bank Transfer, USSD)
                  </span>
                  <span className="rounded-lg bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 px-2.5 py-1 text-xs font-bold text-blue-800 dark:text-blue-300">
                    ⚡ Bachs Gateway (Instant Checkout)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  When you initiate a payment, your transaction is processed in an encrypted checkout window provided directly by Paystack or Bachs. BrainLab only receives a cryptographically signed webhook notification containing the transaction reference, status (<code className="font-mono text-xs">success</code>), currency, and amount. We do not store raw card credentials on our servers.
                </p>
              </div>
            </div>

            {/* Section 3: Exam Anti-Cheat & Proctoring Signals */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                3. Examination Integrity &amp; Anti-Cheat Signals
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                To guarantee fair rankings, scholarship assessments, and authentic mock examination conditions, our browser-based CBT engine records non-invasive integrity telemetry during active tests:
              </p>
              <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                <li><strong>Tab-Switching / Window Blur:</strong> Detecting when a candidate navigates away from the examination window during an active test. Excessive tab switching triggers automatic submission warnings.</li>
                <li><strong>Network Sync &amp; Local Recovery:</strong> Answers are temporarily cached in browser session storage (<code className="font-mono text-xs">localStorage</code>) to protect your attempt against sudden device reboot or network loss, and are synchronized securely to Supabase.</li>
                <li><strong>Server-Side Grading:</strong> Correct answer keys and explanations are held on the database server until after you submit your test, ensuring answer keys cannot be intercepted via browser developer inspection.</li>
              </ul>
            </div>

            {/* Section 4: Cookies & Local Storage */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                4. Browser Storage &amp; Cookies
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                BrainLab Academy uses essential cookies and local browser storage strictly for functional operations:
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs sm:text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white">Session Authentication</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs">Supabase JWT token to keep you safely logged into your student dashboard.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white">Theme &amp; Preferences</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs"><code className="font-mono">brainlab-appearance</code> stores daylight/dark mode preferences across visits.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white">Daily Streak Reminders</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs"><code className="font-mono">brainlab_streak_reminder</code> preserves your preferred reminder time.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Learner Rights */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                5. Your Privacy Rights
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Under the Nigeria Data Protection Act (NDPA) and global privacy standards, learners and parents/guardians possess full rights over their personal data:
              </p>
              <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                <li><strong>Right of Access &amp; Scorecard Retrieval:</strong> You can retrieve past mock test scores anytime via the official result lookup portal.</li>
                <li><strong>Right to Rectification:</strong> If your name or profile details are inaccurate, you can update them in your profile settings or contact support.</li>
                <li><strong>Right to Erasure / Account Deletion:</strong> You may request complete erasure of your profile and stored examination history by submitting an inquiry to our support desk.</li>
              </ul>
            </div>

            {/* Section 6: Contact & Helpdesk */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                6. Contact the Data Protection Officer (DPO)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                For questions regarding this privacy policy, data access requests, or examination record questions, please reach our dedicated support desk:
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs sm:text-sm">
                <a
                  href="https://wa.me/2349074310204"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-bold text-white transition active:scale-95 shadow-sm"
                >
                  <span>💬</span> WhatsApp DPO Helpdesk
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition active:scale-95"
                >
                  <span>📞</span> Official Contact Directory
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BrandFooter />
    </div>
  );
}
