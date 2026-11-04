"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";

interface ReceiptData {
  reference: string;
  providerReference: string;
  provider: string;
  status: string;
  customerEmail: string;
  candidateName: string;
  amountKobo: number;
  amountNgn: string;
  discountKobo: number;
  discountNgn: string;
  subtotalKobo: number;
  subtotalNgn: string;
  currency: string;
  planId: string;
  planName: string;
  planInterval: string;
  paidAt: string;
  createdAt: string;
  receiptNumber: string;
  metadata: Record<string, unknown>;
}

export default function CandidateReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const resolvedParams = use(params);
  const reference = resolvedParams.reference;

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchReceipt() {
      try {
        const res = await fetch(`/api/payments/receipt?reference=${encodeURIComponent(reference)}`);
        const data = await res.json();

        if (!active) return;

        if (res.ok && data.ok) {
          setReceipt(data.receipt);
        } else {
          setError(data.error || "Receipt could not be located.");
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Network error loading receipt.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchReceipt();

    return () => {
      active = false;
    };
  }, [reference]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600">Generating Official Receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 font-bold text-xl">
            ✕
          </div>
          <h1 className="text-xl font-bold text-slate-900">Receipt Not Available</h1>
          <p className="mt-2 text-sm text-slate-600">{error || "Unable to display receipt for this reference."}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#012153] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-[#071c43]"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Subscription Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(receipt.paidAt).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const providerLabel =
    receipt.provider === "flutterwave"
      ? "Flutterwave"
      : receipt.provider === "bachs"
      ? "Bachs Payment Engine"
      : receipt.provider === "bank_transfer"
      ? "Direct Bank Transfer"
      : "Paystack";

  const verificationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/receipt/${encodeURIComponent(receipt.reference)}`
      : `https://www.brainlabacademy.com.ng/verify/receipt/${encodeURIComponent(receipt.reference)}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=4&data=${encodeURIComponent(
    verificationUrl
  )}`;

  const returnUrl = typeof receipt.metadata?.return_url === "string" ? receipt.metadata.return_url.trim() : "";
  const safeReturnUrl = returnUrl.startsWith("/") && !returnUrl.startsWith("//") && !returnUrl.startsWith("/\\") ? returnUrl : "";
  const returnLabel = safeReturnUrl.includes("correction")
    ? "Test Corrections & Solutions"
    : safeReturnUrl.includes("classroom")
    ? "Interactive Classroom"
    : safeReturnUrl.includes("exam") || safeReturnUrl.includes("cbt")
    ? "Exam Simulator"
    : safeReturnUrl.includes("learn")
    ? "Learning Hub"
    : "Previous Page";

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-receipt-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Screen Action Bar (Hidden during printing) */}
      <div className="mx-auto mb-6 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            ← Back to Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500">
            Official Receipt #{receipt.receiptNumber}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-[#012153] hover:bg-[#071c43] px-5 py-2.5 text-xs font-bold text-white shadow transition active:scale-95"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Download / Print Receipt (PDF)
          </button>
        </div>
      </div>

      {/* Main Printable Receipt Sheet */}
      <div className="print-receipt-sheet mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm text-slate-900">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-8 border-b border-slate-200 gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#012153] text-2xl font-black text-white shadow-sm">
              BL
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#012153]">
                BRAINLAB ACADEMY
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Advanced CBT Testing & Academic Preparatory System
              </p>
              <p className="text-[11px] text-slate-400">
                Official E-Receipt & Proof of Payment
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Paid & Verified
            </span>
            <span className="mt-2 text-xs font-bold text-slate-900">
              Receipt No: {receipt.receiptNumber}
            </span>
            <span className="text-[11px] text-slate-500">{formattedDate}</span>
          </div>
        </div>

        {/* Candidate & Transaction Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-8 border-b border-slate-200 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Billed To Candidate
            </p>
            <p className="mt-1 text-sm font-black text-slate-900">
              {receipt.candidateName}
            </p>
            <p className="text-slate-600">{receipt.customerEmail}</p>
            <p className="mt-2 text-[11px] text-slate-500">
              Access Type: Student Account (Active CBT Tier)
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Transaction Details
            </p>
            <p className="mt-1 text-xs font-mono font-bold text-slate-900 break-all">
              Ref: {receipt.reference}
            </p>
            <p className="text-slate-600">
              Provider: <span className="font-semibold">{providerLabel}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Provider Reference: {receipt.providerReference}
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-8">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">
            Payment Breakdown
          </p>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="pb-3 font-semibold uppercase tracking-wider">Item & Description</th>
                <th className="pb-3 text-center font-semibold uppercase tracking-wider">Billing Cycle</th>
                <th className="pb-3 text-right font-semibold uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-4">
                  <p className="font-bold text-slate-900">{receipt.planName}</p>
                  <p className="text-[11px] text-slate-500">
                    Full CBT access, timed mock exams, AI tutor feedback, and subject performance analysis.
                  </p>
                </td>
                <td className="py-4 text-center font-medium capitalize text-slate-600">
                  {receipt.planInterval}
                </td>
                <td className="py-4 text-right font-bold text-slate-900">
                  ₦{receipt.subtotalNgn}
                </td>
              </tr>

              {receipt.discountKobo > 0 && (
                <tr className="text-emerald-700 bg-emerald-50/50">
                  <td className="py-2.5 px-2 font-medium">
                    Coupon / Campaign Discount Applied
                  </td>
                  <td className="py-2.5 text-center font-medium text-emerald-600">
                    Promo
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold">
                    -₦{receipt.discountNgn}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 text-sm">
                <td colSpan={2} className="pt-4 font-black text-slate-900">
                  Total Paid ({receipt.currency}):
                </td>
                <td className="pt-4 text-right font-black text-xl text-[#012153]">
                  ₦{receipt.amountNgn}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Verification & Digital Signature Footer */}
        <div className="mt-8 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 rounded-xl border border-slate-200 bg-white p-1 shadow-sm flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="Verification QR Code"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Official Digital Verification
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                Scan this QR code with any mobile camera or visit our verification portal to validate the authenticity of this receipt.
              </p>
              <Link
                href={`/verify/receipt/${encodeURIComponent(receipt.reference)}`}
                className="mt-1 inline-block text-[11px] font-semibold text-blue-700 underline no-print"
                target="_blank"
              >
                Open Verification Link ↗
              </Link>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="inline-block rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2 text-left">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
                BrainLab Guarantee
              </p>
              <p className="text-[11px] text-blue-800">
                24-Hour 100% Satisfaction Policy
              </p>
            </div>
            <p className="mt-3 text-[10px] text-slate-400">
              BrainLab CBT Academy • support@brainlabacademy.com.ng
            </p>
          </div>
        </div>
      </div>

      {/* Screen Footer Back Link */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 text-center no-print">
        {safeReturnUrl && (
          <Link
            href={safeReturnUrl}
            className="rounded-xl bg-[#012153] px-6 py-3 text-xs font-black text-white shadow-md transition hover:bg-[#071c43] active:scale-95"
          >
            ← Return to {returnLabel}
          </Link>
        )}
        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
        >
          Go to Candidate Dashboard
        </Link>
      </div>
    </div>
  );
}
