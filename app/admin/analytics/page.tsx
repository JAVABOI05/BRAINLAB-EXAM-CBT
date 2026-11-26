"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import { authFetch } from "../../lib/authFetch";
import { normalizeWhatsAppNumber } from "../../lib/whatsapp";
import type { AnalyticsEventName } from "../../lib/analytics";
import "../admin.css";

type RecentUserSignup = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  createdAt: string;
  emailConfirmed: boolean;
};

type UserAnalyticsData = {
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
  dailyTrend: Array<{ date: string; label: string; count: number }>;
  recentSignups: RecentUserSignup[];
};

type ResultSummary = {
  id: string;
  name: string | null;
  subject: string | null;
  score: number | null;
  total: number | null;
  created_at: string;
};

type SubjectStat = {
  subject: string;
  attempts: number;
  avgScore: number;
  passCount: number;
};

type TelemetryRow = {
  event_name: AnalyticsEventName;
  event_payload: Record<string, unknown>;
  session_hash: string | null;
  created_at: string;
};

const FUNNEL_EVENTS: { name: AnalyticsEventName; label: string; stage: string; description: string }[] = [
  { name: "programme_viewed", label: "Programme Page Viewed", stage: "1. Discovery", description: "Learner inspected curriculum details" },
  { name: "countdown_viewed", label: "Exam Countdown Viewed", stage: "1. Discovery", description: "Target test deadline viewed" },
  { name: "free_practice_started", label: "Free Practice Started", stage: "2. Evaluation", description: "Zero-barrier diagnostic CBT test started" },
  { name: "demo_completed", label: "Interactive Demo Completed", stage: "2. Evaluation", description: "STEM lab or AI tutor query completed" },
  { name: "signup_started", label: "Sign-up Flow Initiated", stage: "3. Onboarding", description: "Learner opened account registration" },
  { name: "signup_completed", label: "Sign-up Successfully Completed", stage: "3. Onboarding", description: "Account created and verified" },
  { name: "programme_selected", label: "Programme Track Selected", stage: "4. Intent", description: "Specific track CTA clicked" },
  { name: "channel_join_clicked", label: "Study Channel Join Clicked", stage: "4. Intent", description: "Telegram/WhatsApp cohort link clicked" },
  { name: "enrolment_started", label: "Checkout / Enrolment Started", stage: "4. Intent", description: "Paid plan or checkout dialog opened" },
  { name: "payment_completed", label: "Payment & Subscription Verified", stage: "5. Conversion", description: "Gateway confirmed fee settlement" },
  { name: "school_enquiry_submitted", label: "School Partnership Inquiry", stage: "6. Institutional", description: "School enterprise license requested" },
  { name: "tutor_application_submitted", label: "Tutor Application Submitted", stage: "6. Institutional", description: "Faculty accreditation application filed" },
];

