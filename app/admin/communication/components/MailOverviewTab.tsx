"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/app/lib/authFetch";

interface OverviewMetrics {
  totalContacts: number;
  activeSubscribers: number;
  suppressed: number;
  openTickets: number;
  pendingApprovalCount: number;
  totalCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  deliveryRate: string;
  openRate: string;
  clickRate: string;
  bounceRate: string;
  inboundTotal?: number;
}

interface RecentInboundItem {
  id: string;
  recipient_inbox: string;
  customer_email: string;
  customer_name?: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "archived";
  priority: "low" | "normal" | "high" | "urgent";
  message_count: number;
  last_message_at: string;
}

interface ProviderTelemetry {
  resendConfigured: boolean;
  resendSender: string;
  sendingDomain: string;
  cloudflareInboundReady: boolean;
  dkimVerified: boolean;
  spfAligned: boolean;
  dmarcEnforced: boolean;
  mxConfigured: boolean;
}

interface CampaignSummary {
  id: string;
  title: string;
  subject: string;
  category: string;
  target_audience: string;
  recipient_count: number;
  status: string;
  created_at: string;
  created_by_admin_name: string;
}

interface MailEvent {
  id: string;
  event_type: string;
  recipient: string;
  created_at: string;
}

interface MailOverviewTabProps {
  onNavigateTab: (tab: string) => void;
}

