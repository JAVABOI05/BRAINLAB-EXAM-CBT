"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import AdminPinGuard from "@/app/components/AdminPinGuard";
import "../admin.css";

interface Programme {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier_id: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  member_count: number;
  access_tiers?: { id: string; tier_key: string; name: string; rank: number } | null;
}

interface Tier {
  id: string;
  tier_key: string;
  name: string;
  description: string;
  rank: number;
  is_active: boolean;
}

interface Feature {
  feature_key: string;
  name: string;
  description: string;
  feature_type: "boolean" | "quota" | "level";
  supported_levels: string[] | null;
  default_quota: number | null;
  quota_period: string;
  status: string;
}

interface CodeItem {
  id: string;
  code_prefix: string;
  validity_days: number;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
  access_tiers?: { name: string; tier_key: string } | null;
  access_programmes?: { name: string; slug: string } | null;
}

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950";
const panelClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6";
const buttonPrimary = "inline-flex items-center justify-center rounded-xl bg-[#1356E8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]";
const buttonSecondary = "inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900 min-h-[44px]";

export default function AccessAndCohortManagementPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [activeTab, setActiveTab] = useState<"programmes" | "students" | "codes" | "catalog" | "audit">("programmes");

  // Loaded data
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [codes, setCodes] = useState<CodeItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Create Programme Form
  const [progName, setProgName] = useState("");
  const [progSlug, setProgSlug] = useState("");
  const [progDesc, setProgDesc] = useState("");
  const [progTierId, setProgTierId] = useState("");
  const [progStartsAt, setProgStartsAt] = useState("");
  const [progEndsAt, setProgEndsAt] = useState("");

  // Student Resolver State
  const [studentQuery, setStudentQuery] = useState("");
  const [resolvedStudent, setResolvedStudent] = useState<any>(null);

  // Individual Grant Form
  const [grantFeatureKey, setGrantFeatureKey] = useState("");
  const [grantLevel, setGrantLevel] = useState("");
  const [grantQuota, setGrantQuota] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");
  const [grantNotes, setGrantNotes] = useState("");

  // Code Generation State
  const [codeTierId, setCodeTierId] = useState("");
  const [codeProgId, setCodeProgId] = useState("");
  const [codeDays, setCodeDays] = useState(30);
  const [codePrefixTag, setCodePrefixTag] = useState("BLT");
  const [createdPlainCode, setCreatedPlainCode] = useState<string | null>(null);

  // Active Flagship Cohort Platform Config State (Renaming & Cohort Switching)
  const [cohortName, setCohortName] = useState("Apex Cohort");
  const [cohortTagline, setCohortTagline] = useState("Guided Educational Programme & Intensive Mentorship");
  const [cohortSession, setCohortSession] = useState("2026/2027");
  const [cohortTarget, setCohortTarget] = useState("JAMB UTME 2027");
  const [cohortIsEnrolling, setCohortIsEnrolling] = useState(true);
  const [cohortSaving, setCohortSaving] = useState(false);
  const [showNewCohortModal, setShowNewCohortModal] = useState(false);
  const [newCohortNameInput, setNewCohortNameInput] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [res, cohortCfgRes] = await Promise.all([
        fetch("/api/admin/cohorts"),
        fetch("/api/admin/cohort-config"),
      ]);

      if (cohortCfgRes.ok) {
        const cfgJson = await cohortCfgRes.json();
        if (cfgJson.ok && cfgJson.config) {
          setCohortName(cfgJson.config.active_cohort_name || "Apex Cohort");
          setCohortTagline(cfgJson.config.active_cohort_tagline || "Guided Educational Programme & Intensive Mentorship");
          setCohortSession(cfgJson.config.active_cohort_session || "2026/2027");
          setCohortTarget(cfgJson.config.active_cohort_target || "JAMB UTME 2027");
          setCohortIsEnrolling(cfgJson.config.is_enrolling !== false);
        }
      }

      if (!res.ok) {
        throw new Error("Failed to load cohort management data.");
      }
      const json = await res.json();
      if (json.ok) {
        setProgrammes(json.programmes || []);
        setTiers(json.tiers || []);
        setFeatures(json.features || []);
        setCodes(json.codes || []);
        setAuditLogs(json.auditLogs || []);
        if (json.tiers?.length > 0 && !progTierId) {
          setProgTierId(json.tiers[0].id);
          setCodeTierId(json.tiers[0].id);
        }
        if (json.features?.length > 0 && !grantFeatureKey) {
          setGrantFeatureKey(json.features[0].feature_key);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [progTierId, grantFeatureKey]);

  useEffect(() => {
    let mounted = true;
    void getAdminSession().then((session) => {
      if (!mounted) return;
      if (!session) {
        router.replace("/admin/login");
        return;
      }
      setAdmin(session);
      void loadData();
    });
    return () => {
      mounted = false;
    };
  }, [router, loadData]);

  // Create Programme Handler
  const handleCreateProgramme = async () => {
    if (!progName.trim() || !progSlug.trim()) {
      setError("Please provide a programme name and URL slug.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_programme",
          name: progName,
          slug: progSlug,
          description: progDesc,
          tier_id: progTierId || null,
          starts_at: progStartsAt || undefined,
          ends_at: progEndsAt || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Failed to create programme");

      setNotice(`Programme "${progName}" created successfully!`);
      setProgName("");
      setProgSlug("");
      setProgDesc("");
      setProgStartsAt("");
      setProgEndsAt("");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Resolve Student Handler
  const handleResolveStudent = async () => {
    if (!studentQuery.trim()) return;
    setBusy(true);
    setError("");
    setResolvedStudent(null);
    try {
      const res = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_student",
          query: studentQuery.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Student not found");
      setResolvedStudent(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Create Grant Handler
  const handleCreateGrant = async () => {
    if (!resolvedStudent?.user_id) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_grant",
          user_id: resolvedStudent.user_id,
          feature_key: grantFeatureKey,
          feature_level: grantLevel || undefined,
          quota_allowance: grantQuota ? Number(grantQuota) : undefined,
          expires_at: grantExpiry || undefined,
          notes: grantNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Failed to create grant");

      setNotice("Student grant applied successfully!");
      setGrantQuota("");
      setGrantNotes("");
      await handleResolveStudent();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Revoke Grant Handler
  const handleRevokeGrant = async (grantId: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_grant",
          grant_id: grantId,
          reason: "Revoked from Cohort Management Centre",
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Failed to revoke grant");

      setNotice("Grant revoked.");
      await handleResolveStudent();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Generate Hashed Code Handler
  const handleGenerateCode = async () => {
    setBusy(true);
    setError("");
    setCreatedPlainCode(null);
    try {
      const res = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_code",
          tier_id: codeTierId || null,
          programme_id: codeProgId || null,
          validity_days: codeDays,
          prefix_tag: codePrefixTag,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Failed to generate voucher");

      setCreatedPlainCode(json.code);
      setNotice(json.message);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Save/Rename Flagship Cohort Handler
  const handleSaveCohortConfig = async () => {
    if (!cohortName.trim()) {
      setError("Cohort name cannot be empty.");
      return;
    }
    setCohortSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/cohort-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          active_cohort_name: cohortName.trim(),
          active_cohort_tagline: cohortTagline.trim(),
          active_cohort_session: cohortSession.trim(),
          active_cohort_target: cohortTarget.trim(),
          is_enrolling: cohortIsEnrolling,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Failed to update cohort name");
      setNotice(`Cohort name successfully updated to "${cohortName.trim()}"! Changes have propagated platform-wide.`);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("brainlab_cfg_cohort_platform_config", JSON.stringify(json.config));
        } catch {}
      }
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCohortSaving(false);
    }
  };

  // Create New Cohort Handler
  const handleCreateNewCohort = async () => {
    if (!newCohortNameInput.trim()) {
      setError("Please provide a name for the new cohort.");
      return;
    }
    setCohortSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/cohort-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_new_cohort",
          new_cohort_name: newCohortNameInput.trim(),
          session: cohortSession.trim(),
          exam_target: cohortTarget.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Failed to create new cohort");
      setCohortName(newCohortNameInput.trim());
      setNewCohortNameInput("");
      setShowNewCohortModal(false);
      setNotice(`New cohort "${json.config.active_cohort_name}" created and set as active cohort platform-wide!`);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("brainlab_cfg_cohort_platform_config", JSON.stringify(json.config));
        } catch {}
      }
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCohortSaving(false);
    }
  };

  return (
    <main className="admin-page-container min-h-screen px-4 py-8 max-w-7xl mx-auto space-y-6">
      <AdminPinGuard>
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-extrabold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                PROMPT 2B OPERATOR CONSOLE
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">
              Access & Cohort Management Centre
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Authoritative student entitlements, academic cohorts, hashed vouchers, and feature gates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadData()}
              disabled={loading || busy}
              className={buttonSecondary}
            >
              Refresh Data
            </button>
            <button
              onClick={() => router.push("/admin/users")}
              className={buttonSecondary}
            >
              Staff RBAC &rarr;
            </button>
          </div>
        </header>

        {/* Notices & Alerts */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
            {notice}
          </div>
        )}

        {/* Plaintext Code Modal (Shown Once Only) */}
        {createdPlainCode && (
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 dark:border-amber-600 dark:bg-amber-950/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-black uppercase text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                  CRITICAL: RECORD NOW (SHOWN ONCE ONLY)
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  New Access Code Voucher Generated
                </h3>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  In compliance with Rule F1, this plaintext code is hashed in the database and cannot be retrieved again.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <code className="select-all rounded-xl border border-amber-300 bg-white px-4 py-2 text-2xl font-mono font-black tracking-wider text-blue-700 dark:border-amber-700 dark:bg-slate-900 dark:text-blue-400">
                    {createdPlainCode}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdPlainCode);
                      setNotice("Voucher code copied to clipboard!");
                    }}
                    className={buttonPrimary}
                  >
                    Copy Code
                  </button>
                </div>
              </div>
              <button
                onClick={() => setCreatedPlainCode(null)}
                className="text-slate-500 hover:text-slate-700 font-bold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto rounded-xl bg-slate-100 p-1.5 dark:bg-slate-900">
          {[
            { id: "programmes", label: "Programmes & Cohorts" },
            { id: "students", label: "Student Resolver & Overrides" },
            { id: "codes", label: "Hashed Access Vouchers" },
            { id: "catalog", label: "Feature Catalogue & Tiers" },
            { id: "audit", label: "Audit Logs & Governance" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-lg px-4 py-2.5 text-sm font-bold transition whitespace-nowrap min-h-[44px] ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* TAB 1: ACADEMIC PROGRAMMES & COHORTS */}
        {activeTab === "programmes" && (
          <div className="space-y-6">
            {/* Flagship Cohort & Public Identity Control Panel */}
            <section className="rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 p-5 shadow-sm dark:border-indigo-500/30 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/20 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-950 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      FLAGSHIP COHORT (APEX) GOVERNANCE
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Platform-Wide
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">
                    Active Cohort Identity &amp; Branding
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Change the cohort name below. Saving updates every single surface across BrainLab (Navigation Header, Pricing Plan, Enrolment Portal, WhatsApp Helpdesk Dispatch, and Classroom Gates) dynamically.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCohortModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300 min-h-[40px] cursor-pointer"
                  >
                    <span>+ Launch New Cohort</span>
                  </button>
                </div>
              </div>

              {/* Active Cohort Form */}
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                    Cohort Display Name (Applies Everywhere) *
                  </label>
                  <input
                    type="text"
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                    placeholder="e.g. Apex Cohort or Pinnacle Cohort 2027"
                    className={`mt-1 font-bold ${inputClass}`}
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Default: <strong>Apex Cohort</strong>. Renaming updates all public marketing and student portals.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Academic Session
                  </label>
                  <input
                    type="text"
                    value={cohortSession}
                    onChange={(e) => setCohortSession(e.target.value)}
                    placeholder="e.g. 2026/2027"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Examination Target
                  </label>
                  <input
                    type="text"
                    value={cohortTarget}
                    onChange={(e) => setCohortTarget(e.target.value)}
                    placeholder="e.g. JAMB UTME 2027"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Tagline / Programme Purpose
                  </label>
                  <input
                    type="text"
                    value={cohortTagline}
                    onChange={(e) => setCohortTagline(e.target.value)}
                    placeholder="e.g. Guided Educational Programme & Intensive Mentorship"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Enrolment Admissions Status
                  </label>
                  <select
                    value={cohortIsEnrolling ? "open" : "closed"}
                    onChange={(e) => setCohortIsEnrolling(e.target.value === "open")}
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="open">Admissions Open (Enrolling)</option>
                    <option value="closed">Admissions Closed (Full)</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between pt-4 border-t border-indigo-100 dark:border-indigo-950">
                <div className="text-xs text-slate-500">
                  Current Live Name: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{cohortName}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveCohortConfig()}
                  disabled={cohortSaving || !cohortName.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-black text-white shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px] cursor-pointer"
                >
                  {cohortSaving ? "Saving..." : "Save & Propagate Cohort Name"}
                </button>
              </div>

              {/* Modal for Launching a New Cohort */}
              {showNewCohortModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                  <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Launch &amp; Register New Academic Cohort
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Creates a new cohort entity in the database and automatically promotes it as the new active cohort name across the entire platform.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                          New Cohort Name *
                        </label>
                        <input
                          type="text"
                          value={newCohortNameInput}
                          onChange={(e) => setNewCohortNameInput(e.target.value)}
                          placeholder="e.g. Pinnacle Cohort 2027 or Titan UTME Batch"
                          className={`mt-1 ${inputClass}`}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCohortModal(false);
                          setNewCohortNameInput("");
                        }}
                        className={buttonSecondary}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateNewCohort()}
                        disabled={cohortSaving || !newCohortNameInput.trim()}
                        className={buttonPrimary}
                      >
                        {cohortSaving ? "Creating..." : "Create & Activate Cohort"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Create Programme Card */}
            <section className={panelClass}>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Create New Academic Cohort Programme
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Establish institutional programmes, scholarship cohorts, or school examination batches.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Programme Name *
                  </label>
                  <input
                    type="text"
                    value={progName}
                    onChange={(e) => {
                      setProgName(e.target.value);
                      if (!progSlug) {
                        setProgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                      }
                    }}
                    placeholder="e.g. UTME 2026 Masterclass Cohort"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    value={progSlug}
                    onChange={(e) => setProgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
                    placeholder="e.g. utme-2026-masterclass"
                    className={`mt-1 font-mono ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Assigned Entitlement Tier
                  </label>
                  <select
                    value={progTierId}
                    onChange={(e) => setProgTierId(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="">No automatic tier</option>
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Rank {t.rank})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Description & Objectives
                  </label>
                  <input
                    type="text"
                    value={progDesc}
                    onChange={(e) => setProgDesc(e.target.value)}
                    placeholder="Curriculum focus, schedule, or institutional boundaries"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => void handleCreateProgramme()}
                  disabled={busy || !progName.trim() || !progSlug.trim()}
                  className={buttonPrimary}
                >
                  Create Programme
                </button>
              </div>
            </section>

            {/* Programmes List */}
            <section className={panelClass}>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Active Academic Programmes ({programmes.length})
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <tr>
                      <th className="p-3">Programme</th>
                      <th className="p-3">Slug</th>
                      <th className="p-3">Tier Grant</th>
                      <th className="p-3">Active Members</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programmes.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="p-3">
                          <span className="block font-bold">{p.name}</span>
                          <span className="text-xs text-slate-500">{p.description}</span>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {p.slug}
                        </td>
                        <td className="p-3">
                          {p.access_tiers ? (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {p.access_tiers.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                          {p.member_count} enrolled
                        </td>
                        <td className="p-3">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                    {programmes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          No programmes established yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: STUDENT RESOLVER & OVERRIDES */}
        {activeTab === "students" && (
          <div className="space-y-6">
            {/* Search Student Card */}
            <section className={panelClass}>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Authoritative Entitlement Lookup
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Enter a candidate&apos;s email or UUID to resolve their authoritative effective access, tier rank, and active grants.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleResolveStudent()}
                  placeholder="candidate@example.com or user-uuid"
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  onClick={() => void handleResolveStudent()}
                  disabled={busy || !studentQuery.trim()}
                  className={buttonPrimary}
                >
                  Resolve Access
                </button>
              </div>
            </section>

            {/* Resolved Student Profile */}
            {resolvedStudent && (
              <div className="space-y-6">
                <section className={panelClass}>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-500">Candidate Identity</span>
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                        {resolvedStudent.email}
                      </h3>
                      <p className="font-mono text-xs text-slate-500">{resolvedStudent.user_id}</p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                        Effective Tier: {resolvedStudent.resolved.tier_name} (Rank {resolvedStudent.resolved.rank})
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        {resolvedStudent.resolved.is_subscribed ? "Paid / Programme Member" : "Default Free Fallback"}
                      </p>
                    </div>
                  </div>

                  {/* Feature Matrix Breakdown */}
                  <div className="mt-6">
                    <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                      Resolved Feature Capabilities
                    </h4>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(resolvedStudent.resolved.features || {}).map(([key, feat]: [string, any]) => (
                        <div
                          key={key}
                          className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{key}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                                feat.enabled
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                  : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {feat.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                          {feat.level && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
                              Level: <strong>{feat.level}</strong>
                            </p>
                          )}
                          {feat.quota_limit > 0 && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              Allowance: <strong>{feat.remaining}</strong> / {feat.quota_limit} ({feat.period})
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Individual Grants */}
                  <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
                    <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                      Active Individual Grants ({resolvedStudent.grants?.length || 0})
                    </h4>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                          <tr>
                            <th className="p-2.5">Feature</th>
                            <th className="p-2.5">Quota / Level</th>
                            <th className="p-2.5">Expires</th>
                            <th className="p-2.5">Notes</th>
                            <th className="p-2.5">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resolvedStudent.grants?.map((g: any) => (
                            <tr key={g.id} className="border-t border-slate-100 dark:border-slate-800">
                              <td className="p-2.5 font-bold">{g.feature_key}</td>
                              <td className="p-2.5 text-xs">
                                {g.quota_allowance ? `+${g.quota_allowance} quota` : g.feature_level || "Active"}
                              </td>
                              <td className="p-2.5 text-xs text-slate-500">
                                {g.expires_at ? new Date(g.expires_at).toLocaleDateString() : "Permanent"}
                              </td>
                              <td className="p-2.5 text-xs text-slate-500">{g.notes || "—"}</td>
                              <td className="p-2.5">
                                <button
                                  onClick={() => void handleRevokeGrant(g.id)}
                                  disabled={busy}
                                  className="text-xs font-bold text-red-600 hover:underline"
                                >
                                  Revoke
                                </button>
                              </td>
                            </tr>
                          ))}
                          {resolvedStudent.grants?.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-xs text-slate-500">
                                No individual grant overrides. Access is purely governed by active tier.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Apply New Grant Form */}
                  <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/20">
                    <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      Grant Specific Feature Override to Candidate
                    </h5>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Feature</label>
                        <select
                          value={grantFeatureKey}
                          onChange={(e) => setGrantFeatureKey(e.target.value)}
                          className={`mt-1 ${inputClass}`}
                        >
                          {features.map((f) => (
                            <option key={f.feature_key} value={f.feature_key}>
                              {f.name} ({f.feature_type})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                          Extra Quota Allowance
                        </label>
                        <input
                          type="number"
                          value={grantQuota}
                          onChange={(e) => setGrantQuota(e.target.value)}
                          placeholder="e.g. 100"
                          className={`mt-1 ${inputClass}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                          Expiry Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={grantExpiry}
                          onChange={(e) => setGrantExpiry(e.target.value)}
                          className={`mt-1 ${inputClass}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Audit Notes</label>
                        <input
                          type="text"
                          value={grantNotes}
                          onChange={(e) => setGrantNotes(e.target.value)}
                          placeholder="Reason for grant"
                          className={`mt-1 ${inputClass}`}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => void handleCreateGrant()}
                        disabled={busy || !grantFeatureKey}
                        className={buttonPrimary}
                      >
                        Apply Grant Override
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HASHED ACCESS VOUCHERS */}
        {activeTab === "codes" && (
          <div className="space-y-6">
            {/* Generate Voucher Card */}
            <section className={panelClass}>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Generate Cryptographic Access Code Voucher
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Generates a secure PIN voucher hashed with SHA-256. The plaintext code is revealed once only upon generation.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Voucher Prefix
                  </label>
                  <input
                    type="text"
                    value={codePrefixTag}
                    onChange={(e) => setCodePrefixTag(e.target.value.toUpperCase())}
                    placeholder="BLT"
                    className={`mt-1 font-mono uppercase ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Grants Entitlement Tier
                  </label>
                  <select
                    value={codeTierId}
                    onChange={(e) => setCodeTierId(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="">No tier (programme only)</option>
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Rank {t.rank})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Grants Programme Cohort
                  </label>
                  <select
                    value={codeProgId}
                    onChange={(e) => setCodeProgId(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="">None (stand-alone subscription)</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    value={codeDays}
                    onChange={(e) => setCodeDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => void handleGenerateCode()}
                  disabled={busy || (!codeTierId && !codeProgId)}
                  className={buttonPrimary}
                >
                  Generate Hashed Voucher
                </button>
              </div>
            </section>

            {/* Recent Vouchers List */}
            <section className={panelClass}>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Hashed Vouchers Registry ({codes.length})
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="p-3">Prefix / Identifier</th>
                      <th className="p-3">Target Entitlement</th>
                      <th className="p-3">Validity</th>
                      <th className="p-3">Redemption Status</th>
                      <th className="p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {c.code_prefix}
                        </td>
                        <td className="p-3">
                          {c.access_tiers ? (
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {c.access_tiers.name}
                            </span>
                          ) : c.access_programmes ? (
                            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                              {c.access_programmes.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-slate-600 dark:text-slate-400">{c.validity_days} days</td>
                        <td className="p-3">
                          {c.is_redeemed ? (
                            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Redeemed ({c.redeemed_at ? new Date(c.redeemed_at).toLocaleDateString() : "Yes"})
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                              Unclaimed
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {codes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          No vouchers issued yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* TAB 4: FEATURE CATALOGUE & TIERS */}
        {activeTab === "catalog" && (
          <div className="space-y-6">
            <section className={panelClass}>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Canonical Feature Registry ({features.length})
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Rule C1–C4: Database-backed feature registry. Feature identifiers do not depend on tier names.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((f) => (
                  <article key={f.feature_key} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{f.name}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {f.feature_type}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-blue-600 dark:text-blue-400">{f.feature_key}</p>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{f.description}</p>
                    {f.supported_levels && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Levels: {f.supported_levels.join(" &rarr; ")}
                      </p>
                    )}
                    {f.default_quota !== null && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Default: {f.default_quota} ({f.quota_period})
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Access Tiers Hierarchy ({tiers.length})
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
                {tiers.map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Rank {t.rank}
                    </span>
                    <h3 className="mt-2 font-extrabold text-base text-slate-900 dark:text-slate-100">{t.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{t.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS & GOVERNANCE */}
        {activeTab === "audit" && (
          <section className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Append-Only Audit Trail ({auditLogs.length})
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Rule H6–H7: Tamper-proof governance audit logs. Protected by append-only database trigger.
                </p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="p-3">Timestamp (UTC)</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-3 text-xs text-slate-500 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-mono font-bold text-xs text-blue-700 dark:text-blue-300">
                        {log.action}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{log.target_type}</span>
                        {log.target_id && <span className="block font-mono text-[11px] text-slate-400">{log.target_id}</span>}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-500">
                        {log.actor_id ? log.actor_id.slice(0, 8) + "..." : "System"}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </AdminPinGuard>
    </main>
  );
}
