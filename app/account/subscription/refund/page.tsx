"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

interface Transaction {
  id: string;
  reference: string;
  plan_id: string;
  amount_kobo: number;
  paid_at: string;
  created_at: string;
  status: string;
  subscription_plans?: {
    name: string;
  };
}

interface RefundRequest {
  id: string;
  transaction_id: string;
  amount_kobo: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  created_at: string;
}

export default function StudentRefundPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxId, setSelectedTxId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }

    setUser(auth.user);

    // Fetch transactions
    const { data: txs } = await supabase
      .from("payment_transactions")
      .select("id, reference, plan_id, amount_kobo, paid_at, created_at, status, subscription_plans(name)")
      .eq("user_id", auth.user.id)
      .eq("status", "success")
      .order("created_at", { ascending: false });

    if (txs) setTransactions(txs as unknown as Transaction[]);

    // Fetch existing refunds
    const { data: rfs } = await supabase
      .from("refund_requests")
      .select("id, transaction_id, amount_kobo, reason, status, rejection_reason, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (rfs) setRefunds(rfs as unknown as RefundRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getHoursElapsed(tx: Transaction) {
    const timestamp = new Date(tx.paid_at || tx.created_at).getTime();
    const now = Date.now();
    return (now - timestamp) / (1000 * 60 * 60);
  }

  async function handleSubmitRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTxId || !reason.trim()) {
      setMessage({ type: "error", text: "Please select an eligible transaction and provide a reason." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc("submit_refund_request", {
        p_transaction_id: selectedTxId,
        p_reason: reason.trim(),
      });

      if (error || !data?.ok) {
        setMessage({
          type: "error",
          text: data?.message || error?.message || "Failed to submit refund request.",
        });
      } else {
        setMessage({
          type: "success",
          text: "Your refund request was submitted successfully and is queued for finance review.",
        });
        setReason("");
        setSelectedTxId("");
        loadData();
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error submitting request.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-8">
            <Link
              href="/pricing"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              ← Back to Pricing &amp; Plans
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Subscription Refund Portal
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              BrainLab offers a 100% unconditional refund within 24 hours of payment if our learning tools do not meet your study needs.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Left 2 Cols: Request Form */}
            <div className="md:col-span-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Submit Refund Request</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select a subscription payment made within the past 24 hours.
                </p>

                {message && (
                  <div
                    className={`mt-4 rounded-xl p-3.5 text-xs font-semibold ${
                      message.type === "success"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border border-rose-200 bg-rose-50 text-rose-800"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {!user && !loading && (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <p className="text-xs font-semibold text-amber-900">
                      Please sign in to view your payment history and submit refund requests.
                    </p>
                    <Link
                      href="/login?next=/account/subscription/refund"
                      className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Sign In Now
                    </Link>
                  </div>
                )}

                {user && (
                  <form onSubmit={handleSubmitRefund} className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Select Payment Transaction
                      </label>
                      <select
                        value={selectedTxId}
                        onChange={(e) => setSelectedTxId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-none"
                        required
                      >
                        <option value="">-- Choose a transaction --</option>
                        {transactions.map((tx) => {
                          const hours = getHoursElapsed(tx);
                          const isEligible = hours <= 24;
                          const hasExisting = refunds.some((r) => r.transaction_id === tx.id);

                          return (
                            <option
                              key={tx.id}
                              value={tx.id}
                              disabled={!isEligible || hasExisting}
                            >
                              {tx.subscription_plans?.name || "Subscription"} (₦
                              {(tx.amount_kobo / 100).toLocaleString()}) - Ref: {tx.reference} -{" "}
                              {hasExisting
                                ? "Already Requested"
                                : isEligible
                                ? `Eligible (${(24 - hours).toFixed(1)}h remaining)`
                                : "Expired (>24h)"}
                            </option>
                          );
                        })}
                      </select>
                      {transactions.length === 0 && !loading && (
                        <p className="mt-1 text-xs text-slate-500">
                          No successful payments found on this account.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Reason for Refund
                      </label>
                      <textarea
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please tell us why you are requesting a refund so we can improve our learning tools..."
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !selectedTxId}
                      className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? "Submitting Request..." : "Submit Refund Request →"}
                    </button>
                  </form>
                )}
              </section>

              {/* Refund History */}
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Your Refund Requests</h2>
                <div className="mt-4 space-y-3">
                  {refunds.length === 0 ? (
                    <p className="text-xs text-slate-500">No refund requests submitted yet.</p>
                  ) : (
                    refunds.map((rf) => (
                      <div
                        key={rf.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              ₦{(rf.amount_kobo / 100).toLocaleString()}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                rf.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : rf.status === "rejected"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {rf.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            <strong>Reason:</strong> {rf.reason}
                          </p>
                          {rf.rejection_reason && (
                            <p className="mt-0.5 text-xs text-rose-700">
                              <strong>Decision note:</strong> {rf.rejection_reason}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(rf.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Right 1 Col: Policy Details */}
            <div>
              <aside className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-xs text-slate-700 space-y-3">
                <h3 className="font-extrabold text-blue-950 uppercase tracking-wider">
                  Policy Summary
                </h3>
                <p>
                  <strong>24-Hour Window:</strong> Subscriptions cancelled or refunded within 24 hours of transaction authorization qualify for 100% money-back.
                </p>
                <p>
                  <strong>Processing Time:</strong> Approved refunds are credited back to your original payment card via Paystack within 3 to 5 business days.
                </p>
                <p>
                  <strong>Beyond 24 Hours:</strong> Subscriptions older than 24 hours cannot be refunded, but can be cancelled at any time to prevent future monthly charges.
                </p>
                <div className="border-t border-blue-200 pt-3">
                  <p className="font-semibold text-blue-900">Need direct human assistance?</p>
                  <p className="mt-0.5">
                    Email: <a href="mailto:support@brainlabacademy.com.ng" className="underline font-bold">support@brainlabacademy.com.ng</a>
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>

          </div>
  );
}
