"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminSession, adminSignOut, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, type AdminPermission } from "../../lib/adminRoles";
import AdminWorkspaceShell from "../AdminWorkspaceShell";
import { supabase } from "../../lib/supabase";

interface CandidateSummary {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  targetExam: string;
  targetScore: number;
  stateOfOrigin: string;
  createdAt: string;
  lastSignInAt: string | null;
  lastActivityDate?: string | null;
  lastSeenAt?: string | null;
  emailConfirmed: boolean;
  isSuspended: boolean;
  isAtRisk?: boolean;
  targetCourse?: string | null;
  dreamSchool?: string | null;
  selectedSubjects?: string[] | null;
  bannedUntil: string | null;
  subscription: {
    planId: string;
    status: string;
    expiresAt: string | null;
    provider: string;
  };
  gamification: {
    xp: number;
    streakDays: number;
    level: number;
    levelName?: string;
    longestStreakDays?: number;
  };
}

interface CandidateDetail extends CandidateSummary {
  transactions: Array<{
    id: string;
    reference: string;
    amount_kobo: number;
    currency: string;
    provider: string;
    status: string;
    paid_at: string;
    created_at?: string;
    subscription_plans?: { name: string };
  }>;
  sessions: Array<{
    id: string;
    subject: string | null;
    status: string;
    tab_switch_count: number;
    started_at: string;
    submitted_at: string | null;
  }>;
}

