import type { Metadata } from "next";
import Link from "next/link";
import BrandHeader from "../components/BrandHeader";
import BrandFooter from "../components/BrandFooter";

export const metadata: Metadata = {
  title: "Terms of Use | BrainLab Academy",
  description:
    "Official BrainLab Academy Terms of Use. Guidelines governing CBT examination participation, subscription billing, anti-cheat integrity, and intellectual property.",
};

export default function TermsOfUsePage() {
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
              <span className="text-blue-700 dark:text-cyan-400">Terms of Use</span>
            </nav>

            <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-cyan-300 mb-3">
              Platform Rules &amp; Student Agreement
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
              BrainLab Terms of Use
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              The binding agreement governing your access to the BrainLab CBT examination portal, Learning Hub, subscriptions, and AI study resources.
            </p>
            <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Last Revised: <span className="text-slate-800 dark:text-slate-200">{lastUpdated}</span> · Version 2.1
            </p>
          </div>
        </section>

        {/* Content Body */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
            {/* Essential Rules Card */}
            <div className="rounded-3xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 p-6 sm:p-8">
              <h2 className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-300 mb-2 flex items-center gap-2">
                <span>⚖️</span>
                <span>Key Highlights for Candidates &amp; Learners</span>
              </h2>
              <ul className="mt-3 space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-700 dark:text-amber-400 font-bold">•</span>
                  <span><strong>Independent Prep Portal:</strong> BrainLab is an independent educational academy. We are not an arm of JAMB, WAEC, or NECO. Simulation scores are for academic preparation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-700 dark:text-amber-400 font-bold">•</span>
                  <span><strong>Zero Tolerance for Exam Tampering:</strong> Attempting to scrape questions, inject scripts, bypass anti-cheat tab warnings, or exploit answer endpoints results in permanent ban and score nullification.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-700 dark:text-amber-400 font-bold">•</span>
                  <span><strong>Account &amp; Access Security:</strong> Access codes and student logins are personal. Sharing codes publicly or redistributing proprietary explanations violates our intellectual property rights.</span>
                </li>
              </ul>
            </div>

            {/* Section 1: Agreement & Eligibility */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                1. Acceptance of Terms &amp; Eligibility
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                By accessing or registering on BrainLab Academy (including the website, CBT portal, Live Classroom, Challenge Arena, or AI Tutor), you agree to comply with and be bound by these Terms of Use and our Privacy Notice. If you are under 18 years of age, you confirm that you have obtained permission from a parent or legal guardian to participate in our learning programs.
              </p>
            </div>

            {/* Section 2: CBT Examination Integrity & Anti-Cheat */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                2. Examination Integrity &amp; Academic Honesty
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                The BrainLab CBT engine is engineered to accurately benchmark candidate readiness under strict examination standards. You expressly agree to adhere to the following testing regulations:
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Prohibited Activities:</h3>
                <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                  <li><strong>Tab Switching &amp; Window Navigation:</strong> Navigating away from the active examination screen during a live test triggers anti-cheat telemetry. Continued violations will result in automatic exam submission.</li>
                  <li><strong>Reverse Engineering &amp; Answer Tampering:</strong> You may not inspect network traffic or execute automated browser bots to extract answer keys prior to official result release.</li>
                  <li><strong>False Identification:</strong> Providing fraudulent phone numbers or impersonating another candidate to artificially distort leaderboard scores is strictly prohibited.</li>
                  <li><strong>Multiple Simultaneous Sessions:</strong> Only one active examination attempt is permitted per candidate token at any given time.</li>
                </ul>
              </div>
            </div>

            {/* Section 3: Subscriptions, Pricing & Payments */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                3. Subscriptions, Payments &amp; Access Tiers
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Certain features (such as unlimited question banks, full mock exams, live tutor masterclasses, and AI revision planners) require an active paid subscription or authorized access code.
              </p>
              <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                <li><strong>Payment Providers:</strong> Fees are paid in Nigerian Naira (NGN) via certified payment partners: Paystack (Cards, USSD, Bank Transfer) or Bachs Payment Gateway.</li>
                <li><strong>Access Code Redemption:</strong> Physical or institutional access codes grant specific entitlements and cannot be exchanged for cash or transferred once activated.</li>
                <li><strong>Refund Policy:</strong> Because digital exam questions and study content are made accessible immediately upon payment, fees are non-refundable except in cases of verified duplicate billing or technical unavailability confirmed by our support desk.</li>
              </ul>
            </div>

            {/* Section 4: Intellectual Property */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                4. Intellectual Property Rights
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                All platform materials—including curated past questions, detailed pedagogical explanations, lesson notes, audio lectures, software interfaces, and logos—are the exclusive intellectual property of BrainLab Academy or its licensed partners.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Learners receive a personal, non-exclusive, non-transferable license to view and use these materials solely for their own individual exam preparation. You may not republish, broadcast, sell, or commercially redistribute BrainLab content without prior written permission.
              </p>
            </div>

            {/* Section 5: Educational Disclaimer */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                5. Educational Disclaimer &amp; Performance
              </h2>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  BrainLab Academy is an academic support and tutorial organization. We are not officially connected to, endorsed by, or affiliated with the Joint Admissions and Matriculation Board (JAMB), the West African Examinations Council (WAEC), or the National Examinations Council (NECO).
                </p>
                <p>
                  While our questions and timed conditions closely simulate real examination environments, scores earned on BrainLab assessments represent practice benchmarks and do not guarantee equivalent outcomes in official external examinations.
                </p>
              </div>
            </div>

            {/* Section 6: Account Termination */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                6. Termination of Access
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                BrainLab reserves the right to immediately suspend or terminate any candidate account or examination token that violates these Terms, exhibits disruptive conduct in live classroom sessions, or engages in unauthorized tampering with platform services.
              </p>
            </div>

            {/* Section 7: Support & Contact */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                7. Questions &amp; Inquiries
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                For questions regarding these terms, subscription verification, or candidate rights, please contact our support desk:
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs sm:text-sm">
                <a
                  href="https://wa.me/2349074310204"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-bold text-white transition active:scale-95 shadow-sm"
                >
                  <span>💬</span> Contact Support on WhatsApp
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition active:scale-95"
                >
                  <span>📞</span> Official Helpdesk Lines
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