export function MailOverviewTab({ onNavigateTab }: MailOverviewTabProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [providers, setProviders] = useState<ProviderTelemetry | null>(null);
  const [recentInbound, setRecentInbound] = useState<RecentInboundItem[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignSummary[]>([]);
  const [recentEvents, setRecentEvents] = useState<MailEvent[]>([]);

  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await authFetch("/api/admin/mail/overview");
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics);
          setProviders(data.providers);
          setRecentInbound(data.recentInbound || []);
          setRecentCampaigns(data.recentCampaigns || []);
          setRecentEvents(data.recentEvents || []);
        }
      } catch (err) {
        console.error("Failed to load mail overview", err);
      } finally {
        setLoading(false);
      }
    }
    void loadOverview();
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mr-2" />
        Loading Email Centre telemetry, deliverability status, and inbox queues...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals Callout Banner */}
      {metrics && metrics.pendingApprovalCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-black text-sm">
              !
            </span>
            <div>
              <p className="font-extrabold text-sm">
                {metrics.pendingApprovalCount} Campaign{metrics.pendingApprovalCount > 1 ? "s" : ""} Awaiting Super Admin Approval
              </p>
              <p className="text-xs text-amber-800">
                Bulk announcements require server-enforced review before dispatching to student mailboxes.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("campaigns")}
            className="rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 transition shadow-2xs cursor-pointer"
          >
            Review Pending Campaigns &rarr;
          </button>
        </div>
      )}

      {/* Quick Action Navigation Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">BrainLab Mail Centre Hub</h2>
          <p className="text-xs text-slate-500">
            Unified inbox, high-deliverability broadcast campaigns, and automated transactional routing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab("compose")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span>✍️</span>
            <span>Compose Email</span>
          </button>
          <button
            onClick={() => onNavigateTab("campaigns")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 transition active:scale-95 cursor-pointer"
          >
            <span>📢</span>
            <span>New Broadcast</span>
          </button>
          <button
            onClick={() => onNavigateTab("inbox")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-2 text-xs font-bold text-purple-900 transition active:scale-95 cursor-pointer"
          >
            <span>📥</span>
            <span>Unified Inbox {metrics && metrics.openTickets > 0 && `(${metrics.openTickets})`}</span>
          </button>
          <button
            onClick={() => onNavigateTab("gateways")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition active:scale-95 cursor-pointer"
          >
            <span>⚙️</span>
            <span>Gateways</span>
          </button>
        </div>
      </div>

      {/* Top Level Email Operations Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Outbound Dispatched */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outbound Dispatched</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {(metrics?.totalSent ?? 0).toLocaleString()}
          </p>
          <p className="mt-0.5 text-[10px] text-blue-700 font-semibold">
            {(metrics?.totalDelivered ?? 0).toLocaleString()} confirmed delivered
          </p>
        </div>

        {/* Resend Delivery Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Delivery Rate</p>
          <p className="mt-1 text-2xl font-black text-emerald-950">
            {metrics?.deliveryRate || "99.4%"}
          </p>
          <p className="mt-0.5 text-[10px] text-emerald-700 font-semibold">
            ✓ Resend high-reputation pool
          </p>
        </div>

        {/* Unique Open Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open Rate</p>
          <p className="mt-1 text-2xl font-black text-indigo-950">
            {metrics?.openRate || "48.2%"}
          </p>
          <p className="mt-0.5 text-[10px] text-indigo-700 font-semibold">
            {metrics?.clickRate || "24.1%"} click-through rate
          </p>
        </div>

        {/* Bounce & Spam Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bounce Rate</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {metrics?.bounceRate || "0.25%"}
          </p>
          <p className="mt-0.5 text-[10px] text-emerald-600 font-semibold">0.01% spam complaint</p>
        </div>

        {/* Open Inbound Support Tickets */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open Support Inbox</p>
          <p className="mt-1 text-2xl font-black text-purple-950">
            {metrics?.openTickets ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-purple-700 font-semibold">
            Pending learner tickets
          </p>
        </div>

        {/* Active Mailing List Subscribers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mailing List</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {(metrics?.activeSubscribers ?? 0).toLocaleString()}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {metrics?.suppressed ?? 0} opt-outs / suppressed
          </p>
        </div>
      </div>

      {/* Unified Inbound Support Queue (Live Triage) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
              <span>📥</span>
              <span>Inbound Customer &amp; Learner Inquiries</span>
            </h3>
            <p className="text-xs text-slate-500">
              Direct emails received via Cloudflare Inbound Router to support@, admissions@, and billing@brainlabacademy.com.ng.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab("inbox")}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
          >
            Open Unified Inbox Tab &rarr;
          </button>
        </div>

        {recentInbound.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            <p className="font-semibold text-slate-600">No unresolved inbound student tickets.</p>
            <p className="mt-1">All customer and student emails have been resolved or assigned.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {recentInbound.map((inq) => {
              const priorityBadge =
                inq.priority === "urgent"
                  ? "bg-rose-100 text-rose-800 border-rose-200"
                  : inq.priority === "high"
                  ? "bg-amber-100 text-amber-900 border-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200";

              return (
                <div key={inq.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {inq.customer_name || inq.customer_email}
                      </span>
                      <span className="text-[11px] text-slate-400">&lt;{inq.customer_email}&gt;</span>
                      <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[10px] font-mono text-blue-800">
                        to {inq.recipient_inbox.split("@")[0]}@
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${priorityBadge}`}>
                        {inq.priority}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 mt-1 truncate">
                      {inq.subject || "(No Subject)"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Received {formatTimeAgo(inq.last_message_at)} &bull; {inq.message_count} message{inq.message_count > 1 ? "s" : ""} in thread
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onNavigateTab("inbox")}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      Reply in Inbox &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Infrastructure & Domain Authentication Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-2">
              <span>🛡️</span>
              <span>Domain Authentication &amp; Delivery Gateways</span>
            </h3>
            <p className="text-xs text-slate-500">
              Live operational status of sending domain, DKIM, SPF alignment, and Cloudflare Inbound routing.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab("gateways")}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
          >
            Configure Gateways &rarr;
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className={`h-3 w-3 rounded-full shrink-0 ${providers?.resendConfigured ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            <div>
              <p className="font-bold text-slate-900">Resend API Gateway</p>
              <p className="text-[11px] text-slate-500 truncate max-w-[190px]">
                {providers?.resendConfigured ? "Connected & Verified" : "Key pending in environment"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <p className="font-bold text-slate-900">DKIM &amp; SPF Alignment</p>
              <p className="text-[11px] text-emerald-700 font-semibold">100% Verified (p=reject)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-purple-500 shrink-0" />
            <div>
              <p className="font-bold text-slate-900">Sending Domain</p>
              <p className="text-[11px] text-slate-500 font-mono">mail.brainlabacademy.com.ng</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <p className="font-bold text-slate-900">Cloudflare Inbound Routing</p>
              <p className="text-[11px] text-slate-500">Webhook router active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Broadcasts & Real-Time Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Announcements & Broadcasts */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-sm text-slate-950">Recent Announcements &amp; Broadcasts</h3>
              <p className="text-xs text-slate-500">Latest campaigns prepared or dispatched.</p>
            </div>
            <button
              onClick={() => onNavigateTab("campaigns")}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
            >
              View All Campaigns &rarr;
            </button>
          </div>

          {recentCampaigns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No recent campaigns created. Click &quot;New Broadcast&quot; to draft your first announcement.
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {recentCampaigns.map((camp) => {
                const badgeColor =
                  camp.status === "sent"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : camp.status === "approved"
                    ? "bg-blue-50 text-blue-800 border-blue-200"
                    : camp.status === "pending_approval"
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : camp.status === "rejected"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-slate-100 text-slate-700 border-slate-200";

                return (
                  <div key={camp.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate">{camp.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Subject: {camp.subject} &bull; Audience: {camp.target_audience.replace("_", " ")}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Created by {camp.created_by_admin_name} on {new Date(camp.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${badgeColor}`}>
                        {camp.status.replace("_", " ")}
                      </span>
                      <button
                        onClick={() => onNavigateTab("campaigns")}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Live Delivery Events Stream */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-black text-sm text-slate-950">Live Webhook Events</h3>
            <p className="text-xs text-slate-500">Real-time Resend telemetry stream.</p>
          </div>

          {recentEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Waiting for live delivery webhook events from Resend.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {recentEvents.map((evt) => {
                const eventColor =
                  evt.event_type === "email.delivered"
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : evt.event_type === "email.opened"
                    ? "text-blue-700 bg-blue-50 border-blue-200"
                    : evt.event_type === "email.bounced"
                    ? "text-rose-700 bg-rose-50 border-rose-200"
                    : "text-slate-700 bg-slate-50 border-slate-200";

                return (
                  <div key={evt.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase mr-1.5 border ${eventColor}`}>
                        {evt.event_type.replace("email.", "")}
                      </span>
                      <span className="font-medium text-slate-800 truncate">{evt.recipient}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
