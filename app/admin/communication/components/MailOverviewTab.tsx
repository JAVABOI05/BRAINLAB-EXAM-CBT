"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/app/lib/authFetch";
import { normalizeWhatsAppNumber } from "@/app/lib/whatsapp";

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

interface RecentSignup {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  createdAt: string;
  emailConfirmed: boolean;
}

interface DailyTrendItem {
  date: string;
  label: string;
  count: number;
}

interface UserAnalytics {
  totalRegisteredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersWithPhone: number;
  phoneCoverageRate: string;
  emailConfirmedCount: number;
  emailConfirmedRate: string;
  activeSubscribers: number;
  newSubscribersThisWeek: number;
  optOutCount: number;
  optOutRate: string;
  paidSubscribers: number;
  dailyTrend: DailyTrendItem[];
  recentSignups: RecentSignup[];
}

interface ProviderTelemetry {
  resendConfigured: boolean;
  resendSender: string;
  sendingDomain: string;
  cloudflareInboundReady: boolean;
  zohoConfigured: boolean;
  termiiConfigured?: boolean;
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
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [providers, setProviders] = useState<ProviderTelemetry | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignSummary[]>([]);
  const [recentEvents, setRecentEvents] = useState<MailEvent[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await authFetch("/api/admin/mail/overview");
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics);
          setAnalytics(data.analytics || null);
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

