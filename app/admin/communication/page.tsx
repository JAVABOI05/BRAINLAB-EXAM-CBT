"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import { authFetch } from "../../lib/authFetch";
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
import "../admin.css";

// Modular Mail Centre Tabs
import { MailOverviewTab } from "./components/MailOverviewTab";
import { MailInboxTab } from "./components/MailInboxTab";
import { MailComposeTab } from "./components/MailComposeTab";
import { MailCampaignsTab } from "./components/MailCampaignsTab";
import { MailContactsTab } from "./components/MailContactsTab";
import { MailTemplatesTab } from "./components/MailTemplatesTab";
import { MailAutomationsTab } from "./components/MailAutomationsTab";
import { MailGatewaysTab } from "./components/MailGatewaysTab";
import { MailAuditTab } from "./components/MailAuditTab";
import { MailPoliciesTab } from "./components/MailPoliciesTab";

type MailCentreTab =
  | "overview"
  | "inbox"
  | "compose"
  | "campaigns"
  | "contacts"
  | "templates"
  | "automations"
  | "gateways"
  | "audit"
  | "policies";

export default function AdminMailCentrePage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<Awaited<ReturnType<typeof getAdminSession>>>(null);
  const [activeTab, setActiveTab] = useState<MailCentreTab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Configuration States for Gateways & Policies
  const [servicesConfig, setServicesConfig] = useState<CommunicationServicesConfig>(
    DEFAULT_COMMUNICATION_SERVICES_CONFIG
  );
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

  useEffect(() => {
    let active = true;

    async function init() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);

      const hasPerm = await adminHasPermission("mail.view");
      const isSuper = admin.role === "super_admin" || admin.role === "platform_admin";
      if (!hasPerm && !isSuper && admin.role !== "community_moderator") {
        setFeedback({ text: "You do not have permission to access BrainLab Mail Centre.", type: "error" });
        setLoading(false);
        return;
      }

      try {
        const [comm, audio, commApiRes] = await Promise.all([
          getCommunicationConfig(),
          getAudioPolicyConfig(),
          authFetch("/api/admin/communications/config").then((r) => r.json()).catch(() => null),
        ]);

        if (active) {
          setCommConfig(comm);
          setAudioConfig(audio);
          if (commApiRes?.success && commApiRes.config) {
            setServicesConfig(commApiRes.config);
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

  // Save Gateway Credentials
  const handleSaveGateways = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await authFetch("/api/admin/communications/config", {
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
        setFeedback({ text: "Failed to update configuration settings.", type: "error" });
      }
    } catch (err: unknown) {
      setFeedback({ text: err instanceof Error ? err.message : "Failed to save policies.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const TABS: Array<{ id: MailCentreTab; label: string; icon: string }> = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "inbox", label: "Unified Inbox", icon: "📬" },
    { id: "compose", label: "Compose & Send", icon: "✍️" },
    { id: "campaigns", label: "Campaigns & Approvals", icon: "📢" },
    { id: "contacts", label: "Contacts & Audience", icon: "👥" },
    { id: "templates", label: "Email Templates", icon: "📄" },
    { id: "automations", label: "Automations", icon: "⚡" },
    { id: "gateways", label: "Gateways & DNS", icon: "🔌" },
    { id: "audit", label: "Audit Trail", icon: "🛡️" },
    { id: "policies", label: "Chat Policies", icon: "⚙️" },
  ];

  return (
    <main id="main" className="mx-auto min-h-[80vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-800">
              Platform Administration
            </span>
            <span className="rounded-full bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 text-[10px] font-black">
              Enterprise Communications
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-black text-slate-950 tracking-tight">
            BrainLab Mail Centre
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Unified student support inboxes, governed broadcast campaigns, Resend delivery telemetry, and contacts directory.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shrink-0"
        >
          ← Admin Dashboard
        </Link>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`mt-4 rounded-2xl p-4 text-xs font-bold flex items-center justify-between shadow-2xs ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-2 opacity-60 hover:opacity-100 font-black text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="mt-6 border-b border-slate-200 flex items-center gap-1 overflow-x-auto pb-1 text-xs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 pb-3 px-3 font-extrabold transition border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "border-blue-700 text-blue-950"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mr-2" />
            Loading BrainLab Mail Centre...
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <MailOverviewTab onNavigateTab={(tab) => setActiveTab(tab as MailCentreTab)} />
            )}

            {activeTab === "inbox" && <MailInboxTab />}

            {activeTab === "compose" && (
              <MailComposeTab
                adminEmail={adminUser?.email}
                onCampaignCreated={() => setActiveTab("campaigns")}
              />
            )}

            {activeTab === "campaigns" && (
              <MailCampaignsTab
                currentAdminId={adminUser?.id}
                isSuperAdmin={adminUser?.role === "super_admin"}
              />
            )}

            {activeTab === "contacts" && <MailContactsTab />}

            {activeTab === "templates" && <MailTemplatesTab />}

            {activeTab === "automations" && <MailAutomationsTab />}

            {activeTab === "gateways" && (
              <MailGatewaysTab
                servicesConfig={servicesConfig}
                setServicesConfig={setServicesConfig}
                onSaveGateways={handleSaveGateways}
                saving={saving}
              />
            )}

            {activeTab === "audit" && <MailAuditTab />}

            {activeTab === "policies" && (
              <MailPoliciesTab
                commConfig={commConfig}
                setCommConfig={setCommConfig}
                audioConfig={audioConfig}
                setAudioConfig={setAudioConfig}
                onSavePolicies={handleSavePolicies}
                saving={saving}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
