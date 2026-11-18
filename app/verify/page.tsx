"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function CertificateLookupPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");

  function handleLookup(event: FormEvent) {
    event.preventDefault();
    let clean = identifier.trim();
    if (!clean) {
      setError("Please enter a certificate number or credential ID.");
      return;
    }

    // Automatically extract certificate ID if a full verification URL is pasted
    if (clean.includes("/verify/")) {
      const parts = clean.split("/verify/");
      clean = parts[parts.length - 1].replace(/\/+$/, "").trim();
    }

    if (!clean) {
      setError("Please enter a valid certificate number or credential ID.");
      return;
    }

    setError("");
    router.push(`/verify/${encodeURIComponent(clean)}`);
  }

  return (
    <div className="verify-page flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <main id="main" className="flex-1 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl px-5 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-900">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>BrainLab Public Credential Registry</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Verify Credential Authenticity
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Validate certificates and test completion credentials issued by BrainLab Academy and partner institutions. Enter the unique certificate code found on the certificate or scan the QR badge.
            </p>

            <form onSubmit={handleLookup} className="mt-8 space-y-4">
              <div>
                <label htmlFor="credential-id" className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Certificate Number or Credential ID
                </label>
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <input
                    id="credential-id"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. BL-MOCK-2026-A8K92F or UUID"
                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm font-mono text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#082e6e]"
                  >
                    Verify Credential
                  </button>
                </div>
                {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                <p className="font-semibold text-slate-700">Authoritative Public Ledger</p>
                <p className="mt-1">
                  Every legitimate BrainLab certificate is cryptographically recorded in the platform registry. Candidates, universities, and admissions boards can verify official academic credentials without requiring user credentials.
                </p>
              </div>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-6 flex flex-wrap justify-between items-center gap-3 text-xs font-semibold text-slate-500">
              <Link href="/dashboard" className="text-blue-700 hover:text-blue-900 transition">
                ← Return to Learner Dashboard
              </Link>
              <Link href="/contact" className="text-slate-600 hover:text-slate-900 transition">
                Need help verifying?
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
