"use client";

import { adminSignOut, getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, ADMIN_ROLE_DETAILS, type AdminPermission } from "../../lib/adminRoles";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
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
<div className="admin-badge">BrainLab · {adminUser ? ADMIN_ROLE_DETAILS[adminUser.role].label : "Admin Dashboard"}</div>
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

              <button onClick={handleLogout} className="admin-btn-primary">
                Logout
              </button>
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
  {permissions["learning.content.manage"] && <button onClick={() => router.push("/admin/academy-assessments")} className="admin-card text-left"><h2 className="admin-card-title">Learning Assessments</h2><p className="admin-card-text">Create topic tests, configure timing and pass marks, manage questions, and publish assessments.</p></button>}
  {(permissions["institution.manage"] || permissions["learning.content.manage"]) && <button onClick={() => router.push("/admin/organised-assessments")} className="admin-card text-left"><h2 className="admin-card-title">Organisation Quizzes & Competitions</h2><p className="admin-card-text">Configure organisation assessments, competition settings, schedules, attempt limits, access-code requirements, and result-release rules.</p></button>}
  {(permissions["learning.content.manage"] || permissions["cbt.codes.manage"]) && <button onClick={() => router.push("/admin/academy-access")} className="admin-card text-left"><h2 className="admin-card-title">Organisations & Access</h2><p className="admin-card-text">Manage organisations, membership access codes, temporary codes, entitlements and revocation.</p></button>}
  {permissions["community.moderate"] && <button onClick={() => router.push("/admin/moderation")} className="admin-card text-left"><h2 className="admin-card-title">Community Moderation</h2><p className="admin-card-text">Review community safety and support workflows.</p></button>}
  {permissions["analytics.read"] && <button onClick={() => router.push("/admin/analytics")} className="admin-card text-left"><h2 className="admin-card-title">Analytics</h2><p className="admin-card-text">Open permitted platform reporting.</p></button>}
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