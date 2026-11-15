"use client";

import React from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, getValidatedHomepageConfig, resolveClaimValue } from "@/app/lib/contentConfig";
import { Accordion } from "@/app/components/ui/Accordion";

export function HomeFaqCta() {
  const validatedConfig = getValidatedHomepageConfig(HOMEPAGE_CONTENT_CONFIG);

  // Map validated FAQs to Accordion items
  const accordionItems = validatedConfig.faqs.map((faq) => {
    const questionText = resolveClaimValue(faq.question, "");
    const answerText = resolveClaimValue(faq.answer, "");

    return {
      id: faq.id,
      title: questionText || "Frequently Asked Question",
      content: (
        <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          {answerText}
        </p>
      ),
    };
  });

  return (
    <>
      {/* FAQ Section */}
      <section
        id="faq"
        aria-label="Frequently Asked Questions"
        className="scroll-mt-20 sm:scroll-mt-24 relative py-16 sm:py-20 lg:py-24 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#060A14] transition-colors overflow-hidden"
      >
        {/* Brilliant Subtle Geometric Grid Matrix */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(#1e293b 1.2px, transparent 1.2px)`,
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60 mb-3 shadow-xs">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Common Questions About BrainLab Academy
            </h2>
            <p className="mt-3.5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              Clear answers regarding UTME 4-subject blueprints, O Level WAEC/NECO syllabus coverage, Post-UTME screening, and offline synchronization.
            </p>
          </div>

          {/* Accordion Component */}
          <Accordion items={accordionItems} allowMultiple={false} />

          {/* Full Directory Link */}
          <div className="mt-10 text-center">
            <Link
              href="/faq"
              className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1.5"
            >
              <span>Visit the complete Help &amp; FAQ knowledge base</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final Call to Action Section */}
      <section
        id="final-cta"
        aria-label="Begin Your Learning Journey"
        className="relative overflow-hidden py-20 sm:py-28 bg-slate-50 dark:bg-gradient-to-b dark:from-[#090F20] dark:via-[#070C1A] dark:to-[#050811] border-b border-slate-200 dark:border-white/10 transition-colors"
      >
        {/* Subtle dot matrix background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(#1e293b 1.2px, transparent 1.2px)`,
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300 dark:border-blue-700/60 bg-blue-100 dark:bg-blue-950/70 px-3.5 py-1 text-xs font-bold text-blue-800 dark:text-blue-300 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
            <span>START PREPARING TODAY</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight max-w-3xl mx-auto">
            Master Your Syllabus. Pass Your Examination with Confidence.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Join ambitious students and examination candidates utilizing syllabus-calibrated CBT mocks, instant error diagnostics, and interactive virtual laboratories across all examination tracks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/cbt"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 text-slate-950 px-8 py-4 text-base font-black shadow-lg shadow-cyan-500/25 active:translate-y-0.5 transition-all bl-focus-ring min-h-[50px]"
            >
              <span>Start Candidate Preparation</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>

            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border-2 border-slate-300 dark:border-white/10 bg-white dark:bg-[#0C152B] text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#121E3D] px-7 py-4 text-base font-bold active:translate-y-0.5 transition-all bl-focus-ring min-h-[50px]"
            >
              View Student Plans &amp; Pricing
            </Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 font-medium">
            Instant candidate access &bull; Low-bandwidth optimized &bull; Offline auto-sync protection
          </p>
        </div>
      </section>
    </>
  );
}