export default function AdminAnalyticsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"users" | "funnel" | "exams">("users");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalCodes, setTotalCodes] = useState(0);
  const [totalLiveClasses, setTotalLiveClasses] = useState(0);
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [totalAudioAssets, setTotalAudioAssets] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [userAnalytics, setUserAnalytics] = useState<UserAnalyticsData | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Funnel & Telemetry State
  const [telemetryCounts, setTelemetryCounts] = useState<Record<string, number>>({});
  const [recentTelemetry, setRecentTelemetry] = useState<TelemetryRow[]>([]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [resultsRes, questionsRes, codesRes, classesRes, attendRes, audioRes] = await Promise.all([
        supabase
          .from("results")
          .select("id, name, subject, score, total, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("questions").select("*", { count: "exact", head: true }),
        supabase.from("access_codes").select("*", { count: "exact", head: true }),
        supabase.from("live_classes").select("*", { count: "exact", head: true }),
        supabase.from("class_attendance_records").select("*", { count: "exact", head: true }),
        supabase.from("audio_assets").select("*", { count: "exact", head: true }),
      ]);

      if (resultsRes.error) {
        setError("Could not load examination results for analytics. Check database policies.");
      } else {
        setResults((resultsRes.data ?? []) as ResultSummary[]);
      }

      setTotalQuestions(questionsRes.count ?? 0);
      setTotalCodes(codesRes.count ?? 0);
      setTotalLiveClasses(classesRes.count ?? 0);
      setTotalAttendance(attendRes.count ?? 0);
      setTotalAudioAssets(audioRes.count ?? 0);

      // Load First-Party Conversion Telemetry
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      let countsMap: Record<string, number> = {};
      let eventsList: TelemetryRow[] = [];

      if (token) {
        try {
          const res = await fetch("/api/analytics/events", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.ok) {
              countsMap = json.counts || {};
              eventsList = json.recentEvents || [];
            }
          }
        } catch {
          // Direct Supabase fallback if API route fails
        }
      }

      // Fallback directly to Supabase table if API returned empty
      if (Object.keys(countsMap).length === 0) {
        const { data: eventRows } = await supabase
          .from("platform_analytics_events")
          .select("event_name, event_payload, session_hash, created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        if (eventRows) {
          eventsList = eventRows as TelemetryRow[];
          FUNNEL_EVENTS.forEach((e) => {
            countsMap[e.name] = 0;
          });
          eventRows.forEach((r) => {
            if (countsMap[r.event_name] !== undefined) {
              countsMap[r.event_name]++;
            } else {
              countsMap[r.event_name] = 1;
            }
          });
        }
      }

      setTelemetryCounts(countsMap);
      setRecentTelemetry(eventsList);

      // Load Registered Users & Subscribers Growth Telemetry
      try {
        const mailRes = await authFetch("/api/admin/mail/overview");
        const mailJson = await mailRes.json();
        if (mailJson?.success && mailJson?.analytics) {
          setUserAnalytics(mailJson.analytics);
        }
      } catch (err) {
        console.warn("[analytics] User analytics fetch error:", err);
      }
    } catch {
      setError("An unexpected error occurred while fetching platform metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      const admin = await getAdminSession();
      if (!active) return;

      if (!admin) {
        router.replace("/account");
        return;
      }

      const canReadAnalytics =
        admin.role === "super_admin" ||
        admin.role === "platform_admin" ||
        admin.role === "analytics_admin" ||
        (await adminHasPermission("analytics.read")) ||
        (await adminHasPermission("cbt.results.read"));

      if (!canReadAnalytics) {
        router.replace("/admin/dashboard");
        return;
      }

      setAdminUser(admin);
      await loadAnalytics();
    }

    void init();

    return () => {
      active = false;
    };
  }, [router, loadAnalytics]);

  const filteredResults = useMemo(() => {
    if (selectedSubject === "all") return results;
    return results.filter((r) => r.subject === selectedSubject);
  }, [results, selectedSubject]);

  const uniqueSubjects = useMemo(() => {
    const list = Array.from(new Set(results.map((r) => r.subject).filter(Boolean))) as string[];
    return ["all", ...list.sort()];
  }, [results]);

  const stats = useMemo(() => {
    const total = filteredResults.length;
    if (total === 0) {
      return {
        totalAttempts: 0,
        avgScorePercent: 0,
        passCount: 0,
        passRate: 0,
        brackets: { fail: 0, pass: 0, credit: 0, distinction: 0 },
      };
    }

    let sumPercent = 0;
    let passCount = 0;
    const brackets = { fail: 0, pass: 0, credit: 0, distinction: 0 };

    filteredResults.forEach((r) => {
      const score = Number(r.score) || 0;
      const qTotal = Number(r.total) || 1;
      const pct = Math.round((score / qTotal) * 100);
      sumPercent += pct;

      if (pct >= 50) passCount++;

      if (pct < 40) brackets.fail++;
      else if (pct < 50) brackets.pass++;
      else if (pct < 70) brackets.credit++;
      else brackets.distinction++;
    });

    return {
      totalAttempts: total,
      avgScorePercent: Math.round(sumPercent / total),
      passCount,
      passRate: Math.round((passCount / total) * 100),
      brackets,
    };
  }, [filteredResults]);

  const subjectBreakdown = useMemo<SubjectStat[]>(() => {
    const map = new Map<string, { attempts: number; sumPct: number; passCount: number }>();

    results.forEach((r) => {
      const subj = r.subject || "General";
      const score = Number(r.score) || 0;
      const total = Number(r.total) || 1;
      const pct = Math.round((score / total) * 100);

      const entry = map.get(subj) ?? { attempts: 0, sumPct: 0, passCount: 0 };
      entry.attempts += 1;
      entry.sumPct += pct;
      if (pct >= 50) entry.passCount += 1;
      map.set(subj, entry);
    });

    return Array.from(map.entries()).map(([subject, data]) => ({
      subject,
      attempts: data.attempts,
      avgScore: Math.round(data.sumPct / data.attempts),
      passCount: data.passCount,
    }));
  }, [results]);

  // Aggregated Conversion Funnel Metrics
  const funnelStages = useMemo(() => {
    const discovery = (telemetryCounts.programme_viewed || 0) + (telemetryCounts.countdown_viewed || 0);
    const evaluation = (telemetryCounts.free_practice_started || 0) + (telemetryCounts.demo_completed || 0);
    const signupStarted = telemetryCounts.signup_started || 0;
    const signupCompleted = telemetryCounts.signup_completed || 0;
    const enrolment = (telemetryCounts.programme_selected || 0) + (telemetryCounts.enrolment_started || 0);
    const payment = telemetryCounts.payment_completed || 0;
    const institutional = (telemetryCounts.school_enquiry_submitted || 0) + (telemetryCounts.tutor_application_submitted || 0);

    const base = Math.max(1, discovery);
    const evalRate = Math.round((evaluation / base) * 100);
    const signupRate = Math.round((signupCompleted / Math.max(1, signupStarted || discovery)) * 100);
    const enrolRate = Math.round((enrolment / Math.max(1, signupCompleted || discovery)) * 100);
    const payRate = Math.round((payment / Math.max(1, enrolment || 1)) * 100);

    return [
      {
        id: "discovery",
        title: "1. Discovery & Exploration",
        count: discovery,
        metric: `${discovery} visits/views`,
        conversion: "100%",
        note: "Programme views + exam countdowns",
      },
      {
        id: "evaluation",
        title: "2. Free Practice & Demos",
        count: evaluation,
        metric: `${evalRate}% of discovery`,
        conversion: `${evalRate}%`,
        note: "Diagnostic tests + STEM / AI demos",
      },
      {
        id: "onboarding",
        title: "3. Account Creation",
        count: signupCompleted,
        metric: `${signupRate}% sign-up rate`,
        conversion: `${signupRate}%`,
        note: `${signupCompleted} registered / ${signupStarted} initiated`,
      },
      {
        id: "intent",
        title: "4. Enrolment Intent",
        count: enrolment,
        metric: `${enrolRate}% of registered`,
        conversion: `${enrolRate}%`,
        note: "Programme selection + checkout opened",
      },
      {
        id: "payment",
        title: "5. Paid Conversion",
        count: payment,
        metric: `${payRate}% of enrolments`,
        conversion: `${payRate}%`,
        note: "Bachs / Paystack / Flutterwave verified",
      },
      {
        id: "institutional",
        title: "6. Institutional Inquiries",
        count: institutional,
        metric: `${institutional} enterprise`,
        conversion: "N/A",
        note: "School licenses + Tutor applications",
      },
    ];
  }, [telemetryCounts]);

  function exportExamCSV() {
    if (!filteredResults.length) return;
    const headers = "ID,Candidate,Subject,Score,Total,Percentage,Date\n";
    const rows = filteredResults
      .map((r) => {
        const pct = Math.round(((r.score || 0) / (r.total || 1)) * 100);
        const name = (r.name || "Anonymous").replace(/,/g, " ");
        const subj = (r.subject || "N/A").replace(/,/g, " ");
        return `"${r.id}","${name}","${subj}",${r.score || 0},${r.total || 0},${pct}%,"${r.created_at}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `brainlab-exam-analytics-${selectedSubject}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportFunnelCSV() {
    const summaryHeaders = "Event Name,Stage,Label,Event Count,Description\n";
    const summaryRows = FUNNEL_EVENTS.map((e) => {
      const count = telemetryCounts[e.name] || 0;
      return `"${e.name}","${e.stage}","${e.label}",${count},"${e.description}"`;
    }).join("\n");

    const detailHeaders = "\n\nEvent Name,Daily Session Hash,Timestamp,Payload Summary\n";
    const detailRows = recentTelemetry
      .slice(0, 500)
      .map((r) => {
        const safePayload = JSON.stringify(r.event_payload || {}).replace(/"/g, '""');
        return `"${r.event_name}","${r.session_hash || "anonymous"}","${r.created_at}","${safePayload}"`;
      })
      .join("\n");

    const blob = new Blob([summaryHeaders + summaryRows + detailHeaders + detailRows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `brainlab-conversion-funnel-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <main className="admin-shell">
        <div className="admin-card text-center py-12">
          <p className="admin-card-text">Loading platform operational metrics…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="admin-badge">Platform Insights</span>
              {adminUser && (
                <span className="text-xs font-semibold text-slate-500">
                  Logged in as {adminUser.email} ({adminUser.role})
                </span>
              )}
            </div>
            <h1 className="admin-title">Platform Analytics & Conversion Funnel</h1>
            <p className="admin-subtitle">
              NDPA 2023-compliant telemetry tracking learner discovery, free practice, signups, enrolments, and exam proficiency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="admin-btn-light"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => void loadAnalytics()}
              className="admin-btn-light"
            >
              Refresh
            </button>
            {activeTab === "users" ? (
              <a
                href="/api/admin/mail/contacts?export=csv"
                download
                className="admin-btn-primary inline-flex items-center gap-1.5"
              >
                <span>📥</span> Export Contacts CSV
              </a>
            ) : activeTab === "funnel" ? (
              <button
                type="button"
                onClick={exportFunnelCSV}
                className="admin-btn-primary"
              >
                Export Funnel CSV
              </button>
            ) : (
              <button
                type="button"
                onClick={exportExamCSV}
                disabled={filteredResults.length === 0}
                className="admin-btn-primary"
              >
                Export Exam CSV
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "users"
                ? "border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            👥 Candidate Sign-ups &amp; Subscribers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("funnel")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "funnel"
                ? "border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            🧭 Learner Journey &amp; Conversion Funnel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("exams")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "exams"
                ? "border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            📊 Examination Results &amp; CBT Mastery
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* VIEW 0: REGISTERED USERS, SUBSCRIBERS & AUDIENCE TELEMETRY */}
      {activeTab === "users" && (
        <div className="space-y-6 mt-6">
          {/* Top Vital KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Registered Users</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                {userAnalytics?.totalRegisteredUsers ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-blue-600 font-semibold">
                +{userAnalytics?.newUsersThisWeek ?? 0} new this week
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sign-ups Today</p>
              <p className="mt-1 text-2xl font-black text-emerald-950 dark:text-emerald-400">
                {userAnalytics?.newUsersToday ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-emerald-600 font-semibold">
                {userAnalytics?.newUsersThisMonth ?? 0} in last 30 days
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">📱 Mobile Reach (SMS)</p>
              <p className="mt-1 text-2xl font-black text-indigo-950 dark:text-indigo-400">
                {userAnalytics?.usersWithPhone ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-indigo-600 font-semibold">
                {userAnalytics?.phoneCoverageRate || "0%"} with phone number
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Subscribers</p>
              <p className="mt-1 text-2xl font-black text-blue-900 dark:text-cyan-400">
                {userAnalytics?.activeSubscribers ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Consented for newsletters</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Verification</p>
              <p className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-300">
                {userAnalytics?.emailConfirmedRate || "100%"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Verified inboxes</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">⭐ Paid Pro Candidates</p>
              <p className="mt-1 text-2xl font-black text-purple-900 dark:text-purple-400">
                {userAnalytics?.paidSubscribers ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-purple-600 font-semibold">Pro subscriptions</p>
            </div>
          </div>

          {/* Registration Velocity Bar Chart & Channel Reach */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">
                    📈 14-Day Candidate Sign-up Velocity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daily new learner onboarding velocity across Nigeria.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    7 Days: <strong>+{userAnalytics?.newUsersThisWeek ?? 0}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    30 Days: <strong>+{userAnalytics?.newUsersThisMonth ?? 0}</strong>
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-36 pt-4 px-1">
                  {userAnalytics?.dailyTrend && userAnalytics.dailyTrend.length > 0 ? (
                    (() => {
                      const maxVal = Math.max(...userAnalytics.dailyTrend.map((t) => t.count), 4);
                      return userAnalytics.dailyTrend.map((t, idx) => {
                        const barHeight = Math.max(8, Math.round((t.count / maxVal) * 100));
                        const isLatest = idx === userAnalytics.dailyTrend.length - 1;
                        return (
                          <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none z-10">
                              {t.label}: {t.count} signup{t.count === 1 ? "" : "s"}
                            </div>
                            <div className="w-full max-w-[28px] flex items-end justify-center h-full">
                              <div
                                style={{ height: `${barHeight}%` }}
                                className={`w-full rounded-t-md transition-all duration-300 ${
                                  isLatest
                                    ? "bg-blue-600 shadow-xs"
                                    : t.count > 0
                                    ? "bg-blue-400/80 hover:bg-blue-600 dark:bg-blue-500"
                                    : "bg-slate-200/80 dark:bg-slate-800"
                                }`}
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 font-bold truncate">
                              {t.label.split(" ")[1] || t.label}
                            </span>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400 text-xs">
                      Loading sign-up telemetry...
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-3">
                  Authoritative registration volume from Supabase Auth &bull; 14-day rolling window
                </p>
              </div>
            </div>

            {/* Reachability & Communication Channels */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">📡 Channel Reachability</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct student communication reach across email and SMS telecom networks.
                </p>

                <div className="mt-5 space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>✉️ Email Delivery Reach</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{userAnalytics?.emailConfirmedRate || "100%"}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: userAnalytics?.emailConfirmedRate || "100%" }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {userAnalytics?.totalRegisteredUsers ?? 0} candidate inboxes reachable via Resend
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>📱 Mobile Phone &amp; SMS (Termii)</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{userAnalytics?.phoneCoverageRate || "0%"}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: userAnalytics?.phoneCoverageRate || "0%" }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {userAnalytics?.usersWithPhone ?? 0} candidate phone numbers registered
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>📢 Newsletter &amp; Alerts Opt-In</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {userAnalytics?.totalRegisteredUsers && userAnalytics.totalRegisteredUsers > 0
                          ? `${(((userAnalytics.activeSubscribers || 1) / userAnalytics.totalRegisteredUsers) * 100).toFixed(0)}%`
                          : "100%"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-500"
                        style={{
                          width: userAnalytics?.totalRegisteredUsers
                            ? `${Math.min(100, Math.round(((userAnalytics.activeSubscribers || 1) / userAnalytics.totalRegisteredUsers) * 100))}%`
                            : "100%",
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Opt-out rate: {userAnalytics?.optOutRate || "0.0%"} ({userAnalytics?.optOutCount ?? 0} suppressed)
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/admin/communication"
                className="mt-6 block w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs py-2.5 transition text-center shadow-xs"
              >
                Open Mail Centre &amp; Broadcast Hub &rarr;
              </Link>
            </div>
          </div>

          {/* Real-time Candidate Sign-ups Stream */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  ⚡ Recent Registered Candidate Stream &amp; Phone Contact
                </h3>
                <p className="text-xs text-slate-500">
                  Newest student sign-ups with phone numbers, verification, and WhatsApp access.
                </p>
              </div>

              <Link
                href="/admin/communication"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-blue-700 dark:text-cyan-400 hover:bg-slate-50 transition shrink-0"
              >
                View Full Contacts Directory &rarr;
              </Link>
            </div>

            {userAnalytics?.recentSignups && userAnalytics.recentSignups.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Student Name &amp; Email</th>
                      <th className="py-2.5 px-3">Phone &amp; WhatsApp</th>
                      <th className="py-2.5 px-3">Signed Up</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Quick Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {userAnalytics.recentSignups.map((user) => {
                      const hasPhone = Boolean(user.phone && user.phone.replace(/\D/g, "").length >= 9);
                      const cleanPhone = user.phone ? user.phone.trim() : null;
                      const waNumber = hasPhone ? normalizeWhatsAppNumber(cleanPhone) : null;
                      const waUrl = waNumber
                        ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${user.fullName}, this is BrainLab Academy support regarding your candidate account.`)}`
                        : null;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3">
                            <p className="font-extrabold text-slate-900 dark:text-white">{user.fullName}</p>
                            <p className="text-[11px] font-mono text-slate-500">{user.email}</p>
                          </td>

                          <td className="py-2.5 px-3">
                            {hasPhone && cleanPhone ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                  {cleanPhone}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cleanPhone);
                                    setCopiedPhoneId(user.id);
                                    setTimeout(() => setCopiedPhoneId(null), 2000);
                                  }}
                                  className="rounded px-1.5 py-0.5 text-[10px] font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                                >
                                  {copiedPhoneId === user.id ? "✓" : "Copy"}
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

                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Recently"}
                          </td>

                          <td className="py-2.5 px-3">
                            {user.emailConfirmed ? (
                              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                                ✓ Verified
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[10px] font-bold">
                                Active
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href="/admin/communication"
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Message &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Awaiting student registration entries.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: CONVERSION FUNNEL & FIRST-PARTY TELEMETRY */}
      {activeTab === "funnel" && (
        <>
          {/* Conversion Funnel Scorecards */}
          <section className="admin-section mt-6">
            <h2 className="admin-card-title mb-3">6-Stage Conversion Funnel</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {funnelStages.map((stage) => (
                <div key={stage.id} className="admin-stat-card border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                    {stage.title}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {stage.count}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {stage.metric}
                  </p>
                  <p className="mt-2 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                    {stage.note}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 12 Core Events Telemetry Table */}
          <section className="admin-section admin-card mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="admin-card-title">12 Core First-Party Telemetry Events</h2>
                <p className="admin-card-text">
                  Strict NDPA 2023 compliance: Zero PII, daily salted session hashes, client consent-gated.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                ● Ingestion Active & Protected
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3">Funnel Stage</th>
                    <th className="py-3 px-3">Event Key</th>
                    <th className="py-3 px-3">Event Label</th>
                    <th className="py-3 px-3">Purpose & Scope</th>
                    <th className="py-3 px-3 text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {FUNNEL_EVENTS.map((e) => {
                    const count = telemetryCounts[e.name] || 0;
                    return (
                      <tr key={e.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-3 font-semibold text-blue-700 dark:text-cyan-400">
                          {e.stage}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {e.name}
                        </td>
                        <td className="py-3 px-3 font-medium">{e.label}</td>
                        <td className="py-3 px-3 text-slate-500">{e.description}</td>
                        <td className="py-3 px-3 text-right font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {count}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Real-Time Anonymous Telemetry Feed */}
          <section className="admin-section admin-card mt-6">
            <h2 className="admin-card-title">Real-Time Anonymous Telemetry Stream</h2>
            <p className="admin-card-text">
              Last 25 ingested events showing daily session hash, timestamp, and sanitized payload without PII.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Event</th>
                    <th className="py-3 px-3">Daily Session Hash</th>
                    <th className="py-3 px-3">Sanitized Parameters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentTelemetry.slice(0, 25).map((r, i) => (
                    <tr key={`${r.event_name}-${r.created_at}-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-cyan-300">
                        {r.event_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        {r.session_hash || "anonymous"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {JSON.stringify(r.event_payload || {})}
                      </td>
                    </tr>
                  ))}
                  {recentTelemetry.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No telemetry events recorded yet. Browse the public website or start a practice exam to generate events.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* VIEW 2: CBT EXAMINATION RESULTS & MASTERY */}
      {activeTab === "exams" && (
        <>
          {/* KPI Overview Grid */}
          <section className="admin-section admin-stats mt-6">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Total Exam Attempts</p>
              <p className="admin-stat-value">{stats.totalAttempts}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Overall Pass Rate</p>
              <p className="admin-stat-value">{stats.passRate}%</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Average Score</p>
              <p className="admin-stat-value">{stats.avgScorePercent}%</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Question Bank Total</p>
              <p className="admin-stat-value">{totalQuestions}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Access Codes Total</p>
              <p className="admin-stat-value">{totalCodes}</p>
            </div>
            <div className="admin-stat-card border-blue-200 bg-blue-50/20">
              <p className="admin-stat-label">Live Classes Scheduled</p>
              <p className="admin-stat-value text-blue-900">{totalLiveClasses}</p>
            </div>
            <div className="admin-stat-card border-emerald-200 bg-emerald-50/20">
              <p className="admin-stat-label">Class Attendance Records</p>
              <p className="admin-stat-value text-emerald-900">{totalAttendance}</p>
            </div>
            <div className="admin-stat-card border-indigo-200 bg-indigo-50/20">
              <p className="admin-stat-label">Tutor Voice Notes & Audio</p>
              <p className="admin-stat-value text-indigo-900">{totalAudioAssets}</p>
            </div>
          </section>

          {/* Subject Filter & Score Distribution */}
          <section className="admin-section mt-6 grid gap-6 lg:grid-cols-3">
            <div className="admin-card lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="admin-card-title">Score Performance Distribution</h2>
                  <p className="admin-card-text">Candidate brackets for {selectedSubject === "all" ? "all subjects" : selectedSubject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="subject-select" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Filter Subject:
                  </label>
                  <select
                    id="subject-select"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="admin-input !w-auto text-sm"
                  >
                    {uniqueSubjects.map((s) => (
                      <option key={s} value={s}>
                        {s === "all" ? "All Subjects" : s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Distinction (70% - 100%)</span>
                    <span>{stats.brackets.distinction} attempts ({stats.totalAttempts ? Math.round((stats.brackets.distinction / stats.totalAttempts) * 100) : 0}%)</span>
                  </div>
                  <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${stats.totalAttempts ? (stats.brackets.distinction / stats.totalAttempts) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Credit (50% - 69%)</span>
                    <span>{stats.brackets.credit} attempts ({stats.totalAttempts ? Math.round((stats.brackets.credit / stats.totalAttempts) * 100) : 0}%)</span>
                  </div>
                  <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-500"
                      style={{ width: `${stats.totalAttempts ? (stats.brackets.credit / stats.totalAttempts) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Pass (40% - 49%)</span>
                    <span>{stats.brackets.pass} attempts ({stats.totalAttempts ? Math.round((stats.brackets.pass / stats.totalAttempts) * 100) : 0}%)</span>
                  </div>
                  <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${stats.totalAttempts ? (stats.brackets.pass / stats.totalAttempts) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Needs Improvement (&lt; 40%)</span>
                    <span>{stats.brackets.fail} attempts ({stats.totalAttempts ? Math.round((stats.brackets.fail / stats.totalAttempts) * 100) : 0}%)</span>
                  </div>
                  <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${stats.totalAttempts ? (stats.brackets.fail / stats.totalAttempts) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Breakdown Card */}
            <div className="admin-card">
              <h2 className="admin-card-title">Subject Summary</h2>
              <p className="admin-card-text">Activity breakdown across curricula</p>

              <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {subjectBreakdown.length === 0 ? (
                  <p className="py-4 text-xs text-slate-500">No subject records available.</p>
                ) : (
                  subjectBreakdown.map((s) => (
                    <div key={s.subject} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{s.subject}</p>
                        <p className="text-slate-500">{s.attempts} attempts · {s.passCount} passed</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">
                          {s.avgScore}% avg
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Recent Attempts Log */}
          <section className="admin-section admin-card mt-6">
            <h2 className="admin-card-title">Recent Examination Activity</h2>
            <p className="admin-card-text">Last 25 logged test completions</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Candidate</th>
                    <th className="py-3 px-3">Subject</th>
                    <th className="py-3 px-3">Score</th>
                    <th className="py-3 px-3">Percentage</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredResults.slice(0, 25).map((r) => {
                    const score = r.score ?? 0;
                    const total = r.total ?? 1;
                    const pct = Math.round((score / total) * 100);
                    const passed = pct >= 50;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-500">
                          {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                          {r.name || "Anonymous Learner"}
                        </td>
                        <td className="py-3 px-3 font-semibold">{r.subject || "General"}</td>
                        <td className="py-3 px-3 font-mono">{score} / {total}</td>
                        <td className="py-3 px-3 font-mono font-bold">{pct}%</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              passed
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {passed ? "PASSED" : "FAILED"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredResults.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No results logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
