"use client";

import React from "react";

export function HomeFounderNote() {
  // Per Prompt 5 Specification & Standing Rule S6:
  // "Founder note: render only when APPROVED."
  // Currently, the founder statement copy and portrait photograph
  // are marked AWAITING CONTENT in the Claims Register.
  // Therefore, per S6, this section is completely suppressed until approved.
  const isFounderNoteApproved = false;

  if (!isFounderNoteApproved) {
    return null;
  }

  return (
    <section
      id="founder-note"
      aria-label="Note from the Founder"
      className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#070D18]"
    >
      {/* Rendered only when founder note is officially approved */}
    </section>
  );
}
