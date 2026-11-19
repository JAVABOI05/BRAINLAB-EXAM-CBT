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
        <p className="text-sm sm:text-base leading-relaxed text-slate-600">
          {answerText}
        </p>
      ),
    };
  });

  return (
    <>
      {/* FAQ Section: Clean Luminous Academic Light */}
      <section
        id="faq"
        aria-label="Frequently Asked Questions"
        className="scroll-mt-20 sm:scroll-mt-24 relative py-16 sm:py-20 lg:py-24 border-b border-slate-200 bg-[#F8FAFC] text-slate-900 overflow-hidden"
      >
        {/* Subtle Geometric Grid Matrix */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#1e293b 1.2px, transparent 1.2px)`,
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-200 mb-3 shadow-2xs">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              Common Questions About BrainLab Academy
            </h2>
            <p className="mt-3.5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
              Clear answers regarding UTME 4-subject blueprints, O Level WAEC/NECO syllabus coverage, Post-UTME screening, and offline synchronization.
            </p>
          </div>

          {/* Accordion Component - Clean Light Presentation */}
          <Accordion
            items={accordionItems}
            allowMultiple={false}
            itemClassName="rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-colors"
            headerClassName="flex w-full items-center justify-between px-6 py-5 text-left text-base font-bold text-slate-900 bl-focus-ring rounded-2xl"
            panelClassName="px-6 pb-6 pt-1 text-slate-600 leading-relaxed text-sm sm:text-base border-t border-slate-100"
          />

          {/* Full Directory Link */}
          <div className="mt-10 text-center">
            <Link
              href="/faq"
              className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5"
            >
              <span>Visit the complete Help &amp; FAQ knowledge base</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final Call to Action Section: Navy Rounded Panel before Footer */}
      <section
        id="final-cta"
        aria-label="Begin Your Learning Journey"
        className="relative overflow-hidden py-14 sm:py-20 lg:py-24 bg-white text-slate-900"
      >
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] bg-[#0B1536] text-white p-8 sm:p-14 lg:p-20 shadow-2xl border border-white/10 text-center space-y-6">
            {/* Ambient Coral & Blue Glows inside the panel */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#FF5238]/20 blur-3xl" aria-hidden="true" />

            {/* Subtle dot matrix background */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `radial-gradient(#38bdf8 1.2px, transparent 1.2px)`,
                backgroundSize: "24px 24px",
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 max-w-3xl mx-auto space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/60 px-3.5 py-1 text-xs font-bold text-cyan-300 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>START PREPARING TODAY</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Master Your Syllabus. Pass Your Examination with Confidence.
              </h2>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
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
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border-2 border-white/20 bg-white/10 text-white hover:bg-white/15 px-7 py-4 text-base font-bold active:translate-y-0.5 transition-all bl-focus-ring min-h-[50px]"
                >
                  View Student Plans &amp; Pricing
                </Link>
              </div>

              <p className="text-xs text-slate-400 pt-2 font-medium">
                Instant candidate access &bull; Low-bandwidth optimized &bull; Offline auto-sync protection
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
