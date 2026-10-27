import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use & Student Agreement | BrainLab Academy",
  description:
    "Official BrainLab Academy Terms of Use. Guidelines governing CBT examination participation, AI tutor acceptable use, subscription billing, anti-cheat integrity, and intellectual property.",
};

export default function TermsOfUsePage() {
  const lastUpdated = "October 27, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
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

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-cyan-300">
                Platform Rules &amp; Candidate Agreement
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                ⚖️ NDPA 2023 &amp; Fair Testing Standard
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
              BrainLab Terms of Use
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              The binding legal agreement governing candidate access to the BrainLab CBT examination engine, Live Masterclasses, AI Study Studio, 1v1 Arena, and subscription learning services.
            </p>
            <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Last Revised: <span className="text-slate-800 dark:text-slate-200">{lastUpdated}</span> &bull; Version 3.2 (AI Fair Use &amp; Digital Examination Guidelines)
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
                <span>Key Highlights for Candidates, Parents &amp; Schools</span>
              </h2>
              <ul className="mt-3 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-700 dark:text-amber-400 font-bold shrink-0 mt-0.5">&bull;</span>
                  <span><strong>Independent Prep Portal:</strong> BrainLab is an independent academic preparation academy. We are not officially affiliated with, endorsed by, or an arm of JAMB, WAEC, NECO, or NABTEB. Simulation scores are for academic preparation and diagnostic benchmarking.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-700 dark:text-amber-400 font-bold shrink-0 mt-0.5">&bull;</span>
                  <span><strong>Zero Tolerance for Exam Tampering:</strong> Attempting to scrape questions, inject scripts, bypass anti-cheat tab warnings, or exploit answer endpoints results in immediate score nullification and access token cancellation.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-700 dark:text-amber-400 font-bold shrink-0 mt-0.5">&bull;</span>
                  <span><strong>BrainLab AI Tutor Acceptable Use:</strong> AI explanations are provided exclusively for personalized study guidance. Automated query bombing, prompt-injection attacks, or attempting to extract proprietary system prompts is strictly forbidden.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-700 dark:text-amber-400 font-bold shrink-0 mt-0.5">&bull;</span>
                  <span><strong>Personal Access Licenses:</strong> Access codes and student accounts are strictly for single-user candidate study. Sharing codes publicly or redistributing proprietary explanations violates our intellectual property rights.</span>
                </li>
              </ul>
            </div>

            {/* Section 1: Agreement & Eligibility */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>1.</span> Acceptance of Terms &amp; Eligibility
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                By creating an account, entering an examination access code, or using BrainLab Academy (including the CBT simulator, Live Masterclass Stage, Challenge Arena, or AI Learning Studio), you agree to comply with and be bound by these Terms of Use and our <Link href="/privacy" className="text-blue-600 dark:text-cyan-400 font-bold underline">Privacy Policy</Link>.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Candidates under 18 years of age affirm that they have obtained permission from a parent, legal guardian, or school administrator to participate in our digital learning programs and assessments.
              </p>
            </div>

            {/* Section 2: CBT Examination Integrity & Anti-Cheat Regulations */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>2.</span> CBT Examination Integrity &amp; Proctoring Rules
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                The BrainLab CBT engine is engineered to accurately benchmark candidate readiness under strict examination standards. You expressly agree to adhere to the following testing regulations:
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Strictly Prohibited Testing Activities:</h3>
                <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                  <li><strong>Tab Switching &amp; Window Navigation:</strong> Navigating away from the active examination browser tab triggers anti-cheat telemetry. Repeated violations will result in automatic examination submission and disciplinary flags.</li>
                  <li><strong>Reverse Engineering &amp; Client Answer Scraping:</strong> You may not inspect network traffic, use developer tools, or deploy automated bots to extract correct answer keys prior to official test completion.</li>
                  <li><strong>Identity Spoofing:</strong> Supplying false candidate details or having a surrogate sit for an assessment to artificially distort leaderboard scores is strictly prohibited.</li>
                  <li><strong>Simultaneous Active Attempts:</strong> Only one active examination attempt is permitted per candidate PIN at any given time.</li>
                </ul>
              </div>
            </div>

            {/* Section 3: BrainLab AI Tutor Fair Use Policy */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>3.</span> BrainLab AI Tutor &amp; Study Studio Fair Use Policy
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                BrainLab provides AI-assisted tutoring tools (powered by multi-model routing) to help learners understand difficult concepts, unpack syllabus topics, and verify mathematical derivations:
              </p>
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <span>✅</span> Permitted Academic Use
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li>Asking for step-by-step problem derivations</li>
                    <li>Syllabus concept explanations and revision summaries</li>
                    <li>Grammar and comprehension analysis for English</li>
                    <li>Exam timing and revision planning advice</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                    <span>❌</span> Prohibited AI Misuse
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li>Automated scraping or prompt-bombing APIs</li>
                    <li>Jailbreak attacks attempting to expose system prompts</li>
                    <li>Generating non-educational or illicit content</li>
                    <li>Commercial redistribution of AI study outputs</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                <em>Notice: AI-generated explanations are pedagogical aids designed to enhance comprehension. While verified against Nigerian curricula, students should always cross-reference official textbooks and recommended reading lists.</em>
              </p>
            </div>

            {/* Section 4: Subscriptions, Payments & Access Codes */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>4.</span> Subscriptions, Access Codes &amp; Refund Policy
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Premium features (including unlimited CBT mocks, downloadable formula sheets, live masterclass stages, and AI tutor sessions) require an active paid subscription or authorized access code:
              </p>
              <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2.5 list-disc list-inside leading-relaxed">
                <li><strong>Transparent Billing:</strong> All prices are displayed in Nigerian Naira (NGN). Payments are processed securely via CBN-certified processors: Paystack or Bachs Gateway.</li>
                <li><strong>Access Code Redemption:</strong> Codes purchased via physical cards, authorized tutorial centers, or schools are single-use licenses and non-transferable once activated.</li>
                <li><strong>Digital Content Refund Policy:</strong> Because full examination banks and revision materials are made accessible immediately upon payment confirmation, fees are non-refundable except in confirmed cases of duplicate billing or technical platform unavailability verified by our support desk within 48 hours. See our <Link href="/account/subscription/refund" className="text-blue-600 dark:text-cyan-400 font-bold underline">Official Refund Policy</Link>.</li>
              </ul>
            </div>

            {/* Section 5: Intellectual Property */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>5.</span> Intellectual Property Rights
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                All platform assets—including curated past questions, detailed pedagogical solutions, video masterclasses, lesson audio, software architectures, algorithms, and logos—are the exclusive intellectual property of BrainLab Academy.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Learners are granted a personal, revocable, non-commercial license to use these materials solely for their own individual academic preparation. You may not broadcast, scrape, photocopy, re-sell, or commercially republish BrainLab materials without written authorization.
              </p>
            </div>

            {/* Section 6: Live Classroom & Community Conduct */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>6.</span> Live Masterclass &amp; Community Etiquette
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                BrainLab maintains a supportive, respectful learning community. In live masterclasses, discussion boards, and 1v1 challenge arenas, participants must adhere to our zero-tolerance policy against:
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <p>&bull; Cyberbullying, hate speech, vulgarity, or disruptive trolling</p>
                <p>&bull; Soliciting or advertising unofficial &ldquo;exam runz&rdquo;, fraudulent question leaks, or commercial services</p>
                <p>&bull; Sharing inappropriate media, links, or unsolicited direct messages to fellow students</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Violators will be instantly ejected from live stages and permanently barred without refund.
              </p>
            </div>

            {/* Section 7: Educational Disclaimer */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>7.</span> Official Educational Disclaimer
              </h2>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  BrainLab Academy is an academic tutorial and preparatory platform. We are not officially connected to, endorsed by, or affiliated with the Joint Admissions and Matriculation Board (JAMB), the West African Examinations Council (WAEC), the National Examinations Council (NECO), or NABTEB.
                </p>
                <p>
                  While our question banks, timer algorithms, and syllabus coverage closely mirror official examination conditions, scores earned on BrainLab mocks represent preparation benchmarks and do not guarantee equivalent outcomes on official national examinations.
                </p>
              </div>
            </div>

            {/* Section 8: Support Desk & Contact Inquiries */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>💬</span>
                <span>Questions, Disputes &amp; Official Inquiries</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                For inquiries regarding these terms, institutional partnerships, or subscription billing disputes, our academic support team is ready to assist you:
              </p>

              <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs">
                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Official Support Email</p>
                  <a href="mailto:support@brainlabacademy.com.ng" className="text-blue-600 dark:text-cyan-400 hover:underline">
                    support@brainlabacademy.com.ng
                  </a>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Refund &amp; Billing Inquiries</p>
                  <Link href="/account/subscription/refund" className="text-blue-600 dark:text-cyan-400 hover:underline">
                    Visit Refund Desk Portal &rarr;
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm">
                <a
                  href="https://wa.me/2349074310204?text=Hello%20BrainLab%20Support,%20I%20have%20an%20inquiry%20regarding%20Terms%20of%20Use."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-bold text-white transition active:scale-95 shadow-sm"
                >
                  <span>💬</span> Contact Support on WhatsApp (+234 907 431 0204)
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
                >
                  <span>📞</span> Helpdesk Contact
                </Link>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
                >
                  <span>🔒</span> View Privacy Notice &rarr;
                </Link>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
