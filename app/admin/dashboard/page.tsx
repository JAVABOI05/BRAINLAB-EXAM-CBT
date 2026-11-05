"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminSignOut, getAdminSession, getCachedAdminSession, type AdminUser } from "../../lib/adminAuth";
import {
  adminHasPermission,
  adminResolvePermissions,
  getCachedAdminPermissions,
  ADMIN_ROLE_DETAILS,
  type AdminPermission,
} from "../../lib/adminRoles";
import { supabase } from "../../lib/supabase";
import AdminWorkspaceShell from "../AdminWorkspaceShell";

type Access = Partial<Record<AdminPermission, boolean>>;
type Metric = number | null;
type Metrics = { questions: Metric; results: Metric; codes: Metric; sessions?: Metric };
type StudentStats = {
  registeredStudents: number;
  activeStudents30d: number;
  newRegistrations30d: number;
  chart: { date: string; registrations: number; active: number }[];
  activityDefinition: string;
};
type SettingsMap = {
  exam_duration: number;
  calculator_enabled: boolean;
  leaderboard_enabled: boolean;
  show_results: boolean;
  mock_enabled: boolean;
  ai_explanations_enabled: boolean;
};
type SettingRow = { key: string; value: unknown };

const DEFAULT_SETTINGS: SettingsMap = {
  exam_duration: 7200,
  calculator_enabled: true,
  leaderboard_enabled: false,
  show_results: false,
  mock_enabled: true,
  ai_explanations_enabled: true,
};

