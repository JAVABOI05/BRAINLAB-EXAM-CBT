"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface VerifiedReceipt {
  reference: string;
  provider: string;
  status: string;
  customerEmail: string;
  candidateName: string;
  amountNgn: string;
  planName: string;
  planInterval: string;
  paidAt: string;
  receiptNumber: string;
}

export default function VerifyReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const resolvedParams = use(params);
  const reference = resolvedParams.reference;

  const [receipt, setReceipt] = useState<VerifiedReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function verify() {
      try {
        const res = await fetch(`/api/payments/receipt?reference=${encodeURIComponent(reference)}`);
        const data = await res.json();

        if (!active) return;

        if (res.ok && data.ok) {
          setReceipt(data.receipt);
        } else {
          setError(data.error || "Transaction could not be verified.");
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Verification request failed.");
      } finally {
        if (active) setLoading(false);
      }
    }

    verify();

    return () => {
      active = false;
    };
  }, [reference]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-900">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm text-center">
        {loading && (
          <div className="py-8">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <h2 className="text-lg font-bold text-slate-900">Validating Payment Record...</h2>
            <p className="mt-1 text-xs text-slate-500">Checking BrainLab cryptographic and transaction ledger</p>
          </div>
        )}

        {!loading && error && (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl font-bold text-rose-600">
              ✕
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-rose-800">
              Verification Failed
            </span>
            <h2 className="mt-3 text-xl font-black text-slate-900">Invalid or Unrecognized Reference</h2>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              We could not authenticate any verified payment record matching <code className="font-mono font-bold">{reference}</code>.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex rounded-xl bg-[#012153] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-[#071c43]"
              >
                Go to BrainLab Homepage
              </Link>
            </div>
          </div>
        )}

        {!loading && receipt && (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-bold text-white shadow-sm">
              ✓
            </div>
            <span className="rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              Authentic BrainLab Payment Verified
            </span>

            <h2 className="mt-3 text-2xl font-black text-slate-900">
              ₦{receipt.amountNgn}
            </h2>
            <p className="text-xs font-semibold text-slate-600">
              {receipt.planName} ({receipt.planInterval})
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-left text-xs space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Receipt Number</span>
                <span className="font-bold text-slate-900">{receipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Candidate</span>
                <span className="font-bold text-slate-900">{receipt.candidateName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Payment Gateway</span>
                <span className="font-bold capitalize text-slate-900">{receipt.provider}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Date & Time</span>
                <span className="font-semibold text-slate-700">
                  {new Date(receipt.paidAt).toLocaleString("en-NG")}
                </span>
              </div>
              <div className="flex justify-between items-start pt-1">
                <span className="text-slate-500">Reference</span>
                <span className="font-mono text-[11px] font-bold text-slate-900 break-all text-right max-w-[200px]">
                  {receipt.reference}
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                href={`/account/receipt/${encodeURIComponent(receipt.reference)}`}
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-[#071c43] px-5 py-2.5 text-xs font-bold text-white shadow transition"
              >
                📄 View Official Print Slip
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Go to CBT Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-[11px] text-slate-400">
        BrainLab Academy • Official E-Receipt Cryptographic Verification Gateway
      </p>
    </div>
  );
}
