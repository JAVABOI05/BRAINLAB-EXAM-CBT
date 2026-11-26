"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/app/lib/authFetch";

interface Campaign {
  id: string;
  title: string;
  subject: string;
  preview_text?: string;
  body_html: string;
  body_text?: string;
  category: "marketing" | "service_notification" | "transactional";
  target_audience: "all_registered" | "active_subscribers" | "paid_tiers" | "custom_filter";
  recipient_count: number;
  status: "draft" | "submitted" | "pending_approval" | "approved" | "rejected" | "queued" | "sending" | "sent" | "failed";
  created_by_admin_id: string;
  created_by_admin_name: string;
  submitted_at?: string;
  approved_by_admin_id?: string;
  approved_by_admin_name?: string;
  approved_at?: string;
  rejection_reason?: string;
  approval_snapshot?: Record<string, unknown>;
  sent_at?: string;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    failed: number;
  };
  created_at: string;
}

interface MailCampaignsTabProps {
  currentAdminId?: string;
  isSuperAdmin?: boolean;
}

export function MailCampaignsTab({ currentAdminId, isSuperAdmin }: MailCampaignsTabProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Selected Campaign for Review Modal
  const [reviewCampaign, setReviewCampaign] = useState<Campaign | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Create Campaign Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createSubject, setCreateSubject] = useState("");
  const [createAudience, setCreateAudience] = useState<Campaign["target_audience"]>("active_subscribers");
  const [createCategory, setCreateCategory] = useState<Campaign["category"]>("marketing");
  const [createHtml, setCreateHtml] = useState("");
  const [submitForApprovalImmediately, setSubmitForApprovalImmediately] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const url = statusFilter === "all" ? "/api/admin/mail/campaigns" : `/api/admin/mail/campaigns?status=${statusFilter}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch {
      setFeedback({ text: "Failed to load campaigns", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCampaigns();
  }, [statusFilter]);

  // Handle Approve Campaign
  const handleApprove = async () => {
    if (!reviewCampaign) return;
    setProcessingAction(true);
    setFeedback(null);

    try {
      const res = await authFetch(`/api/admin/mail/campaigns/${reviewCampaign.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ super_admin_self_override: isSuperAdmin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `✓ Campaign approved for dispatch: ${data.message}`, type: "success" });
        setReviewCampaign(null);
        void fetchCampaigns();
      } else {
        setFeedback({ text: data.error || "Approval failed", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Reject Campaign
  const handleReject = async () => {
    if (!reviewCampaign || !rejectReason.trim()) return;
    setProcessingAction(true);
    setFeedback(null);

    try {
      const res = await authFetch(`/api/admin/mail/campaigns/${reviewCampaign.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `✓ Campaign rejected: ${rejectReason}`, type: "success" });
        setReviewCampaign(null);
        setShowRejectBox(false);
        setRejectReason("");
        void fetchCampaigns();
      } else {
        setFeedback({ text: data.error || "Rejection failed", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Dispatch Approved Campaign
  const handleDispatch = async (campaignId: string) => {
    const confirmed = window.confirm(
      "Dispatch this approved broadcast campaign to target recipients?\n\nThis will send personalized emails via Resend. Unsubscribed learners will be automatically protected."
    );
    if (!confirmed) return;

    setProcessingAction(true);
    setFeedback(null);

    try {
      const res = await authFetch(`/api/admin/mail/campaigns/${campaignId}/dispatch`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.simulated) {
          setFeedback({ text: data.message || "⚠️ Broadcast simulated locally. Configure RESEND_API_KEY in Gateways to deliver live emails.", type: "error" });
        } else {
          setFeedback({ text: `✓ Dispatch completed: ${data.message}`, type: "success" });
        }
        setReviewCampaign(null);
        void fetchCampaigns();
      } else {
        setFeedback({ text: data.error || "Dispatch failed", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Create Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle || !createSubject || !createHtml) return;

    setSavingCampaign(true);
    setFeedback(null);

    try {
      const res = await authFetch("/api/admin/mail/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle,
          subject: createSubject,
          target_audience: createAudience,
          category: createCategory,
          body_html: createHtml,
          submit_for_approval: submitForApprovalImmediately,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateModal(false);
        setCreateTitle("");
        setCreateSubject("");
        setCreateHtml("");
        setFeedback({
          text: submitForApprovalImmediately
            ? "✓ Campaign created and submitted for Super Admin approval."
            : "✓ Campaign draft saved.",
          type: "success",
        });
        void fetchCampaigns();
      } else {
        setFeedback({ text: data.error || "Failed to create campaign", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setSavingCampaign(false);
    }
  };

  const STATUS_TABS = [
    { id: "all", label: "All Campaigns" },
    { id: "pending_approval", label: "Pending Approval" },
    { id: "approved", label: "Approved" },
    { id: "draft", label: "Drafts" },
    { id: "sent", label: "Dispatched (Sent)" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        {/* Status Switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition shadow-sm shrink-0 flex items-center gap-1.5"
        >
          <span>+</span> Create New Campaign
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl p-3 text-xs font-semibold ${
            feedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Campaigns Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No campaigns found matching filter &quot;{statusFilter}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Campaign Title &amp; Subject</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4">Governance Status</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((camp) => {
                  const statusColors: Record<string, string> = {
                    draft: "bg-slate-100 text-slate-700 border-slate-200",
                    pending_approval: "bg-amber-100 text-amber-900 border-amber-300",
                    approved: "bg-blue-100 text-blue-900 border-blue-300",
                    sending: "bg-purple-100 text-purple-900 border-purple-300 animate-pulse",
                    sent: "bg-emerald-100 text-emerald-900 border-emerald-300",
                    rejected: "bg-rose-100 text-rose-900 border-rose-300",
                    failed: "bg-red-100 text-red-900 border-red-300",
                  };

                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="font-extrabold text-slate-900 truncate">{camp.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{camp.subject}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="capitalize text-slate-700 font-medium">
                          {camp.target_audience.replace("_", " ")}
                        </span>
                        <div className="text-[10px] text-slate-400 capitalize">{camp.category}</div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {camp.recipient_count > 0 ? camp.recipient_count : "—"}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${
                            statusColors[camp.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {camp.status.replace("_", " ")}
                        </span>
                        {camp.rejection_reason && (
                          <p className="mt-0.5 text-[10px] text-rose-700 truncate max-w-[150px]">
                            {camp.rejection_reason}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        <p className="font-medium text-slate-900">{camp.created_by_admin_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(camp.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {camp.status === "pending_approval" && (
                            <button
                              onClick={() => {
                                setReviewCampaign(camp);
                                setShowRejectBox(false);
                              }}
                              className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-700 shadow-2xs"
                            >
                              Review &amp; Approve
                            </button>
                          )}

                          {camp.status === "approved" && (
                            <button
                              onClick={() => handleDispatch(camp.id)}
                              disabled={processingAction}
                              className="rounded-lg bg-blue-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-800 shadow-2xs"
                            >
                              Dispatch Now &rarr;
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setReviewCampaign(camp);
                              setShowRejectBox(false);
                            }}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Approval Modal */}
      {reviewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">
                  Governance Review
                </span>
                <h3 className="text-base font-black text-slate-950">{reviewCampaign.title}</h3>
              </div>
              <button
                onClick={() => setReviewCampaign(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Campaign Metadata & Content Scroll Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Anti Self-Approval Warning */}
              {reviewCampaign.created_by_admin_id === currentAdminId && !isSuperAdmin && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 font-medium">
                  ⚠️ <strong>Governance Policy Notice:</strong> You are the author of this campaign. Under BrainLab
                  approval regulations, creators cannot self-approve broadcasts. A separate administrator must review
                  and authorize dispatch.
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                  <span className="font-extrabold uppercase text-slate-900">{reviewCampaign.status}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Audience</span>
                  <span className="font-extrabold text-slate-900 capitalize">
                    {reviewCampaign.target_audience.replace("_", " ")}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Recipients</span>
                  <span className="font-extrabold text-slate-900">{reviewCampaign.recipient_count}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Category</span>
                  <span className="font-extrabold uppercase text-slate-900">{reviewCampaign.category}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Subject Line</label>
                <div className="mt-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900">
                  {reviewCampaign.subject}
                </div>
              </div>

              {/* Rendered HTML Preview */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Message Body Preview</label>
                <div
                  className="mt-1 p-4 rounded-xl border border-slate-200 bg-slate-50/50 max-h-60 overflow-y-auto text-xs"
                  dangerouslySetInnerHTML={{ __html: reviewCampaign.body_html }}
                />
              </div>

              {/* Rejection input box if triggered */}
              {showRejectBox && (
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 space-y-2">
                  <label className="text-xs font-bold text-rose-900">Reason for Rejection *</label>
                  <textarea
                    rows={2}
                    placeholder="Provide specific feedback or required edits..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full rounded-lg border border-rose-300 p-2 text-xs text-slate-900 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(false)}
                      className="px-3 py-1 rounded text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={processingAction || !rejectReason.trim()}
                      onClick={handleReject}
                      className="px-3 py-1 rounded bg-rose-700 text-white text-xs font-bold hover:bg-rose-800"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setReviewCampaign(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {reviewCampaign.status === "pending_approval" && !showRejectBox && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(true)}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                    >
                      Reject Campaign
                    </button>

                    <button
                      type="button"
                      disabled={
                        processingAction ||
                        (reviewCampaign.created_by_admin_id === currentAdminId && !isSuperAdmin)
                      }
                      onClick={handleApprove}
                      className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-40 transition shadow-sm"
                    >
                      {processingAction ? "Approving..." : "Approve for Dispatch ✓"}
                    </button>
                  </>
                )}

                {reviewCampaign.status === "approved" && (
                  <button
                    type="button"
                    disabled={processingAction}
                    onClick={() => handleDispatch(reviewCampaign.id)}
                    className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-sm"
                  >
                    {processingAction ? "Dispatching..." : "Dispatch Campaign Now &rarr;"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">
                  New Announcement
                </span>
                <h3 className="text-base font-black text-slate-950">Draft Email Broadcast Campaign</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="flex-1 overflow-y-auto py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Title (Internal Reference) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. November WAEC Prep Webinar Announcement"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject Line *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master High-Yield Chemistry with BrainLab This Weekend"
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={createAudience}
                    onChange={(e) => setCreateAudience(e.target.value as Campaign["target_audience"])}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="active_subscribers">Active Subscribers (Consented Only)</option>
                    <option value="paid_tiers">Paid Subscription Candidates</option>
                    <option value="all_registered">All Registered Learners</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value as Campaign["category"])}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="marketing">Marketing &amp; Promotions (Respects Consent)</option>
                    <option value="service_notification">Service Notification</option>
                    <option value="transactional">Transactional Notice</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">HTML Content Body *</label>
                  <span className="text-[10px] text-slate-400">Tokens: {`{{first_name}}`}, {`{{unsubscribe_url}}`}</span>
                </div>
                <textarea
                  required
                  rows={8}
                  placeholder="<p>Hello {{first_name}},</p><p>We are launching our live revision session...</p>"
                  value={createHtml}
                  onChange={(e) => setCreateHtml(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="submitApproval"
                  checked={submitForApprovalImmediately}
                  onChange={(e) => setSubmitForApprovalImmediately(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="submitApproval" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Submit immediately for Super Admin review and approval
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCampaign}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 shadow-sm"
                >
                  {savingCampaign ? "Saving..." : submitForApprovalImmediately ? "Submit for Approval &rarr;" : "Save as Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
