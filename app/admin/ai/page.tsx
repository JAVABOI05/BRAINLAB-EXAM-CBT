"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import {
  getAIPlatformConfig,
  saveAIPlatformConfig,
  type AIPlatformConfig,
  type AIModelDefinition,
  type AIRoutingStrategy,
  type AIModelStrength,
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
  const [activeTab, setActiveTab] = useState<"monitor" | "pool" | "config" | "headers" | "activity">("monitor");

  // Real-time Ticking Clocks
  const [utcCountdown, setUtcCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, formatted: "00h 00m 00s" });
  const [minuteCountdown, setMinuteCountdown] = useState(60);

  // Model Pool & Shuffling Strategy State (Super Admin)
  const [routingStrategy, setRoutingStrategy] = useState<AIRoutingStrategy>("auto_strength");
  const [pinnedModelId, setPinnedModelId] = useState<string>("");
  const [modelPool, setModelPool] = useState<AIModelDefinition[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Model Form State
  const [newModelName, setNewModelName] = useState("");
  const [newModelProvider, setNewModelProvider] = useState<"gemini" | "groq">("gemini");
  const [newModelIdentifier, setNewModelIdentifier] = useState("");
  const [newModelStrength, setNewModelStrength] = useState<AIModelStrength>("general");
  const [newModelPriority, setNewModelPriority] = useState(1);
  const [newModelQuota, setNewModelQuota] = useState(1500);
  const [newModelMaxTokens, setNewModelMaxTokens] = useState(350);
  const [newModelNotes, setNewModelNotes] = useState("");

  // Standard Quota Config Form State
  const [dailyFreeQuota, setDailyFreeQuota] = useState(10);
  const [monthlyPremiumQuota, setMonthlyPremiumQuota] = useState(500);
  const [maxOutputTokens, setMaxOutputTokens] = useState(350);
  const [systemPromptTone, setSystemPromptTone] = useState("");

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSuperAdmin = admin?.role === "super_admin";

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
      if (data.routingStrategy) setRoutingStrategy(data.routingStrategy);
      if (data.pinnedModelId) setPinnedModelId(data.pinnedModelId);
      if (data.modelPool) setModelPool(data.modelPool);
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
        setRoutingStrategy(data.routing_strategy || "auto_strength");
        setPinnedModelId(data.pinned_model_id || "");
        setModelPool(data.model_pool || []);
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

  // Update Strategy Handler (Super Admin Only)
  async function handleUpdateStrategy(newStrategy: AIRoutingStrategy, pinnedId?: string) {
    if (!isSuperAdmin) {
      setError("Only the Super Admin can change AI model routing and shuffling policies.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const auth = await (await import("../../lib/supabase")).supabase.auth.getSession();
      const token = auth.data.session?.access_token || "";

      const res = await fetch("/api/admin/ai/models", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          routing_strategy: newStrategy,
          pinned_model_id: pinnedId !== undefined ? pinnedId : pinnedModelId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update strategy.");

      setRoutingStrategy(newStrategy);
      if (pinnedId !== undefined) setPinnedModelId(pinnedId);
      setMessage(`AI Model Shuffling policy updated to: ${getStrategyLabel(newStrategy)}!`);
      void fetchTelemetry(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update routing strategy.");
    } finally {
      setWorking(false);
    }
  }

  // Toggle Model Enabled/Disabled (Super Admin Only)
  async function handleToggleModel(modelId: string, currentEnabled: boolean) {
    if (!isSuperAdmin) {
      setError("Only the Super Admin can toggle AI models.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const auth = await (await import("../../lib/supabase")).supabase.auth.getSession();
      const token = auth.data.session?.access_token || "";

      const res = await fetch("/api/admin/ai/models", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toggle_model_id: modelId,
          enabled: !currentEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle model.");

      setMessage(`Model status updated.`);
      void fetchTelemetry(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle model.");
    } finally {
      setWorking(false);
    }
  }

  // Delete Model from Pool (Super Admin Only)
  async function handleDeleteModel(modelId: string, modelName: string) {
    if (!isSuperAdmin) {
      setError("Only the Super Admin can remove AI models.");
      return;
    }
    if (!confirm(`Are you sure you want to remove "${modelName}" from the AI model pool?`)) {
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const auth = await (await import("../../lib/supabase")).supabase.auth.getSession();
      const token = auth.data.session?.access_token || "";

      const res = await fetch(`/api/admin/ai/models?id=${encodeURIComponent(modelId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete model.");

      setMessage(`Model "${modelName}" removed from pool.`);
      void fetchTelemetry(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove model.");
    } finally {
      setWorking(false);
    }
  }

  // Add New Model to Pool (Super Admin Only)
  async function handleAddModelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSuperAdmin) {
      setError("Only the Super Admin can add new models to the fleet.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const auth = await (await import("../../lib/supabase")).supabase.auth.getSession();
      const token = auth.data.session?.access_token || "";

      const res = await fetch("/api/admin/ai/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newModelName.trim(),
          provider: newModelProvider,
          modelIdentifier: newModelIdentifier.trim(),
          strength: newModelStrength,
          priority: Number(newModelPriority) || 1,
          dailyQuotaLimit: Number(newModelQuota) || (newModelProvider === "gemini" ? 1500 : 1000),
          maxTokens: Number(newModelMaxTokens) || 350,
          notes: newModelNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add model.");

      setMessage(`New model "${newModelName}" added to the AI fleet pool!`);
      setShowAddModal(false);
      setNewModelName("");
      setNewModelIdentifier("");
      setNewModelNotes("");
      void fetchTelemetry(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add model.");
    } finally {
      setWorking(false);
    }
  }

  // Save General Quota Config
  async function handleSaveGeneralConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!admin) return;

    setWorking(true);
    setError("");
    setMessage("");

    const updated: AIPlatformConfig = {
      ...(config || {}),
      provider: config?.provider || "gemini",
      gemini_model: config?.gemini_model || "gemini-3-flash-preview",
      groq_model: config?.groq_model || "qwen/qwen3.8-27b",
      routing_strategy: routingStrategy,
      pinned_model_id: pinnedModelId,
      model_pool: modelPool,
      daily_free_quota: Number(dailyFreeQuota) || 10,
      monthly_premium_quota: Number(monthlyPremiumQuota) || 500,
      max_output_tokens: Number(maxOutputTokens) || 350,
      system_prompt_tone: systemPromptTone.trim(),
    };

    const success = await saveAIPlatformConfig(updated, { id: admin.id, email: admin.email });
    if (success) {
      setConfig(updated);
      setMessage("AI Platform quotas, limits, and system prompt tone saved successfully!");
      void fetchTelemetry(false);
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
              <h1 className="admin-title">AI Models Fleet, Dynamic Shuffling &amp; Quota Engine</h1>
              <p className="admin-subtitle">
                Monitor real-time consumption, provider quotas, daily UTC reset countdowns, and automatic model shuffling.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {admin && (
                  <div className="admin-user-chip">
                    {admin.email} · {admin.role.replaceAll("_", " ")}
                  </div>
                )}
                {isSuperAdmin ? (
                  <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-black text-purple-900 border border-purple-200">
                    👑 Super Admin: Model Pool &amp; Shuffling Management Unlocked
                  </span>
                ) : (
                  <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-200">
                    🔒 Model Add/Delete &amp; Shuffling rules restricted to Super Admin
                  </span>
                )}
                <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                  🛡️ Learner Masking Active (Students only see &quot;BrainLab AI Tutor&quot;)
                </span>
              </div>
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
            onClick={() => setActiveTab("pool")}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "pool"
                ? "bg-[#061a3a] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            🔀 Model Shuffling &amp; Fleet Pool ({modelPool.length})
            {isSuperAdmin && <span className="ml-1.5 rounded bg-purple-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-200">Super Admin</span>}
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
            ⚙️ Platform Quota &amp; Tone Settings
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
                    routingStrategy === "admin_pinned"
                      ? model.modelId === pinnedModelId
                      : model.priority === 1
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
                    Enforces per-student daily and monthly rate caps so learners never exhaust server budgets.
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

        {/* TAB 2: MODEL SHUFFLING & FLEET POOL (SUPER ADMIN ONLY) */}
        {activeTab === "pool" && (
          <div className="space-y-6">
            {/* Shuffling Strategy Selector */}
            <section className="admin-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900">AI Model Routing &amp; Automatic Shuffling Policy</h2>
                    {isSuperAdmin ? (
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-900">
                        SUPER ADMIN EXCLUSIVE
                      </span>
                    ) : (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
                        LOCKED · VIEW ONLY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls how student requests are routed, balanced, or failed over across enabled models. Students never see which model responds.
                  </p>
                </div>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 shadow transition"
                  >
                    + Add Model to Fleet
                  </button>
                )}
              </div>

              {/* Strategy Options Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Auto Strength */}
                <label
                  className={`flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                    routingStrategy === "auto_strength"
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${!isSuperAdmin ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">🧠</span>
                      <input
                        type="radio"
                        name="routingStrategy"
                        value="auto_strength"
                        checked={routingStrategy === "auto_strength"}
                        disabled={!isSuperAdmin || working}
                        onChange={() => void handleUpdateStrategy("auto_strength")}
                        className="text-indigo-600"
                      />
                    </div>
                    <strong className="block text-xs font-black text-slate-900">
                      Smart Strength Routing (Recommended)
                    </strong>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Math &amp; STEM route to high-reasoning models; quick drills route to sub-200ms models; auto-shuffles if 429 occurs.
                    </p>
                  </div>
                  <span className="mt-3 inline-block text-[10px] font-bold text-indigo-700">
                    ● Autonomous Strength Matching
                  </span>
                </label>

                {/* 2. Load Balance */}
                <label
                  className={`flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                    routingStrategy === "load_balance"
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${!isSuperAdmin ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">⚖️</span>
                      <input
                        type="radio"
                        name="routingStrategy"
                        value="load_balance"
                        checked={routingStrategy === "load_balance"}
                        disabled={!isSuperAdmin || working}
                        onChange={() => void handleUpdateStrategy("load_balance")}
                        className="text-indigo-600"
                      />
                    </div>
                    <strong className="block text-xs font-black text-slate-900">
                      Dynamic Load Balancing
                    </strong>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Shuffles student traffic evenly across all enabled healthy models to maximize aggregate throughput and avoid quota exhaustion.
                    </p>
                  </div>
                  <span className="mt-3 inline-block text-[10px] font-bold text-indigo-700">
                    ● Multi-Model Shuffling
                  </span>
                </label>

                {/* 3. Priority Failover */}
                <label
                  className={`flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                    routingStrategy === "priority_failover"
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${!isSuperAdmin ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">⚡</span>
                      <input
                        type="radio"
                        name="routingStrategy"
                        value="priority_failover"
                        checked={routingStrategy === "priority_failover"}
                        disabled={!isSuperAdmin || working}
                        onChange={() => void handleUpdateStrategy("priority_failover")}
                        className="text-indigo-600"
                      />
                    </div>
                    <strong className="block text-xs font-black text-slate-900">
                      Strict Priority Failover
                    </strong>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Routes 100% of queries to Priority 1. Automatically falls over to Priority 2, then Priority 3 during rate limits.
                    </p>
                  </div>
                  <span className="mt-3 inline-block text-[10px] font-bold text-indigo-700">
                    ● Sequential Fallback Queue
                  </span>
                </label>

                {/* 4. Admin Pinned */}
                <label
                  className={`flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                    routingStrategy === "admin_pinned"
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${!isSuperAdmin ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">📌</span>
                      <input
                        type="radio"
                        name="routingStrategy"
                        value="admin_pinned"
                        checked={routingStrategy === "admin_pinned"}
                        disabled={!isSuperAdmin || working}
                        onChange={() => void handleUpdateStrategy("admin_pinned")}
                        className="text-indigo-600"
                      />
                    </div>
                    <strong className="block text-xs font-black text-slate-900">
                      Admin Pinned Model
                    </strong>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Forces a designated model for all requests. Background failover still activates automatically if the pinned model fails.
                    </p>
                  </div>
                  {routingStrategy === "admin_pinned" && isSuperAdmin && (
                    <select
                      value={pinnedModelId}
                      onChange={(e) => void handleUpdateStrategy("admin_pinned", e.target.value)}
                      className="mt-2 text-[11px] font-bold border border-indigo-300 rounded p-1 bg-white"
                    >
                      {modelPool.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              </div>
            </section>

            {/* Model Fleet Table */}
            <section className="admin-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Active AI Model Fleet ({modelPool.length} Models in Pool)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure strengths, priority ranking, and enable/disable individual models.
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  {isSuperAdmin ? "👑 Full Super Admin Controls Active" : "🔒 Read-only view"}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Model Name &amp; Provider</th>
                      <th className="pb-2">API Identifier</th>
                      <th className="pb-2">Strength Specialization</th>
                      <th className="pb-2">Priority</th>
                      <th className="pb-2">Daily Quota</th>
                      {isSuperAdmin && <th className="pb-2 text-right">Super Admin Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modelPool.map((model) => (
                      <tr key={model.id} className={`hover:bg-slate-50 transition ${!model.enabled ? "opacity-60 bg-slate-50/50" : ""}`}>
                        <td className="py-3">
                          {model.enabled ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              ENABLED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              DISABLED
                            </span>
                          )}
                        </td>

                        <td className="py-3">
                          <strong className="block text-slate-900 text-xs">{model.name}</strong>
                          <span className="text-[10px] text-slate-500 font-mono uppercase">
                            Provider: {model.provider}
                          </span>
                        </td>

                        <td className="py-3 font-mono text-xs text-indigo-700 font-bold">
                          {model.modelIdentifier}
                        </td>

                        <td className="py-3">
                          <StrengthBadge strength={model.strength} />
                        </td>

                        <td className="py-3 font-bold text-slate-900">
                          #{model.priority}
                        </td>

                        <td className="py-3 text-slate-700">
                          {model.dailyQuotaLimit ? `${model.dailyQuotaLimit.toLocaleString()} RPD` : "Default"}
                        </td>

                        {isSuperAdmin && (
                          <td className="py-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void handleToggleModel(model.id, model.enabled)}
                              disabled={working}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition border ${
                                model.enabled
                                  ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                  : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              }`}
                            >
                              {model.enabled ? "Disable" : "Enable"}
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDeleteModel(model.id, model.name)}
                              disabled={working || modelPool.length <= 1}
                              className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-40 transition"
                              title={modelPool.length <= 1 ? "Cannot delete the last remaining model" : "Remove from pool"}
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: PLATFORM SETTINGS */}
        {activeTab === "config" && (
          <form onSubmit={handleSaveGeneralConfig} className="space-y-6">
            <section className="admin-section admin-card">
              <h2 className="text-lg font-black text-slate-950 mb-1">Learner Usage Quotas &amp; Cost Limits</h2>
              <p className="text-xs text-slate-500 mb-4">
                Enforces strict server-side budgets to keep AI operating costs predictable and affordable.
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

        {/* TAB 4: RAW RATE-LIMIT HEADERS INSPECTOR */}
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

        {/* TAB 5: RECENT GENERATIONS ACTIVITY STREAM */}
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

      {/* SUPER ADMIN MODAL: ADD MODEL TO POOL */}
      {showAddModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-950">Add AI Model to Fleet Pool</h3>
                <p className="text-xs text-slate-500">Super Admin configuration: model will participate in shuffling and failover.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddModelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Friendly Display Name</label>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g. Google Gemini 3.8 Flash (Preview)"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Provider</label>
                  <select
                    value={newModelProvider}
                    onChange={(e) => setNewModelProvider(e.target.value as "gemini" | "groq")}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq LPU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Strength Specialization</label>
                  <select
                    value={newModelStrength}
                    onChange={(e) => setNewModelStrength(e.target.value as AIModelStrength)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                  >
                    <option value="reasoning_stem">🧠 STEM &amp; Deep Reasoning</option>
                    <option value="speed_drill">⚡ Ultra-Fast Drills &amp; Hints</option>
                    <option value="general">📚 General Studies &amp; Verbal</option>
                    <option value="failover">🛡️ Emergency Failover</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">API Model Identifier</label>
                <input
                  type="text"
                  value={newModelIdentifier}
                  onChange={(e) => setNewModelIdentifier(e.target.value)}
                  placeholder="e.g. gemini-3.8-flash, qwen/qwen3.8-27b, openai/gpt-oss-120b"
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs text-slate-900"
                  required
                />
                {newModelProvider === "groq" && monitoring?.availableGroqModels && monitoring.availableGroqModels.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="text-[10px] text-slate-500">Suggestions:</span>
                    {monitoring.availableGroqModels.slice(0, 5).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewModelIdentifier(m)}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 hover:bg-indigo-100"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Priority Rank</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newModelPriority}
                    onChange={(e) => setNewModelPriority(Number(e.target.value) || 1)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                    required
                  />
                  <span className="text-[10px] text-slate-400">1 = First</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Daily Quota (RPD)</label>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    value={newModelQuota}
                    onChange={(e) => setNewModelQuota(Number(e.target.value) || 1000)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Per Day</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Max Output Tokens</label>
                  <input
                    type="number"
                    min={150}
                    max={2000}
                    value={newModelMaxTokens}
                    onChange={(e) => setNewModelMaxTokens(Number(e.target.value) || 350)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Default: 350</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Admin Notes (Optional)</label>
                <input
                  type="text"
                  value={newModelNotes}
                  onChange={(e) => setNewModelNotes(e.target.value)}
                  placeholder="e.g. Mid-size model released June 2026 for high-yield questions."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={working}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {working ? "Saving..." : "Add Model to Pool"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

// Subcomponent: Strength Badge
function StrengthBadge({ strength }: { strength?: AIModelStrength }) {
  switch (strength) {
    case "reasoning_stem":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-900">
          🧠 STEM &amp; Reasoning
        </span>
      );
    case "speed_drill":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
          ⚡ Ultra-Fast Drills
        </span>
      );
    case "general":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-900">
          📚 General Studies
        </span>
      );
    case "failover":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
          🛡️ Failover Backup
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          Standard
        </span>
      );
  }
}

function getStrategyLabel(strategy: AIRoutingStrategy): string {
  switch (strategy) {
    case "auto_strength":
      return "Autonomous Strength & Subject Routing";
    case "load_balance":
      return "Dynamic Multi-Model Load Balancing";
    case "priority_failover":
      return "Strict Sequential Priority Failover";
    case "admin_pinned":
      return "Admin Pinned Single Model";
    default:
      return strategy;
  }
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
          Active Primary / Priority #1
        </span>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
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
            <StrengthBadge strength={model.strength} />
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
