"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import AdminPinGuard from "@/app/components/AdminPinGuard";
import "../admin.css";

interface MetricState {
  totalProgrammes: number;
  totalGrants: number;
  totalVouchers: number;
  activeVouchers: number;
  consumedVouchers: number;
  totalMonthlyUsage: number;
  tierCounts: Record<string, number>;
}

interface Tier {
  id: string;
  tier_key: string;
  name: string;
  description: string;
  tier_priority: number;
  is_active: boolean;
  is_retired: boolean;
  access_tier_features?: any[];
}

interface Programme {
  id: string;
  programme_key: string;
  name: string;
  description: string;
  associated_tier_id: string | null;
  is_active: boolean;
  created_at: string;
  access_tiers?: { id: string; tier_key: string; name: string; tier_priority: number } | null;
  programme_memberships?: { count: number }[];
}

interface FeatureItem {
  feature_key: string;
  display_name: string;
  description: string;
  feature_group: string;
  entitlement_type: string;
  supported_levels: string[];
  level_ordering: Record<string, number>;
  quota_unit: string | null;
  quota_period: string | null;
  is_active: boolean;
}

interface AccessCode {
  id: string;
  code_display: string;
  code_purpose: string;
  mock_credits: number;
  uses_allowed: number;
  uses_consumed: number;
  validity_days: number;
  status: string;
  created_at: string;
  access_tiers?: { name: string; tier_key: string } | null;
  feature_catalog?: { display_name: string } | null;
}

