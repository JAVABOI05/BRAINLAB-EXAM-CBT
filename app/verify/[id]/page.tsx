"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import BrandHeader from "@/app/components/BrandHeader";
import BrandFooter from "@/app/components/BrandFooter";

type CertificateRecord = {
  id: string;
  certificate_number: string;
  recipient_name: string;
  title: string;
  issuer_name: string;
  score: number | null;
  grade: string | null;
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
};

type VerificationResult =
  | { ok: true; status: "valid" | "expired" | "revoked"; certificate: CertificateRecord }
  | { ok: false; error: string; message: string };

export default function CertificateVerificationPage() {
  const params = useParams<{ id: string }>();
  const identifier = decodeURIComponent(params.id || "");

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let active = true;

    async function verify() {
      if (!identifier) {
        setResult({ ok: false, error: "invalid_id", message: "No certificate identifier provided." });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("verify_certificate", { p_query: identifier });

      if (!active) return;

      if (error) {
        setResult({
          ok: false,
          error: "rpc_error",
          message: "Could not communicate with the verification authority. Please try again.",
        });
      } else {
        setResult(data as VerificationResult);
      }
      setLoading(false);
    }

    void verify();

    return () => {
      active = false;
    };
  }, [identifier]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <div className="print:hidden">
        <BrandHeader />
      </div>

      <main id="main" className="flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
              <p className="mt-4 text-sm font-semibold text-slate-600">Verifying credential in BrainLab Registry…</p>
            </div>
          ) : !result || !result.ok ? (
            <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-600">
                ✕
              </div>
              <h1 className="mt-4 text-2xl font-black text-slate-950 sm:text-3xl">Credential Not Found</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {result && !result.ok ? result.message : "The certificate code could not be verified in the BrainLab registry."}
              </p>
              <div className="mt-4 rounded-xl bg-slate-50 p-4 font-mono text-xs text-slate-700">
                Query: {identifier}
              </div>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/verify"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#082e6e]"
                >
                  Search Another Code
                </Link>
                <Link
                  href="/support"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              {/* Top Status Header */}
              <div
                className={`px-6 py-4 text-center text-xs font-black uppercase tracking-wider ${
                  result.status === "valid"
                    ? "bg-emerald-600 text-white"
                    : result.status === "expired"
                    ? "bg-amber-500 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                {result.status === "valid"
                  ? "✓ Official Verified Credential"
                  : result.status === "expired"
                  ? "⚠ Credential Has Expired"
                  : "✕ Revoked Credential"}
              </div>

              {/* Certificate Inner Canvas */}
              <div className="p-8 sm:p-12 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                      {result.certificate.issuer_name}
                    </span>
                    <h2 className="mt-1 text-xs text-slate-500">Official Certificate of Achievement</h2>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
                    {result.certificate.certificate_number}
                  </div>
                </div>

                <div className="mt-8 text-center sm:mt-12">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">This certifies that</p>
                  <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                    {result.certificate.recipient_name}
                  </h1>
                  <p className="mt-3 text-sm text-slate-600">has successfully demonstrated proficiency and completed</p>
                  <h2 className="mt-2 text-xl font-bold text-indigo-950 sm:text-2xl">
                    {result.certificate.title}
                  </h2>
                </div>

                {/* Score / Grade Breakdown */}
                <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-4">
                  <div>
                    <span className="block text-xs text-slate-500 font-semibold">Issue Date</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {new Date(result.certificate.issued_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-semibold">Expiry Date</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {result.certificate.expires_at
                        ? new Date(result.certificate.expires_at).toLocaleDateString()
                        : "Permanent"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-semibold">Score / Grade</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {result.certificate.score !== null ? `${result.certificate.score}%` : "Completed"}
                      {result.certificate.grade ? ` (${result.certificate.grade})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-semibold">Status</span>
                    <span
                      className={`inline-block font-bold text-sm ${
                        result.status === "valid"
                          ? "text-emerald-700"
                          : result.status === "expired"
                          ? "text-amber-700"
                          : "text-rose-700"
                      }`}
                    >
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {result.status === "revoked" && result.certificate.revocation_reason && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                    <span className="font-bold">Revocation Notice: </span>
                    {result.certificate.revocation_reason}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="bg-slate-50 px-6 py-5 sm:px-10 flex flex-wrap items-center justify-between gap-4 print:hidden">
                <Link href="/verify" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                  ← Verify another certificate
                </Link>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    🖨️ Print / Save PDF
                  </button>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-[#082e6e]"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="print:hidden">
        <BrandFooter />
      </div>
    </div>
  );
}