export default function CandidatesAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<AdminPermission, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Candidate Data State
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    activeSubscribers: 0,
    suspendedAccounts: 0,
    freeTierCandidates: 0,
    atRiskCount: 0,
    unconfirmedCount: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal Drawer State
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateDetail, setCandidateDetail] = useState<CandidateDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "exams" | "actions">("overview");

  // Action form state
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [grantPlanId, setGrantPlanId] = useState("premium");
  const [grantDurationDays, setGrantDurationDays] = useState(30);
  const [grantReason, setGrantReason] = useState("");

  // Authenticated fetch helper attaching admin Bearer token
  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(init?.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", "Bearer " + session.access_token);
    }
    return fetch(input, { ...init, headers });
  }, []);

  async function handleQuickUpgrade(candidateId: string, candidateName: string) {
    if (!window.confirm(`Upgrade ${candidateName} to Premium Study for 30 days immediately?`)) return;
    try {
      const res = await authFetch(`/api/admin/candidates/${candidateId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_subscription",
          planId: "premium",
          durationDays: 30,
          reason: "1-Click Administrator Upgrade from Registry",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`Successfully upgraded ${candidateName} to Premium Study!`);
        await loadCandidates();
      } else {
        alert(data.error || "Failed to upgrade candidate.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Network error upgrading candidate.");
    }
  }

  async function handleQuickVerifyEmail(candidateId: string, candidateName: string) {
    if (!window.confirm(`Manually verify email address for ${candidateName}? This will activate their account immediately.`)) return;
    try {
      const res = await authFetch(`/api/admin/candidates/${candidateId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_email" }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`Successfully verified email for ${candidateName}!`);
        await loadCandidates();
      } else {
        alert(data.error || "Failed to verify candidate email.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Network error verifying candidate email.");
    }
  }

  function getWhatsAppUrl(phone: string, fullName: string, targetExam: string) {
    const digits = (phone || "").replace(/\D/g, "");
    let intl = digits;
    if (digits.startsWith("0") && digits.length === 11) {
      intl = "234" + digits.slice(1);
    } else if (!digits.startsWith("234") && digits.length === 10) {
      intl = "234" + digits;
    }
    const firstName = fullName.split(" ")[0] || "Candidate";
    const message = `Hello ${firstName}! 👋 This is BrainLab Academy. We noticed you haven't started your ${targetExam} practice or activated your daily study streak yet. 📚 Log in today to take your 10-Question Baseline Diagnostic and begin your journey: https://www.brainlabacademy.com.ng/cbt/diagnostic`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
  }

  function exportCandidatesCsv() {
    if (candidates.length === 0) {
      alert("No candidates to export in current view.");
      return;
    }
    const headers = [
      "ID",
      "Full Name",
      "Email",
      "Phone",
      "Target Exam",
      "Target Score",
      "Target Course",
      "Dream School",
      "Plan Tier",
      "Plan Status",
      "XP",
      "Level",
      "Streak Days",
      "Account Status",
      "Email Confirmed",
      "Registered Date",
      "Last Sign In",
    ];

    const rows = candidates.map((c) => {
      const statusLabel = c.isSuspended
        ? "Suspended"
        : !c.emailConfirmed
        ? "Unconfirmed"
        : c.isAtRisk
        ? "At-Risk"
        : "Active";

      return [
        `"${c.id}"`,
        `"${(c.fullName || "").replace(/"/g, '""')}"`,
        `"${c.email}"`,
        `"${c.phone || "N/A"}"`,
        `"${c.targetExam}"`,
        c.targetScore,
        `"${(c.targetCourse || "").replace(/"/g, '""')}"`,
        `"${(c.dreamSchool || "").replace(/"/g, '""')}"`,
        `"${c.subscription.planId}"`,
        `"${c.subscription.status}"`,
        c.gamification.xp,
        c.gamification.level,
        c.gamification.streakDays,
        `"${statusLabel}"`,
        c.emailConfirmed ? "Yes" : "No",
        `"${new Date(c.createdAt).toISOString()}"`,
        c.lastSignInAt ? `"${new Date(c.lastSignInAt).toISOString()}"` : '"Never"',
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `brainlab-candidates-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function formatLastSeen(lastSeenAt: string | null | undefined) {
    if (!lastSeenAt) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>Never
        </span>
      );
    }
    const date = new Date(lastSeenAt);
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Today
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
          Yesterday
        </span>
      );
    }
    if (diffDays < 7) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
          {diffDays}d ago
        </span>
      );
    }
    if (diffDays < 14) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
          {diffDays}d ago
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
        ⚠️ {diffDays}d ago
      </span>
    );
  }

  const loadCandidates = useCallback(async () => {
    try {
      const query = new URLSearchParams({
        search,
        status: statusFilter,
        tier: tierFilter,
        page: String(page),
        limit: "25",
      });

      const res = await authFetch(`/api/admin/candidates?${query.toString()}`);
      const data = await res.json();

      if (res.ok && data.ok) {
        setCandidates(data.candidates || []);
        if (data.stats) setStats(data.stats);
        if (data.meta) setTotalPages(data.meta.totalPages || 1);
      }
    } catch {
      // Ignore network aborts
    }
  }, [search, statusFilter, tierFilter, page]);

  useEffect(() => {
    let active = true;

    async function init() {
      const currentAdmin = await getAdminSession();
      if (!active) return;
      if (!currentAdmin) {
        router.replace("/account");
        return;
      }
      setAdmin(currentAdmin);

      // Check admin permissions
      const perms: Partial<Record<AdminPermission, boolean>> = {};
      perms["institution.manage"] = await adminHasPermission("institution.manage");
      perms["finance.billing.manage"] = await adminHasPermission("finance.billing.manage");
      perms["audit.logs.read"] = await adminHasPermission("audit.logs.read");
      setPermissions(perms);

      await loadCandidates();
      if (active) setLoading(false);
    }

    init();

    return () => {
      active = false;
    };
  }, [router, loadCandidates]);

  // Handle detailed candidate drawer inspection
  async function openCandidateDrawer(id: string) {
    setSelectedCandidateId(id);
    setLoadingDetail(true);
    setActionMessage(null);
    setActiveTab("overview");

    try {
      const res = await authFetch(`/api/admin/candidates/${id}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setCandidateDetail(data.candidate);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeDrawer() {
    setSelectedCandidateId(null);
    setCandidateDetail(null);
    setActionMessage(null);
  }

  // Handle Candidate Action submission
  async function executeAction(actionType: string, payload: Record<string, unknown> = {}) {
    if (!selectedCandidateId) return;
    setActionBusy(true);
    setActionMessage(null);

    try {
      const res = await authFetch(`/api/admin/candidates/${selectedCandidateId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType, ...payload }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setActionMessage({ type: "success", text: data.message || "Action executed successfully." });
        // Refresh detail & list
        await loadCandidates();
        const refreshDetail = await authFetch(`/api/admin/candidates/${selectedCandidateId}`);
        const refData = await refreshDetail.json();
        if (refData.ok) setCandidateDetail(refData.candidate);
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to execute action." });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Network error executing action.",
      });
    } finally {
      setActionBusy(false);
    }
  }

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading Candidate Registry...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminWorkspaceShell
      user={admin}
      permissions={permissions}
      onLogout={async () => {
        await adminSignOut();
        router.replace("/account");
      }}
    >
      <div className="space-y-8 p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
              Student Directory & CRM
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              Candidate Registry & CRM
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Search, inspect, and manage registered student profiles, mock exam attempts, and subscription statuses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCandidatesCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 cursor-pointer"
              title="Export current candidate view to CSV"
            >
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => {
                startTransition(() => {
                  loadCandidates();
                });
              }}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <svg className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards with 1-Click Filter Activation */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setTierFilter("all");
            }}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:scale-[1.02] cursor-pointer ${
              statusFilter === "all" && tierFilter === "all"
                ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-500">Total Registered</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{stats.totalCandidates.toLocaleString()}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-blue-600">All Candidate Cohort</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTierFilter("premium");
              setStatusFilter("all");
            }}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:scale-[1.02] cursor-pointer ${
              tierFilter === "premium"
                ? "border-emerald-600 bg-emerald-100/70 ring-2 ring-emerald-500/20"
                : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50"
            }`}
          >
            <p className="text-[11px] font-semibold text-emerald-800">Paid Subscribers</p>
            <p className="mt-1 text-2xl font-black text-emerald-950">{stats.activeSubscribers.toLocaleString()}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-emerald-700">Pro, Plus & Premium</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("at-risk");
              setTierFilter("all");
            }}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:scale-[1.02] cursor-pointer ${
              statusFilter === "at-risk"
                ? "border-amber-600 bg-amber-100/80 ring-2 ring-amber-500/20"
                : "border-amber-300 bg-amber-50/60 hover:bg-amber-100/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-amber-900">⚠️ At-Risk Students</p>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <p className="mt-1 text-2xl font-black text-amber-950">{(stats.atRiskCount || 0).toLocaleString()}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-amber-800">0 XP / 0d Streak (Needs Nudge)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("unverified");
              setTierFilter("all");
            }}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:scale-[1.02] cursor-pointer ${
              statusFilter === "unverified"
                ? "border-orange-600 bg-orange-100/80 ring-2 ring-orange-500/20"
                : "border-orange-200 bg-orange-50/50 hover:bg-orange-100/60"
            }`}
          >
            <p className="text-[11px] font-semibold text-orange-900">Unconfirmed Email</p>
            <p className="mt-1 text-2xl font-black text-orange-950">{(stats.unconfirmedCount || 0).toLocaleString()}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-orange-800">Pending Activation</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTierFilter("free");
              setStatusFilter("all");
            }}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:scale-[1.02] cursor-pointer ${
              tierFilter === "free"
                ? "border-slate-600 bg-slate-100 ring-2 ring-slate-400/20"
                : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/60"
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-600">Free Practice Tier</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{stats.freeTierCandidates.toLocaleString()}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-slate-500">Freemium Learners</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by student name, email, phone, or target exam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="at-risk">⚠️ At-Risk Intervention</option>
              <option value="suspended">Suspended Only</option>
              <option value="unverified">Email Unverified</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Tiers</option>
              <option value="premium">Premium Plan</option>
              <option value="basic">Basic Plan</option>
              <option value="free">Free Tier</option>
            </select>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Candidate</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Target Exam</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Plan & Access</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">XP & Level</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Status</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Last Seen</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Registered</th>
                  <th className="py-3.5 px-4 text-right font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No candidates matched your search criteria.
                    </td>
                  </tr>
                ) : (
                  candidates.map((cand) => (
                    <tr key={cand.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 text-xs shadow-xs">
                            {cand.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{cand.fullName}</p>
                            <p className="text-[11px] text-slate-500 truncate">{cand.email}</p>
                            {(cand.targetCourse || cand.dreamSchool) && (
                              <p className="text-[10px] font-semibold text-blue-700 mt-0.5 truncate flex items-center gap-1">
                                <span>🎯</span>
                                <span>{cand.targetCourse || "Course"}</span>
                                {cand.dreamSchool && (
                                  <span className="text-slate-400 font-normal">@ {cand.dreamSchool}</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700 text-[11px]">
                          {cand.targetExam}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Target: {cand.targetScore} pts</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider text-[10px] ${
                            cand.subscription.status === "active" && cand.subscription.planId !== "free"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {cand.subscription.planId}
                        </span>
                        {cand.subscription.expiresAt && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Exp: {new Date(cand.subscription.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{cand.gamification.xp.toLocaleString()} XP</p>
                        <p className="text-[10px] text-slate-400">Lvl {cand.gamification.level} • {cand.gamification.streakDays}d streak</p>
                      </td>

                      <td className="py-3.5 px-4">
                        {cand.isSuspended ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            Suspended
                          </span>
                        ) : !cand.emailConfirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Unconfirmed
                          </span>
                        ) : cand.isAtRisk ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900" title="Candidate inactive or zero study streak">
                            ⚠️ At-Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {formatLastSeen(cand.lastSeenAt || cand.lastSignInAt)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(cand.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {!cand.emailConfirmed && (
                            <button
                              type="button"
                              onClick={() => handleQuickVerifyEmail(cand.id, cand.fullName)}
                              className="rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer inline-flex items-center gap-1"
                              title="Bypass confirmation and mark email as verified immediately"
                            >
                              <span>✓</span>
                              <span>Verify</span>
                            </button>
                          )}
                          {cand.phone && cand.phone !== "N/A" && cand.phone.replace(/\D/g, "").length >= 10 && (
                            <a
                              href={getWhatsAppUrl(cand.phone, cand.fullName, cand.targetExam)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#25D366] hover:bg-[#20ba59] px-2.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 inline-flex items-center gap-1"
                              title="Open WhatsApp with personalized study streak reminder"
                            >
                              <span>💬</span>
                              <span>WhatsApp</span>
                            </a>
                          )}
                          {cand.subscription.planId === "free" && (
                            <button
                              type="button"
                              onClick={() => handleQuickUpgrade(cand.id, cand.fullName)}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer inline-flex items-center gap-1"
                              title="Instantly upgrade candidate to Premium (30 days)"
                            >
                              <span>⚡</span>
                              <span>Upgrade</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openCandidateDrawer(cand.id)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#012153] shadow-sm hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                          >
                            Manage →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Detailed Drawer / Modal */}
      {selectedCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-6 bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Student Record Dossier
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  {candidateDetail?.fullName || "Loading Candidate..."}
                </h2>
                <p className="text-xs text-slate-500">{candidateDetail?.email}</p>
              </div>

              <button
                onClick={closeDrawer}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex flex-1 items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : candidateDetail ? (
              <div className="flex flex-1 flex-col p-6 space-y-6">
                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`pb-3 px-3 transition ${
                      activeTab === "overview"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("payments")}
                    className={`pb-3 px-3 transition ${
                      activeTab === "payments"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Payments & Receipts ({candidateDetail.transactions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("exams")}
                    className={`pb-3 px-3 transition ${
                      activeTab === "exams"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Exam Sessions ({candidateDetail.sessions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("actions")}
                    className={`pb-3 px-3 transition ${
                      activeTab === "actions"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Administrative Actions
                  </button>
                </div>

                {/* Notifications in modal */}
                {actionMessage && (
                  <div
                    className={`rounded-xl p-3 text-xs font-semibold ${
                      actionMessage.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {actionMessage.text}
                  </div>
                )}

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                      <div>
                        <p className="text-slate-400 font-medium">Phone</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="font-bold text-slate-800">{candidateDetail.phone}</p>
                          {candidateDetail.phone && candidateDetail.phone !== "N/A" && (
                            <a
                              href={getWhatsAppUrl(candidateDetail.phone, candidateDetail.fullName, candidateDetail.targetExam)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-emerald-300"
                            >
                              💬 WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">State of Origin</p>
                        <p className="font-bold text-slate-800 mt-0.5">{candidateDetail.stateOfOrigin}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Target Exam</p>
                        <p className="font-bold text-slate-800 mt-0.5">{candidateDetail.targetExam}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Target Score</p>
                        <p className="font-bold text-slate-800 mt-0.5">{candidateDetail.targetScore} / 400</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Target Course</p>
                        <p className="font-bold text-blue-900 mt-0.5">{candidateDetail.targetCourse || "General / Undecided"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Dream Institution</p>
                        <p className="font-bold text-blue-900 mt-0.5">{candidateDetail.dreamSchool || "Not Selected"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Registered Date</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {new Date(candidateDetail.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Last Login</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {candidateDetail.lastSignInAt
                            ? new Date(candidateDetail.lastSignInAt).toLocaleString()
                            : "Never Logged In"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Learning Activity</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {candidateDetail.lastActivityDate
                            ? new Date(candidateDetail.lastActivityDate).toLocaleDateString()
                            : "No Drills Logged"}
                        </p>
                      </div>
                    </div>

                    {/* Gamification & Academic Momentum */}
                    {candidateDetail.gamification && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Lifetime XP</p>
                          <p className="text-base font-extrabold text-amber-950 mt-0.5">
                            {candidateDetail.gamification.xp.toLocaleString()} XP
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Academic Rank</p>
                          <p className="text-xs font-extrabold text-amber-950 mt-1">
                            Lvl {candidateDetail.gamification.level} &bull; {candidateDetail.gamification.levelName || "Beginner"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Active Streak</p>
                          <p className="text-base font-extrabold text-amber-950 mt-0.5 flex items-center justify-center gap-1">
                            <span>🔥</span>
                            <span>{candidateDetail.gamification.streakDays}d</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Active 4-Subject Combination if present */}
                    {candidateDetail.selectedSubjects && candidateDetail.selectedSubjects.length > 0 && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                        <p className="text-[11px] font-bold text-blue-950 uppercase tracking-wider mb-2">
                          🎯 Active 4-Subject Examination Combination
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {candidateDetail.selectedSubjects.map((sub, i) => (
                            <span
                              key={i}
                              className="rounded-lg bg-white border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-900 shadow-2xs"
                            >
                              {i === 0 ? "1. " : `${i + 1}. `}{sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
                        Subscription Status
                      </h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-black text-sm uppercase text-[#012153]">
                            {candidateDetail.subscription?.planId || "Free Tier"}
                          </span>
                          <p className="text-[11px] text-slate-500">
                            Status: <span className="font-semibold">{candidateDetail.subscription?.status || "inactive"}</span>
                          </p>
                          {candidateDetail.subscription?.expiresAt && (
                            <p className="text-[11px] text-slate-500">
                              Valid until: {new Date(candidateDetail.subscription.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setActiveTab("actions")}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          Modify Tier →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PAYMENTS & RECEIPTS */}
                {activeTab === "payments" && (
                  <div className="space-y-3">
                    {candidateDetail.transactions.length === 0 ? (
                      <p className="text-center py-8 text-xs text-slate-400">
                        No transactions recorded for this candidate.
                      </p>
                    ) : (
                      candidateDetail.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {tx.subscription_plans?.name || "CBT Plan"}
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                ₦{(tx.amount_kobo / 100).toLocaleString()}
                              </span>
                            </div>
                            <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                              Ref: {tx.reference} • {new Date(tx.paid_at || tx.created_at || "").toLocaleDateString()}
                            </p>
                          </div>
                          <Link
                            href={`/account/receipt/${encodeURIComponent(tx.reference)}`}
                            target="_blank"
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-blue-900 hover:bg-blue-50 shadow-xs"
                          >
                            📄 View Receipt
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: EXAMS */}
                {activeTab === "exams" && (
                  <div className="space-y-3">
                    {candidateDetail.sessions.length === 0 ? (
                      <p className="text-center py-8 text-xs text-slate-400">
                        No CBT exam sessions recorded yet.
                      </p>
                    ) : (
                      candidateDetail.sessions.map((sess) => (
                        <div
                          key={sess.id}
                          className="rounded-xl border border-slate-200 p-3 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">
                              {sess.subject || "Full Mock Combination"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                sess.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {sess.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Started: {new Date(sess.started_at).toLocaleString()}
                            {sess.tab_switch_count > 0 && (
                              <span className="text-rose-600 font-semibold ml-2">
                                ⚠ {sess.tab_switch_count} focus violation(s)
                              </span>
                            )}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 4: ACTIONS */}
                {activeTab === "actions" && (
                  <div className="space-y-6">
                    {/* Instant Email Verification Bypass if unconfirmed */}
                    {!candidateDetail.emailConfirmed && (
                      <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4">
                        <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <span>✉️</span>
                          <span>Instant Email Verification Bypass</span>
                        </h4>
                        <p className="text-[11px] text-amber-900 mb-3">
                          This candidate has not clicked their email verification link. You can manually activate and confirm their account immediately.
                        </p>
                        <button
                          type="button"
                          onClick={() => executeAction("verify_email")}
                          disabled={actionBusy}
                          className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-bold text-white shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {actionBusy ? "Verifying..." : "✓ Confirm Candidate Email Immediately"}
                        </button>
                      </div>
                    )}

                    {/* Grant Subscription Card */}
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                      <h4 className="font-bold text-blue-950 text-xs uppercase tracking-wider mb-2">
                        🎁 Grant or Extend Subscription Tier
                      </h4>
                      <p className="text-[11px] text-blue-800 mb-3">
                        Manually activate a CBT subscription for this candidate (e.g. for scholarship, manual bank transfer, or contest winner).
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700">Select Tier</label>
                          <select
                            value={grantPlanId}
                            onChange={(e) => setGrantPlanId(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                          >
                            <option value="premium">⭐ Premium Study (CBT Corrections & AI Tutor)</option>
                            <option value="plus">🚀 BrainLab Plus (Corrections + Competitions + AI)</option>
                            <option value="pro">👑 BrainLab Pro (Universal Academy & 1-on-1 AI)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700">Duration (Days)</label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={grantDurationDays}
                            onChange={(e) => setGrantDurationDays(parseInt(e.target.value) || 30)}
                            className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-[11px] font-bold text-slate-700">Reason / Reference Note</label>
                        <input
                          type="text"
                          placeholder="e.g. BrainLab Scholarship 2026 / Verified Bank Transfer"
                          value={grantReason}
                          onChange={(e) => setGrantReason(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={() =>
                          executeAction("grant_subscription", {
                            planId: grantPlanId,
                            durationDays: grantDurationDays,
                            reason: grantReason,
                          })
                        }
                        disabled={actionBusy}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white shadow transition active:scale-95 disabled:opacity-50"
                      >
                        {actionBusy ? "Processing..." : "Confirm & Grant Subscription"}
                      </button>
                    </div>

                    {/* Suspension Controls */}
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                        Account Suspension & Security
                      </h4>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Lock candidate from taking CBT exams or signing into their dashboard in case of exam malpractice or policy violations.
                      </p>

                      <div className="flex gap-2">
                        {candidateDetail.isSuspended ? (
                          <button
                            onClick={() => executeAction("reactivate")}
                            disabled={actionBusy}
                            className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow transition active:scale-95 disabled:opacity-50"
                          >
                            🔓 Reactivate Account
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              executeAction("suspend", {
                                reason: "Exam malpractice or administrative investigation",
                              })
                            }
                            disabled={actionBusy}
                            className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white shadow transition active:scale-95 disabled:opacity-50"
                          >
                            🚫 Suspend Candidate
                          </button>
                        )}

                        <button
                          onClick={() => executeAction("send_password_reset")}
                          disabled={actionBusy}
                          className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-50"
                        >
                          🔑 Send Password Reset Link
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </AdminWorkspaceShell>
  );
}
