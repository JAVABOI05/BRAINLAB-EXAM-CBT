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
    const clean = identifier.trim();
    if (!clean) {
      setError("Please enter a certificate number or credential ID.");
      return;
    }
    setError("");
    router.push(`/verify/${encodeURIComponent(clean)}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <main id="main" className="flex-1 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl px-5 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-900">
              <span>🛡️ BrainLab Trust Registry</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Verify Credential Authenticity
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Validate certificates and test completion credentials issued by BrainLab Academy and partner institutions. Enter the unique certificate code found on the certificate or QR badge.
            </p>

            <form onSubmit={handleLookup} className="mt-8 space-y-4">
              <div>
                <label htmlFor="credential-id" className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Certificate Number or Credential ID
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="credential-id"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. BL-2026-A8F93 or UUID"
                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm font-mono text-slate-900 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/20"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#082e6e]"
                  >
                    Verify
                  </button>
                </div>
                {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                <p className="font-semibold text-slate-700">Why verification matters</p>
                <p className="mt-1">
                  Every legitimate BrainLab certificate is cryptographically recorded in the platform registry. No external authority or third party can forge a verified record.
                </p>
              </div>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-6 flex flex-wrap justify-between items-center text-xs font-semibold text-slate-500">
              <Link href="/dashboard" className="text-indigo-700 hover:text-indigo-900">
                ← Return to Learner Dashboard
              </Link>
              <Link href="/support" className="text-slate-600 hover:text-slate-900">
                Need help verifying?
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
