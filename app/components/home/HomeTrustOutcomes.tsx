"use client";

import React from "react";

export function HomeTrustOutcomes() {
  // Per Prompt 5 Specification & Standing Rule S6:
  // "Trust and outcomes: only VERIFIED or APPROVED items. Hide the section if none are approved."
  // Currently, all outcome claims, testimonials, and institutional partner figures
  // are marked AWAITING CONTENT / AWAITING CONSENT in the Claims Register.
  // Therefore, per S6, this section is completely suppressed until verified evidence is loaded.
  const hasApprovedTrustClaims = false;

  if (!hasApprovedTrustClaims) {
    return null;
  }

  return (
    <section
      id="trust-outcomes"
      aria-label="Verified Outcomes and Accreditations"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-[#070D18]"
    >
      {/* Rendered only when approved items are populated in Prompt 6/7 */}
    </section>
  );
}
