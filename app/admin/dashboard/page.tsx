"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminSignOut, getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, ADMIN_ROLE_DETAILS, type AdminPermission } from "../../lib/adminRoles";
import { supabase } from "../../lib/supabase";
import AdminWorkspaceShell from "../AdminWorkspaceShell";

type Access = Partial<Record<AdminPermission, boolean>>;
type Metric = number | null;
type Metrics = { questions: Metric; results: Metric; codes: Metric };
type SettingsMap = { exam_duration: number; calculator_enabled: boolean; leaderboard_enabled: boolean; show_results: boolean; mock_enabled: boolean };
type SettingRow = { key: string; value: unknown };
const DEFAULT_SETTINGS: SettingsMap = { exam_duration: 7200, calculator_enabled: true, leaderboard_enabled: false, show_results: false, mock_enabled: true };

const PERMISSIONS: AdminPermission[] = [
  "cbt.config.read", "cbt.config.manage", "cbt.questions.manage", "cbt.results.read",
  "cbt.codes.manage", "cbt.sessions.read", "audit.logs.read", "learning.content.manage",
  "community.moderate", "analytics.read", "institution.manage", "finance.billing.manage",
];

function MetricCard({ label, value, note, symbol }: { label: string; value: Metric; note: string; symbol: string }) {
  return <article className="admin-kpi-card">
    <div className="admin-kpi-top"><span className="admin-kpi-label">{label}</span><span className="admin-kpi-icon" aria-hidden="true">{symbol}</span></div>
    <div className={"admin-kpi-value " + (value === null ? "is-unavailable" : "")}>{value === null ? "Unavailable" : value.toLocaleString()}</div>
    <p className="admin-kpi-note">{value === null ? "The data source could not be read. This is not reported as zero." : note}</p>
  </article>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Access>({});
  const [metrics, setMetrics] = useState<Metrics>({ questions: null, results: null, codes: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState<SettingsMap>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function initialise() {
      let verifiedAdmin = false;
      try {
        const admin = await getAdminSession();
        if (!active) return;
        if (!admin) { router.replace("/admin/login?reason=session"); return; }
        verifiedAdmin = true;
        setUser(admin);

        const entries = await Promise.all(PERMISSIONS.map(async (permission) => [
          permission, await adminHasPermission(permission),
        ] as const));
        if (!active) return;
        const access = Object.fromEntries(entries) as Access;
        setPermissions(access);

        const [questions, results, codes] = await Promise.all([
          access["cbt.questions.manage"] ? supabase.from("questions").select("*", { count: "exact", head: true }) : Promise.resolve(null),
          access["cbt.results.read"] ? supabase.from("results").select("*", { count: "exact", head: true }) : Promise.resolve(null),
          access["cbt.codes.manage"] ? supabase.from("access_codes").select("*", { count: "exact", head: true }) : Promise.resolve(null),
        ]);
        if (!active) return;
        setMetrics({
          questions: access["cbt.questions.manage"] ? (questions && !questions.error ? questions.count ?? 0 : null) : null,
          results: access["cbt.results.read"] ? (results && !results.error ? results.count ?? 0 : null) : null,
          codes: access["cbt.codes.manage"] ? (codes && !codes.error ? codes.count ?? 0 : null) : null,
        });
        if (access["cbt.config.read"]) {
          const { data: settingRows, error: settingsError } = await supabase.from("settings").select("key, value");
          if (!active) return;
          if (settingsError) {
            setSettingsMessage("Exam quick settings could not be read. Use Exam Configuration if available.");
          } else {
            const next = { ...DEFAULT_SETTINGS };
            (settingRows ?? []).forEach((row: SettingRow) => {
              if (row.key === "exam_duration") next.exam_duration = Number(row.value) || 7200;
              if (row.key === "calculator_enabled") next.calculator_enabled = row.value === true || row.value === "true";
              if (row.key === "leaderboard_enabled") next.leaderboard_enabled = row.value === true || row.value === "true";
              if (row.key === "show_results") next.show_results = row.value === true || row.value === "true";
              if (row.key === "mock_enabled") next.mock_enabled = row.value === true || row.value === "true";
            });
            setSettings(next);
          }
        }
        if ([questions, results, codes].some((result) => result?.error)) {
          setLoadError("Some dashboard data could not be loaded. Unavailable values are shown explicitly rather than as zero.");
        }
      } catch {
        if (active) setLoadError("The dashboard could not load its data. Refresh the page or contact a platform administrator.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialise();
    return () => { active = false; };
  }, [router]);

  async function saveQuickSetting(key: keyof SettingsMap, value: number | boolean) {
    const { error } = await supabase.from("settings").update({ value }).eq("key", key);
    if (error) throw new Error(error.message);
  }

  async function saveQuickSettings() {
    setSavingSettings(true);
    setSettingsMessage("");
    try {
      await Promise.all([
        saveQuickSetting("exam_duration", settings.exam_duration),
        saveQuickSetting("calculator_enabled", settings.calculator_enabled),
        saveQuickSetting("leaderboard_enabled", settings.leaderboard_enabled),
        saveQuickSetting("show_results", settings.show_results),
        saveQuickSetting("mock_enabled", settings.mock_enabled),
      ]);
      setSettingsMessage("Exam quick settings saved.");
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "Could not save exam quick settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleLogout() {
    await adminSignOut();
    router.replace("/account");
  }

  if (loading || !user) return <main className="admin-login-shell"><section className="admin-login-card"><p>{loading ? "Verifying administrator session…" : "Redirecting to sign in…"}</p></section></main>;

  const roleName = ADMIN_ROLE_DETAILS[user.role]?.label ?? user.role.replaceAll("_", " ");
  const canOpen = (permission: AdminPermission) => permissions[permission] === true;
  const platformAdmin = user.role === "super_admin" || user.role === "platform_admin";

  return <AdminWorkspaceShell user={user} permissions={permissions} onLogout={handleLogout}>
    <section className="admin-overview-heading">
      <div><h1>Good to see you, administrator.</h1><p>Monitor BrainLab Academy, open your daily workflows, and identify the data connections that still need to be enabled.</p></div>
      <span className="admin-overview-date">{roleName}</span>
    </section>

    {loadError && <div className="admin-workspace-message" role="status">{loadError}</div>}

    <section className="admin-kpi-grid" aria-label="Current platform metrics">
      {canOpen("cbt.questions.manage") && <MetricCard label="Question bank" value={metrics.questions} note="Questions available in the bank" symbol="Q" />}
      {canOpen("cbt.results.read") && <MetricCard label="Exam results" value={metrics.results} note="Result records accessible to your role" symbol="R" />}
      {canOpen("cbt.codes.manage") && <MetricCard label="Access codes" value={metrics.codes} note="Access-code records accessible to your role" symbol="C" />}
    </section>

    <div className="admin-dashboard-grid">
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Quick access</h2><p>Jump directly into your permitted workflows.</p></div></div>
        <div className="admin-action-list">
          {canOpen("cbt.questions.manage") && <Link className="admin-action-link" href="/admin/questions/manage"><strong>Question Bank</strong><span>Manage question records and maintenance tasks.</span></Link>}
          {canOpen("cbt.codes.manage") && <Link className="admin-action-link" href="/admin/codes"><strong>Access Codes</strong><span>Create and review exam access codes.</span></Link>}
          {canOpen("cbt.results.read") && <Link className="admin-action-link" href="/admin/results"><strong>Results & Corrections</strong><span>Review candidate performance within your permissions.</span></Link>}
          {canOpen("cbt.sessions.read") && <Link className="admin-action-link" href="/admin/sessions"><strong>Exam Sessions</strong><span>Review authorised exam-session activity.</span></Link>}
          {canOpen("learning.content.manage") && <Link className="admin-action-link" href="/admin/content"><strong>Learning Content</strong><span>Manage content and learning resources.</span></Link>}
          {(canOpen("institution.manage") || platformAdmin) && <Link className="admin-action-link" href="/admin/schools"><strong>Schools & Organisations</strong><span>Manage institutional workflows and access.</span></Link>}
          {(canOpen("analytics.read") || platformAdmin) && <Link className="admin-action-link" href="/admin/analytics"><strong>Analytics & Reports</strong><span>Open the reporting tools available today.</span></Link>}
          {(canOpen("cbt.config.manage") || platformAdmin) && <Link className="admin-action-link" href="/admin/settings"><strong>Settings</strong><span>Open the central settings directory.</span></Link>}
          {platformAdmin && <Link className="admin-action-link" href="/admin/ai"><strong>AI Controls</strong><span>Manage existing AI provider and quota controls.</span></Link>}
          {(canOpen("finance.billing.manage") || platformAdmin) && <Link className="admin-action-link" href="/admin/pricing"><strong>Plans & Pricing</strong><span>Manage plans and entitlements.</span></Link>}
          {canOpen("community.moderate") && <Link className="admin-action-link" href="/admin/moderation"><strong>Community Moderation</strong><span>Review permitted community workflows.</span></Link>}
          {platformAdmin && <Link className="admin-action-link" href="/admin/security"><strong>Security & Audit</strong><span>Review administrator access and security controls.</span></Link>}
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Dashboard connections</h2><p>Do not mistake unconnected metrics for zero activity.</p></div></div>
        <div className="admin-connection-item"><span className="admin-connection-status" aria-hidden="true" /><div><strong>Website traffic</strong><p>Analytics integration is not yet surfaced in this dashboard. Connect verified traffic data before showing visits or conversion rates.</p></div></div>
        <div className="admin-connection-item"><span className="admin-connection-status" aria-hidden="true" /><div><strong>AI usage and cost</strong><p>Provider requests, token usage, latency and cost need a verified telemetry source before they can be reported here.</p></div></div>
        <div className="admin-connection-item"><span className="admin-connection-status" aria-hidden="true" /><div><strong>BACHS payments</strong><p>Finance metrics should use server-verified BACHS transactions and reconciliation records, not checkout redirects.</p></div></div>
        <div className="admin-connection-item"><span className="admin-connection-status" aria-hidden="true" /><div><strong>System health</strong><p>Connect application and integration telemetry to provide actionable error alerts.</p></div></div>
      </section>
    </div>

    <section className="admin-panel" style={{ marginTop: 16 }}>
      <div className="admin-panel-heading"><div><h2>Next operational priorities</h2><p>Recommended order for expanding the dashboard without inventing data.</p></div></div>
      <div className="admin-action-list">
        <Link className="admin-action-link" href="/admin/settings"><strong>1. Centralise settings</strong><span>Keep configuration organised and preserve existing settings routes.</span></Link>
        <Link className="admin-action-link" href="/admin/analytics"><strong>2. Build verified analytics</strong><span>Document metric definitions, access rules and data sources.</span></Link>
        <Link className="admin-action-link" href="/admin/ai"><strong>3. Instrument AI operations</strong><span>Measure usage, errors and cost only where provider data supports it.</span></Link>
        <Link className="admin-action-link" href="/admin/pricing"><strong>4. Validate BACHS reporting</strong><span>Confirm payment state and reconcile transaction references.</span></Link>
      </div>
    </section>

    {canOpen("cbt.config.manage") && <section className="admin-panel" style={{ marginTop: 16 }}>
      <div className="admin-panel-heading"><div><h2>Exam settings quick controls</h2><p>Existing settings-table controls retained during the dashboard migration.</p></div><Link className="admin-panel-link" href="/admin/config">Full configuration</Link></div>
      <div className="admin-settings-directory">
        <label><strong>Exam duration (seconds)</strong><input className="admin-input" type="number" min={60} value={settings.exam_duration} onChange={(event) => setSettings((prev) => ({ ...prev, exam_duration: Number(event.target.value) || 7200 }))} /></label>
        <label><strong>Calculator enabled</strong><input type="checkbox" checked={settings.calculator_enabled} onChange={(event) => setSettings((prev) => ({ ...prev, calculator_enabled: event.target.checked }))} /></label>
        <label><strong>Leaderboard enabled</strong><input type="checkbox" checked={settings.leaderboard_enabled} onChange={(event) => setSettings((prev) => ({ ...prev, leaderboard_enabled: event.target.checked }))} /></label>
        <label><strong>Release results to candidates</strong><input type="checkbox" checked={settings.show_results} onChange={(event) => setSettings((prev) => ({ ...prev, show_results: event.target.checked }))} /></label>
        <label><strong>Allow candidates to start exams</strong><input type="checkbox" checked={settings.mock_enabled} onChange={(event) => setSettings((prev) => ({ ...prev, mock_enabled: event.target.checked }))} /></label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}><button className="admin-btn-primary" type="button" onClick={saveQuickSettings} disabled={savingSettings}>{savingSettings ? "Saving…" : "Save quick settings"}</button>{settingsMessage && <span role="status" className="admin-kpi-note">{settingsMessage}</span>}</div>
    </section>}
  </AdminWorkspaceShell>;
}
