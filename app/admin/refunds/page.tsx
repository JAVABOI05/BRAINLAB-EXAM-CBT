"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import "../admin.css";

interface RefundRow {
  id: string;
  user_id: string;
  transaction_id: string;
  plan_id: string;
  amount_kobo: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_notes?: string;
  rejection_reason?: string;
  created_at: string;
  payment_transactions?: {
    reference: string;
    customer_email: string;
    paid_at: string;
    created_at: string;
    amount_kobo: number;
  };
  subscription_plans?: {
    name: string;
  };
}

export default function AdminRefundsPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actionModal, setActionModal] = useState<{
    refund: RefundRow;
    action: "approve" | "reject";
  } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("refund_requests")
      .select("*, payment_transactions(reference, customer_email, paid_at, created_at, amount_kobo), subscription_plans(name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRefunds(data as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);
      await loadRefunds();
    }
    checkAuth();
  }, [router, loadRefunds]);

  async function handleConfirmAction() {
    if (!actionModal) return;
    setProcessing(true);
    setFeedback("");

    const { refund, action } = actionModal;
    const isApprove = action === "approve";

    try {
      // 1. Update refund request status
      const { error: refundErr } = await supabase
        .from("refund_requests")
        .update({
          status: isApprove ? "approved" : "rejected",
          admin_notes: adminNote.trim() || null,
          rejection_reason: !isApprove ? adminNote.trim() || "Rejected by finance review." : null,
          reviewed_by: adminUser?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", refund.id);

      if (refundErr) throw refundErr;

      // 2. If approved, mark transaction as refunded and cancel subscription
      if (isApprove) {
        await supabase
          .from("payment_transactions")
          .update({
            status: "refunded",
            updated_at: new Date().toISOString(),
          })
          .eq("id", refund.transaction_id);

        if (refund.user_id) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", refund.user_id);
        }
      }

      // 3. Log audit record
      await supabase.from("configuration_audit_logs").insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        entity_type: "refund",
        entity_id: refund.id,
        action: "updated",
        previous_value: { status: refund.status },
        new_value: {
          status: isApprove ? "approved" : "rejected",
          notes: adminNote,
          transaction_id: refund.transaction_id,
        },
        change_reason: `Admin ${action} refund for transaction ${refund.payment_transactions?.reference || refund.transaction_id}`,
      });

      setFeedback(`Refund request ${isApprove ? "approved" : "rejected"} successfully.`);
      setActionModal(null);
      setAdminNote("");
      loadRefunds();
    } catch (err) {
      setFeedback("Failed to update refund: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  }

  const filtered = refunds.filter((r) => (filter === "all" ? true : r.status === filter));
  const pendingCount = refunds.filter((r) => r.status === "pending").length;

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Finance &amp; Governance · Refund Queue</div>
              <h1 className="admin-title">Subscription Refunds</h1>
              <p className="admin-subtitle">
                Review and resolve learner refund requests submitted within the 24-hour money-back guarantee window.
              </p>
            </div>
            <div className="admin-actions">
              <button onClick={() => router.push("/admin/pricing")} className="admin-btn-light">
                Plans &amp; Pricing
              </button>
              <button onClick={() => router.push("/admin/coupons")} className="admin-btn-light">
                Coupons
              </button>
              <button onClick={() => router.push("/admin/dashboard")} className="admin-btn-primary">
                Dashboard
              </button>
            </div>
          </div>
        </section>

        {feedback && (
          <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-900">
            {feedback}
          </div>
        )}

        {/* Stats */}
        <section className="admin-section admin-stats">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Pending Requests</p>
            <p className="admin-stat-value text-amber-600">{pendingCount}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Approved Refunds</p>
            <p className="admin-stat-value text-emerald-600">
              {refunds.filter((r) => r.status === "approved").length}
            </p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Total Volume</p>
            <p className="admin-stat-value">{refunds.length}</p>
          </div>
        </section>

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition ${
                filter === tab
                  ? "bg-[#012153] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab} {tab === "pending" && pendingCount > 0 && `(${pendingCount})`}
            </button>
          ))}
        </div>

        {/* Refunds Table */}
        <section className="admin-section admin-card">
          {loading ? (
            <p className="py-8 text-center text-xs font-semibold text-slate-500">
              Loading refund queue...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No refund requests matching &apos;{filter}&apos;.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Candidate / Ref</th>
                    <th className="py-3 px-3">Plan / Amount</th>
                    <th className="py-3 px-3">Payment Time</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((rf) => {
                    const tx = rf.payment_transactions;
                    const paidDate = tx?.paid_at ? new Date(tx.paid_at) : null;
                    const reqDate = new Date(rf.created_at);
                    const hoursElapsed = paidDate
                      ? ((reqDate.getTime() - paidDate.getTime()) / (1000 * 60 * 60)).toFixed(1)
                      : "N/A";

                    return (
                      <tr key={rf.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{tx?.customer_email || "Learner"}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{tx?.reference || rf.transaction_id}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{rf.subscription_plans?.name || rf.plan_id}</p>
                          <p className="text-slate-600">₦{(rf.amount_kobo / 100).toLocaleString()}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-slate-700">{paidDate?.toLocaleDateString() || "N/A"}</p>
                          <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                            Requested +{hoursElapsed}h
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <p className="text-slate-800 line-clamp-2">{rf.reason}</p>
                          {rf.rejection_reason && (
                            <p className="text-[10px] text-rose-600 mt-0.5">Note: {rf.rejection_reason}</p>
                          )}
                        </td>
                        <td className="py-3 px-3">
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
                        </td>
                        <td className="py-3 px-3 text-right">
                          {rf.status === "pending" ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setActionModal({ refund: rf, action: "approve" })}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setActionModal({ refund: rf, action: "reject" })}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Action Modal */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-base font-bold text-slate-900">
                {actionModal.action === "approve" ? "Approve Refund" : "Reject Refund"}
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Amount: ₦{(actionModal.refund.amount_kobo / 100).toLocaleString()} for{" "}
                {actionModal.refund.payment_transactions?.customer_email}
              </p>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  {actionModal.action === "approve" ? "Admin Internal Note" : "Rejection Reason (Visible to Learner)"}
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    actionModal.action === "approve"
                      ? "Optional confirmation note..."
                      : "Explain why this refund is being declined..."
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                  required={actionModal.action === "reject"}
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing || (actionModal.action === "reject" && !adminNote.trim())}
                  onClick={handleConfirmAction}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm ${
                    actionModal.action === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  } disabled:opacity-50`}
                >
                  {processing ? "Processing..." : `Confirm ${actionModal.action === "approve" ? "Approval" : "Rejection"}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
