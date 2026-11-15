"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsentStatus,
} from "@/app/lib/analytics";

export default function CookieConsentBanner() {
  const [status, setStatus] = useState<CookieConsentStatus>("all"); // default assumed decided to prevent SSR flash
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStatus(getCookieConsent());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: CookieConsentStatus }>;
      if (customEvent.detail?.status) {
        setStatus(customEvent.detail.status);
      }
    };

    window.addEventListener("brainlab-consent-updated", handleUpdate);
    return () => {
      window.removeEventListener("brainlab-consent-updated", handleUpdate);
    };
  }, []);

  if (!mounted || status !== "undecided") {
    return null;
  }

  const handleChoice = (choice: "all" | "essential_only") => {
    setCookieConsent(choice);
    setStatus(choice);
  };

  return (
    <aside
      aria-label="Privacy & Cookie Preferences"
      role="dialog"
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none animate-bl-fade-up"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-300/80 bg-white/95 p-5 shadow-2xl backdrop-blur-md pointer-events-auto dark:border-slate-800 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">🍪</span>
              <h2 className="text-sm font-black tracking-tight text-slate-950 dark:text-white">
                Privacy Choices &amp; First-Party Measurement (Nigeria Data Protection Act (NDPA) 2023)
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We use strictly necessary cookies to keep you signed in securely and protect active CBT exam answers. With your consent, we also collect privacy-preserving aggregated telemetry to evaluate curriculum interest. We never sell your data or use student submissions to train third-party AI models.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleChoice("essential_only")}
              className="flex-1 sm:flex-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
            >
              Essential Only
            </button>

            <button
              type="button"
              onClick={() => handleChoice("all")}
              className="flex-1 sm:flex-none rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-black text-white shadow-md transition"
            >
              Accept All
            </button>
          </div>
        </div>

        {/* Expandable Details Drawer */}
        {showDetails ? (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-xs space-y-2 animate-bl-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="text-emerald-500">✓</span> Strictly Necessary (Always Active)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  Authentication tokens, CSRF protection, and offline CBT local storage answer caching (`bl_arena_answers_*`).
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>📊</span> Aggregated Analytics (Optional)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  First-party conversion funnel metrics, curriculum views, and simulator completions. Anonymized without student PII.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
              <Link
                href="/privacy"
                className="underline hover:text-blue-600 dark:hover:text-cyan-400 font-bold"
              >
                Read Full Privacy &amp; AI Ethics Policy →
              </Link>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Hide Details ↑
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2 text-[11px]">
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="text-slate-700 dark:text-slate-300 hover:underline font-bold"
            >
              Customize &amp; Learn More ↓
            </button>
            <Link
              href="/privacy"
              className="text-slate-700 dark:text-slate-300 hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