interface AuditRecord {
  id: string;
  actor_id: string | null;
  target_student_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  created_at: string;
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950";
const panelClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6";
const buttonPrimary =
  "inline-flex items-center justify-center rounded-xl bg-[#1356E8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]";
const buttonSecondary =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900 min-h-[44px]";

type TabKey =
  | "overview"
  | "tiers"
  | "students"
  | "programmes"
  | "features"
  | "codes"
  | "durations"
  | "commercial"
  | "migration"
  | "audit";

export default function AccessAndCohortCentrePage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // State data for 10 areas
  const [metrics, setMetrics] = useState<MetricState | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);

  // Student Search & Grant form
  const [studentQuery, setStudentQuery] = useState("");
  const [searchedStudents, setSearchedStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [grantTierId, setGrantTierId] = useState("");
  const [grantFeatureKey, setGrantFeatureKey] = useState("");
  const [grantLevel, setGrantLevel] = useState("");
  const [grantQuota, setGrantQuota] = useState("");
  const [grantDuration, setGrantDuration] = useState("30");
  const [grantReason, setGrantReason] = useState("");

  // Create Programme Form
  const [progKey, setProgKey] = useState("");
  const [progName, setProgName] = useState("");
  const [progDesc, setProgDesc] = useState("");
  const [progTierId, setProgTierId] = useState("");

  // Code Generation Form
  const [codePurpose, setCodePurpose] = useState<"single_mock_pass" | "subscription_grant">("single_mock_pass");
  const [codeTargetTier, setCodeTargetTier] = useState("");
  const [codeCount, setCodeCount] = useState(1);
  const [codePrefix, setCodePrefix] = useState("BLT");
  const [codeDuration, setCodeDuration] = useState(30);
  const [generatedPlainCodes, setGeneratedPlainCodes] = useState<string[] | null>(null);

  // Migration dry run state
  const [migrationDryRun, setMigrationDryRun] = useState<any | null>(null);

  const loadTabData = useCallback(
    async (tab: TabKey) => {
      setError("");
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/access?tab=${tab}`);
        const data = await res.json();
        if (data.ok) {
          if (tab === "overview") {
            setMetrics(data.metrics);
            setTiers(data.tiers || []);
          } else if (tab === "tiers") {
            setTiers(data.tiers || []);
          } else if (tab === "programmes") {
            setProgrammes(data.programmes || []);
          } else if (tab === "features") {
            setFeatures(data.features || []);
          } else if (tab === "codes") {
            setCodes(data.codes || []);
            setTiers(data.availableTiers || []);
          } else if (tab === "audit") {
            setAuditLogs(data.logs || []);
          }
        } else {
          setError(data.error || "Failed to load tab data.");
        }
      } catch (err: any) {
        setError(err.message || "Network error loading access data.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    async function init() {
      const session = await getAdminSession();
      if (!session) {
        router.push("/admin/login?next=/admin/access");
        return;
      }
      setAdmin(session);
      loadTabData(activeTab);
    }
    init();
  }, [router, activeTab, loadTabData]);

  // Handle Student Search
  const handleSearchStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentQuery.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/access?tab=students&query=${encodeURIComponent(studentQuery)}`);
      const data = await res.json();
      if (data.ok) {
        setSearchedStudents(data.students || []);
      }
    } catch {
      setError("Failed to search students.");
    } finally {
      setBusy(false);
    }
  };

  // Handle Grant Assignment
  const handleAssignGrant = async () => {
    if (!selectedStudent) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_grant",
          studentId: selectedStudent.id,
          targetTierId: grantTierId || undefined,
          targetFeatureKey: grantFeatureKey || undefined,
          featureLevel: grantLevel || undefined,
          quotaAmount: grantQuota || undefined,
          durationDays: grantDuration,
          reason: grantReason || "Direct 1-Click Upgrade",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotice(`Successfully assigned grant to ${selectedStudent.email}!`);
        // Refresh student state
        const refRes = await fetch(`/api/admin/access?tab=students&query=${encodeURIComponent(selectedStudent.email)}`);
        const refData = await refRes.json();
        if (refData.ok && refData.students?.[0]) {
          setSelectedStudent(refData.students[0]);
        }
      } else {
        setError(data.error || "Failed to assign grant.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit grant.");
    } finally {
      setBusy(false);
    }
  };

  // Handle Create Programme
  const handleCreateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_programme",
          programmeKey: progKey,
          name: progName,
          description: progDesc,
          associatedTierId: progTierId || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotice(`Created programme: ${progName}`);
        setProgKey("");
        setProgName("");
        setProgDesc("");
        loadTabData("programmes");
      } else {
        setError(data.error || "Failed to create programme.");
      }
    } catch (err: any) {
      setError(err.message || "Network error creating programme.");
    } finally {
      setBusy(false);
    }
  };

  // Handle Batch Code Generation
  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_codes",
          count: codeCount,
          codePurpose,
          targetTierId: codePurpose === "subscription_grant" ? codeTargetTier : undefined,
          prefix: codePrefix,
          validityDays: codeDuration,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setGeneratedPlainCodes(data.plaintextCodes || []);
        setNotice(`Generated ${data.count} vouchers successfully! Save or export the plaintext codes immediately.`);
        loadTabData("codes");
      } else {
        setError(data.error || "Failed to generate codes.");
      }
    } catch (err: any) {
      setError(err.message || "Network error generating codes.");
    } finally {
      setBusy(false);
    }
  };

  // Handle Migration Dry Run
  const handleMigrationDryRun = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute_migration_dry_run" }),
      });
      const data = await res.json();
      if (data.ok) {
        setMigrationDryRun(data.dryRun);
      } else {
        setError(data.error || "Dry run evaluation failed.");
      }
    } catch (err: any) {
      setError(err.message || "Dry run network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPinGuard title="Access & Cohort Management Centre">
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black text-white shadow-md shadow-blue-500/20">
                  BL
                </span>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Access & Cohort Management Centre
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Authoritative student entitlements, academic cohorts, hashed vouchers, and feature gates
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300">
                Authoritative SQL Resolver: Active
              </span>
            </div>
          </div>

          {/* Feedback Notices */}
          {notice && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              {error}
            </div>
          )}

          {/* 10 Navigation Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-200 no-scrollbar dark:border-slate-800 gap-1 pb-1">
            {[
              { id: "overview", label: "Overview" },
              { id: "tiers", label: "Access Tiers" },
              { id: "students", label: "Students & Grants" },
              { id: "programmes", label: "Cohorts & Programmes" },
              { id: "features", label: "Feature Catalogue" },
              { id: "codes", label: "Voucher Codes" },
              { id: "durations", label: "Durations" },
              { id: "commercial", label: "Commercial" },
              { id: "migration", label: "Migration Centre" },
              { id: "audit", label: "Security Audit" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-bold rounded-xl transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading && !metrics && (
            <div className="py-12 text-center text-sm text-slate-500">Loading access subsystem data...</div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                {tiers.map((tier) => (
                  <div key={tier.id} className={panelClass}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tier.name}</p>
                    <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                      {(metrics.tierCounts[tier.tier_key] || 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Priority: {tier.tier_priority}</p>
                  </div>
                ))}
                <div className={panelClass}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Cohorts</p>
                  <p className="mt-2 text-3xl font-black text-blue-600">{metrics.totalProgrammes}</p>
                  <p className="mt-1 text-xs text-slate-400">Institutional Tracks</p>
                </div>
                <div className={panelClass}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Vouchers</p>
                  <p className="mt-2 text-3xl font-black text-emerald-600">{metrics.activeVouchers}</p>
                  <p className="mt-1 text-xs text-slate-400">of {metrics.totalVouchers} total</p>
                </div>
              </div>

              <div className={panelClass}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Authoritative Resolver Architecture</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Every product (CBT, AI Tutor, STEM Studio, Arena) queries the central database function{" "}
                  <code className="text-blue-600">resolve_student_entitlements_internal()</code>. Manual localStorage codes
                  are no longer required for upgraded students.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ACCESS TIERS */}
          {activeTab === "tiers" && (
            <div className={panelClass}>
              <h3 className="text-lg font-bold">Access Tiers & Feature Mappings</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Tier Key</th>
                      <th className="py-3 px-4">Display Name</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tiers.map((t) => (
                      <tr key={t.id}>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{t.tier_key}</td>
                        <td className="py-3 px-4 font-bold">{t.name}</td>
                        <td className="py-3 px-4">{t.tier_priority}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              t.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {t.is_active ? "Active" : "Retired"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{t.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STUDENTS & GRANTS */}
          {activeTab === "students" && (
            <div className="space-y-6">
              <div className={panelClass}>
                <h3 className="text-base font-bold">Search Student & Inspect Live Entitlements</h3>
                <form onSubmit={handleSearchStudents} className="mt-4 flex gap-3">
                  <input
                    type="text"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Search by student email, name, or phone..."
                    className={inputClass}
                  />
                  <button type="submit" disabled={busy} className={buttonPrimary}>
                    {busy ? "Searching..." : "Search"}
                  </button>
                </form>

                {searchedStudents.length > 0 && (
                  <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {searchedStudents.map((s) => (
                      <div key={s.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{s.full_name || s.email}</p>
                          <p className="text-xs text-slate-500">{s.email} · Phone: {s.phone || "None"}</p>
                          <p className="text-xs font-mono text-blue-600 mt-1">
                            Effective Tier: {s.entitlements?.effective_tier?.name || "Free Learner"} (Priority:{" "}
                            {s.entitlements?.effective_tier?.priority ?? 0})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(s)}
                          className={buttonSecondary}
                        >
                          Manage Grants & Upgrade
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className={`${panelClass} border-blue-500 bg-blue-50/20 dark:bg-blue-950/20`}>
                  <h4 className="text-sm font-bold text-blue-800 dark:text-blue-200">
                    Assign Grant to {selectedStudent.email}
                  </h4>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500">Target Tier</label>
                      <select
                        value={grantTierId}
                        onChange={(e) => setGrantTierId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">-- No Tier Grant --</option>
                        {tiers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (Priority {t.tier_priority})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">Validity Duration (Days)</label>
                      <select
                        value={grantDuration}
                        onChange={(e) => setGrantDuration(e.target.value)}
                        className={inputClass}
                      >
                        <option value="7">7 Days (Crash Revision)</option>
                        <option value="30">30 Days (Standard Monthly)</option>
                        <option value="90">90 Days (Quarterly Cohort)</option>
                        <option value="365">365 Days (Full Academic Year)</option>
                        <option value="0">Indefinite (Scholarship)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-500">Grant Reason / Audit Note</label>
                      <input
                        type="text"
                        value={grantReason}
                        onChange={(e) => setGrantReason(e.target.value)}
                        placeholder="e.g. 1-Click Super Admin Promotion / JAMB Scholarship"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={handleAssignGrant}
                      disabled={busy || (!grantTierId && !grantFeatureKey)}
                      className={buttonPrimary}
                    >
                      {busy ? "Saving..." : "Apply Authoritative Grant"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className={buttonSecondary}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COHORTS & PROGRAMMES */}
          {activeTab === "programmes" && (
            <div className="space-y-6">
              <div className={panelClass}>
                <h3 className="text-base font-bold">Create Academic Cohort / Institutional Track</h3>
                <form onSubmit={handleCreateProgramme} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Cohort Slug Key</label>
                    <input
                      type="text"
                      value={progKey}
                      onChange={(e) => setProgKey(e.target.value)}
                      placeholder="e.g. apex_2027"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Cohort Display Name</label>
                    <input
                      type="text"
                      value={progName}
                      onChange={(e) => setProgName(e.target.value)}
                      placeholder="e.g. BrainLab Apex Cohort 2027"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500">Associated Tier (Optional)</label>
                    <select
                      value={progTierId}
                      onChange={(e) => setProgTierId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">-- No Associated Tier --</option>
                      {tiers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (Priority {t.tier_priority})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" disabled={busy} className={buttonPrimary}>
                      {busy ? "Creating..." : "Create Cohort Programme"}
                    </button>
                  </div>
                </form>
              </div>

              <div className={panelClass}>
                <h3 className="text-base font-bold">Active Academic Cohorts</h3>
                <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {programmes.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs font-mono text-slate-500">{p.programme_key}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Associated Tier: {p.access_tiers?.name || "None"}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FEATURE CATALOGUE */}
          {activeTab === "features" && (
            <div className={panelClass}>
              <h3 className="text-lg font-bold">Central Feature Catalogue</h3>
              <p className="text-xs text-slate-500">
                Authoritative registry of all capabilities, quota units, and stepped levels across BrainLab disciplines.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Feature Key</th>
                      <th className="py-3 px-4">Group</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Quota / Period</th>
                      <th className="py-3 px-4">Supported Levels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {features.map((f) => (
                      <tr key={f.feature_key}>
                        <td className="py-3 px-4 font-mono font-bold">{f.feature_key}</td>
                        <td className="py-3 px-4 font-semibold uppercase text-[10px] text-slate-500">
                          {f.feature_group}
                        </td>
                        <td className="py-3 px-4 font-mono text-blue-600">{f.entitlement_type}</td>
                        <td className="py-3 px-4">
                          {f.quota_unit ? `${f.quota_unit} (${f.quota_period})` : "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {Array.isArray(f.supported_levels) && f.supported_levels.length > 0
                            ? f.supported_levels.join(" > ")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: VOUCHER CODES */}
          {activeTab === "codes" && (
            <div className="space-y-6">
              <div className={panelClass}>
                <h3 className="text-base font-bold">Generate Hashed Access Voucher Batch</h3>
                <form onSubmit={handleGenerateCodes} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Voucher Purpose</label>
                    <select
                      value={codePurpose}
                      onChange={(e) => setCodePurpose(e.target.value as any)}
                      className={inputClass}
                    >
                      <option value="single_mock_pass">Single CBT Mock Exam Pass (Credit Only)</option>
                      <option value="subscription_grant">Subscription Tier Voucher (Plus / Pro / Apex)</option>
                    </select>
                  </div>

                  {codePurpose === "subscription_grant" && (
                    <div>
                      <label className="text-xs font-bold text-slate-500">Target Subscription Tier</label>
                      <select
                        value={codeTargetTier}
                        onChange={(e) => setCodeTargetTier(e.target.value)}
                        className={inputClass}
                        required
                      >
                        <option value="">-- Choose Tier --</option>
                        {tiers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500">Batch Quantity (1 - 100)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={codeCount}
                      onChange={(e) => setCodeCount(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500">Code Prefix</label>
                    <input
                      type="text"
                      value={codePrefix}
                      onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button type="submit" disabled={busy} className={buttonPrimary}>
                      {busy ? "Generating..." : "Generate Hashed Vouchers"}
                    </button>
                  </div>
                </form>

                {generatedPlainCodes && (
                  <div className="mt-6 rounded-xl border border-emerald-400 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      ⚠️ Plaintext Vouchers Generated ({generatedPlainCodes.length})
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      In compliance with security rules, plaintext codes are displayed ONCE and cannot be recovered
                      after closing this panel (only SHA-256 hashes are stored in the database).
                    </p>
                    <div className="mt-3 max-h-40 overflow-y-auto font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-300">
                      {generatedPlainCodes.map((code) => (
                        <div key={code}>{code}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={panelClass}>
                <h3 className="text-base font-bold">Vouchers Ledger</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold">
                      <tr>
                        <th className="py-3 px-4">Masked Code</th>
                        <th className="py-3 px-4">Purpose</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Uses</th>
                        <th className="py-3 px-4">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {codes.map((c) => (
                        <tr key={c.id}>
                          <td className="py-3 px-4 font-mono font-bold">{c.code_display}</td>
                          <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {c.code_purpose}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                c.status === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {c.uses_consumed} / {c.uses_allowed}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DURATIONS */}
          {activeTab === "durations" && (
            <div className={panelClass}>
              <h3 className="text-lg font-bold">Standard Duration Presets & Expiry Thresholds</h3>
              <p className="text-xs text-slate-500 mt-1">
                Authoritative validity duration matrix evaluated at query time using West Africa Time (Africa/Lagos).
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "7-Day Sprint", days: 7, desc: "CBT crash revision & diagnostic sprints" },
                  { label: "30-Day Monthly", days: 30, desc: "Standard monthly study access" },
                  { label: "90-Day Term", days: 90, desc: "Complete UTME/WAEC prep cohort" },
                  { label: "180-Day Semester", days: 180, desc: "Institutional school term" },
                  { label: "365-Day Academic", days: 365, desc: "Full academic session universal access" },
                  { label: "Lifetime / Indefinite", days: null, desc: "Scholarship & universal admin VIP grants" },
                ].map((preset) => (
                  <div key={preset.label} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="font-bold text-sm">{preset.label}</p>
                    <p className="text-2xl font-black text-blue-600 mt-1">
                      {preset.days ? `${preset.days} Days` : "Permanent"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{preset.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: COMMERCIAL SETTINGS */}
          {activeTab === "commercial" && (
            <div className={panelClass}>
              <h3 className="text-lg font-bold">Commercial & Billing Gateway Settings</h3>
              <p className="text-xs text-slate-500 mt-1">
                Paystack & BACHS subscription price plan references in Nigerian Naira (NGN).
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase">Premium Study</p>
                  <p className="text-2xl font-black mt-1">₦2,500 <span className="text-xs font-normal text-slate-500">/mo</span></p>
                  <p className="text-xs text-slate-500 mt-1">5 daily CBT mocks, 250 AI hints</p>
                </div>
                <div className="border border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-600 uppercase">BrainLab Plus</p>
                  <p className="text-2xl font-black mt-1">₦5,000 <span className="text-xs font-normal text-slate-500">/mo</span></p>
                  <p className="text-xs text-slate-500 mt-1">Unlimited CBT mocks, 1,000 AI hints, STEM Studio 3D</p>
                </div>
                <div className="border border-amber-500/50 bg-amber-50/20 dark:bg-amber-950/20 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-600 uppercase">BrainLab Apex</p>
                  <p className="text-2xl font-black mt-1">₦15,000 <span className="text-xs font-normal text-slate-500">/term</span></p>
                  <p className="text-xs text-slate-500 mt-1">Universal platform access, 5,000 AI hints, Arena Host</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: MIGRATION CENTRE */}
          {activeTab === "migration" && (
            <div className="space-y-6">
              <div className={panelClass}>
                <h3 className="text-lg font-bold">Legacy Subscription Migration Inspector</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Preview legacy subscriptions eligible for transformation into unified student access grants.
                </p>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={handleMigrationDryRun} disabled={busy} className={buttonPrimary}>
                    {busy ? "Evaluating..." : "Run Migration Dry-Run Evaluation"}
                  </button>
                </div>

                {migrationDryRun && (
                  <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm font-bold">Dry-Run Evaluation Results:</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 text-xs">
                      <div>
                        <span className="text-slate-400">Total Active Subscriptions:</span>
                        <p className="text-lg font-bold">{migrationDryRun.totalActiveFound}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Eligible for Migration:</span>
                        <p className="text-lg font-bold text-emerald-600">{migrationDryRun.eligibleForMigration}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Unmapped Tiers:</span>
                        <p className="text-lg font-bold text-slate-500">{migrationDryRun.unmappedTiers}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 10: SECURITY AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className={panelClass}>
              <h3 className="text-lg font-bold">Immutable Security Audit Trail</h3>
              <p className="text-xs text-slate-500 mt-1">
                Guarded by PostgreSQL append-only triggers. Mutations and deletions are permanently blocked.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{log.action}</td>
                        <td className="py-3 px-4 font-mono">{log.entity_type}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{log.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminPinGuard>
  );
}