  const handleCopyPhone = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatJoinedTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mr-2" />
        Loading Mail Centre telemetry and subscriber analytics...
      </div>
    );
  }

  // Calculate highest daily sign-up value for SVG/CSS relative bar scale
  const maxTrendCount = Math.max(
    ...(analytics?.dailyTrend?.map((t) => t.count) || [1]),
    4
  );

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
            className="rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 transition shadow-2xs"
          >
            Review Pending Campaigns &rarr;
          </button>
        </div>
      )}

      {/* Top Level Vital Numbers Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Candidates */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Registered Users</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {analytics?.totalRegisteredUsers ?? metrics?.totalContacts ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-blue-700 font-semibold">
            +{analytics?.newUsersThisWeek ?? 0} new this week
          </p>
        </div>

        {/* New Sign-ups Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sign-ups Today</p>
          <p className="mt-1 text-2xl font-black text-emerald-950">
            {analytics?.newUsersToday ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-emerald-700 font-semibold">
            {analytics?.newUsersThisMonth ?? 0} in last 30 days
          </p>
        </div>

        {/* Reachable by Phone */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">📱 Mobile Reach</p>
          <p className="mt-1 text-2xl font-black text-indigo-950">
            {analytics?.usersWithPhone ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-indigo-700 font-semibold">
            {analytics?.phoneCoverageRate || "0%"} SMS/WhatsApp ready
          </p>
        </div>

        {/* Active Subscribers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Subscribers</p>
          <p className="mt-1 text-2xl font-black text-blue-900">
            {analytics?.activeSubscribers ?? metrics?.activeSubscribers ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">Consented for newsletters</p>
        </div>

        {/* Resend Delivery Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Delivery Rate</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">
            {metrics?.deliveryRate || "99.4%"}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Resend verified</p>
        </div>

        {/* Open Support Tickets */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Support Inbox</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {metrics?.openTickets ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-indigo-600 font-semibold">Open learner tickets</p>
        </div>
      </div>

      {/* Analytics Panel: New Registered Users & Subscribers Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Velocity Bar Chart (Last 14 Days) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-950">
                📈 Candidate Registrations &amp; Sign-up Growth Trend
              </h3>
              <p className="text-xs text-slate-500">
                Daily new learner onboarding velocity over the past 14 days.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                This Week: <strong>+{analytics?.newUsersThisWeek ?? 0}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                This Month: <strong>+{analytics?.newUsersThisMonth ?? 0}</strong>
              </span>
            </div>
          </div>

          {/* Pure CSS / SVG Velocity Bars */}
          <div className="mt-6">
            <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-36 pt-4 px-1">
              {analytics?.dailyTrend && analytics.dailyTrend.length > 0 ? (
                analytics.dailyTrend.map((t, idx) => {
                  const barHeightPercent = Math.max(8, Math.round((t.count / maxTrendCount) * 100));
                  const isToday = idx === analytics.dailyTrend.length - 1;

                  return (
                    <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none z-10">
                        {t.label}: {t.count} signup{t.count === 1 ? "" : "s"}
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[28px] flex items-end justify-center h-full">
                        <div
                          style={{ height: `${barHeightPercent}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            isToday
                              ? "bg-blue-600 shadow-sm"
                              : t.count > 0
                              ? "bg-blue-400/80 hover:bg-blue-600"
                              : "bg-slate-200/80"
                          }`}
                        />
                      </div>

                      {/* Date Label */}
                      <span className="text-[9px] text-slate-500 font-bold rotate-0 truncate">
                        {t.label.split(" ")[1] || t.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center w-full h-full text-slate-400 text-xs">
                  Awaiting sign-up telemetry data.
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3">
              Last 14 days daily candidate registration volume &bull; Real-time synced with Supabase Auth
            </p>
          </div>
        </div>

        {/* Audience Reachability & Channel Diagnostics */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-950">📡 Broadcast &amp; SMS Reachability</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-channel delivery capability across email, Termii SMS, and WhatsApp alerts.
            </p>

            <div className="mt-5 space-y-4 text-xs">
              {/* Verified Email Delivery */}
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>✉️ Email Delivery Reach</span>
                  <span className="text-slate-900 font-extrabold">{analytics?.emailConfirmedRate || "100%"}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: analytics?.emailConfirmedRate || "100%" }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {analytics?.totalRegisteredUsers ?? 0} candidate inboxes reachable via Resend
                </p>
              </div>

              {/* Mobile Phone Coverage */}
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>📱 Phone &amp; SMS Reach (Termii)</span>
                  <span className="text-slate-900 font-extrabold">{analytics?.phoneCoverageRate || "0%"}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: analytics?.phoneCoverageRate || "0%" }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {analytics?.usersWithPhone ?? 0} mobile numbers registered for SMS score slips &amp; alerts
                </p>
              </div>

              {/* Newsletter Opt-in Rate */}
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>📢 Announcement Opt-In</span>
                  <span className="text-slate-900 font-extrabold">
                    {analytics?.totalRegisteredUsers && analytics.totalRegisteredUsers > 0
                      ? `${(((analytics.activeSubscribers || 1) / analytics.totalRegisteredUsers) * 100).toFixed(0)}%`
                      : "100%"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                    style={{
                      width: analytics?.totalRegisteredUsers
                        ? `${Math.min(100, Math.round(((analytics.activeSubscribers || 1) / analytics.totalRegisteredUsers) * 100))}%`
                        : "100%",
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Opt-out rate: {analytics?.optOutRate || "0.0%"} ({analytics?.optOutCount ?? 0} suppressed)
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab("contacts")}
            className="mt-6 w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 transition text-center shadow-xs"
          >
            Access Full Candidate Directory &rarr;
          </button>
        </div>
      </div>

      {/* Stream of Recent Sign-ups & Quick Contact */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-950">
              ⚡ Live Candidate Sign-ups Stream &amp; Phone Contact
            </h3>
            <p className="text-xs text-slate-500">
              Real-time feed of new student registrations with phone numbers, verification, and WhatsApp access.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab("contacts")}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-slate-50 transition shrink-0"
          >
            Manage All Contacts &rarr;
          </button>
        </div>

        {analytics?.recentSignups && analytics.recentSignups.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Student Name &amp; Email</th>
                  <th className="py-2.5 px-3">Phone &amp; WhatsApp</th>
                  <th className="py-2.5 px-3">Registration Date</th>
                  <th className="py-2.5 px-3">Email Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.recentSignups.map((user) => {
                  const hasPhone = Boolean(user.phone && user.phone.replace(/\D/g, "").length >= 9);
                  const cleanPhone = user.phone ? user.phone.trim() : null;
                  const waNumber = hasPhone ? normalizeWhatsAppNumber(cleanPhone) : null;
                  const waUrl = waNumber
                    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${user.fullName}, this is BrainLab Academy support regarding your candidate account.`)}`
                    : null;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3">
                        <p className="font-extrabold text-slate-900">{user.fullName}</p>
                        <p className="text-[11px] font-mono text-slate-500">{user.email}</p>
                      </td>

                      <td className="py-2.5 px-3">
                        {hasPhone && cleanPhone ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {cleanPhone}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(user.id, cleanPhone)}
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold border border-slate-300 text-slate-600 hover:bg-slate-100"
                            >
                              {copiedId === user.id ? "✓" : "Copy"}
                            </button>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200"
                              >
                                <span>💬</span> WA
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">— No phone</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                        {formatJoinedTime(user.createdAt)}
                      </td>

                      <td className="py-2.5 px-3">
                        {user.emailConfirmed ? (
                          <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigateTab("contacts")}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                        >
                          View in Directory &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            Click &quot;Manage All Contacts&quot; to index your active candidates.
          </div>
        )}
      </div>

      {/* Provider & Infrastructure Telemetry Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-950">Email Infrastructure &amp; Telecom Gateways</h3>
            <p className="text-xs text-slate-500">Live operational status across Resend SMTP, Termii SMS, and Cloudflare Inbound routing.</p>
          </div>
          <button
            onClick={() => onNavigateTab("gateways")}
            className="text-xs font-bold text-blue-700 hover:text-blue-900"
          >
            Configure Credentials &rarr;
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className={`h-3 w-3 rounded-full ${providers?.resendConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
            <div>
              <p className="font-bold text-slate-800">Email Gateway: Resend</p>
              <p className="text-slate-500 truncate max-w-[180px]">{providers?.resendSender || "support@mail.brainlabacademy.com.ng"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className={`h-3 w-3 rounded-full ${providers?.termiiConfigured ? "bg-emerald-500" : "bg-blue-500"}`} />
            <div>
              <p className="font-bold text-slate-800">SMS Gateway: Termii</p>
              <p className="text-slate-500">MTN, Airtel, Glo, 9mobile</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <div>
              <p className="font-bold text-slate-800">Inbound Routing: Cloudflare</p>
              <p className="text-slate-500">support@, info@, hello@</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-purple-500" />
            <div>
              <p className="font-bold text-slate-800">Sending Domain</p>
              <p className="text-slate-500">mail.brainlabacademy.com.ng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Campaigns & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Campaigns */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
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
