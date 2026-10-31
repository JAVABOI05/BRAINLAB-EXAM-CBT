"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "../lib/toast";
import { getWhatsAppChatUrl, DEFAULT_WHATSAPP_NUMBER } from "../lib/whatsapp";
import { getFooterConfig } from "../lib/platformConfig";

const SECTIONS = [
  { id: "highlights", label: "Executive Highlights", icon: "⚡" },
  { id: "acceptance", label: "1. Acceptance & Eligibility", icon: "📋" },
  { id: "cbt-integrity", label: "2. CBT Integrity & Proctoring", icon: "🛡️" },
  { id: "ai-fair-use", label: "3. AI Tutor Fair Use", icon: "🤖" },
  { id: "subscriptions-billing", label: "4. Payments & Subscriptions", icon: "💳" },
  { id: "intellectual-property", label: "5. Intellectual Property", icon: "⚖️" },
  { id: "community-conduct", label: "6. Masterclass & Etiquette", icon: "🎓" },
  { id: "disclaimers", label: "7. Educational Disclaimers", icon: "📜" },
  { id: "dispute-support", label: "8. Disputes & Support Desk", icon: "💬" },
];

export default function TermsOfUsePage() {
  const lastUpdated = "October 27, 2026";
  const [activeSection, setActiveSection] = useState("highlights");
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
    const url = `${window.location.origin}/terms#${sectionId}`;
    void navigator.clipboard.writeText(url);
    toast.success("Section link copied to clipboard");
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060e1a] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071328]/90 py-12 sm:py-16">
        {/* Ambient Gradient Glow */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl dark:bg-cyan-500/10"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span>Legal &amp; Governance</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-cyan-400">Terms of Use</span>
          </nav>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-bold text-blue-900 dark:text-cyan-300">
              Platform Rules &amp; Candidate Agreement
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300">
              Fair Testing Standard
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 px-3 py-1 text-xs font-bold text-indigo-900 dark:text-indigo-300">
              AI Fair Use Policy
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
            BrainLab Terms of Use
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            The legally binding agreement governing candidate access to the BrainLab CBT examination simulator, Live Masterclass Stage, AI Study Studio, 1v1 Arena, and multi-gateway subscription services.
          </p>

          {/* Metadata bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                Effective Date: <strong className="text-slate-800 dark:text-slate-200">{lastUpdated}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Version: <strong className="text-slate-800 dark:text-slate-200">3.8 (Multi-Gateway &amp; AI Ethics)</strong>
              </span>
              <span>&bull;</span>
              <span>
                Governing Jurisdiction: <strong className="text-slate-800 dark:text-slate-200">Federal Republic of Nigeria</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Print Terms
              </button>
              <Link
                href="/privacy"
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-cyan-800 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-cyan-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
              >
                Privacy Notice &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout with Sticky Sidebar */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sticky Table of Contents (Desktop) */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-sm backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 pb-1">
                Agreement Chapters
              </p>
              <nav className="space-y-1">
                {SECTIONS.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold transition ${
                      activeSection === id
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="text-sm shrink-0">{icon}</span>
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </nav>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                <p>Have an inquiry?</p>
                <a
                  href={getWhatsAppChatUrl("Hello BrainLab Support, I have an inquiry regarding Terms of Use.", whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  WhatsApp Helpdesk &rarr;
                </a>
              </div>
            </div>
          </aside>

          {/* Policy Articles */}
          <main className="lg:col-span-3 space-y-12">
            {/* Highlights Card */}
            <article id="highlights" className="scroll-mt-24">
              <div className="rounded-3xl border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/70 to-amber-100/30 dark:from-amber-950/30 dark:to-slate-900 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-300 flex items-center gap-2">
                    
                    <span>Executive Highlights for Candidates &amp; Guardians</span>
                  </h2>
                  <button
                    onClick={() => handleCopyLink("highlights")}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                    title="Copy section link"
                  >
                    Copy Link
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <div className="rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-slate-900/60 p-4">
                    <p className="font-bold text-amber-950 dark:text-amber-300 mb-1">Independent Prep Academy</p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      BrainLab is an independent academic preparatory body. We are not officially affiliated with or endorsed by JAMB, WAEC, NECO, or NABTEB. Mock scores serve as diagnostic readiness benchmarks.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-slate-900/60 p-4">
                    <p className="font-bold text-amber-950 dark:text-amber-300 mb-1">Non-Negotiable CBT Integrity</p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      Tab switching, proxy candidate sitting, automated script injection, and answer scraping are strictly prohibited. Violations trigger automated test disqualification.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-slate-900/60 p-4">
                    <p className="font-bold text-amber-950 dark:text-amber-300 mb-1">AI Tutor Educational Use</p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      BrainLab AI Tutor is engineered solely for syllabus explanations and step-by-step problem derivations. Jailbreaks, prompt bombing, and commercial redistribution are forbidden.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-slate-900/60 p-4">
                    <p className="font-bold text-amber-950 dark:text-amber-300 mb-1">Transparent Subscriptions</p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      Payments via Paystack, Flutterwave, Bank Transfer, and Bachs are securely processed. Digital exam banks are activated immediately upon verification.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            {/* Section 1: Acceptance & Eligibility */}
            <article id="acceptance" className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>1.</span> Acceptance of Terms &amp; Eligibility
                </h2>
                <button
                  onClick={() => handleCopyLink("acceptance")}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                By creating a candidate account, inputting an examination access code, or accessing the BrainLab Academy platform (including our CBT simulator, Live Masterclass Stage, Challenge Arena, or AI Study Studio), you enter into a legally binding contract with BrainLab Academy and agree to abide by these Terms of Use and our{" "}
                <Link href="/privacy" className="text-blue-600 dark:text-cyan-400 font-bold underline">
                  Privacy Policy &amp; AI Ethics Notice
                </Link>.
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Eligibility Criteria:</h3>
                <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                  <li><strong>Candidate Age:</strong> Our platform is tailored for secondary school learners, UTME/DE applicants, SSCE candidates, and post-secondary scholars. Candidates under 18 years represent that they have parental, guardian, or institutional consent.</li>
                  <li><strong>Single-User License:</strong> Each student account and access PIN is designated for individual use. Account sharing or institutional syndication without an institutional tier is a violation of these terms.</li>
                  <li><strong>Accurate Registration:</strong> You agree to provide authentic contact information (telephone number and elective subjects) to ensure accurate examination scorecard lookup and SMS/WhatsApp notifications.</li>
                </ul>
              </div>
            </article>

            {/* Section 2: CBT Examination Integrity & Anti-Cheat */}
            <article id="cbt-integrity" className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>2.</span> CBT Examination Integrity &amp; Proctoring Rules
                </h2>
                <button
                  onClick={() => handleCopyLink("cbt-integrity")}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                To guarantee that BrainLab examination simulations provide an honest diagnostic reflection of candidate readiness, our test engine enforces automated academic integrity signals:
              </p>

              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-5 space-y-3">
                <h3 className="text-sm font-bold text-rose-950 dark:text-rose-300">Strictly Prohibited Testing Activities:</h3>
                <ul className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2.5 list-disc list-inside leading-relaxed">
                  <li><strong>Tab Switching &amp; Window Navigation:</strong> Leaving the active CBT simulator tab logs a blur event. Accumulating 3 or more tab switch warnings triggers automated session finalization and an integrity strike.</li>
                  <li><strong>Client-Side Answer Scraping:</strong> Real exam answer keys and rationale derivations are never transmitted to candidate browsers prior to submission. Attempting to reverse engineer network packets or tamper with local memory is prohibited.</li>
                  <li><strong>Surrogate Testing:</strong> Permitting another individual to sit for an assessment on your behalf to artificially inflate competitive standings or leaderboard scores is strictly forbidden.</li>
                  <li><strong>Simultaneous Concurrent Logins:</strong> Only one active examination attempt is permitted per student profile at any given time. Concurrent access attempts will terminate the previous session.</li>
                </ul>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <em>Consequences of Malpractice: Confirmed infractions will result in immediate examination invalidation, revocation of leaderboard rankings, and potential suspension from future scholarship tournaments.</em>
              </p>
            </article>

            {/* Section 3: AI Tutor Fair Use */}
            <article id="ai-fair-use" className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>3.</span> BrainLab AI Tutor &amp; Study Studio Fair Use Policy
                </h2>
                <button
                  onClick={() => handleCopyLink("ai-fair-use")}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                BrainLab equips candidates with state-of-the-art pedagogical AI engines (multi-provider intelligent router) to break down complex topics into digestible derivations:
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-1">
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Permitted Academic Use
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li>Step-by-step mathematical &amp; scientific derivations</li>
                    <li>Syllabus topic explanations and key concept summaries</li>
                    <li>Grammar, vocabulary, and literary text comprehension</li>
                    <li>Study schedule formulation and revision strategy</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                    <span className="text-rose-600 font-bold">✗</span> Prohibited AI Abuse
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li>Prompt-injection attacks targeting system instructions</li>
                    <li>Automated bot scraping or high-frequency API bombardment</li>
                    <li>Generation of non-educational or defamatory content</li>
                    <li>Commercial redistribution of BrainLab AI study notes</li>
                  </ul>
                </div>
              </div>
            </article>

            {/* Section 4: Subscriptions, Payments & Access Codes */}
            <article id="subscriptions-billing" className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>4.</span> Subscriptions, Payments &amp; Access Codes
                </h2>
                <button
                  onClick={() => handleCopyLink("subscriptions-billing")}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Premium access features—including full-syllabus question banks, offline revision mode, downloadable formula sheets, live whiteboard masterclasses, and AI tutor inference credits—are provided via transparent pricing:
              </p>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2.5 list-disc list-inside leading-relaxed">
                  <li><strong>Multi-Gateway Payment Security:</strong> BrainLab accepts payments via CBN-licensed payment processors: <strong>Paystack</strong>, <strong>Flutterwave</strong>, direct <strong>Bank Transfer</strong> (GTBank verified account), and <strong>Bachs Gateway</strong>. We never store debit card numbers or bank credentials.</li>
                  <li><strong>Transparent NGN Pricing:</strong> All subscription rates on our <Link href="/pricing" className="text-blue-600 dark:text-cyan-400 font-bold underline">Pricing Page</Link> are quoted in Nigerian Naira (NGN) inclusive of applicable taxes. No hidden lock-in or recurring automated charges without explicit candidate confirmation.</li>
                  <li><strong>Access Code Redemption:</strong> Physical scratch cards and institutional vouchers purchased via authorized school coordinators or tutorial centers are single-use activation licenses.</li>
                  <li><strong>Refund &amp; Cancellation Policy:</strong> Due to immediate digital unlock of intellectual materials, mock banks, and AI derivations upon purchase, subscriptions are generally non-refundable except for double-charging or technical failure preventing platform access within 48 hours. Submit requests via our <Link href="/account/subscription/refund" className="text-blue-600 dark:text-cyan-400 font-bold underline">Refund Portal</Link>.</li>
                </ul>
              </div>
            </article>

            {/* Section 5: Intellectual Property */}
            <article id="intellectual-property" className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>5.</span> Intellectual Property Rights
                </h2>
                <button
                  onClick={() => handleCopyLink("intellectual-property")}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                All platform intellectual assets—including past question curations, pedagogical step-by-step explanations, live masterclass recordings, digital whiteboard notes, interactive question algorithms, brand marks, and software code—are the proprietary intellectual property of BrainLab Academy.
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                <p>
                  Candidates receive a limited, revocable, non-exclusive, non-transferable license to consume materials for their individual academic preparation. You may not:
                </p>
                <p>&bull; Resell, photocopy, distribute, or bundle BrainLab materials for commercial tutorial services without written authorization.</p>
                <p>&bull; Scrape question databases using automated crawlers, headless browsers, or machine learning scrapers.</p>
                <p>&bull; Publicly stream, rebroadcast, or mirror live masterclass audio or video streams.</p>
              </div>
            </article>

            {/* Section 6: Live Masterclass & Community Conduct */}
            <article id="community-conduct" className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>6.</span> Live Masterclass Stage &amp; Community Etiquette
                </h2>
                <button
                  onClick={() => handleCopyLink("community-conduct")}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                BrainLab maintains an encouraging, focused academic environment. Across our Live Masterclass Stages, live tutor chat rooms, and 1v1 Challenge Arenas, students are required to uphold academic decorum:
              </p>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <p>&bull; <strong>Respectful Interaction:</strong> Bullying, discriminatory language, sexual harassment, or verbal abuse towards tutors or peers results in instant ejection and permanent account ban.</p>
                <p>&bull; <strong>Prohibition of &ldquo;Exam Runz&rdquo; &amp; Scams:</strong> Soliciting, advertising, or sharing links regarding examination malpractice (&ldquo;runz&rdquo;, leaked papers, or fraudulent score upgrades) is strictly prohibited.</p>
                <p>&bull; <strong>Academic Focus:</strong> Classroom chat and audio must remain centered around the subject topic under instruction.</p>
              </div>
            </article>

            {/* Section 7: Educational Disclaimers */}
            <article id="disclaimers" className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>7.</span> Educational Disclaimers &amp; Limitation of Liability
                </h2>
                <button
                  onClick={() => handleCopyLink("disclaimers")}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
                >
                  Copy Link
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  <strong>Non-Affiliation Notice:</strong> BrainLab Academy is an academic tutorial and examination preparation organization. We are not an official branch, subsidiary, or partner of the Joint Admissions and Matriculation Board (JAMB), West African Examinations Council (WAEC), National Examinations Council (NECO), or NABTEB.
                </p>
                <p>
                  <strong>Benchmarking Nature of Mocks:</strong> While our question banks and timers simulate the authentic timing and cognitive weight of Nigerian standardized examinations, BrainLab scores are pedagogical benchmarks and do not constitute a guarantee of identical results in official national examinations.
                </p>
                <p>
                  <strong>Service Availability:</strong> We strive for 99.9% platform availability. BrainLab shall not be held liable for temporary service interruptions caused by telecommunication network dropouts, national power outages, or cybercafé hardware defects.
                </p>
              </div>
            </article>

            {/* Section 8: Disputes & Help Desk */}
            <article id="dispute-support" className="scroll-mt-24">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>💬</span>
                    <span>8. Questions, Disputes &amp; Official Inquiries</span>
                  </h2>
                  <button
                    onClick={() => handleCopyLink("dispute-support")}
                    className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
                  >
                    Copy Link
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  For inquiries regarding these terms, institutional licenses for secondary schools, or billing reconciliations, reach out to our dedicated student helpdesk:
                </p>

                <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Official Support Email</p>
                    <a href="mailto:support@brainlabacademy.com.ng" className="text-blue-600 dark:text-cyan-400 hover:underline">
                      support@brainlabacademy.com.ng
                    </a>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Refund &amp; Billing Inquiries</p>
                    <Link href="/account/subscription/refund" className="text-blue-600 dark:text-cyan-400 hover:underline">
                      Visit Refund Desk Portal &rarr;
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 text-xs sm:text-sm">
                  <a
                    href={getWhatsAppChatUrl("Hello BrainLab Support, I have an inquiry regarding Terms of Use.", whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-bold text-white transition active:scale-95 shadow-sm"
                  >
                    <span>Contact WhatsApp Helpdesk</span> (+{whatsappNumber})
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
                  >
                    <span>Contact Directory</span>
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
                  >
                    <span>View Pricing Plans</span>
                  </Link>
                </div>
              </div>
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
