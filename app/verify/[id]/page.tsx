"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { toast } from "@/app/lib/toast";
import { downloadCertificatePdf } from "@/app/lib/certificatePdfService";
import VerificationQRCode from "@/app/components/VerificationQRCode";

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

const CANONICAL_BASE = "https://www.brainlabacademy.com.ng/verify";

export default function CertificateVerificationResultPage() {
  const params = useParams();
  const rawParam = (params?.id as string) || "";
  let query = decodeURIComponent(rawParam).trim();

  // If query contains full URL, extract certificate ID
  if (query.includes("/verify/")) {
    const parts = query.split("/verify/");
    query = parts[parts.length - 1].replace(/\/+$/, "").trim();
  }

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
        // 1. First attempt: Direct client RPC
        let found = false;
        try {
          const { data, error } = await supabase.rpc("verify_certificate", {
            p_query: query.trim(),
          });

          if (active && !error && data && data.ok && data.certificate) {
            setStatus(data.status || "valid");
            setCert(data.certificate as VerifiedCertificate);
            found = true;
          }
        } catch {
          // Fall through to server API
        }

        if (found) return;

        // 2. Second attempt: Resilient server API route
        const apiRes = await fetch(`/api/certificates/verify/${encodeURIComponent(query.trim())}`).catch(() => null);
        if (active && apiRes && apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson && apiJson.ok && apiJson.certificate) {
            setStatus(apiJson.status || "valid");
            setCert(apiJson.certificate as VerifiedCertificate);
            return;
          }
        }

        if (active) {
          setStatus("not_found");
          setMessage("No certificate matching this identifier was found in the official registry.");
        }
      } catch {
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

  const canonicalUrl = cert?.certificate_number
    ? `${CANONICAL_BASE}/${encodeURIComponent(cert.certificate_number)}`
    : `${CANONICAL_BASE}/${encodeURIComponent(query)}`;

  function handleDownloadPdf() {
    if (!cert) return;
    downloadCertificatePdf({
      certificateNumber: cert.certificate_number,
      recipientName: cert.recipient_name,
      examTitle: cert.title,
      issuerName: cert.issuer_name,
      issuedDate: new Date(cert.issued_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      score: cert.score ?? 0,
      percentage: cert.score ?? undefined,
      grade: cert.grade || undefined,
      verificationUrl: canonicalUrl,
    });
    toast.success("Official certificate PDF downloaded!");
  }

  return (
    <div className="verification-detail-page flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <main className="flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Breadcrumb Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 transition"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Verify Another Credential</span>
            </Link>
            <span className="text-xs text-slate-400 font-mono">
              Identifier: {query}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="mt-4 text-sm font-bold text-slate-700">
                Verifying cryptographic registry signature...
              </p>
              <p className="mt-1 text-xs text-slate-400">Querying immutable certificate ledger</p>
            </div>
          ) : status === "not_found" || !cert ? (
            <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">
                Certificate Not Found
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                {message ||
                  "No valid BrainLab certificate could be found matching this identifier. Please verify the code on your certificate or QR code badge."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/verify"
                  className="rounded-xl bg-[#012153] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#082e6e]"
                >
                  Try Another Identifier
                </Link>
                <Link
                  href="/contact"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Contact Verification Support
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Authenticity Status Banner */}
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
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      status === "valid"
                        ? "bg-emerald-200/80 text-emerald-800"
                        : status === "revoked"
                        ? "bg-rose-200/80 text-rose-800"
                        : "bg-amber-200/80 text-amber-800"
                    }`}
                  >
                    {status === "valid" ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : status === "revoked" ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    )}
                  </div>
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
                        ? "This credential has been verified against the official BrainLab public registry."
                        : status === "revoked"
                        ? `Revocation note: ${cert.revocation_reason || "Revoked by issuer."}`
                        : "This certificate has exceeded its validity period."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-white/80 border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-xs transition hover:bg-white"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  <span>Print Record</span>
                </button>
              </div>

              {/* Certificate Diploma Visual Card */}
              <div className="overflow-hidden rounded-3xl border-4 border-double border-amber-300 bg-gradient-to-b from-white via-amber-50/20 to-white p-6 sm:p-12 shadow-xl relative">
                {/* Guilloché / Watermark effect */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center text-7xl sm:text-9xl font-black select-none"
                >
                  BRAINLAB
                </div>

                <div className="relative text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#071c43] shadow-md text-amber-400">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 21h18" />
                      <path d="M5 21V7l7-4 7 4v14" />
                      <path d="M9 21v-6h6v6" />
                    </svg>
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
                  <p className="mt-2 text-lg sm:text-xl font-black text-blue-950">
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
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-center">
                        <span className="block text-[10px] font-bold uppercase text-blue-800">
                          Distinction / Grade
                        </span>
                        <span className="font-mono text-base font-black text-blue-950">
                          {cert.grade}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Issuer Signatures, QR Code & Verification Details */}
                  <div className="mt-10 pt-6 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-6 text-left items-center">
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
                        {new Date(cert.issued_at).toLocaleDateString("en-GB", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Official Verification Link
                      </p>
                      <a
                        href={canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block font-mono text-[10px] font-bold text-blue-700 hover:text-blue-900 underline truncate"
                        title={canonicalUrl}
                      >
                        {canonicalUrl}
                      </a>
                    </div>

                    <div className="flex justify-start sm:justify-end">
                      <VerificationQRCode
                        url={canonicalUrl}
                        size={64}
                        label="Scan to verify"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <Link
                  href="/verify"
                  className="font-bold text-blue-700 hover:text-blue-900 transition"
                >
                  ← Verify Another Certificate
                </Link>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        void navigator.share({
                          title: `${cert.recipient_name} — ${cert.title}`,
                          text: `Verified Academic Certificate: ${cert.recipient_name} (${cert.certificate_number})`,
                          url: canonicalUrl,
                        });
                      } else {
                        void navigator.clipboard.writeText(canonicalUrl);
                        toast.success("Verification link copied to clipboard!");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-100 min-h-11"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    <span>Share Verification Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 font-bold text-white shadow-xs transition active:scale-95 min-h-11"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download Certificate PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#012153] px-4 py-2 font-bold text-white transition hover:bg-[#082e6e] min-h-11"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    <span>Print Record</span>
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
