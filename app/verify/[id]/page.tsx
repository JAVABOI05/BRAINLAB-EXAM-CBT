"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { toast } from "@/app/lib/toast";

interface VerifiedCertificate {
  id: string;
  certificate_number: string;
  recipient_name: string;
  title: string;
  issuer_name: string;
  score?: number | null;
  grade?: string | null;
  issued_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
}

export default function CertificateVerificationResultPage() {
  const params = useParams();
  const router = useRouter();
  const query = decodeURIComponent((params?.id as string) || "");

  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<VerifiedCertificate | null>(null);
  const [status, setStatus] = useState<"valid" | "revoked" | "expired" | "not_found">("not_found");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function verify() {
      if (!query.trim()) {
        setStatus("not_found");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("verify_certificate", {
          p_query: query.trim(),
        });

        if (!active) return;

        if (error || !data || !data.ok) {
          setStatus("not_found");
          setMessage(data?.message || "No certificate matching this identifier was found.");
        } else {
          setStatus(data.status || "valid");
          setCert(data.certificate as VerifiedCertificate);
        }
      } catch (err: unknown) {
        if (active) {
          setStatus("not_found");
          setMessage("An unexpected error occurred during verification.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void verify();
    return () => {
      active = false;
    };
  }, [query]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      
      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/verify"
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900"
            >
              ← Search Another Credential
            </Link>
            <span className="text-xs text-slate-400 font-mono">
              Query: {query}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="mt-4 text-sm font-bold text-slate-700">
                Verifying cryptographic registry signature...
              </p>
              <p className="mt-1 text-xs text-slate-400">Querying immutable certificate ledger</p>
            </div>
          ) : status === "not_found" || !cert ? (
            <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl">
                ⚠️
              </div>
              <h1 className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">
                Certificate Not Found
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                {message ||
                  "No valid BrainLab certificate could be found matching this identifier. Please verify the code on your certificate or QR code badge."}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/verify"
                  className="rounded-xl bg-[#012153] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#082e6e]"
                >
                  Try Another Identifier
                </Link>
                <Link
                  href="/support"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Contact Verification Support
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Authenticity Banner */}
              <div
                className={`rounded-2xl p-4 sm:p-5 flex items-center justify-between border ${
                  status === "valid"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                    : status === "revoked"
                    ? "border-rose-300 bg-rose-50 text-rose-950"
                    : "border-amber-300 bg-amber-50 text-amber-950"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {status === "valid" ? "✅" : status === "revoked" ? "⛔" : "⏳"}
                  </span>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wide">
                      {status === "valid"
                        ? "Cryptographically Verified Authentic"
                        : status === "revoked"
                        ? "Credential Revoked"
                        : "Certificate Expired"}
                    </h2>
                    <p className="text-xs opacity-85">
                      {status === "valid"
                        ? "This credential has been verified against the official BrainLab registry."
                        : status === "revoked"
                        ? `Revocation note: ${cert.revocation_reason || "Revoked by issuer."}`
                        : "This certificate has exceeded its validity period."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hidden sm:inline-flex rounded-xl bg-white/80 border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-white"
                >
                  🖨️ Print Record
                </button>
              </div>

              {/* Certificate Diploma Visual Card */}
              <div className="overflow-hidden rounded-3xl border-4 border-double border-amber-300 bg-gradient-to-b from-white via-amber-50/20 to-white p-8 sm:p-12 shadow-xl relative">
                {/* Guilloché / Watermark effect */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center text-9xl font-black"
                >
                  BRAINLAB
                </div>

                <div className="relative text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#071c43] text-2xl shadow-md text-amber-400">
                    🏛️
                  </div>

                  <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-amber-700">
                    {cert.issuer_name || "BrainLab Academy"}
                  </p>
                  <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl font-serif">
                    Certificate of Academic Achievement
                  </h1>
                  <p className="mt-1 text-xs text-slate-500">
                    Official Credential &amp; Competency Record
                  </p>

                  <div className="my-6 mx-auto h-0.5 w-24 bg-amber-300" />

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    This certifies that
                  </p>
                  <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-950 font-serif">
                    {cert.recipient_name}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    has successfully demonstrated verified competency and excellence in
                  </p>
                  <p className="mt-2 text-lg sm:text-xl font-black text-indigo-950">
                    {cert.title}
                  </p>

                  {/* Performance Indicators */}
                  <div className="mt-6 flex flex-wrap justify-center gap-4">
                    {cert.score !== null && cert.score !== undefined && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center">
                        <span className="block text-[10px] font-bold uppercase text-amber-800">
                          Verified Score
                        </span>
                        <span className="font-mono text-base font-black text-amber-950">
                          {cert.score}%
                        </span>
                      </div>
                    )}
                    {cert.grade && (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-center">
                        <span className="block text-[10px] font-bold uppercase text-indigo-800">
                          Distinction / Grade
                        </span>
                        <span className="font-mono text-base font-black text-indigo-950">
                          {cert.grade}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Issuer Signatures & Verification Details */}
                  <div className="mt-10 pt-6 border-t border-slate-200/80 grid grid-cols-2 gap-4 text-left sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Certificate Number
                      </p>
                      <p className="mt-1 font-mono text-xs font-black text-slate-900">
                        {cert.certificate_number}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Date of Issue
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-900">
                        {new Date(cert.issued_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Verification URL
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-indigo-700 truncate">
                        brainlabexam-cbt.vercel.app/verify/{cert.certificate_number}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <Link
                  href="/verify"
                  className="font-bold text-indigo-700 hover:text-indigo-900"
                >
                  ← Verify Another Certificate
                </Link>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        void navigator.share({
                          title: `${cert.recipient_name} — ${cert.title}`,
                          url: window.location.href,
                        });
                      } else {
                        void navigator.clipboard.writeText(window.location.href);
                        toast.success("Verification link copied to clipboard! 📋");
                      }
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-100"
                  >
                    🔗 Share Verification Link
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-xl bg-[#012153] px-4 py-2 font-bold text-white transition hover:bg-[#082e6e]"
                  >
                    🖨️ Print / Save PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

          </div>
  );
}
