"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "../lib/toast";

const SECTIONS = [
  { id: "core-commitments", label: "Core Security Commitments", icon: "🛡️" },
  { id: "ai-ethics", label: "AI Tutor & Inference Ethics", icon: "🤖" },
  { id: "cryptographic-backend", label: "Cryptographic Architecture", icon: "🔐" },
  { id: "cbt-integrity", label: "CBT Anti-Cheat & Telemetry", icon: "⏱️" },
  { id: "data-collected", label: "Data Collected & Minimization", icon: "📋" },
  { id: "candidate-rights", label: "Your Rights (NDPA 2023)", icon: "⚖️" },
  { id: "terminal-safety", label: "Cybercafé Terminal Safety", icon: "🧹" },
  { id: "dpo-contact", label: "DPO & Compliance Inquiries", icon: "💬" },
];

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 27, 2026";
  const [activeSection, setActiveSection] = useState("core-commitments");
  const [searchQuery, setSearchQuery] = useState("");

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleCopyLink = (sectionId: string) => {
    const url = `${window.location.origin}/privacy#${sectionId}`;
    void navigator.clipboard.writeText(url);
    toast.success("Section link copied to clipboard!");
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060d19] text-slate-900 dark:text-slate-100 transition-colors selection:bg-indigo-500 selection:text-white">
      <main className="flex-1">
        {/* Modern Executive Hero */}
        <section className="relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800 bg-linear-to-b from-white via-slate-50/50 to-slate-100/30 dark:from-[#0b172a] dark:via-[#071120] dark:to-[#050a14] py-14 sm:py-20">
          {/* Ambient Lighting Gradients */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-linear-to-tr from-indigo-500/15 via-sky-400/10 to-emerald-400/10 blur-3xl dark:from-indigo-600/20 dark:via-cyan-500/15 dark:to-emerald-500/15"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb Navigation */}
            <nav className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/" className="hover:text-indigo-600 dark:hover:text-cyan-400 transition">
                Home
              </Link>
              <span className="opacity-40">/</span>
              <span className="text-slate-700 dark:text-slate-300">Legal &amp; Trust Center</span>
              <span className="opacity-40">/</span>
              <span className="text-indigo-600 dark:text-cyan-400 font-bold">Privacy Notice &amp; AI Ethics</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2.5 mb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                NDPA 2023 Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 shadow-2xs">
                AES-256-GCM Encrypted
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-sky-800 dark:text-cyan-300 shadow-2xs">
                Zero Student Model Training
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.1]">
                Data Privacy, AI Ethics &amp; <span className="bg-linear-to-r from-indigo-600 via-sky-600 to-emerald-600 bg-clip-text text-transparent">Cryptographic Security</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                BrainLab Academy enforces application-level cryptographic security, ephemeral AI inference isolation, and strict student confidentiality across all digital CBT assessments, live classrooms, and institutional mock examinations.
              </p>
            </div>

            {/* Quick Actions & Meta Bar */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 dark:border-slate-800/80 pt-6 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Effective: <strong className="text-slate-800 dark:text-slate-200">{lastUpdated}</strong>
                </span>
                <span className="opacity-40">&bull;</span>
                <span>
                  Version: <strong className="text-slate-800 dark:text-slate-200">v3.5 (NDPA 2023 Architecture)</strong>
                </span>
                <span className="opacity-40">&bull;</span>
                <span>
                  Audited by: <strong className="text-slate-800 dark:text-slate-200">BrainLab Information Security Desk</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Document</span>
                </button>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 font-bold text-white shadow-2xs transition active:scale-95"
                >
                  <span>Terms of Use &rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Layout with Sticky Sidebar */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
            
            {/* Sticky Table of Contents (Desktop) */}
            <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Document Sections
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-cyan-400">8 Chapters</span>
                </div>

                <nav className="mt-4 space-y-1">
                  {SECTIONS.map((sec) => {
                    const isActive = activeSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollTo(sec.id)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-left transition ${
                          isActive
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-cyan-300 font-extrabold shadow-2xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span>{sec.icon}</span>
                          <span className="truncate">{sec.label}</span>
                        </span>
                        {isActive && <span className="text-indigo-600 dark:text-cyan-400 text-sm">&bull;</span>}
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-3.5 text-xs space-y-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Need specific compliance assistance?</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Our institutional compliance desk supports schools, scholarship bodies, and parent inquiries.
                    </p>
                    <a
                      href="mailto:dpo@brainlabacademy.com.ng"
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-cyan-400 hover:underline text-[11px]"
                    >
                      <span>Email Data Protection Officer &rarr;</span>
                    </a>
                  </div>
                </div>
              </div>
            </aside>

            {/* Document Content Column */}
            <div className="lg:col-span-8 space-y-12">
              
              {/* Trust & Architectural Pillar Cards */}
              <div id="core-commitments" className="scroll-mt-24 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Chapter 1: Security Commitments
                  </span>
                  <button
                    onClick={() => handleCopyLink("core-commitments")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Copy direct link"
                  >
                    Copy link
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                  Core Privacy &amp; Data Security Commitments
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  BrainLab Academy is built on zero-knowledge candidate isolation principles. We treat student performance records as confidential assets protected under federal Nigerian privacy statutes.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  {/* Card 1 */}
                  <div className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-6 shadow-sm hover:shadow-md transition">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-lg mb-4 text-indigo-600 dark:text-indigo-400">
                      🚫
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Zero Student Model Training</h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Your tutoring prompts, math solutions, and essay submissions are strictly ephemeral. We <strong>never</strong> use student queries to train, fine-tune, or commercialize third-party AI models.
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-6 shadow-sm hover:shadow-md transition">
                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 flex items-center justify-center text-lg mb-4 text-emerald-600 dark:text-emerald-400">
                      🔐
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Application-Level AES-256-GCM</h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Candidate telephone numbers and access tokens are transformed into authenticated ciphertext prior to database storage, rendering data unreadable even in raw database snapshots.
                    </p>
                  </div>

                  {/* Card 3 */}
                  <div className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-6 shadow-sm hover:shadow-md transition">
                    <div className="h-10 w-10 rounded-2xl bg-sky-50 dark:bg-sky-950/80 flex items-center justify-center text-lg mb-4 text-sky-600 dark:text-cyan-400">
                      ⚡
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Zero Client Answer Leakage</h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Official examination answer keys and step-by-step solutions are never sent to candidate browsers during active testing. Scores are strictly computed server-side upon verified submission.
                    </p>
                  </div>

                  {/* Card 4 */}
                  <div className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-6 shadow-sm hover:shadow-md transition">
                    <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 flex items-center justify-center text-lg mb-4 text-amber-600 dark:text-amber-400">
                      🧹
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Cybercafé Memory Shredder</h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      On test completion or sign-out, session tokens in browser RAM and local cache are overwritten with pseudo-random cryptographic noise to protect students on shared school computers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: AI Tutor Ethics */}
              <div id="ai-ethics" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300">
                    Chapter 2: Artificial Intelligence
                  </span>
                  <button
                    onClick={() => handleCopyLink("ai-ethics")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Copy link
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
                  
                  <span>BrainLab AI Tutor &amp; Learning Studio Ethics</span>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  BrainLab integrates autonomous multi-model intelligence to provide instant pedagogical coaching, syllabus alignment, and step-by-step math derivations. We adhere to clear ethical guardrails:
                </p>

                <div className="space-y-3 pt-2">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                       Student Anonymization at Gateway
                    </h4>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Before any query leaves BrainLab for model inference, our gateway sanitizes the payload, stripping candidate names, phone numbers, email addresses, and school IDs. The foundation model only receives the academic prompt.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>🇳🇬</span> National Curriculum Alignment &amp; Anti-Bias
                    </h4>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      AI tutor prompts are calibrated specifically to Nigerian examination blueprints (NERDC, JAMB UTME, WAEC SSCE, and NECO). Deterministic checkers verify mathematical constants and grammatical conventions to prevent misleading hallucinations.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                       Uniform Student Anonymity
                    </h4>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Students interact uniformly with the &ldquo;BrainLab AI Tutor&rdquo;. Behind the scenes, our smart router dynamically selects optimal models (Gemini, Qwen, or Llama) based on cognitive task strength while keeping candidate identities insulated.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Cryptographic Backend */}
              <div id="cryptographic-backend" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Chapter 3: Cryptography
                  </span>
                  <button
                    onClick={() => handleCopyLink("cryptographic-backend")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Copy link
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
                  
                  <span>Multi-Layered Cryptographic Backend</span>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Rather than relying solely on perimeter TLS/HTTPS, BrainLab implements multi-tier application-level encryption (ALE) to ensure confidentiality even under catastrophic database compromise:
                </p>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900 p-6 text-slate-200 font-mono text-xs space-y-4">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                    <span>DATABASE CIPHER SPECIFICATION</span>
                    <span className="text-emerald-400 font-bold">ACTIVE &bull; ENFORCED</span>
                  </div>
                  <div className="space-y-2">
                    <p><span className="text-indigo-400">Cipher Algorithm:</span> AES-256-GCM (Galois/Counter Mode with 128-bit Auth Tag)</p>
                    <p><span className="text-indigo-400">Key Derivation:</span> PBKDF2 with SHA-512 &bull; 100,000 Iterations</p>
                    <p><span className="text-indigo-400">Candidate Lookup:</span> HMAC-SHA256 Blind Indexing (Zero Cleartext Search Index)</p>
                    <p><span className="text-indigo-400">Payload Format:</span> <code className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300">enc:v1:iv:tag:ciphertext</code></p>
                  </div>
                </div>
              </div>

              {/* Section 4: CBT Integrity */}
              <div id="cbt-integrity" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-amber-50 dark:bg-amber-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Chapter 4: Proctoring &amp; Anti-Cheat
                  </span>
                  <button
                    onClick={() => handleCopyLink("cbt-integrity")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Copy link
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
                  <span>⏱️</span>
                  <span>CBT Integrity &amp; Non-Invasive Anti-Cheat Signals</span>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  To guarantee authentic score benchmarking during scholarship contests and official mock exams, the CBT engine monitors non-invasive integrity signals:
                </p>

                <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs sm:text-sm">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-4">
                    <p className="font-bold text-slate-900 dark:text-white">Tab Switch &amp; Blur Telemetry</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs">
                      Detects when a candidate departs the active examination browser tab. Excessive away intervals prompt automatic disciplinary submission.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-4">
                    <p className="font-bold text-slate-900 dark:text-white">Immutable Attempt Snapshots</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs">
                      Once initiated, question sequences and option layouts are frozen in server-side snapshots, preventing post-facto answer manipulation.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-4">
                    <p className="font-bold text-slate-900 dark:text-white">In-Memory Obfuscation</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs">
                      Answers stored in browser cache are scrambled to prevent rogue browser extensions from sniffing or altering responses.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-4">
                    <p className="font-bold text-slate-900 dark:text-white">Zero Surveillance Spyware</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs">
                      BrainLab never installs kernel extensions, captures background audio without consent, or inspects files outside the browser session.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 5: Data Collected */}
              <div id="data-collected" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-purple-50 dark:bg-purple-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Chapter 5: Data Minimization
                  </span>
                  <button
                    onClick={() => handleCopyLink("data-collected")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Copy link
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
                  
                  <span>Categories of Information Collected</span>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Under the principle of <strong>Data Minimization</strong> (NDPA 2023), we only collect information indispensable to score computation and candidate profile authentication:
                </p>

                <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424]">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-4">Data Element</th>
                        <th className="p-4">Purpose</th>
                        <th className="p-4">Protection Standard</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      <tr>
                        <td className="p-4 font-bold">Full Name &amp; Phone Number</td>
                        <td className="p-4">Candidate scorecard lookup &amp; certificate issuance</td>
                        <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">AES-256-GCM Authenticated</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold">4-Subject UTME Choice</td>
                        <td className="p-4">Assessment generation &amp; psychometric weighting</td>
                        <td className="p-4 text-slate-500">Restricted Academic Schema</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold">Billing &amp; Card Details</td>
                        <td className="p-4">Plan subscription processing</td>
                        <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">Zero Storage (PCI-DSS Gateways)</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold">Honor Roll Display Name</td>
                        <td className="p-4">National leaderboard recognition</td>
                        <td className="p-4 text-sky-600 dark:text-cyan-400 font-bold">Masked (e.g. Chukwudi O. • Lagos)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 6: Candidate Rights */}
              <div id="candidate-rights" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-rose-50 dark:bg-rose-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Chapter 6: Legal Rights
                  </span>
                  <button
                    onClick={() => handleCopyLink("candidate-rights")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Copy link
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
                  
                  <span>Candidate Rights Under NDPA 2023</span>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every candidate, parent, and institutional sponsor enjoys statutory rights guaranteed under the Nigeria Data Protection Act:
                </p>

                <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs sm:text-sm">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-4">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                       Right of Access &amp; Portability
                    </h4>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                      Retrieve historical scorecards, topic diagnostics, and AI tutor transcripts at any time via your student dashboard.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-4">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                       Right to Rectification
                    </h4>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                      Update or correct inaccurate student names, school affiliations, or subject combinations directly through support.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-4">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                       Right to Erasure (&ldquo;Forgotten&rdquo;)
                    </h4>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                      Request permanent deletion of your phone number, name, and telemetry records upon completing your exam session.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-4">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                       Right to Contest Scoring
                    </h4>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                      Request human academic review of any automated anti-cheat flag, scoring dispute, or question questionability.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 7: Cybercafé Safety */}
              <div id="terminal-safety" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Chapter 7: Terminal Protection
                  </span>
                  <button
                    onClick={() => handleCopyLink("terminal-safety")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Copy link
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
                  
                  <span>Cybercafé &amp; Shared School Terminal Safety</span>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Many Nigerian candidates access CBT preparatory platforms via commercial cybercafés or shared school laboratory terminals. BrainLab implements specialized client protections:
                </p>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a1424] p-6 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    &bull; <strong>Volatile Session Expiration:</strong> When a test concludes or you click &ldquo;Sign Out&rdquo;, active session tokens are actively shredded with pseudo-random cryptographic bytes.
                  </p>
                  <p>
                    &bull; <strong>Zero Intrusive Third-Party Ad Trackers:</strong> BrainLab does not embed behavioral advertising pixels, cross-site trackers, or commercial data brokers.
                  </p>
                </div>
              </div>

              {/* Section 8: DPO Contact */}
              <div id="dpo-contact" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Chapter 8: Official Contact
                  </span>
                  <button
                    onClick={() => handleCopyLink("dpo-contact")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Copy link
                  </button>
                </div>

                <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-linear-to-b from-emerald-50/60 to-white dark:from-emerald-950/30 dark:to-[#0a1424] p-6 sm:p-8 shadow-sm">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white flex items-center gap-2">
                    
                    <span>BrainLab Data Protection Officer (DPO)</span>
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    For statutory erasure requests, cryptographic audits, or institutional compliance verification under NDPA 2023, contact our designated privacy officer:
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 bg-white dark:bg-slate-900/80">
                      <p className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                        Official DPO Email
                      </p>
                      <a
                        href="mailto:dpo@brainlabacademy.com.ng"
                        className="mt-1 block font-mono font-bold text-indigo-600 dark:text-cyan-400 hover:underline"
                      >
                        dpo@brainlabacademy.com.ng
                      </a>
                    </div>
                    <div className="p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 bg-white dark:bg-slate-900/80">
                      <p className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                        General Academic Support
                      </p>
                      <a
                        href="mailto:support@brainlabacademy.com.ng"
                        className="mt-1 block font-mono font-bold text-indigo-600 dark:text-cyan-400 hover:underline"
                      >
                        support@brainlabacademy.com.ng
                      </a>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <a
                      href="https://wa.me/2349074310204?text=Hello%20BrainLab%20DPO,%20I%20have%20an%20inquiry%20regarding%20data%20privacy%20and%20encryption."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
                    >
                       WhatsApp DPO Desk (+234 907 431 0204)
                    </a>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
                    >
                       Helpdesk Contact
                    </Link>
                    <Link
                      href="/account/subscription/refund"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
                    >
                       Refund Desk &rarr;
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