const PERMISSIONS: AdminPermission[] = [
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

// Crisp SVG Dashboard Icons
function DashboardIcon({
  name,
  className,
}: {
  name:
    | "questions"
    | "results"
    | "codes"
    | "students"
    | "active"
    | "registrations"
    | "operations"
    | "analytics"
    | "content"
    | "schools"
    | "settings"
    | "ai"
    | "pricing"
    | "moderation"
    | "security"
    | "duplicates"
    | "sessions"
    | "communication";
  className?: string;
}) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "questions":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "results":
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
          <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
    case "codes":
      return (
        <svg {...common}>
          <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      );
    case "students":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "active":
      return (
        <svg {...common}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case "registrations":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
      );
    case "operations":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" />
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
    case "content":
      return (
        <svg {...common}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      );
    case "schools":
      return (
        <svg {...common}>
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2" />
          <path d="M10 6h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "ai":
      return (
        <svg {...common}>
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
      );
    case "pricing":
      return (
        <svg {...common}>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case "moderation":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      );
    case "security":
      return (
        <svg {...common}>
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "duplicates":
      return (
        <svg {...common}>
          <rect width="13" height="13" x="9" y="9" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "sessions":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "communication":
      return (
        <svg {...common}>
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      );
    default:
      return null;
  }
}

function MetricCard({
  label,
  value,
  note,
  iconName,
  accent = "blue",
}: {
  label: string;
  value: Metric;
  note: string;
  iconName: "questions" | "results" | "codes" | "students" | "active" | "registrations" | "sessions";
  accent?: "blue" | "emerald" | "amber" | "indigo" | "rose" | "purple";
}) {
  return (
    <article className={`admin-kpi-card is-${accent}`}>
      <div className="admin-kpi-top">
        <span className="admin-kpi-label">{label}</span>
        <span className={`admin-kpi-icon is-${accent}`} aria-hidden="true">
          <DashboardIcon name={iconName} />
        </span>
      </div>
      <div className={"admin-kpi-value " + (value === null ? "is-unavailable" : "")}>
        {value === null ? "Unavailable" : value.toLocaleString()}
      </div>
      <p className="admin-kpi-note">
        {value === null ? "The data source could not be read. This is not reported as zero." : note}
      </p>
    </article>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(() => getCachedAdminSession());
  const [permissions, setPermissions] = useState<Access>(() => getCachedAdminPermissions());
  const [metrics, setMetrics] = useState<Metrics>({ questions: null, results: null, codes: null, sessions: null });
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [studentStatsError, setStudentStatsError] = useState("");
  const [loading, setLoading] = useState(() => !getCachedAdminSession());
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
        if (!admin) {
          router.replace("/admin/login?reason=session");
          return;
        }
        verifiedAdmin = true;
        setUser(admin);

        const access = await adminResolvePermissions(PERMISSIONS, admin.role);
        if (!active) return;
        setPermissions(access);

        const [questions, results, codes, activeSessions] = await Promise.all([
          access["cbt.questions.manage"]
            ? supabase.from("questions").select("*", { count: "exact", head: true })
            : Promise.resolve(null),
          access["cbt.results.read"]
            ? supabase.from("results").select("*", { count: "exact", head: true })
            : Promise.resolve(null),
          access["cbt.codes.manage"]
            ? supabase.from("access_codes").select("*", { count: "exact", head: true })
            : Promise.resolve(null),
          access["cbt.sessions.read"]
            ? supabase.from("sessions").select("*", { count: "exact", head: true }).eq("status", "in_progress")
            : Promise.resolve(null),
        ]);
        if (!active) return;
        setMetrics({
          questions:
            access["cbt.questions.manage"] ? (questions && !questions.error ? questions.count ?? 0 : null) : null,
          results: access["cbt.results.read"] ? (results && !results.error ? results.count ?? 0 : null) : null,
          codes: access["cbt.codes.manage"] ? (codes && !codes.error ? codes.count ?? 0 : null) : null,
          sessions:
            access["cbt.sessions.read"] ? (activeSessions && !activeSessions.error ? activeSessions.count ?? 0 : null) : null,
        });

        // Protected student statistics for platform administrators
        if (admin.role === "super_admin" || admin.role === "platform_admin") {
          try {
            const res = await fetch("/api/admin/student-statistics");
            if (res.ok) {
              const data = await res.json();
              if (active && data.chart) {
                setStudentStats(data);
              }
            } else {
              if (active) setStudentStatsError("Live student statistics endpoint is currently offline.");
            }
          } catch {
            if (active) setStudentStatsError("Could not retrieve student statistics telemetry.");
          }
        }

        if (access["cbt.config.read"]) {
          // Read from primary exam_config first, fallback to legacy settings
          const { data: configRows } = await supabase
            .from("exam_config")
            .select("config_key, config_value");
          if (!active) return;

          const next = { ...DEFAULT_SETTINGS };
          if (Array.isArray(configRows) && configRows.length > 0) {
            configRows.forEach((row: { config_key: string; config_value: unknown }) => {
              if (row.config_key === "exam_duration") next.exam_duration = Number(row.config_value) || 7200;
              if (row.config_key === "calculator_enabled") next.calculator_enabled = row.config_value === true || row.config_value === "true";
              if (row.config_key === "leaderboard_enabled") next.leaderboard_enabled = row.config_value === true || row.config_value === "true";
              if (row.config_key === "show_results") next.show_results = row.config_value === true || row.config_value === "true";
              if (row.config_key === "mock_enabled") next.mock_enabled = row.config_value === true || row.config_value === "true";
              if (row.config_key === "ai_explanations_enabled") next.ai_explanations_enabled = row.config_value === true || row.config_value === "true";
            });
            setSettings(next);
          } else {
            const { data: settingRows, error: settingsError } = await supabase.from("settings").select("key, value");
            if (!settingsError && Array.isArray(settingRows)) {
              settingRows.forEach((row: SettingRow) => {
                if (row.key === "exam_duration") next.exam_duration = Number(row.value) || 7200;
                if (row.key === "calculator_enabled") next.calculator_enabled = row.value === true || row.value === "true";
                if (row.key === "leaderboard_enabled") next.leaderboard_enabled = row.value === true || row.value === "true";
                if (row.key === "show_results") next.show_results = row.value === true || row.value === "true";
                if (row.key === "mock_enabled") next.mock_enabled = row.value === true || row.value === "true";
                if (row.key === "ai_explanations_enabled") next.ai_explanations_enabled = row.value === true || row.value === "true";
              });
              setSettings(next);
            }
          }
        }

        if ([questions, results, codes, activeSessions].some((result) => result?.error)) {
          setLoadError(
            "Some dashboard data could not be loaded. Unavailable values are shown explicitly rather than as zero."
          );
        }
      } catch {
        if (active) {
          if (!verifiedAdmin) {
            router.replace("/admin/login?reason=verify");
          } else {
            setLoadError(
              "Some dashboard services could not be reached. Your administrator session is still active; refresh or retry the affected panel."
            );
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialise();
    return () => {
      active = false;
    };
  }, [router]);

  async function saveQuickSetting(key: keyof SettingsMap, value: number | boolean) {
    // 1. Primary write to exam_config table (upsert)
    const { error: configError } = await supabase.from("exam_config").upsert(
      {
        config_key: key,
        config_value: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "config_key" }
    );
    // 2. Dual-write to settings table
    try {
      await supabase.from("settings").upsert({ key, value }, { onConflict: "key" });
    } catch {}
    if (configError) throw new Error(configError.message);
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
        saveQuickSetting("ai_explanations_enabled", settings.ai_explanations_enabled),
      ]);
      setSettingsMessage("Exam quick settings saved successfully.");
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

  if (loading || !user) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-card">
          <p>{loading ? "Verifying administrator session…" : "Redirecting to sign in…"}</p>
        </section>
      </main>
    );
  }

  const roleName = ADMIN_ROLE_DETAILS[user.role]?.label ?? user.role.replaceAll("_", " ");
  const canOpen = (permission: AdminPermission) => permissions[permission] === true;
  const platformAdmin = user.role === "super_admin" || user.role === "platform_admin";

  const todayString = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <AdminWorkspaceShell user={user} permissions={permissions} onLogout={handleLogout}>
      {/* Modern Executive Hero Banner */}
      <section className="admin-dashboard-hero" aria-label="Administrator greeting">
        <div className="admin-dashboard-hero-content">
          <div className="admin-dashboard-hero-pill">
            <span className="admin-status-dot pulse" />
            <span>National CBT Cloud • Live Operations</span>
          </div>
          <h1>Welcome back, Administrator</h1>
          <p>
            Monitor real-time candidate activity, orchestrate examination banks, and govern institutional learning workflows.
          </p>
        </div>
        <div className="admin-dashboard-hero-meta">
          <div className="admin-hero-badge">
            <span className="admin-hero-badge-label">Active Role</span>
            <strong>{roleName}</strong>
          </div>
          <div className="admin-hero-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <span>{todayString}</span>
          </div>
        </div>
      </section>

      {loadError && (
        <div className="admin-workspace-message is-warning" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
          <span>{loadError}</span>
        </div>
      )}

      {/* Featured: Institutional CBT Operations Command Center */}
      <div className="admin-command-banner">
        <div className="admin-command-banner-info">
          <div className="admin-command-badge">
            <span className="admin-pulse-dot" />
            Institutional CBT Command Center
          </div>
          <h2>National Operations &amp; Live CBT Administration</h2>
          <p>
            Proctor concurrent candidate sessions, stream real-time edge telemetry, issue cryptographic PIN batches, and audit syllabus distribution.
          </p>
        </div>
        <Link href="/admin/operations" className="admin-command-btn">
          <span>Launch Command Center</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" x2="19" y1="12" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      {/* Student Overview (Platform Admin) */}
      {platformAdmin && (
        <section className="admin-student-statistics" aria-labelledby="student-statistics-heading">
          <div className="admin-panel-heading">
            <div>
              <h2 id="student-statistics-heading">Student &amp; Learner Overview</h2>
              <p>Registered student candidate accounts and verified Learning Hub activity.</p>
            </div>
            <span className="admin-badge-pill">Last 30 days</span>
          </div>

          {studentStatsError && (
            <p className="admin-workspace-message is-subtle" role="status">
              {studentStatsError}
            </p>
          )}

          {!studentStats && !studentStatsError && (
            <p className="admin-kpi-note">Loading protected student statistics…</p>
          )}

          {studentStats && (
            <>
              <div className="admin-kpi-grid admin-student-kpi-grid">
                <MetricCard
                  label="Registered Students"
                  value={studentStats.registeredStudents}
                  note="Registered accounts excluding administrator profiles"
                  iconName="students"
                  accent="blue"
                />
                <MetricCard
                  label="Active Students"
                  value={studentStats.activeStudents30d}
                  note="Distinct candidates with recorded learning activity in 30 days"
                  iconName="active"
                  accent="rose"
                />
                <MetricCard
                  label="New Registrations"
                  value={studentStats.newRegistrations30d}
                  note="New student accounts created in the last 30 days"
                  iconName="registrations"
                  accent="emerald"
                />
              </div>

              <section className="admin-panel admin-student-chart-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h3>Student Activity Velocity</h3>
                    <p>Daily new registrations compared with daily active students.</p>
                  </div>
                </div>

                <div className="admin-student-chart-legend">
                  <span className="legend-item">
                    <i className="admin-chart-dot registrations" />
                    New Registrations
                  </span>
                  <span className="legend-item">
                    <i className="admin-chart-dot active" />
                    Daily Active Students
                  </span>
                </div>

                <div className="admin-student-chart-scroll">
                  <svg
                    className="admin-student-chart"
                    viewBox="0 0 720 250"
                    role="img"
                    aria-label="Line chart of daily new student registrations and daily active students over the last 30 days"
                  >
                    <defs>
                      <linearGradient id="chartGradReg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1356E8" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#1356E8" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="chartGradAct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF5238" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#FF5238" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const values = studentStats.chart.flatMap((day) => [day.registrations, day.active]);
                      const max = Math.max(1, ...values);
                      const x = (index: number) => 42 + (index / Math.max(1, studentStats.chart.length - 1)) * 650;
                      const y = (value: number) => 205 - (value / max) * 165;
                      const line = (key: "registrations" | "active") =>
                        studentStats.chart
                          .map((day, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(day[key])}`)
                          .join(" ");

                      return (
                        <>
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                            <g key={ratio}>
                              <line
                                x1="42"
                                x2="692"
                                y1={205 - ratio * 165}
                                y2={205 - ratio * 165}
                                className="admin-chart-gridline"
                              />
                              <text
                                x="32"
                                y={209 - ratio * 165}
                                textAnchor="end"
                                className="admin-chart-axis-label"
                              >
                                {Math.round(max * ratio)}
                              </text>
                            </g>
                          ))}
                          <path d={line("registrations")} className="admin-chart-line registrations" />
                          <path d={line("active")} className="admin-chart-line active" />
                          {studentStats.chart.map((day, index) => (
                            <g key={day.date}>
                              <circle
                                cx={x(index)}
                                cy={y(day.registrations)}
                                r="3.5"
                                className="admin-chart-point registrations"
                              />
                              <circle cx={x(index)} cy={y(day.active)} r="3.5" className="admin-chart-point active" />
                            </g>
                          ))}
                          {[0, 7, 14, 21, 29]
                            .filter((index) => index < studentStats.chart.length)
                            .map((index) => (
                              <text
                                key={index}
                                x={x(index)}
                                y="231"
                                textAnchor="middle"
                                className="admin-chart-axis-label"
                              >
                                {studentStats.chart[index].date.slice(5)}
                              </text>
                            ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <p className="admin-kpi-note">{studentStats.activityDefinition}</p>
              </section>
            </>
          )}
        </section>
      )}

      {/* Core Platform KPIs */}
      <section className="admin-kpi-grid" aria-label="Current platform metrics">
        {canOpen("cbt.questions.manage") && (
          <MetricCard
            label="Question Bank Repository"
            value={metrics.questions}
            note="Syllabus-aligned questions ready for deployment"
            iconName="questions"
            accent="indigo"
          />
        )}
        {canOpen("cbt.results.read") && (
          <MetricCard
            label="Examination Results"
            value={metrics.results}
            note="Completed examination candidate submissions"
            iconName="results"
            accent="emerald"
          />
        )}
        {canOpen("cbt.codes.manage") && (
          <MetricCard
            label="Active Access Codes"
            value={metrics.codes}
            note="Cryptographic exam tokens and access vouchers"
            iconName="codes"
            accent="amber"
          />
        )}
        {canOpen("cbt.sessions.read") && (
          <MetricCard
            label="Live CBT Sessions"
            value={metrics.sessions ?? null}
            note="Concurrent candidates actively testing"
            iconName="sessions"
            accent="blue"
          />
        )}
      </section>

      {/* Main Two-Column Operational Layout */}
      <div className="admin-dashboard-grid">
        {/* Quick Access Grid */}
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Operational Workflows</h2>
              <p>Direct entry points to your permitted administrative capabilities.</p>
            </div>
          </div>
          <div className="admin-action-list">
            <Link className="admin-action-link" href="/admin/operations">
              <span className="admin-action-icon is-blue">
                <DashboardIcon name="operations" />
              </span>
              <div className="admin-action-content">
                <strong>Institutional Operations</strong>
                <span>Monitor live proctored sessions, issue PIN batches, and audit syllabus health.</span>
              </div>
              <span className="admin-action-arrow" aria-hidden="true">→</span>
            </Link>

            {canOpen("cbt.questions.manage") && (
              <Link className="admin-action-link" href="/admin/questions/manage">
                <span className="admin-action-icon is-indigo">
                  <DashboardIcon name="questions" />
                </span>
                <div className="admin-action-content">
                  <strong>Question Bank</strong>
                  <span>Manage multi-subject questions, blueprinted quotas, and question uploads.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {canOpen("cbt.questions.manage") && (
              <Link className="admin-action-link" href="/admin/questions/duplicates">
                <span className="admin-action-icon is-rose">
                  <DashboardIcon name="duplicates" />
                </span>
                <div className="admin-action-content">
                  <strong>Duplicate Questions Manager</strong>
                  <span>Similarity detection, group review, and zero-data-loss bulk archival.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {canOpen("cbt.sessions.read") && (
              <Link className="admin-action-link" href="/admin/sessions">
                <span className="admin-action-icon is-blue">
                  <DashboardIcon name="sessions" />
                </span>
                <div className="admin-action-content">
                  <strong>Live Exam Sessions</strong>
                  <span>Invigilate active candidates, monitor tab switches, and review session timers.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {canOpen("cbt.codes.manage") && (
              <Link className="admin-action-link" href="/admin/codes">
                <span className="admin-action-icon is-amber">
                  <DashboardIcon name="codes" />
                </span>
                <div className="admin-action-content">
                  <strong>Access Vouchers &amp; Codes</strong>
                  <span>Issue batch PINs, revoke expired passes, and monitor candidate redemption.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {canOpen("cbt.results.read") && (
              <Link className="admin-action-link" href="/admin/results">
                <span className="admin-action-icon is-emerald">
                  <DashboardIcon name="results" />
                </span>
                <div className="admin-action-content">
                  <strong>Results &amp; Corrections</strong>
                  <span>Review scoring rubrics, candidate metrics, and audit response sheets.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {canOpen("learning.content.manage") && (
              <Link className="admin-action-link" href="/admin/content">
                <span className="admin-action-icon is-purple">
                  <DashboardIcon name="content" />
                </span>
                <div className="admin-action-content">
                  <strong>Learning Content Hub</strong>
                  <span>Syllabus lesson modules, video tutorials, and interactive revision blocks.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {(canOpen("institution.manage") || platformAdmin) && (
              <Link className="admin-action-link" href="/admin/schools">
                <span className="admin-action-icon is-blue">
                  <DashboardIcon name="schools" />
                </span>
                <div className="admin-action-content">
                  <strong>Schools &amp; Institutions</strong>
                  <span>Partner school licensing, institutional portals, and center quotas.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {(canOpen("analytics.read") || platformAdmin) && (
              <Link className="admin-action-link" href="/admin/analytics">
                <span className="admin-action-icon is-rose">
                  <DashboardIcon name="analytics" />
                </span>
                <div className="admin-action-content">
                  <strong>Analytics &amp; Performance</strong>
                  <span>Cohort completion rates, subject difficulty indices, and score distributions.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {platformAdmin && (
              <Link className="admin-action-link" href="/admin/ai">
                <span className="admin-action-icon is-indigo">
                  <DashboardIcon name="ai" />
                </span>
                <div className="admin-action-content">
                  <strong>AI Provider Controls</strong>
                  <span>Model routing, latency limits, explanation generation, and token quotas.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {(canOpen("finance.billing.manage") || platformAdmin) && (
              <Link className="admin-action-link" href="/admin/pricing">
                <span className="admin-action-icon is-emerald">
                  <DashboardIcon name="pricing" />
                </span>
                <div className="admin-action-content">
                  <strong>Plans &amp; Subscriptions</strong>
                  <span>Pricing tiers, student pass entitlements, and Paystack/BACHS integrations.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {(canOpen("finance.billing.manage") || platformAdmin) && (
              <Link className="admin-action-link" href="/admin/payment-gateways">
                <span className="admin-action-icon is-emerald">
                  <DashboardIcon name="pricing" />
                </span>
                <div className="admin-action-content">
                  <strong>Payment Gateways &amp; Webhooks</strong>
                  <span>Configure BACHS, Paystack, and Flutterwave credentials.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {(canOpen("cbt.config.manage") || platformAdmin) && (
              <Link className="admin-action-link" href="/admin/announcements">
                <span className="admin-action-icon is-amber">
                  <DashboardIcon name="communication" />
                </span>
                <div className="admin-action-content">
                  <strong>Announcements &amp; Maintenance</strong>
                  <span>Publish live broadcast banners and manage emergency CBT maintenance.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}

            {platformAdmin && (
              <Link className="admin-action-link" href="/admin/security">
                <span className="admin-action-icon is-amber">
                  <DashboardIcon name="security" />
                </span>
                <div className="admin-action-content">
                  <strong>Security &amp; Audit Trail</strong>
                  <span>Role permissions, administrative access reviews, and tamper-proof log logs.</span>
                </div>
                <span className="admin-action-arrow" aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </section>

        {/* Telemetry & Integrations Status */}
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Integration Telemetry</h2>
              <p>Live health and telemetry readiness for backend services.</p>
            </div>
            <span className="admin-badge-pill is-active">Active Monitoring</span>
          </div>

          <div className="admin-connections-list">
            <Link href="/admin/security" className="admin-connection-card is-interactive" title="Configure Database & RLS Security">
              <div className="admin-connection-header">
                <div className="admin-connection-title">
                  <span className="admin-status-dot is-online" />
                  <strong>Database &amp; RLS Policies</strong>
                </div>
                <div className="admin-connection-actions">
                  <span className="admin-tag-pill is-success">Connected</span>
                  <span className="admin-connection-arrow" aria-hidden="true">→</span>
                </div>
              </div>
              <p>PostgreSQL cluster verified with row-level security boundaries and RPC grants.</p>
            </Link>

            <Link href="/admin/users" className="admin-connection-card is-interactive" title="Manage Administrator Roles & Operator Gate">
              <div className="admin-connection-header">
                <div className="admin-connection-title">
                  <span className="admin-status-dot is-online" />
                  <strong>Supabase Auth &amp; Operator Gate</strong>
                </div>
                <div className="admin-connection-actions">
                  <span className="admin-tag-pill is-success">Verified</span>
                  <span className="admin-connection-arrow" aria-hidden="true">→</span>
                </div>
              </div>
              <p>Candidate session encryption and multi-tier operator verification active.</p>
            </Link>

            <Link href="/admin/ai" className="admin-connection-card is-interactive" title="Click to Configure AI Models, Keys, and Quotas">
              <div className="admin-connection-header">
                <div className="admin-connection-title">
                  <span className="admin-status-dot is-pending" />
                  <strong>AI Engine (Gemini / Groq)</strong>
                </div>
                <div className="admin-connection-actions">
                  <span className="admin-tag-pill is-warning">Telemetry Ready</span>
                  <span className="admin-connection-cta">Configure AI →</span>
                </div>
              </div>
              <p>AI authoring and explanation APIs online; latency aggregation awaiting traffic stream.</p>
            </Link>

            <Link href="/admin/payment-gateways#bachs" className="admin-connection-card is-interactive" title="Click to Configure Bachs and Payment Webhooks">
              <div className="admin-connection-header">
                <div className="admin-connection-title">
                  <span className="admin-status-dot is-pending" />
                  <strong>Payment Webhooks (BACHS)</strong>
                </div>
                <div className="admin-connection-actions">
                  <span className="admin-tag-pill is-subtle">Configured</span>
                  <span className="admin-connection-cta">Configure BACHS →</span>
                </div>
              </div>
              <p>Signed cryptographic webhook endpoints deployed; automated ledger reconciliation active.</p>
            </Link>
          </div>
        </section>
      </div>

      {/* Exam Quick Configuration Controls */}
      {canOpen("cbt.config.manage") && (
        <section className="admin-panel admin-quick-settings-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Exam Quick Controls</h2>
              <p>Instant platform-level CBT policies. Changes apply across all concurrent sessions.</p>
            </div>
            <Link className="admin-panel-link" href="/admin/config">
              <span>Full Configuration Suite</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="admin-quick-settings-grid">
            <div className="admin-setting-field">
              <label htmlFor="exam-duration-input" className="admin-setting-label">
                <strong>Standard Exam Duration</strong>
                <span>Total test duration in seconds (7,200s = 2 hours)</span>
              </label>
              <div className="admin-input-affix-wrap">
                <input
                  id="exam-duration-input"
                  className="admin-input"
                  type="number"
                  min={60}
                  value={settings.exam_duration}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      exam_duration: Number(event.target.value) || 7200,
                    }))
                  }
                />
                <span className="admin-input-affix">sec</span>
              </div>
            </div>

            <div className="admin-toggle-field">
              <div className="admin-toggle-copy">
                <strong>Four-Function CBT Calculator</strong>
                <span>Provide on-screen 4-function arithmetic calculator in candidate test interface</span>
              </div>
              <label className="admin-switch" htmlFor="calculator-toggle">
                <input
                  id="calculator-toggle"
                  type="checkbox"
                  checked={settings.calculator_enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, calculator_enabled: event.target.checked }))
                  }
                />
                <span className="admin-switch-slider" />
              </label>
            </div>

            <div className="admin-toggle-field">
              <div className="admin-toggle-copy">
                <strong>Real-time Leaderboard</strong>
                <span>Display national and institutional student rankings</span>
              </div>
              <label className="admin-switch" htmlFor="leaderboard-toggle">
                <input
                  id="leaderboard-toggle"
                  type="checkbox"
                  checked={settings.leaderboard_enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, leaderboard_enabled: event.target.checked }))
                  }
                />
                <span className="admin-switch-slider" />
              </label>
            </div>

            <div className="admin-toggle-field">
              <div className="admin-toggle-copy">
                <strong>Release Instant Results</strong>
                <span>Show scores and performance analytics immediately on submit</span>
              </div>
              <label className="admin-switch" htmlFor="show-results-toggle">
                <input
                  id="show-results-toggle"
                  type="checkbox"
                  checked={settings.show_results}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, show_results: event.target.checked }))
                  }
                />
                <span className="admin-switch-slider" />
              </label>
            </div>

            <div className="admin-toggle-field">
              <div className="admin-toggle-copy">
                <strong>Mock Exam Access</strong>
                <span>Permit registered candidates to start self-paced mock tests</span>
              </div>
              <label className="admin-switch" htmlFor="mock-enabled-toggle">
                <input
                  id="mock-enabled-toggle"
                  type="checkbox"
                  checked={settings.mock_enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, mock_enabled: event.target.checked }))
                  }
                />
                <span className="admin-switch-slider" />
              </label>
            </div>

            <div className="admin-toggle-field">
              <div className="admin-toggle-copy">
                <strong>AI Tutor Explanations</strong>
                <span>Provide step-by-step worked solutions and reasoning on released corrections</span>
              </div>
              <label className="admin-switch" htmlFor="ai-explanations-toggle">
                <input
                  id="ai-explanations-toggle"
                  type="checkbox"
                  checked={settings.ai_explanations_enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, ai_explanations_enabled: event.target.checked }))
                  }
                />
                <span className="admin-switch-slider" />
              </label>
            </div>
          </div>

          <div className="admin-settings-footer">
            <button
              className="admin-btn-primary"
              type="button"
              onClick={saveQuickSettings}
              disabled={savingSettings}
            >
              {savingSettings ? (
                <>
                  <span className="admin-btn-spinner" />
                  Saving Changes…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Save Quick Controls
                </>
              )}
            </button>
            {settingsMessage && (
              <span
                role="status"
                className={`admin-status-toast ${settingsMessage.includes("error") || settingsMessage.includes("Could not") ? "is-error" : "is-success"}`}
              >
                {settingsMessage}
              </span>
            )}
          </div>
        </section>
      )}
    </AdminWorkspaceShell>
  );
}
