"use client";

import { adminSignOut, getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, ADMIN_ROLE_DETAILS, type AdminPermission } from "../../lib/adminRoles";
import { getFeatureFlags, setFeatureFlag, type FeatureFlags } from "../../lib/platformConfig";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import "../admin.css";

type SettingRow = {
  key: string;
  value: unknown;
};

type SettingsMap = {
  exam_duration: number;
  calculator_enabled: boolean;
  leaderboard_enabled: boolean;
  show_results: boolean;
  mock_enabled: boolean;
};

type StatCard = {
  title: string;
  value: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<AdminPermission, boolean>>>({});
  const [settings, setSettings] = useState<SettingsMap>({
    exam_duration: 7200,
    calculator_enabled: true,
    leaderboard_enabled: false,
    show_results: false,
    mock_enabled: true,
  });

  const [stats, setStats] = useState<StatCard[]>([
    { title: "Question Bank", value: 0 },
    { title: "Results", value: 0 },
    { title: "Access Codes", value: 0 },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    competitions_enabled: true,
    ai_hints_enabled: true,
    offline_mode: true,
    public_leaderboard: true,
    mock_exams: true,
    calculator_enabled: true,
    certificates_enabled: true,
    negative_marking: false,
  });

  useEffect(() => {
    void getFeatureFlags().then((flags) => setFeatureFlags(flags));
  }, []);

  async function handleToggleFlag(key: keyof FeatureFlags) {
    if (!adminUser) return;
    const newVal = !featureFlags[key];
    setFeatureFlags((prev) => ({ ...prev, [key]: newVal }));
    await setFeatureFlag(key, newVal, { id: adminUser.id, email: adminUser.email });
    setMessage(`Feature flag "${String(key)}" set to ${newVal ? "Enabled" : "Disabled"}.`);
  }
  const [organisations, setOrganisations] = useState<{ id: string; name: string; slug: string; status: string }[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>("");

  const loadAdminData = useCallback(async (access: Partial<Record<AdminPermission, boolean>> = {}) => {
    setLoading(true);
    setMessage("");

    const canReadConfig = access["cbt.config.read"] === true;
    const canReadQuestions = access["cbt.questions.manage"] === true;
    const canReadResults = access["cbt.results.read"] === true;
    const canReadCodes = access["cbt.codes.manage"] === true;

    const [settingsResult, questionCount, resultCount, codeCount] = await Promise.all([
      (async () => canReadConfig
        ? await supabase.from("settings").select("key, value")
        : { data: [] as SettingRow[], error: null })(),
      (async () => {
        if (!canReadQuestions) return 0;
        const { count } = await supabase.from("questions").select("*", { count: "exact", head: true });
        return count ?? 0;
      })(),
      (async () => {
        if (!canReadResults) return 0;
        const { count } = await supabase.from("results").select("*", { count: "exact", head: true });
        return count ?? 0;
      })(),
      (async () => {
        if (!canReadCodes) return 0;
        const { count } = await supabase.from("access_codes").select("*", { count: "exact", head: true });
        return count ?? 0;
      })(),
    ]);

    if (settingsResult.error) {
      setMessage("You do not have permission to read examination settings.");
      setLoading(false);
      return;
    }

    const nextSettings: SettingsMap = {
      exam_duration: 7200,
      calculator_enabled: true,
      leaderboard_enabled: false,
      show_results: false,
      mock_enabled: true,
    };

    (settingsResult.data || []).forEach((row: SettingRow) => {
      if (row.key === "exam_duration") nextSettings.exam_duration = Number(row.value) || 7200;
      if (row.key === "calculator_enabled") nextSettings.calculator_enabled = row.value === true || row.value === "true";
      if (row.key === "leaderboard_enabled") nextSettings.leaderboard_enabled = row.value === true || row.value === "true";
      if (row.key === "show_results") nextSettings.show_results = row.value === true || row.value === "true";
      if (row.key === "mock_enabled") nextSettings.mock_enabled = row.value === true || row.value === "true";
    });

    if (canReadConfig) setSettings(nextSettings);
    setStats([
      { title: "Question Bank", value: questionCount },
      { title: "Results", value: resultCount },
      { title: "Access Codes", value: codeCount },
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function initializeDashboard() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) {
        router.replace("/account");
        return;
      }

      setAdminUser(admin);
      const permissionKeys: AdminPermission[] = [
        "cbt.config.read",
        "cbt.config.manage",
        "cbt.questions.manage",
        "cbt.results.read",
        "cbt.codes.manage",
        "cbt.sessions.read",
        "audit.logs.read",
        "learning.content.manage",
        "community.moderate",
        "analytics.read",
        "institution.manage",
        "finance.billing.manage",
      ];
      const entries = await Promise.all(
        permissionKeys.map(async (permission) => [
          permission,
          await adminHasPermission(permission),
        ] as const)
      );
      if (!active) return;
      const access = Object.fromEntries(entries) as Partial<Record<AdminPermission, boolean>>;
      setPermissions(access);
      try {
        const { data: orgsData } = await supabase.from("learning_organisations").select("id, name, slug, status").order("name");
        if (orgsData) {
          setOrganisations(orgsData);
          const savedOrg = typeof window !== "undefined" ? localStorage.getItem("admin_active_org_id") : null;
          if (savedOrg && orgsData.some((o: { id: string }) => o.id === savedOrg)) {
            setActiveOrgId(savedOrg);
          }
        }
      } catch {}
      await loadAdminData(access);
    }

    void initializeDashboard().catch(() => {
      if (active) router.replace("/account");
    });
    return () => { active = false; };
  }, [router, loadAdminData]);

  async function saveSetting(key: keyof SettingsMap, value: number | boolean) {
    const { error } = await supabase
      .from("settings")
      .update({ value })
      .eq("key", key);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      await Promise.all([
        saveSetting("exam_duration", settings.exam_duration),
        saveSetting("calculator_enabled", settings.calculator_enabled),
        saveSetting("leaderboard_enabled", settings.leaderboard_enabled),
        saveSetting("show_results", settings.show_results),
        saveSetting("mock_enabled", settings.mock_enabled),
      ]);

      setMessage("Settings saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDuration(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (mins === 0) return `${hrs} hour${hrs === 1 ? "" : "s"}`;
    return `${hrs}h ${mins}m`;
  }

  async function handleLogout() {
    await adminSignOut();
    router.replace("/account");
  }

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card">
            <p className="text-lg font-medium text-slate-700">
              Loading admin dashboard...
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
<div className="admin-badge">BrainLab · {adminUser ? (ADMIN_ROLE_DETAILS[adminUser.role]?.label ?? adminUser.role.replaceAll("_", " ")) : "Admin Dashboard"}</div>
<h1 className="admin-title">CBT Control Center</h1>
<p className="admin-subtitle">
  Monitor results, manage question banks, generate access codes, track exam
  sessions, and control live exam settings from one polished admin workspace.
</p>

              {adminUser && (
                <div className="admin-user-chip">
                  Signed in as <strong>{adminUser. email}</strong>
                </div>
              )}
            </div>

            <div className="admin-actions">
              <AdminNotificationBell />
              <button
                onClick={() => router.push("/admin/codes")}
                className="admin-btn-light"
              >
                Codes
              </button>

              <button
                onClick={() => router.push("/admin/results")}
                className="admin-btn-light"
              >
                Results
              </button>

              <button onClick={() => router.push("/admin/classroom")} className="admin-btn-light !border-blue-600 !text-blue-900 font-bold">🎥 Live Classroom</button>
              <button onClick={() => router.push("/admin/pricing")} className="admin-btn-light">Pricing</button>
              <button onClick={handleLogout} className="admin-btn-primary">
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="admin-section mb-6 border border-blue-500/30 bg-gradient-to-br from-[#012153] via-blue-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Classroom Host Portal
              </div>
              <h2 className="mt-3 text-2xl font-black text-white">
                Teacher &amp; Administrator Live Classroom
              </h2>
              <p className="mt-1.5 text-sm text-blue-100/90 max-w-xl leading-relaxed">
                Host interactive live classes with WebRTC audio/video, broadcast whiteboard and screen shares, conduct instant multiple-choice polls, and monitor student attendance in real time.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push("/classroom/demo-class")}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 active:scale-95"
              >
                <span>🎥</span> Enter Live Stage as Host
              </button>
              <button
                onClick={() => router.push("/admin/classroom")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20 active:scale-95"
              >
                Classroom Governance &amp; Rules
              </button>
            </div>
          </div>
        </section>

        <section className="admin-section admin-card mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold uppercase tracking-wider text-indigo-700">🏢 Multi-Tenant Institution Scope</span>
                {activeOrgId && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                    Scoped
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Filter assessments, learner access codes, and results by institutional boundary.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Active Organisation Context"
                className="admin-input !mt-0 !w-auto min-w-[220px] text-xs font-semibold"
                value={activeOrgId}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveOrgId(val);
                  if (typeof window !== "undefined") {
                    if (val) localStorage.setItem("admin_active_org_id", val);
                    else localStorage.removeItem("admin_active_org_id");
                  }
                }}
              >
                <option value="">Global / All Institutions</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.status})
                  </option>
                ))}
              </select>
              {activeOrgId && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveOrgId("");
                    if (typeof window !== "undefined") localStorage.removeItem("admin_active_org_id");
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Reset to Global
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="admin-section admin-stats">
          {stats.filter((stat) => stat.title === "Question Bank" ? permissions["cbt.questions.manage"] : stat.title === "Results" ? permissions["cbt.results.read"] : permissions["cbt.codes.manage"]).map((stat) => (
            <div key={stat.title} className="admin-stat-card">
              <p className="admin-stat-label">{stat.title}</p>
              <p className="admin-stat-value">{stat.value}</p>
            </div>
          ))}
        </section>

<section className="admin-section admin-grid-2">
  {permissions["cbt.codes.manage"] && <button onClick={() => router.push("/admin/codes")} className="admin-card text-left"><h2 className="admin-card-title">Access Codes</h2><p className="admin-card-text">Generate and monitor exam access codes.</p></button>}
  {permissions["cbt.results.read"] && <button onClick={() => router.push("/admin/results")} className="admin-card text-left"><h2 className="admin-card-title">Results</h2><p className="admin-card-text">View authorized candidate results and performance.</p></button>}
  {permissions["cbt.questions.manage"] && <button onClick={() => router.push("/admin/questions/manage")} className="admin-card text-left"><h2 className="admin-card-title">Questions</h2><p className="admin-card-text">Manage the authorized question bank.</p></button>}
  {permissions["cbt.sessions.read"] && <button onClick={() => router.push("/admin/sessions")} className="admin-card text-left"><h2 className="admin-card-title">Exam Sessions</h2><p className="admin-card-text">Review authorized exam-session activity.</p></button>}
  {permissions["cbt.config.manage"] && <button onClick={() => router.push("/admin/config")} className="admin-card text-left"><h2 className="admin-card-title">Exam Configuration</h2><p className="admin-card-text">Manage approved exam settings.</p></button>}
  {adminUser?.role === "super_admin" && <button onClick={() => router.push("/admin/users")} className="admin-card text-left"><h2 className="admin-card-title">Admin Roles</h2><p className="admin-card-text">Assign and review administrator roles.</p></button>}
  {adminUser?.role === "super_admin" && <button onClick={() => router.push("/admin/security")} className="admin-card text-left"><h2 className="admin-card-title">Security & Settings</h2><p className="admin-card-text">Access the restricted security workspace.</p></button>}
  {permissions["learning.content.manage"] && <button onClick={() => router.push("/admin/content")} className="admin-card text-left"><h2 className="admin-card-title">AI & Learning Content</h2><p className="admin-card-text">Manage approved learning content when the tools are enabled.</p></button>}
  {permissions["learning.content.manage"] && <button onClick={() => router.push("/admin/content-intelligence")} className="admin-card text-left"><h2 className="admin-card-title">Content Intelligence</h2><p className="admin-card-text">Audit syllabus coverage, detect topics missing practice questions, and monitor content health.</p></button>}
  {permissions["learning.content.manage"] && <button onClick={() => router.push("/admin/academy-assessments")} className="admin-card text-left"><h2 className="admin-card-title">Learning Assessments</h2><p className="admin-card-text">Create topic tests, configure timing and pass marks, manage questions, and publish assessments.</p></button>}
  {(permissions["institution.manage"] || permissions["learning.content.manage"]) && <button onClick={() => router.push("/admin/organised-assessments")} className="admin-card text-left"><h2 className="admin-card-title">Organisation Quizzes & Competitions</h2><p className="admin-card-text">Configure organisation assessments, competition settings, schedules, attempt limits, access-code requirements, and result-release rules.</p></button>}
  {(permissions["analytics.read"] || permissions["cbt.results.read"] || permissions["institution.manage"] || permissions["learning.content.manage"]) && <button onClick={() => router.push("/admin/academy-results")} className="admin-card text-left"><h2 className="admin-card-title">Assessment Results</h2><p className="admin-card-text">Review assessment attempts, scores, submission times, and auto-submissions, including results held from learners.</p></button>}
  {(permissions["learning.content.manage"] || permissions["cbt.codes.manage"]) && <button onClick={() => router.push("/admin/academy-access")} className="admin-card text-left"><h2 className="admin-card-title">Organisations & Access</h2><p className="admin-card-text">Manage organisations, membership access codes, temporary codes, entitlements and revocation.</p></button>}
  {permissions["community.moderate"] && <button onClick={() => router.push("/admin/moderation")} className="admin-card text-left"><h2 className="admin-card-title">Community Moderation</h2><p className="admin-card-text">Review community safety and support workflows.</p></button>}
  {permissions["analytics.read"] && <button onClick={() => router.push("/admin/analytics")} className="admin-card text-left"><h2 className="admin-card-title">Analytics</h2><p className="admin-card-text">Open permitted platform reporting.</p></button>}
  {(permissions["finance.billing.manage"] || adminUser?.role === "super_admin" || adminUser?.role === "platform_admin") && <button onClick={() => router.push("/admin/pricing")} className="admin-card text-left"><h2 className="admin-card-title">Plans & Pricing</h2><p className="admin-card-text">Manage subscription tiers, AI quotas, feature access, dynamic pricing, and review configuration audit logs.</p></button>}
  {(permissions["finance.billing.manage"] || adminUser?.role === "super_admin" || adminUser?.role === "platform_admin") && <button onClick={() => router.push("/admin/refunds")} className="admin-card text-left"><h2 className="admin-card-title">Refund Queue</h2><p className="admin-card-text">Review and adjudicate learner refund requests within the 24-hour guarantee window.</p></button>}
  {(permissions["finance.billing.manage"] || adminUser?.role === "super_admin" || adminUser?.role === "platform_admin") && <button onClick={() => router.push("/admin/coupons")} className="admin-card text-left"><h2 className="admin-card-title">Coupons & Campaigns</h2><p className="admin-card-text">Create promotional discount codes with concurrency caps, expiry dates, and minimum spend limits.</p></button>}
  {(adminUser?.role === "super_admin" || adminUser?.role === "platform_admin" || permissions["learning.content.manage"]) && <button onClick={() => router.push("/admin/academic")} className="admin-card text-left"><h2 className="admin-card-title">Academic Structure</h2><p className="admin-card-text">Manage class cohorts, academic sessions, curricula, and official question bank subjects.</p></button>}
  {(adminUser?.role === "super_admin" || adminUser?.role === "platform_admin") && <button onClick={() => router.push("/admin/ai")} className="admin-card text-left"><h2 className="admin-card-title">AI Controls & Quotas</h2><p className="admin-card-text">Configure primary AI providers, models, daily token quotas, and pedagogical prompt rules.</p></button>}
  {(adminUser?.role === "super_admin" || adminUser?.role === "platform_admin") && <button onClick={() => router.push("/admin/audit")} className="admin-card text-left"><h2 className="admin-card-title">Audit Trail</h2><p className="admin-card-text">Review the complete immutable ledger of administrative pricing, plan, and rule changes.</p></button>}
  {(adminUser?.role === "super_admin" || adminUser?.role === "platform_admin" || permissions["learning.content.manage"]) && <button onClick={() => router.push("/admin/gamification")} className="admin-card text-left"><h2 className="admin-card-title">Gamification &amp; Rewards</h2><p className="admin-card-text">Manage student badges, reputation levels, XP rules, and rewards catalog redemptions.</p></button>}
  {(adminUser?.role === "super_admin" || adminUser?.role === "platform_admin" || permissions["learning.content.manage"] || permissions["institution.manage"]) && <button onClick={() => router.push("/admin/classroom")} className="admin-card text-left border-blue-200 bg-blue-50/20"><h2 className="admin-card-title text-blue-900">📹 Live Classroom Governance</h2><p className="admin-card-text">Configure video infrastructure, attendance minimum thresholds, recording policies, and waiting rooms.</p></button>}
  {(adminUser?.role === "super_admin" || adminUser?.role === "platform_admin" || permissions["community.moderate"]) && <button onClick={() => router.push("/admin/communication")} className="admin-card text-left border-indigo-200 bg-indigo-50/20"><h2 className="admin-card-title text-indigo-900">💬 Communication & Audio Policies</h2><p className="admin-card-text">Manage private messaging, official content tags, tutor voice notes, and student audio response permissions.</p></button>}
  {(adminUser?.role === "super_admin" || adminUser?.role === "platform_admin" || permissions["institution.manage"] || permissions["cbt.codes.manage"]) && <button onClick={() => router.push("/admin/schools")} className="admin-card text-left border-sky-200 bg-sky-50/20"><h2 className="admin-card-title text-sky-950">🏫 School CBT &amp; Mock License Manager</h2><p className="admin-card-text">Review incoming school demo requests, generate bulk computer lab candidate PINs, and manage institutional partner packages.</p></button>}
</section>

        {permissions["cbt.config.manage"] && (
        <section className="admin-section admin-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="admin-card-title">Live Exam Settings</h2>
              <p className="admin-card-text">
                Adjust how the exam behaves for candidates in real time.
              </p>
            </div>

            <div className="admin-user-chip">
              Current duration <strong>{formatDuration(settings.exam_duration)}</strong>
            </div>
          </div>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">Exam Duration (seconds)</label>
              <input
                type="number"
                min={60}
                value={settings.exam_duration}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    exam_duration: Number(e.target.value) || 7200,
                  }))
                }
                className="admin-input"
              />
              <p className="admin-help">
                Update the exam timer without editing code.
              </p>
            </div>

            <div className="admin-setting-box">
              <p className="admin-label">Calculator Access</p>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={settings.calculator_enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator_enabled: e.target.checked,
                    }))
                  }
                />
                <span>Enable calculator during exam</span>
              </label>
              <p className="admin-help">
                Controls whether candidates can use the calculator.
              </p>
            </div>

            <div className="admin-setting-box">
              <p className="admin-label">Leaderboard Visibility</p>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={settings.leaderboard_enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      leaderboard_enabled: e.target.checked,
                    }))
                  }
                />
                <span>Show leaderboard to users</span>
              </label>
              <p className="admin-help">
                Decide whether ranking is visible on the homepage.
              </p>
            </div>

            <div className="admin-setting-box">
              <p className="admin-label">Result Release</p>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={settings.show_results}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      show_results: e.target.checked,
                    }))
                  }
                />
                <span>Release results to candidates</span>
              </label>
              <p className="admin-help">
                Control when candidates can view their result page.
              </p>
            </div>

            <div className="admin-setting-box" style={{ gridColumn: "1 / -1" }}>
              <p className="admin-label">Exam Availability</p>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={settings.mock_enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      mock_enabled: e.target.checked,
                    }))
                  }
                />
                <span>Allow candidates to start exam</span>
              </label>
              <p className="admin-help">
                Turn the exam on or off instantly from the dashboard.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="admin-btn-primary"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>

            <button onClick={() => loadAdminData(permissions)} className="admin-btn-light">
              Refresh Dashboard
            </button>
          </div>

          {message && <div className="admin-message">{message}</div>}
        </section>
        )}
      </div>
    </main>
  );
}