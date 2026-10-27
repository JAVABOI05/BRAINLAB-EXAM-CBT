import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & Data Protection Policy | BrainLab Academy",
  description:
    "Official BrainLab Academy Privacy & Data Security Policy. Learn about our AES-256 encrypted backend, NDPR 2023 compliance, candidate privacy safeguards, and anti-tamper CBT integrity.",
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
              <span className="text-blue-700 dark:text-cyan-400">Privacy &amp; Encryption Policy</span>
            </nav>

            <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-3">
              🔒 End-to-End Encrypted Backend &amp; NDPR Compliant
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
              Data Privacy &amp; Cryptographic Security
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              BrainLab Academy employs enterprise-grade AES-256 application-level database encryption, cryptographic memory shredding, and strict candidate data minimization standards to protect your academic records.
            </p>
            <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Effective Date: <span className="text-slate-800 dark:text-slate-200">{lastUpdated}</span> · Version 3.0 (Encrypted Backend Architecture)
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
                <span>Our Core Privacy &amp; Security Guarantees</span>
              </h2>
              <ul className="mt-3 space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span><strong>Application-Level AES-256-GCM Backend Encryption:</strong> All sensitive candidate identification records, contact numbers, and examination session tokens are cryptographically encrypted at rest with military-grade Galois/Counter Mode authenticated ciphers before database commitment.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span><strong>Zero Client Answer Key Exposure:</strong> Correct answer options and worked pedagogical solutions are never sent to candidate browsers during active testing. Answer scoring is strictly calculated server-side upon verified submission.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span><strong>Automated Local Storage Memory Shredding:</strong> On exam submission or timeout, candidate responses cached in browser memory are overwritten with pseudo-random noise and purged to prevent residue on public cybercafé or school terminals.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span><strong>PCI-DSS Certified Payment Processing:</strong> BrainLab never handles, views, or retains credit/debit card numbers. All billing is conducted via CBN-licensed payment partners (Paystack and Bachs Gateway).</span>
                </li>
              </ul>
            </div>

            {/* Section 1: Backend Architecture & Cryptography */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>🔐</span>
                <span>1. Encrypted Backend Architecture</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Unlike platforms relying solely on perimeter SSL, BrainLab implements multi-layered Application-Level Encryption (ALE) to ensure total confidentiality even in the event of direct database export:
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🗝️</span> AES-256-GCM at Rest
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Personal telephone numbers, exam access credentials, and audit telemetry are transformed into authenticated ciphertext (<code className="font-mono text-xs">enc:v1:iv:tag:data</code>) before insertion into Supabase tables, rendering stored rows unreadable without the runtime environment secret.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🔍</span> Blind Index Searching (HMAC-SHA256)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Candidate result lookups are powered by cryptographic HMAC-SHA256 blind indices. The system can match an authorized candidate query without decrypting the entire database or indexing raw phone numbers.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Examination Integrity & Anti-Cheat Signals */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>⏱️</span>
                <span>2. CBT Integrity &amp; Proctoring Telemetry</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                To guarantee academic authenticity across scholarship trials and mock examinations, our CBT simulator monitors non-invasive integrity telemetry during active testing sessions:
              </p>
              <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                <li><strong>Window Blur / Tab Switch Counting:</strong> Detects when a candidate departs the examination browser tab. Sessions with excessive tab switches are flagged for institutional review or auto-submitted.</li>
                <li><strong>Cryptographic Local Protection:</strong> In-progress answers are obfuscated in browser memory so malicious browser extensions cannot scrape or alter active responses.</li>
                <li><strong>Immutable Attempt Snapshots:</strong> Once a test is initiated, question order and candidate choices are frozen in an immutable server snapshot to prevent retroactive question swapping.</li>
              </ul>
            </div>

            {/* Section 3: Information We Collect */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>📋</span>
                <span>3. Categories of Information Collected</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                We adhere strictly to the principle of <strong>Data Minimization</strong>—collecting only what is necessary for testing, scoring, and academic revision:
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Candidate Examination Records
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li>Full Name and Contact Number (encrypted at rest)</li>
                    <li>Chosen 4-Subject Combination (e.g. English, Math, Physics, Chemistry)</li>
                    <li>Session authorization PINs</li>
                    <li>Time spent per section and aggregate percentile rank</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Public Display Safeguards
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li><strong>Masked Honor Rolls:</strong> Public leaderboards display masked identifiers (e.g. <code className="font-mono text-xs">Chukwudi O.</code>) rather than contact information.</li>
                    <li><strong>Digitally Signed QR Slips:</strong> Result slips include an HMAC-SHA256 signature to verify authenticity against forgery.</li>
                    <li><strong>No Marketing Brokering:</strong> Candidate data is never sold or rented to third-party ad brokers.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 4: Nigeria Data Protection Act (NDPA 2023) Compliance */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>⚖️</span>
                <span>4. Compliance with NDPA 2023 &amp; Candidate Rights</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Under the Nigeria Data Protection Act (NDPA 2023) and international privacy frameworks, every candidate and legal guardian possesses actionable rights:
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3 text-xs sm:text-sm">
                <p><strong>• Right to Access:</strong> Retrieve full historical scorecards and diagnostic reports at any time via the verified result lookup system.</p>
                <p><strong>• Right to Rectification:</strong> Request correction of inaccurate names, school affiliations, or subject combinations.</p>
                <p><strong>• Right to Erasure / Right to be Forgotten:</strong> Request complete deletion of personal identification and active test telemetry from our databases upon program completion.</p>
                <p><strong>• Right to Data Portability:</strong> Export verified examination performance summaries in standardized digital format.</p>
              </div>
            </div>

            {/* Section 5: Contact the Data Protection Officer */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🛡️</span>
                <span>Contact BrainLab Data Protection Officer (DPO)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                If you have inquiries regarding backend cryptographic measures, data deletion requests, or institutional compliance, contact our dedicated privacy desk:
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs sm:text-sm">
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
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition active:scale-95"
                >
                  <span>📞</span> Help &amp; Support Portal
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
