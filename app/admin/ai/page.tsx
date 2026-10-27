"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import {
  getAIPlatformConfig,
  saveAIPlatformConfig,
  type AIPlatformConfig,
} from "../../lib/platformConfig";
import type { AIMonitoringPayload, ModelUsageSummary } from "../../lib/aiUsageTracker";
import "../admin.css";

export default function AdminAIPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [config, setConfig] = useState<AIPlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Monitoring State
  const [monitoring, setMonitoring] = useState<AIMonitoringPayload | null>(null);
  const [probing, setProbing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<"monitor" | "config" | "headers" | "activity">("monitor");

  // Real-time Ticking Clocks
  const [utcCountdown, setUtcCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, formatted: "00h 00m 00s" });
  const [minuteCountdown, setMinuteCountdown] = useState(60);

  // Form State
  const [provider, setProvider] = useState<"gemini" | "groq">("gemini");
  const [geminiModel, setGeminiModel] = useState("gemini-3-flash-preview");
  const [groqModel, setGroqModel] = useState("qwen/qwen3.8-27b");
  const [dailyFreeQuota, setDailyFreeQuota] = useState(10);
  const [monthlyPremiumQuota, setMonthlyPremiumQuota] = useState(500);
  const [maxOutputTokens, setMaxOutputTokens] = useState(350);
  const [systemPromptTone, setSystemPromptTone] = useState("");

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live 1-Second Ticking Timer for Reset Countdowns
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const nextUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
      const totalSec = Math.max(0, Math.floor((nextUtc.getTime() - now.getTime()) / 1000));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setUtcCountdown({
        hours: h,
        minutes: m,
        seconds: s,
        formatted: `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`,
      });
      setMinuteCountdown(60 - now.getUTCSeconds());
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch telemetry from API
  const fetchTelemetry = useCallback(async (probe = false) => {
    try {
      if (probe) setProbing(true);
      const res = await fetch(`/api/admin/ai-monitoring?probe=${probe ? "true" : "false"}&t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Telemetry HTTP ${res.status}`);
      const data: AIMonitoringPayload = await res.json();
      setMonitoring(data);
    } catch (err) {
      console.warn("[AdminAIPage] Telemetry fetch warning:", err);
    } finally {
      if (probe) setProbing(false);
    }
  }, []);

  // Auto-refresh loop
  useEffect(() => {
    if (!autoRefresh) {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      return;
    }
    refreshTimerRef.current = setInterval(() => {
      void fetchTelemetry(false);
    }, 15000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [autoRefresh, fetchTelemetry]);

  // Initial load
  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) {
        router.replace("/account");
        return;
      }
      setAdmin(session);
      const data = await getAIPlatformConfig();
      if (active) {
        setConfig(data);
        setProvider(data.provider);
        setGeminiModel(data.gemini_model);
        setGroqModel(data.groq_model || "qwen/qwen3.8-27b");
        setDailyFreeQuota(data.daily_free_quota);
        setMonthlyPremiumQuota(data.monthly_premium_quota);
        setMaxOutputTokens(data.max_output_tokens);
        setSystemPromptTone(data.system_prompt_tone);
        setLoading(false);
      }
      void fetchTelemetry(true);
    }
    void init();
    return () => {
      active = false;
    };
  }, [router, fetchTelemetry]);

  async function handleSaveAIConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!admin) return;

    setWorking(true);
    setError("");
    setMessage("");

    const updated: AIPlatformConfig = {
      provider,
      gemini_model: geminiModel.trim(),
      groq_model: groqModel.trim(),
      daily_free_quota: Number(dailyFreeQuota) || 10,
      monthly_premium_quota: Number(monthlyPremiumQuota) || 500,
      max_output_tokens: Number(maxOutputTokens) || 350,
      system_prompt_tone: systemPromptTone.trim(),
    };

    const success = await saveAIPlatformConfig(updated, { id: admin.id, email: admin.email });
    if (success) {
      setConfig(updated);
      setMessage("AI Platform model routing and quota policies saved successfully!");
      void fetchTelemetry(true);
    } else {
      setError("Failed to save AI configuration.");
    }
    setWorking(false);
  }

  if (loading || !config) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card p-8 text-center text-slate-600">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="font-bold">Connecting to AI Gateways &amp; Telemetry Engine…</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container space-y-6">
        {/* Navigation & Header */}
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-900/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-700 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live AI Gateway &amp; Quota Telemetry
              </div>
              <h1 className="admin-title">AI Models Usage, Quotas &amp; Reset Times</h1>
              <p className="admin-subtitle">
                Monitor real-time consumption, provider quota thresholds, daily UTC reset countdowns, and student tier budgets across Google Gemini and Groq LPU models.
              </p>
              {admin && (
                <div className="admin-user-chip mt-2">
                  {admin.email} · {admin.role.replaceAll("_", " ")}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => void fetchTelemetry(true)}
                disabled={probing}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
                title="Pings Gemini & Groq APIs to measure latency and refresh live rate-limit headers"
              >
                {probing ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Probing Gateways…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    Probe &amp; Refresh Now
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`rounded-xl px-3.5 py-2.5 text-xs font-bold transition border ${
                  autoRefresh
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-slate-100 border-slate-300 text-slate-600"
                }`}
                title="Toggle 15-second automatic telemetry polling"
              >
                Auto-Refresh: {autoRefresh ? "ON (15s)" : "OFF"}
              </button>

              <Link href="/admin/dashboard" className="admin-btn-light">
                ← Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Global Reset Countdown Hero Banner */}
        <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-5 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                Global Quota Reset Synchronizer
              </div>
              <h2 className="text-xl font-black text-white">Daily AI Quota Reset Countdown</h2>
              <p className="text-xs text-indigo-200/80 max-w-xl">
                Google AI Studio free quotas, Groq daily windows, and student daily tutor limits automatically reset at <strong className="text-white">00:00:00 UTC</strong> every midnight.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-indigo-500/40 bg-indigo-900/40 px-4 py-2.5 text-center backdrop-blur">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-300">Daily Reset In</span>
                <span className="font-mono text-2xl font-black text-white tracking-wider">
                  {utcCountdown.formatted}
                </span>
                <span className="block text-[10px] text-indigo-300/70">00:00:00 UTC</span>
              </div>

              <div className="rounded-xl border border-indigo-500/40 bg-indigo-900/40 px-4 py-2.5 text-center backdrop-blur">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-300">Rate Window</span>
                <span className="font-mono text-2xl font-black text-emerald-400 tracking-wider">
                  {String(minuteCountdown).padStart(2, "0")}s
                </span>
                <span className="block text-[10px] text-indigo-300/70">Rolling 60s</span>
              </div>
            </div>
          </div>
        </section>

        {message && <div className="admin-message" role="status">✓ {message}</div>}
        {error && <div className="admin-message" role="alert" style={{ background: "#fee2e2", color: "#991b1b" }}>⚠️ {error}</div>}

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("monitor")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "monitor"
                ? "bg-[#061a3a] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            📊 Live Model Quotas &amp; Telemetry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "config"
                ? "bg-[#061a3a] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            ⚙️ Model Routing &amp; Quota Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("headers")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "headers"
                ? "bg-[#061a3a] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            📡 Live Rate-Limit Headers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "activity"
                ? "bg-[#061a3a] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            📜 Recent Generations Activity ({monitoring?.recentGenerations.length || 0})
          </button>
        </div>

        {/* TAB 1: LIVE MODEL QUOTAS & MONITORING */}
        {activeTab === "monitor" && (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="admin-card border-l-4 border-indigo-600 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today&apos;s AI Requests</span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-950">
                    {monitoring?.summary.totalRequestsToday ?? 0}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-extrabold text-indigo-700">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Live API completions today</p>
              </div>

              <div className="admin-card border-l-4 border-emerald-600 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Est. Tokens Consumed</span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-950">
                    {(monitoring?.summary.totalTokensToday ?? 0).toLocaleString()}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                    Tokens
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Prompt + Output token volume</p>
              </div>

              <div className="admin-card border-l-4 border-amber-500 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cache Hits / Quota Saved</span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-950">
                    {monitoring?.summary.cacheHitsToday ?? 0}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                    {monitoring?.summary.cacheSavingsPercent ?? 0}% Saved
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Served via cache without quota cost</p>
              </div>

              <div className="admin-card border-l-4 border-sky-600 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Students Today</span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-950">
                    {monitoring?.summary.activeStudentsToday ?? 0}
                  </span>
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-extrabold text-sky-700">
                    Learners
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Unique candidates using AI Tutor</p>
              </div>
            </div>

            {/* Model Fleet Cards Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {monitoring?.models.map((model) => (
                <ModelCard
                  key={model.modelId}
                  model={model}
                  utcCountdownFormatted={utcCountdown.formatted}
                  minuteCountdown={minuteCountdown}
                  isPrimary={
                    (model.provider === "gemini" && monitoring.activeProvider === "gemini") ||
                    (model.provider === "groq" && monitoring.activeProvider === "groq")
                  }
                  onProbe={() => void fetchTelemetry(true)}
                />
              ))}
            </div>

            {/* Platform & Student Quota Policy Card */}
            <section className="admin-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Learner Tier Quota Policy &amp; Cost Guardrails
                  </h3>
                  <p className="text-xs text-slate-500">
                    Protects upstream AI budgets by enforcing per-student daily and monthly rate caps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("config")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Edit Policies →
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Free Tier Allowance</span>
                  <strong className="block text-xl font-black text-slate-900">
                    {monitoring?.learnerQuotas.dailyFreeQuota ?? 10} Questions / Day
                  </strong>
                  <span className="mt-1 block text-[11px] text-emerald-700 font-semibold">
                    Resets in: {utcCountdown.formatted} (00:00 UTC)
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Premium Tier Allowance</span>
                  <strong className="block text-xl font-black text-slate-900">
                    {monitoring?.learnerQuotas.monthlyPremiumQuota ?? 500} Questions / Month
                  </strong>
                  <span className="mt-1 block text-[11px] text-slate-600">
                    Rolling 30-day student billing cycle
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Max Output Token Cap</span>
                  <strong className="block text-xl font-black text-slate-900">
                    {monitoring?.learnerQuotas.maxOutputTokens ?? 350} Tokens
                  </strong>
                  <span className="mt-1 block text-[11px] text-indigo-700 font-semibold">
                    Enforces concise, non-verbose responses
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: AI MODEL CONFIGURATION */}
        {activeTab === "config" && (
          <form onSubmit={handleSaveAIConfig} className="space-y-6">
            <section className="admin-section admin-card">
              <h2 className="text-lg font-black text-slate-950 mb-1">Active Primary AI Provider &amp; Model Routing</h2>
              <p className="text-xs text-slate-500 mb-4">
                Select the primary gateway for question explanations, AI Tutor dialogues, and auto-generated mock assessments.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    provider === "gemini" ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20" : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value="gemini"
                    checked={provider === "gemini"}
                    onChange={() => setProvider("gemini")}
                    className="mt-1 text-indigo-600"
                  />
                  <div>
                    <strong className="block text-slate-950">Google AI Studio (Gemini)</strong>
                    <span className="text-xs text-slate-600 block mt-0.5">
                      Rich reasoning, high context window (1M tokens), reliable SSE streaming for interactive student explanations.
                    </span>
                    <span className="mt-2 inline-block rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
                      Free Quota: 1,500 RPD · 15 RPM
                    </span>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    provider === "groq" ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20" : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value="groq"
                    checked={provider === "groq"}
                    onChange={() => setProvider("groq")}
                    className="mt-1 text-indigo-600"
                  />
                  <div>
                    <strong className="block text-slate-950">Groq High-Speed LPU</strong>
                    <span className="text-xs text-slate-600 block mt-0.5">
                      Sub-200ms latency inference for instant explanations and rapid drill authoring.
                    </span>
                    <span className="mt-2 inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                      Free Quota: 1,000 RPD · 8,000 TPM
                    </span>
                  </div>
                </label>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">Gemini Model Identifier</label>
                  <input
                    type="text"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs"
                    placeholder="e.g. gemini-3-flash-preview, gemini-3.8-flash"
                    required
                  />
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGeminiModel("gemini-3-flash-preview")}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                    >
                      gemini-3-flash-preview (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeminiModel("gemini-3.8-flash")}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                    >
                      gemini-3.8-flash
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">Groq Model Identifier</label>
                  <input
                    type="text"
                    value={groqModel}
                    onChange={(e) => setGroqModel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs"
                    placeholder="e.g. qwen/qwen3.8-27b"
                    required
                  />
                  {monitoring?.availableGroqModels && monitoring.availableGroqModels.length > 0 && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-slate-500 block mb-1">Available on your Groq key:</span>
                      <div className="flex flex-wrap gap-1">
                        {monitoring.availableGroqModels.slice(0, 4).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setGroqModel(m)}
                            className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-indigo-100 hover:text-indigo-800"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="admin-section admin-card">
              <h2 className="text-lg font-black text-slate-950 mb-1">Learner Usage Quotas &amp; Cost Limits</h2>
              <p className="text-xs text-slate-500 mb-4">
                Enforces strict server-side limits to prevent upstream token exhaustion.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">Daily Free Tier Quota</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={dailyFreeQuota}
                    onChange={(e) => setDailyFreeQuota(Number(e.target.value) || 1)}
                    className="w-full rounded-xl border border-slate-300 p-3 font-bold text-slate-900"
                    required
                  />
                  <span className="text-[11px] text-slate-500">Questions per free learner per day (resets 00:00 UTC)</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">Monthly Premium Quota</label>
                  <input
                    type="number"
                    min={50}
                    max={5000}
                    value={monthlyPremiumQuota}
                    onChange={(e) => setMonthlyPremiumQuota(Number(e.target.value) || 50)}
                    className="w-full rounded-xl border border-slate-300 p-3 font-bold text-slate-900"
                    required
                  />
                  <span className="text-[11px] text-slate-500">Questions included in paid subscription tiers</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">Max Output Tokens</label>
                  <input
                    type="number"
                    min={150}
                    max={1000}
                    value={maxOutputTokens}
                    onChange={(e) => setMaxOutputTokens(Number(e.target.value) || 350)}
                    className="w-full rounded-xl border border-slate-300 p-3 font-bold text-slate-900"
                    required
                  />
                  <span className="text-[11px] text-slate-500">Output limit per question (standard: 350)</span>
                </div>
              </div>
            </section>

            <section className="admin-section admin-card">
              <h2 className="text-lg font-black text-slate-950 mb-1">Pedagogical System Prompt &amp; Tone</h2>
              <p className="text-xs text-slate-500 mb-3">
                Instructs the model on pedagogical demeanor, brevity, and exam-appropriate framing.
              </p>
              <textarea
                rows={4}
                value={systemPromptTone}
                onChange={(e) => setSystemPromptTone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-900"
                required
              />
              <p className="mt-2 text-[11px] text-slate-500">
                Note: Explanations automatically strip markdown hashtags (#) and asterisks (*) for clean plain-text reading.
              </p>
            </section>

            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={working}
                className="rounded-xl bg-[#061a3a] px-8 py-3 font-extrabold text-white hover:bg-[#123566] disabled:opacity-50 transition shadow"
              >
                {working ? "Saving AI Controls…" : "Save AI Platform Configuration"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: RAW RATE-LIMIT HEADERS INSPECTOR */}
        {activeTab === "headers" && (
          <section className="admin-card p-5 space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900">Provider Live HTTP Response Headers Inspector</h2>
              <p className="text-xs text-slate-500">
                Shows the exact rate-limit and reset headers returned by the upstream AI providers during the latest probe.
              </p>
            </div>

            {monitoring?.models.map((model) => (
              <div key={model.modelId} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-black text-slate-900">{model.modelName}</strong>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-700">
                      {model.provider}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Latency: {model.latencyMs !== null ? `${model.latencyMs}ms` : "N/A"}
                  </span>
                </div>

                <div className="p-4">
                  {Object.keys(model.rawHeaders).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No rate-limit headers captured yet. Click &quot;Probe &amp; Refresh Now&quot; above to query the gateway.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="pb-2 font-bold">Header Name</th>
                            <th className="pb-2 font-bold">Header Value</th>
                            <th className="pb-2 font-bold">Meaning</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(model.rawHeaders).map(([key, val]) => (
                            <tr key={key} className="hover:bg-slate-50">
                              <td className="py-2 text-indigo-700 font-bold">{key}</td>
                              <td className="py-2 text-slate-900">{val}</td>
                              <td className="py-2 text-slate-500 text-[11px] font-sans">
                                {getHeaderDescription(key)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* TAB 4: RECENT GENERATIONS ACTIVITY STREAM */}
        {activeTab === "activity" && (
          <section className="admin-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Recent AI Generations Log</h2>
                <p className="text-xs text-slate-500">
                  Last 25 AI tutor queries, practice explanations, and assessment completions.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {monitoring?.recentGenerations.length || 0} Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Model</th>
                    <th className="pb-2">Prompt Preview</th>
                    <th className="pb-2">Response Preview</th>
                    <th className="pb-2">Est. Tokens</th>
                    <th className="pb-2">Cache Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monitoring?.recentGenerations.map((gen) => (
                    <tr key={gen.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {new Date(gen.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="py-2.5">
                        <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-800">
                          {gen.model}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-800 max-w-xs truncate" title={gen.promptSnippet}>
                        {gen.promptSnippet || "—"}
                      </td>
                      <td className="py-2.5 text-slate-600 max-w-xs truncate" title={gen.responseSnippet}>
                        {gen.responseSnippet || "—"}
                      </td>
                      <td className="py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {gen.tokens}
                      </td>
                      <td className="py-2.5">
                        {gen.isCache ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                            ⚡ CACHE HIT
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            API Call
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// Subcomponent: Model Quota Card
function ModelCard({
  model,
  utcCountdownFormatted,
  minuteCountdown,
  isPrimary,
  onProbe,
}: {
  model: ModelUsageSummary;
  utcCountdownFormatted: string;
  minuteCountdown: number;
  isPrimary: boolean;
  onProbe: () => void;
}) {
  const isGemini = model.provider === "gemini";
  const requestsUsedPercent = Math.min(100, model.quotaRequestsPercentUsed);
  const meterColor =
    requestsUsedPercent > 85 ? "bg-rose-500" : requestsUsedPercent > 60 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div
      className={`admin-card relative overflow-hidden p-5 transition ${
        isPrimary ? "ring-2 ring-indigo-500/40 border-indigo-300" : "border-slate-200"
      }`}
    >
      {/* Primary Badge */}
      {isPrimary && (
        <span className="absolute top-0 right-0 rounded-bl-xl bg-indigo-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
          Active Primary
        </span>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-950">{model.modelName}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                model.status === "operational"
                  ? "bg-emerald-100 text-emerald-800"
                  : model.status === "warning"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              ● {model.status}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 block mt-0.5">
            Model ID: {model.modelId}
          </span>
        </div>

        {model.latencyMs !== null && (
          <div className="text-right">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
              ⚡ {model.latencyMs} ms
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5">Latency</span>
          </div>
        )}
      </div>

      {/* Quota Progress Meter: Requests */}
      <div className="space-y-1.5 mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
        <div className="flex justify-between items-baseline text-xs">
          <span className="font-extrabold text-slate-700">
            Daily Request Quota (RPD)
          </span>
          <span className="font-mono text-xs font-black text-slate-900">
            {model.quotaLimitRequests !== null
              ? `${model.requestsToday} / ${model.quotaLimitRequests.toLocaleString()} (${requestsUsedPercent}%)`
              : `${model.requestsToday} requests today`}
          </span>
        </div>

        {model.quotaLimitRequests !== null && (
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full ${meterColor} transition-all duration-500`}
              style={{ width: `${Math.max(2, requestsUsedPercent)}%` }}
            />
          </div>
        )}

        <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
          <span>Remaining: <strong className="text-slate-800">{model.quotaRemainingRequests?.toLocaleString() ?? "N/A"}</strong></span>
          <span>7-Day Total: <strong className="text-slate-800">{model.requestsLast7Days.toLocaleString()}</strong></span>
          <span>30-Day Total: <strong className="text-slate-800">{model.requestsLast30Days.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Quota Progress Meter: Tokens */}
      <div className="space-y-1.5 mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
        <div className="flex justify-between items-baseline text-xs">
          <span className="font-extrabold text-slate-700">
            Token Rate Limit &amp; Output Volume
          </span>
          <span className="font-mono text-xs font-black text-slate-900">
            {model.estimatedTokensToday.toLocaleString()} tokens today
          </span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>Rate Limit: <strong className="text-slate-800">{model.quotaLimitTokens?.toLocaleString() ?? "N/A"} TPM</strong></span>
          <span>
            {model.quotaRemainingTokens !== null && (
              <>Window Remaining: <strong className="text-slate-800">{model.quotaRemainingTokens.toLocaleString()} tokens</strong></>
            )}
          </span>
        </div>
      </div>

      {/* Reset Times Callout Box */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Daily Quota Reset Time
          </span>
          <span className="font-mono font-black text-indigo-700">
            {utcCountdownFormatted}
          </span>
        </div>
        <p className="text-[11px] text-indigo-900/80">
          Resets to 0 at 00:00:00 UTC ({new Date(model.resetTimeDailyUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} local).
        </p>

        {/* Rolling Window Reset */}
        <div className="border-t border-indigo-200/50 pt-2 flex items-center justify-between text-[11px] text-indigo-900">
          <span>Minute Rate Window Reset:</span>
          <span className="font-mono font-extrabold text-indigo-700">
            {minuteCountdown}s
          </span>
        </div>

        {/* Dynamic Header Reported Reset (Groq) */}
        {model.providerReportedResetRequests && (
          <div className="border-t border-indigo-200/50 pt-1.5 flex items-center justify-between text-[11px] text-indigo-900">
            <span>Provider Header Reset (x-ratelimit):</span>
            <span className="font-mono font-extrabold text-indigo-700">
              {model.providerReportedResetRequests}
            </span>
          </div>
        )}
      </div>

      {/* Footer Notes & Probe Action */}
      <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="text-[11px] text-slate-500 max-w-xs">{model.notes}</p>
        <button
          type="button"
          onClick={onProbe}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          Probe Model
        </button>
      </div>
    </div>
  );
}

function getHeaderDescription(header: string): string {
  switch (header.toLowerCase()) {
    case "x-ratelimit-limit-requests":
      return "Maximum allowed requests in the active daily quota cycle.";
    case "x-ratelimit-remaining-requests":
      return "Number of remaining requests available before throttling.";
    case "x-ratelimit-reset-requests":
      return "Exact duration until the request quota counter resets.";
    case "x-ratelimit-limit-tokens":
      return "Tokens allowed per minute (TPM) limit.";
    case "x-ratelimit-remaining-tokens":
      return "Tokens remaining in the current 1-minute window.";
    case "x-ratelimit-reset-tokens":
      return "Duration until tokens window rolls over.";
    case "retry-after":
      return "Seconds to wait before resending after a 429 response.";
    default:
      return "Provider gateway telemetry parameter.";
  }
}
