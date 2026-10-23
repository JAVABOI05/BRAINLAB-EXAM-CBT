"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors for operational diagnostics
    console.error("[BrainLab Global Error Boundary]:", error);
  }, [error]);

  return (
    <main id="main" className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="mx-auto max-w-xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-red-900">
          <span>⚠️</span> Application Notice
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Something unexpected happened
        </h1>

        <p className="mt-3 text-base leading-7 text-slate-600">
          BrainLab encountered an unexpected temporary glitch while loading this view.
          Your account data and queued exam answers remain securely stored.
        </p>

        {error.digest && (
          <p className="mt-2 text-xs font-mono text-slate-400">
            Error Reference: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-[#012153] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0d3475] active:scale-95"
          >
            🔄 Try Again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 transition"
          >
            ← Return to Home
          </Link>
          <Link
            href="/support"
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-900 hover:bg-blue-100 transition"
          >
            Help &amp; Support
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          If this persists, contact our 24/7 technical desk at{" "}
          <a
            href="mailto:support@brainlab.edu.ng"
            className="font-bold text-blue-800 underline underline-offset-2"
          >
            support@brainlab.edu.ng
          </a>
        </p>
      </div>
    </main>
  );
}
