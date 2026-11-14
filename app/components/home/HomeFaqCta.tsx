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
        className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-24 border-b border-white/10"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-cyan-300 border border-blue-400/30 mb-3">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Common Questions About BrainLab Academy
            </h2>
            <p className="mt-3.5 text-base text-slate-300">
              Clear answers regarding CBT exam simulations, free daily practice, offline synchronization, and student learning plans.
            </p>
          </div>

          {/* Accordion Component */}
          <Accordion items={accordionItems} allowMultiple={false} />

          {/* Full Directory Link */}
          <div className="mt-10 text-center">
            <Link
              href="/faq"
              className="text-sm font-bold text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1.5"
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
        className="relative overflow-hidden py-20 sm:py-28 bg-gradient-to-b from-transparent via-[#091530] to-[#060c18]"
      >
        {/* Atmospheric Ambient Glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/15 blur-[120px]" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>START PREPARING TODAY</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Master Your Syllabus. Pass Your Examination with Confidence.
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join thousands of secondary students and examination candidates across Nigeria utilizing syllabus-calibrated CBT mocks, instant error diagnostics, and 3D virtual laboratories.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              href="/cbt"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-8 py-4 text-base font-black text-white shadow-xl shadow-blue-600/30 transition-all duration-180 bl-focus-ring min-h-[50px] active:scale-[0.98]"
            >
              <span>Start Learning for Free</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>

            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/15 bg-slate-900/90 hover:bg-slate-800 px-7 py-4 text-base font-bold text-white transition-all duration-180 bl-focus-ring min-h-[50px] active:scale-[0.98]"
            >
              View Student Plans &amp; Pricing
            </Link>
          </div>

          <p className="text-xs text-slate-400 pt-2">
            No credit card required &bull; Low-bandwidth optimized &bull; Offline auto-sync protection
          </p>
        </div>
      </section>
    </>
  );
}
