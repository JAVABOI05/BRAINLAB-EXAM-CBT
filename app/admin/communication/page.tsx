"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import {
  getCommunicationConfig,
  saveCommunicationConfig,
  getAudioPolicyConfig,
  saveAudioPolicyConfig,
  type CommunicationConfig,
  type AudioPolicyConfig,
  type CommunicationServicesConfig,
  DEFAULT_COMMUNICATION_SERVICES_CONFIG,
} from "../../lib/platformConfig";
import { supabase } from "../../lib/supabase";
import "../admin.css";

interface OfficialTag {
  id: string;
  bg_color: string;
  color: string;
  display_label: string;
  name: string;
}

interface TelemetryData {
  totalCandidates: number;
  activeSubscribers: number;
  unsubscribed: number;
  optOutRatePercent: string;
  providers: {
    resendReady: boolean;
    zohoReady: boolean;
    cloudflareReady: boolean;
    termiiReady: boolean;
  };
}

export default function AdminCommunicationControlPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<Awaited<ReturnType<typeof getAdminSession>>>(null);
  const [activeTab, setActiveTab] = useState<"gateways" | "broadcast" | "policies">("gateways");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // 1. Providers Configuration State
  const [servicesConfig, setServicesConfig] = useState<CommunicationServicesConfig>(
    DEFAULT_COMMUNICATION_SERVICES_CONFIG
  );
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    totalCandidates: 0,
    activeSubscribers: 0,
    unsubscribed: 0,
    optOutRatePercent: "0.0",
    providers: {
      resendReady: false,
      zohoReady: false,
      cloudflareReady: false,
      termiiReady: false,
    },
  });

  // Test Dispatcher State
  const [testType, setTestType] = useState<"email" | "sms" | "cloudflare">("email");
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // 2. Broadcast Composer State
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState<"active_subscribers" | "all" | "paid_tiers">("active_subscribers");
  const [broadcastActionUrl, setBroadcastActionUrl] = useState("");
  const [broadcastActionLabel, setBroadcastActionLabel] = useState("View on BrainLab");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSummary, setBroadcastSummary] = useState<{
    totalEvaluated: number;
    sent: number;
    skipped: number;
    failed: number;
  } | null>(null);

  // 3. Existing Communication & Audio Policies State
  const [commConfig, setCommConfig] = useState<CommunicationConfig>({
    private_messaging_enabled: true,
    group_messaging_enabled: true,
    student_can_message_tutor: true,
    read_receipts_enabled: true,
    reactions_enabled: true,
    official_tags_enabled: true,
    announcement_views_enabled: true,
    presence_visibility_default: true,
    message_rate_limit_per_minute: 20,
  });

  const [audioConfig, setAudioConfig] = useState<AudioPolicyConfig>({
    max_duration_seconds: 300,
    max_file_size_mb: 25,
    allowed_formats: ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"],
    student_audio_enabled_globally: true,
    transcription_enabled: true,
    audio_retention_days: 90,
    allow_downloads: true,
  });

  const [officialTags, setOfficialTags] = useState<OfficialTag[]>([]);

  useEffect(() => {
    let active = true;

    async function init() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);
      setTestEmail(admin.email || "");

      const hasPerm = await adminHasPermission("security.settings.manage");
      if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
        setFeedback({ text: "You do not have permission to modify communication settings.", type: "error" });
        setLoading(false);
        return;
      }

      try {
        const [comm, audio, { data: tags }, commApiRes] = await Promise.all([
          getCommunicationConfig(),
          getAudioPolicyConfig(),
          supabase.from("official_tags").select("*").order("sort_order"),
          fetch("/api/admin/communications/config").then((r) => r.json()).catch(() => null),
        ]);

        if (active) {
          setCommConfig(comm);
          setAudioConfig(audio);
          setOfficialTags((tags ?? []) as OfficialTag[]);
          if (commApiRes?.success) {
            setServicesConfig(commApiRes.config);
            if (commApiRes.telemetry) {
              setTelemetry(commApiRes.telemetry);
            }
          }
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  // Save Gateway Configurations
  const handleSaveGateways = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/communications/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(servicesConfig),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: "✓ Communication provider credentials saved successfully.", type: "success" });
      } else {
        setFeedback({ text: data.error || "Failed to save provider settings.", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Run Test Dispatch
  const handleRunTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/communications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: testType,
          targetEmail: testEmail,
          targetPhone: testPhone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult(data.message || "Test passed successfully.");
      } else {
        setTestResult(`❌ Error: ${data.error || "Test failed"}`);
      }
    } catch (err) {
      setTestResult(`❌ Network Error: ${err instanceof Error ? err.message : "Failed to run test"}`);
    } finally {
      setTesting(false);
    }
  };

  // Run Broadcast Email Blast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastMessage) {
      setFeedback({ text: "Please enter a subject and message body.", type: "error" });
      return;
    }

    const confirmed = window.confirm(
      `Send this official broadcast to target audience (${broadcastAudience.toUpperCase()})?\n\nSubscribers who have opted out will be automatically skipped to respect their choices.`
    );
    if (!confirmed) return;

    setBroadcasting(true);
    setFeedback(null);
    setBroadcastSummary(null);

    try {
      const res = await fetch("/api/admin/communications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: broadcastSubject,
          title: broadcastTitle || broadcastSubject,
          message: broadcastMessage,
          audience: broadcastAudience,
          actionUrl: broadcastActionUrl,
          actionLabel: broadcastActionLabel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastSummary(data.summary);
        setFeedback({ text: data.message || "Broadcast dispatched successfully.", type: "success" });
      } else {
        setFeedback({ text: data.error || "Broadcast failed.", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setBroadcasting(false);
    }
  };

  // Save Messaging & Audio Policies
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    setSaving(true);
    setFeedback(null);

    try {
      const okComm = await saveCommunicationConfig(
        commConfig,
        { id: adminUser.id, email: adminUser.email },
        "Administrator modified communication policies"
      );

      const okAudio = await saveAudioPolicyConfig(
        audioConfig,
        { id: adminUser.id, email: adminUser.email },
        "Administrator modified audio & voice note policies"
      );

      if (okComm && okAudio) {
        setFeedback({ text: "✓ Communication and Audio policies saved successfully.", type: "success" });
      } else {
        setFeedback({ text: "Failed to update some configuration settings.", type: "error" });
      }
    } catch (err: unknown) {
      setFeedback({ text: err instanceof Error ? err.message : "Failed to save.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
              Platform Administration
            </span>
            <span className="rounded-full bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 text-[10px] font-black">
              Enterprise Communications
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-black text-slate-950">
            Communications &amp; Email Hub
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Configure Resend, Zoho Mail, Cloudflare, and Termii SMS APIs, broadcast announcements, and monitor subscriber health.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shrink-0"
        >
          ← Admin Dashboard
        </Link>
      </div>

      {/* Live Subscriber Telemetry Bar */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Candidates</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{telemetry.totalCandidates}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Registered platform accounts</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Active Subscribers</p>
          <p className="mt-1 text-2xl font-black text-emerald-950">{telemetry.activeSubscribers}</p>
          <p className="mt-0.5 text-[10px] text-emerald-700">Eligible for newsletters &amp; alerts</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Unsubscribed</p>
          <p className="mt-1 text-2xl font-black text-rose-950">{telemetry.unsubscribed}</p>
          <p className="mt-0.5 text-[10px] text-rose-700">{telemetry.optOutRatePercent}% opt-out rate</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Active Email Gateway</p>
          <p className="mt-1 text-lg font-black uppercase text-blue-950 truncate">{servicesConfig.active_email_provider}</p>
          <p className="mt-0.5 text-[10px] text-blue-700">
            {servicesConfig.resend.api_key ? "Connected to Resend" : "Simulation Mode Active"}
          </p>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`mt-4 rounded-2xl p-4 text-xs font-bold flex items-center justify-between ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="ml-2 opacity-60 hover:opacity-100 font-black">
            ×
          </button>
        </div>
      )}

      {/* Hub Tabs */}
      <div className="mt-6 border-b border-slate-200 flex gap-4">
        {[
          { id: "gateways", label: "🔌 Provider Gateways & APIs", desc: "Resend, Zoho, Cloudflare, Termii" },
          { id: "broadcast", label: "📢 Email Broadcast Composer", desc: "Send announcements to subscribers" },
          { id: "policies", label: "🛡️ Messaging & Audio Policies", desc: "Chat rate limits & voice notes" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`pb-3 text-xs font-black transition border-b-2 ${
              activeTab === tab.id
                ? "border-blue-700 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="p-8 text-center text-xs text-slate-500">Loading communication settings…</p>
      ) : (
        <>
          {/* TAB 1: PROVIDER GATEWAYS & APIS */}
          {activeTab === "gateways" && (
            <div className="mt-6 space-y-6">
              <form onSubmit={handleSaveGateways} className="space-y-6">
                {/* Active Gateway Selector */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-base font-extrabold text-slate-950">Active Email Delivery Provider</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select which service transmits student welcome emails, score slips, and revision alerts.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      { id: "resend", name: "Resend API", desc: "Fast transactional email REST API (Recommended)" },
                      { id: "zoho", name: "Zoho Mail SMTP", desc: "Institutional custom domain mailbox via SMTP" },
                      { id: "smtp", name: "Custom SMTP", desc: "Generic server SMTP credentials" },
                    ].map((prov) => (
                      <label
                        key={prov.id}
                        className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                          servicesConfig.active_email_provider === prov.id
                            ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="active_email_provider"
                          value={prov.id}
                          checked={servicesConfig.active_email_provider === prov.id}
                          onChange={(e) =>
                            setServicesConfig({
                              ...servicesConfig,
                              active_email_provider: e.target.value as "resend" | "zoho" | "smtp",
                            })
                          }
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-xs font-black text-slate-900">{prov.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{prov.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Resend Configuration */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-sm">
                        R
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Resend API Configuration</h3>
                        <p className="text-[11px] text-slate-500">Powered by resend.com with instant DNS domain signing</p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        servicesConfig.resend.api_key
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {servicesConfig.resend.api_key ? "Configured" : "Simulated"}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Resend API Key (re_...)
                      </label>
                      <input
                        type="password"
                        value={servicesConfig.resend.api_key}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            resend: { ...servicesConfig.resend, api_key: e.target.value },
                          })
                        }
                        placeholder="re_123456789_abcdef"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Default From Email
                      </label>
                      <input
                        type="text"
                        value={servicesConfig.resend.from_email}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            resend: { ...servicesConfig.resend, from_email: e.target.value },
                          })
                        }
                        placeholder="BrainLab Academy <support@brainlab.edu.ng>"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Results Directorate From Email
                      </label>
                      <input
                        type="text"
                        value={servicesConfig.resend.system_from_email}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            resend: { ...servicesConfig.resend, system_from_email: e.target.value },
                          })
                        }
                        placeholder="BrainLab Academy <results@brainlabacademy.com.ng>"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Zoho Mail SMTP Configuration */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white font-black text-sm">
                        Z
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Zoho Mail / SMTP Gateway</h3>
                        <p className="text-[11px] text-slate-500">For Nigerian school domain mailboxes hosted on Zoho</p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        servicesConfig.zoho.smtp_user ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {servicesConfig.zoho.smtp_user ? "Ready" : "Inactive"}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={servicesConfig.zoho.smtp_host}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            zoho: { ...servicesConfig.zoho, smtp_host: e.target.value },
                          })
                        }
                        placeholder="smtppro.zoho.com"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Port</label>
                      <input
                        type="number"
                        value={servicesConfig.zoho.smtp_port}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            zoho: { ...servicesConfig.zoho, smtp_port: Number(e.target.value) || 465 },
                          })
                        }
                        placeholder="465"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Username / Email</label>
                      <input
                        type="text"
                        value={servicesConfig.zoho.smtp_user}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            zoho: { ...servicesConfig.zoho, smtp_user: e.target.value },
                          })
                        }
                        placeholder="support@brainlab.edu.ng"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">SMTP App Password</label>
                      <input
                        type="password"
                        value={servicesConfig.zoho.smtp_pass}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            zoho: { ...servicesConfig.zoho, smtp_pass: e.target.value },
                          })
                        }
                        placeholder="Zoho generated app-specific password"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={servicesConfig.zoho.use_tls}
                          onChange={(e) =>
                            setServicesConfig({
                              ...servicesConfig,
                              zoho: { ...servicesConfig.zoho, use_tls: e.target.checked },
                            })
                          }
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>Enforce SSL/TLS Secure Handshake</span>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Cloudflare Configuration */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white font-black text-sm">
                        CF
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Cloudflare Turnstile &amp; Email Routing</h3>
                        <p className="text-[11px] text-slate-500">DDoS defense, bot challenge, and domain routing</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">API Token</label>
                      <input
                        type="password"
                        value={servicesConfig.cloudflare.api_token}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            cloudflare: { ...servicesConfig.cloudflare, api_token: e.target.value },
                          })
                        }
                        placeholder="Cloudflare scoped API token"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Account ID</label>
                      <input
                        type="text"
                        value={servicesConfig.cloudflare.account_id}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            cloudflare: { ...servicesConfig.cloudflare, account_id: e.target.value },
                          })
                        }
                        placeholder="e.g. 1a2b3c4d5e6f"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Turnstile Site Key (Public)</label>
                      <input
                        type="text"
                        value={servicesConfig.cloudflare.turnstile_site_key}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            cloudflare: { ...servicesConfig.cloudflare, turnstile_site_key: e.target.value },
                          })
                        }
                        placeholder="0x4AAAAAA..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Turnstile Secret Key</label>
                      <input
                        type="password"
                        value={servicesConfig.cloudflare.turnstile_secret_key}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            cloudflare: { ...servicesConfig.cloudflare, turnstile_secret_key: e.target.value },
                          })
                        }
                        placeholder="0x4AAAAAA..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </section>

                {/* Termii SMS Configuration */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm">
                        T
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Termii SMS Telecom Gateway (Nigeria)</h3>
                        <p className="text-[11px] text-slate-500">Official SMS score alerts &amp; access code dispatches to MTN, Airtel, Glo, 9mobile</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Termii API Key</label>
                      <input
                        type="password"
                        value={servicesConfig.termii.api_key}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            termii: { ...servicesConfig.termii, api_key: e.target.value },
                          })
                        }
                        placeholder="TL..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sender ID (Sender Mask)</label>
                      <input
                        type="text"
                        value={servicesConfig.termii.sender_id}
                        onChange={(e) =>
                          setServicesConfig({
                            ...servicesConfig,
                            termii: { ...servicesConfig.termii, sender_id: e.target.value },
                          })
                        }
                        placeholder="BrainLab"
                        maxLength={11}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-700 hover:bg-blue-800 px-6 py-3 text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50"
                  >
                    {saving ? "Saving Changes…" : "Save All Gateway Credentials"}
                  </button>
                </div>
              </form>

              {/* Real-time Connection Tester */}
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-xs">
                <h3 className="text-sm font-black text-slate-900">⚡ Real-Time Connection Tester</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send a live test message to verify that your keys, sender identities, and network ports are operating cleanly.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value as typeof testType)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="email">Test Email (Resend/Zoho)</option>
                    <option value="sms">Test SMS (Termii)</option>
                    <option value="cloudflare">Verify Cloudflare Token</option>
                  </select>

                  {testType === "email" && (
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Destination email"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 w-64"
                    />
                  )}

                  {testType === "sms" && (
                    <input
                      type="tel"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="Destination phone (e.g. 08012345678)"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 w-64"
                    />
                  )}

                  <button
                    type="button"
                    disabled={testing}
                    onClick={handleRunTest}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-black text-white shadow-xs transition disabled:opacity-50"
                  >
                    {testing ? "Testing…" : "Send Test"}
                  </button>
                </div>

                {testResult && (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800">
                    {testResult}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: BROADCAST & EMAIL COMPOSER */}
          {activeTab === "broadcast" && (
            <div className="mt-6 space-y-6">
              <form onSubmit={handleSendBroadcast} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                <div>
                  <h2 className="text-base font-extrabold text-slate-950">Compose Email Broadcast</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Send an official academic announcement, mock test invitation, or syllabus update to your candidates. Unsubscribed candidates are automatically protected.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                    <select
                      value={broadcastAudience}
                      onChange={(e) => setBroadcastAudience(e.target.value as typeof broadcastAudience)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value="active_subscribers">
                        Active Subscribers Only ({telemetry.activeSubscribers} candidates) — Recommended
                      </option>
                      <option value="all">
                        All Registered Candidates ({telemetry.totalCandidates})
                      </option>
                      <option value="paid_tiers">
                        Premium &amp; Plus Subscribers Only
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject Line</label>
                    <input
                      type="text"
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      placeholder="e.g. BrainLab 2026 National Mock UTME Registration Open"
                      required
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Header / Headline (Optional)
                    </label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. Official Examination Directorate Announcement"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Message Body</label>
                      <span className="text-[10px] text-blue-700 font-semibold">
                        Tip: Use {"{{name}}"} to personalize each email with candidate name
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Write your announcement here..."
                      required
                      className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 leading-relaxed focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Call to Action Link (Optional)</label>
                    <input
                      type="url"
                      value={broadcastActionUrl}
                      onChange={(e) => setBroadcastActionUrl(e.target.value)}
                      placeholder="https://brainlabacademy.com.ng/cbt"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Button Label</label>
                    <input
                      type="text"
                      value={broadcastActionLabel}
                      onChange={(e) => setBroadcastActionLabel(e.target.value)}
                      placeholder="Launch Practice Portal"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    All outbound emails automatically include your institutional signature and 1-click unsubscribe links.
                  </p>
                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="rounded-xl bg-purple-700 hover:bg-purple-800 px-6 py-3 text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span>🚀</span>
                    <span>{broadcasting ? "Dispatched Batch…" : "Dispatch Broadcast"}</span>
                  </button>
                </div>
              </form>

              {broadcastSummary && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs">
                  <p className="font-black text-emerald-900 mb-1">Broadcast Delivery Report:</p>
                  <ul className="space-y-0.5 text-emerald-800">
                    <li>• Candidates Evaluated: {broadcastSummary.totalEvaluated}</li>
                    <li>• Successfully Delivered: {broadcastSummary.sent}</li>
                    <li>• Skipped (Unsubscribed / Opted-Out): {broadcastSummary.skipped}</li>
                    <li>• Failed: {broadcastSummary.failed}</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MESSAGING & AUDIO POLICIES (EXISTING) */}
          {activeTab === "policies" && (
            <form onSubmit={handleSavePolicies} className="mt-6 space-y-6">
              {/* Messaging Controls */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-base font-extrabold text-slate-950">1. Messaging &amp; Collaboration</h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={commConfig.private_messaging_enabled}
                      onChange={(e) =>
                        setCommConfig({ ...commConfig, private_messaging_enabled: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Enable private 1-on-1 messaging platform-wide
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={commConfig.student_can_message_tutor}
                      onChange={(e) =>
                        setCommConfig({ ...commConfig, student_can_message_tutor: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Allow students to initiate messages with tutors
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={commConfig.group_messaging_enabled}
                      onChange={(e) =>
                        setCommConfig({ ...commConfig, group_messaging_enabled: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Enable course and class group discussions
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={commConfig.read_receipts_enabled}
                      onChange={(e) =>
                        setCommConfig({ ...commConfig, read_receipts_enabled: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Enable delivery and read receipts (blue ticks)
                    </span>
                  </label>
                </div>
              </section>

              {/* Voice Notes & Audio Submissions Policy */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-base font-extrabold text-slate-950">2. Audio &amp; Voice Note Policies</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Configure recording limits and student audio response permissions. Server validation enforces these settings unconditionally.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Maximum Audio Duration (Seconds)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={900}
                      value={audioConfig.max_duration_seconds}
                      onChange={(e) =>
                        setAudioConfig({
                          ...audioConfig,
                          max_duration_seconds: Number.parseInt(e.target.value, 10) || 300,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Max File Size (MB)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={audioConfig.max_file_size_mb}
                      onChange={(e) =>
                        setAudioConfig({
                          ...audioConfig,
                          max_file_size_mb: Number.parseInt(e.target.value, 10) || 25,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              </section>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 hover:bg-blue-800 px-6 py-3 text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Communication Policies"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </main>
  );
}
