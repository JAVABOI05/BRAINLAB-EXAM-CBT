"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import {
  getAIPlatformConfig,
  saveAIPlatformConfig,
  type AIPlatformConfig,
} from "../../lib/platformConfig";
import "../admin.css";

export default function AdminAIPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [config, setConfig] = useState<AIPlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Form State
  const [provider, setProvider] = useState<"gemini" | "groq">("gemini");
  const [geminiModel, setGeminiModel] = useState("gemini-3-flash-preview");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [dailyFreeQuota, setDailyFreeQuota] = useState(10);
  const [monthlyPremiumQuota, setMonthlyPremiumQuota] = useState(500);
  const [maxOutputTokens, setMaxOutputTokens] = useState(350);
  const [systemPromptTone, setSystemPromptTone] = useState("");

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
        setGroqModel(data.groq_model);
        setDailyFreeQuota(data.daily_free_quota);
        setMonthlyPremiumQuota(data.monthly_premium_quota);
        setMaxOutputTokens(data.max_output_tokens);
        setSystemPromptTone(data.system_prompt_tone);
        setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [router]);

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
      setMessage("AI Tutor & Study Coach platform configuration saved and audited!");
    } else {
      setError("Failed to save AI configuration.");
    }
    setWorking(false);
  }

  if (loading || !config) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card">Loading AI configuration…</section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        {/* Navigation Header */}
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Platform Control Engine · Artificial Intelligence</div>
              <h1 className="admin-title">AI Tutor, Quotas &amp; Model Controls</h1>
              <p className="admin-subtitle">
                Configure primary AI providers, models, daily token quotas, and pedagogical prompt rules across BrainLab Academy.
              </p>
              {admin && (
                <div className="admin-user-chip">
                  {admin.email} · {admin.role.replaceAll("_", " ")}
                </div>
              )}
            </div>
            <div className="admin-actions">
              <Link href="/admin/dashboard" className="admin-btn-light">
                ← Dashboard
              </Link>
            </div>
          </div>
        </section>

        {message && <div className="admin-message" role="status">✓ {message}</div>}
        {error && <div className="admin-message" role="alert" style={{ background: "#fee2e2", color: "#991b1b" }}>⚠️ {error}</div>}

        <form onSubmit={handleSaveAIConfig} className="space-y-6">
          {/* Provider Selection */}
          <section className="admin-section admin-card">
            <h2 className="text-lg font-black text-slate-950 mb-1">Primary LLM Provider &amp; Model Routing</h2>
            <p className="text-xs text-slate-500 mb-4">
              Select the default inference gateway for student explanations, hints, and study plans.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                  provider === "gemini" ? "border-indigo-600 bg-indigo-50/70" : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="gemini"
                  checked={provider === "gemini"}
                  onChange={() => setProvider("gemini")}
                  className="mt-1"
                />
                <div>
                  <strong className="block text-slate-950">Google AI Studio Gemini (Recommended)</strong>
                  <span className="text-xs text-slate-600">
                    High reasoning speed, rich math formatting, and reliable streaming SSE support.
                  </span>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                  provider === "groq" ? "border-indigo-600 bg-indigo-50/70" : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="groq"
                  checked={provider === "groq"}
                  onChange={() => setProvider("groq")}
                  className="mt-1"
                />
                <div>
                  <strong className="block text-slate-950">Groq High-Speed LPU</strong>
                  <span className="text-xs text-slate-600">
                    Ultra-low latency open-weights models (Llama 3.3 70B Versatile, Mixtral).
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
                  placeholder="e.g. gemini-3-flash-preview, gemini-2.5-flash"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">Groq Model Identifier</label>
                <input
                  type="text"
                  value={groqModel}
                  onChange={(e) => setGroqModel(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs"
                  placeholder="e.g. llama-3.3-70b-versatile"
                  required
                />
              </div>
            </div>
          </section>

          {/* Quotas & Cost Protection */}
          <section className="admin-section admin-card">
            <h2 className="text-lg font-black text-slate-950 mb-1">Learner Usage Quotas &amp; Cost Limits</h2>
            <p className="text-xs text-slate-500 mb-4">
              Enforce strict server-side budgets to keep AI operating costs predictable and affordable.
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
                  className="w-full rounded-xl border border-slate-300 p-3 font-bold"
                  required
                />
                <span className="text-[11px] text-slate-500">Queries allowed per free candidate per day</span>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">Monthly Premium Quota</label>
                <input
                  type="number"
                  min={50}
                  max={5000}
                  value={monthlyPremiumQuota}
                  onChange={(e) => setMonthlyPremiumQuota(Number(e.target.value) || 50)}
                  className="w-full rounded-xl border border-slate-300 p-3 font-bold"
                  required
                />
                <span className="text-[11px] text-slate-500">Queries included in paid subscription tiers</span>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">Max Output Tokens</label>
                <input
                  type="number"
                  min={150}
                  max={1000}
                  value={maxOutputTokens}
                  onChange={(e) => setMaxOutputTokens(Number(e.target.value) || 350)}
                  className="w-full rounded-xl border border-slate-300 p-3 font-bold"
                  required
                />
                <span className="text-[11px] text-slate-500">Enforces concise responses (standard: 350)</span>
              </div>
            </div>
          </section>

          {/* System Prompt & Tone */}
          <section className="admin-section admin-card">
            <h2 className="text-lg font-black text-slate-950 mb-1">Pedagogical System Prompt &amp; Tone</h2>
            <p className="text-xs text-slate-500 mb-3">
              Defines the pedagogical posture and instructions supplied to the model.
            </p>
            <textarea
              rows={4}
              value={systemPromptTone}
              onChange={(e) => setSystemPromptTone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-900"
              required
            />
            <p className="mt-2 text-[11px] text-slate-500">
              Note: The API route automatically enforces the removal of markdown hashtags (#) and asterisks (*).
            </p>
          </section>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={working}
              className="rounded-xl bg-[#061a3a] px-8 py-3 font-extrabold text-white hover:bg-[#123566] disabled:opacity-50 transition"
            >
              {working ? "Saving AI Controls…" : "Save AI Platform Configuration"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
