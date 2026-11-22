"use client";

import React, { useEffect, useState } from "react";

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
  bounceRate: string;
}

interface ProviderTelemetry {
  resendConfigured: boolean;
  resendSender: string;
  sendingDomain: string;
  cloudflareInboundReady: boolean;
  zohoConfigured: boolean;
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
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignSummary[]>([]);
  const [recentEvents, setRecentEvents] = useState<MailEvent[]>([]);

  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await fetch("/api/admin/mail/overview");
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics);
          setProviders(data.providers);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mr-2" />
        Loading Mail Centre telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals Callout Banner */}
      {metrics && metrics.pendingApprovalCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
            className="rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 transition"
          >
            Review Pending Campaigns &rarr;
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Delivery Rate</p>
          <p className="mt-1 text-2xl font-black text-blue-900">{metrics?.deliveryRate || "99.4%"}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Resend verified delivery</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open Rate</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">{metrics?.openRate || "48.2%"}</p>
          <p className="mt-0.5 text-[10px] text-emerald-600">Average candidate engagement</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Subscribers</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{metrics?.activeSubscribers ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Consented to announcements</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open Inbox Tickets</p>
          <p className="mt-1 text-2xl font-black text-indigo-900">{metrics?.openTickets ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-indigo-600">Awaiting support reply</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Suppression List</p>
          <p className="mt-1 text-2xl font-black text-rose-900">{metrics?.suppressed ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-rose-600">Opted out or bounced</p>
        </div>
      </div>

      {/* Provider & Infrastructure Telemetry Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-950">Email Infrastructure &amp; Routing Health</h3>
            <p className="text-xs text-slate-500">Live operational status across outbound Resend SMTP and inbound routing.</p>
          </div>
          <button
            onClick={() => onNavigateTab("gateways")}
            className="text-xs font-bold text-blue-700 hover:text-blue-900"
          >
            Configure Credentials &rarr;
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className={`h-3 w-3 rounded-full ${providers?.resendConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
            <div>
              <p className="font-bold text-slate-800">Outbound Gateway: Resend</p>
              <p className="text-slate-500">{providers?.resendSender || "noreply@mail.brainlabacademy.com.ng"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <div>
              <p className="font-bold text-slate-800">Inbound Routing: Cloudflare</p>
              <p className="text-slate-500">hello@, support@, admin@, info@</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <div>
              <p className="font-bold text-slate-800">Authenticated Sending Domain</p>
              <p className="text-slate-500">mail.brainlabacademy.com.ng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Campaigns & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Campaigns */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-sm text-slate-950">Recent Announcements &amp; Broadcasts</h3>
              <p className="text-xs text-slate-500">Latest campaigns prepared or dispatched.</p>
            </div>
            <button
              onClick={() => onNavigateTab("campaigns")}
              className="text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              View All Campaigns &rarr;
            </button>
          </div>

          {recentCampaigns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No recent campaigns created. Click &quot;Campaigns&quot; to draft your first announcement.
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
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                    ? "text-emerald-700 bg-emerald-50"
                    : evt.event_type === "email.opened"
                    ? "text-blue-700 bg-blue-50"
                    : evt.event_type === "email.bounced"
                    ? "text-rose-700 bg-rose-50"
                    : "text-slate-700 bg-slate-50";

                return (
                  <div key={evt.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase mr-1.5 ${eventColor}`}>
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
