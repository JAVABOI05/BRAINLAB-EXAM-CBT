import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy & AI Ethics | BrainLab Academy",
  description:
    "Official BrainLab Academy Privacy Policy & AI Ethics Statement. Learn about our AES-256 encrypted backend, NDPA 2023 compliance, candidate privacy safeguards, zero student AI training guarantee, and anti-tamper CBT proctoring.",
};

export default function PrivacyPolicyPage() {
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
              <span className="text-slate-900 dark:text-slate-200">Legal &amp; Security</span>
              <span>/</span>
              <span className="text-blue-700 dark:text-cyan-400">Privacy Notice &amp; AI Ethics</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                NDPA 2023 Compliant &bull; AES-256 Encrypted
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-800 dark:text-cyan-300">
                🤖 Zero Student AI Model Training
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
              Data Privacy, AI Ethics &amp; Security Policy
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              BrainLab Academy is dedicated to uncompromising learner data protection, application-level cryptographic security, transparent AI ethics, and student confidentiality across all digital CBT assessments and interactive learning hubs.
            </p>
            <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Effective Date: <span className="text-slate-800 dark:text-slate-200">{lastUpdated}</span> &bull; Version 3.5 (NDPA 2023 &amp; Multi-Provider AI Architecture)
            </p>
          </div>
        </section>

        {/* Content Body */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
            
            {/* Quick Guarantees Card */}
            <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 p-6 sm:p-8">
              <h2 className="text-base sm:text-lg font-bold text-blue-950 dark:text-cyan-300 mb-2 flex items-center gap-2">
                <span>🛡️</span>
                <span>Our Core Privacy &amp; Data Security Commitments</span>
              </h2>
              <ul className="mt-3 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span><strong>Zero Student Training for AI Models:</strong> Student queries, practice responses, and tutoring interactions are strictly ephemeral. We NEVER use candidate submissions to train, fine-tune, or commercialize external artificial intelligence models.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span><strong>Application-Level AES-256-GCM Encryption:</strong> Sensitive candidate identification records, phone numbers, and session tokens are encrypted with military-grade Galois/Counter Mode authenticated ciphers before database commitment.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span><strong>Zero Client-Side Answer Leakage:</strong> Real exam answer keys and pedagogical solutions are never transmitted to candidate browsers during active testing. Scores are strictly computed server-side upon verified submission.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span><strong>Automated Cybercafé Memory Shredding:</strong> On exam completion or logout, candidate session tokens cached in browser memory are overwritten with pseudo-random noise and shredded to protect candidates on shared school or cybercafé terminals.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span><strong>PCI-DSS Level 1 Billing Privacy:</strong> BrainLab never collects, retains, or views credit/debit card numbers. All billing is processed via CBN-licensed payment gateways (Paystack and Bachs Gateway).</span>
                </li>
              </ul>
            </div>

            {/* Section 1: AI Tutor & Machine Learning Ethics */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>🤖</span>
                <span>1. BrainLab AI Tutor &amp; Learning Studio Ethics</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                BrainLab integrates advanced artificial intelligence to provide instant pedagogical feedback, step-by-step math derivations, and personalized study guidance. We hold our AI systems to strict ethical standards:
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🔒</span> Student Anonymization at Gateway
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    When you ask a question or request an AI explanation, your request is stripped of all personally identifiable information (such as your full name, phone number, email, or school affiliation) before dispatching to our intelligent inference routers.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🚫</span> No Model Training on Candidate Data
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Under enterprise API terms with our foundation model partners (including Google Gemini, Groq, Anthropic Claude, and OpenAI), student inputs are strictly processed ephemerally and are exempt from data harvesting or model training pipelines.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🎯</span> Curriculum Alignment &amp; Anti-Bias
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    AI tutor prompts are calibrated specifically to Nigerian educational curricula (NERDC, JAMB, WAEC, NECO). Mathematical derivations and grammatical rules undergo deterministic checking to safeguard against misleading hallucinations.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🛡️</span> Uniform Student Anonymity
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Learners interact uniformly with &ldquo;BrainLab AI Tutor&rdquo;. Behind the scenes, our smart router selects optimal models based on cognitive strength and uptime while keeping candidate data insulated.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Encrypted Backend Architecture */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>🔐</span>
                <span>2. Multi-Layered Cryptographic Backend</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Rather than relying solely on perimeter HTTPS, BrainLab enforces multi-tiered application-level encryption (ALE) to ensure total confidentiality even in the event of direct database export:
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🗝️</span> AES-256-GCM at Rest
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Personal telephone numbers, exam access credentials, and audit telemetry are transformed into authenticated ciphertext (<code className="font-mono text-xs">enc:v1:iv:tag:data</code>) before database insertion, rendering stored records unreadable without server environment keys.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🔍</span> HMAC-SHA256 Blind Indexing
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Candidate result lookups utilize cryptographic HMAC-SHA256 blind indices. The system verifies candidate identities without decrypting the broader database or storing raw telephone numbers in searchable indexes.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: CBT Examination Integrity & Anti-Cheat Telemetry */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>⏱️</span>
                <span>3. CBT Integrity &amp; Non-Invasive Anti-Cheat Signals</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                To guarantee academic authenticity across scholarship trials, mock examinations, and live 1v1 arenas, our CBT simulator monitors non-invasive integrity telemetry during active testing sessions:
              </p>
              <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2.5 list-disc list-inside leading-relaxed">
                <li><strong>Window Blur / Tab Switch Counting:</strong> Monitors when a candidate leaves the active examination tab. Sessions exceeding threshold warnings are flagged for academic review or auto-submitted.</li>
                <li><strong>Cryptographic Local Protection:</strong> In-progress answers are obfuscated in browser memory so malicious extensions cannot extract or modify active responses.</li>
                <li><strong>Immutable Attempt Snapshots:</strong> Once a test is initiated, question order and candidate choices are frozen in an immutable server snapshot to prevent retroactive question swapping.</li>
                <li><strong>No Invasive Surveillance:</strong> BrainLab does NOT install root certificates, record background audio, or access candidate files outside of explicitly granted classroom permissions.</li>
              </ul>
            </div>

            {/* Section 4: Information We Collect */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>📋</span>
                <span>4. Categories of Information Collected</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                We adhere strictly to the principle of <strong>Data Minimization</strong> under the Nigeria Data Protection Act (NDPA 2023):
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Candidate Examination Records
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li>Full Name and Contact Number (encrypted at rest)</li>
                    <li>Chosen 4-Subject Combination (e.g. English, Math, Physics, Chemistry)</li>
                    <li>Single-use session authorization PINs</li>
                    <li>Time spent per question, pace diagnostics, and aggregate percentile rank</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Public Display Safeguards
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li><strong>Masked Honor Rolls:</strong> Public leaderboards display masked identifiers (e.g. <code className="font-mono text-xs">Chukwudi O. &bull; Lagos</code>) rather than telephone numbers or full emails.</li>
                    <li><strong>Digitally Signed QR Slips:</strong> Result slips include an HMAC-SHA256 signature to verify authenticity against forgery.</li>
                    <li><strong>Zero Ad Brokering:</strong> Candidate data is never rented, bartered, or sold to third-party advertising brokers.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 5: Nigeria Data Protection Act (NDPA 2023) Candidate Rights */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>⚖️</span>
                <span>5. Candidate Rights Under NDPA 2023</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Every candidate, parent, and institutional sponsor enjoys statutory rights regarding their personal academic information:
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3 text-xs sm:text-sm">
                <p><strong>&bull; Right to Access:</strong> Retrieve historical scorecards, topic diagnostics, and AI tutor transcripts at any time via your verified student portal.</p>
                <p><strong>&bull; Right to Rectification:</strong> Request correction of inaccurate names, school affiliations, or subject combinations.</p>
                <p><strong>&bull; Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> Request full deletion of personal identification and active test telemetry from our databases upon program completion.</p>
                <p><strong>&bull; Right to Data Portability:</strong> Export verified examination performance summaries in standardized digital format.</p>
                <p><strong>&bull; Right to Contest Automated Decisions:</strong> Request human academic review of any automated anti-cheat flag or scoring discrepancy.</p>
              </div>
            </div>

            {/* Section 6: Cookies, Local Storage & Cybercafé Protection */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>🍪</span>
                <span>6. Cookies, Local Storage &amp; Cybercafé Terminal Safety</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                We use strictly essential session cookies and local storage tokens to maintain your authentication state and protect active examination progress in case of unexpected network disconnects.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                To protect candidates using shared cybercafé or school library computers, our memory shredder actively zeroes out session credentials upon clicking &ldquo;Submit Exam&rdquo; or &ldquo;Sign Out&rdquo;. We do not use intrusive third-party cross-site advertising cookies.
              </p>
            </div>

            {/* Section 7: Official DPO & Support Desk */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🛡️</span>
                <span>Contact BrainLab Data Protection Officer (DPO)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                If you have inquiries regarding cryptographic backend measures, student data deletion requests, or institutional compliance, reach out to our dedicated privacy desk:
              </p>
              
              <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs">
                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Official DPO Email</p>
                  <a href="mailto:dpo@brainlabacademy.com.ng" className="text-blue-600 dark:text-cyan-400 hover:underline">
                    dpo@brainlabacademy.com.ng
                  </a>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <p className="font-bold text-slate-800 dark:text-slate-200">General CBT Support Desk</p>
                  <a href="mailto:support@brainlabacademy.com.ng" className="text-blue-600 dark:text-cyan-400 hover:underline">
                    support@brainlabacademy.com.ng
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm">
                <a
                  href="https://wa.me/2349074310204?text=Hello%20BrainLab%20DPO,%20I%20have%20an%20inquiry%20regarding%20data%20privacy%20and%20encryption."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-bold text-white transition active:scale-95 shadow-sm"
                >
                  <span>💬</span> Official WhatsApp DPO Desk (+234 907 431 0204)
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
                >
                  <span>📞</span> Help &amp; Support Portal
                </Link>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
                >
                  <span>📄</span> View Terms of Use &rarr;
                </Link>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
