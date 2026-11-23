"use client";

import React, { useState } from "react";
import type { CommunicationServicesConfig } from "@/app/lib/platformConfig";
import { authFetch } from "@/app/lib/authFetch";

interface MailGatewaysTabProps {
  servicesConfig: CommunicationServicesConfig;
  setServicesConfig: React.Dispatch<React.SetStateAction<CommunicationServicesConfig>>;
  onSaveGateways: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
  adminEmail?: string;
}

export function MailGatewaysTab({
  servicesConfig,
  setServicesConfig,
  onSaveGateways,
  saving,
  adminEmail,
}: MailGatewaysTabProps) {
  // Connection tester state
  const [testType, setTestType] = useState<"email" | "sms" | "cloudflare">("email");
  const [testEmail, setTestEmail] = useState(adminEmail || "");
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleRunTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await authFetch("/api/admin/communications/test", {
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
        setTestResult(data.message || "✓ Test passed successfully.");
      } else {
        setTestResult(`❌ Error: ${data.error || "Test failed"}`);
      }
    } catch (err) {
      setTestResult(`❌ Network Error: ${err instanceof Error ? err.message : "Failed to run test"}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-base font-extrabold text-slate-950">Provider Gateways, DNS &amp; Inbound Telemetry</h2>
        <p className="text-xs text-slate-500">
          Configure production credentials for Resend, Cloudflare Inbound routing, Zoho Mail SMTP, and Termii SMS.
        </p>
      </div>

      <form onSubmit={onSaveGateways} className="space-y-6">
        {/* Active Gateway Selector */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-950">Active Email Delivery Provider</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select which service transmits student welcome emails, score slips, and revision alerts.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { id: "resend", name: "Resend API", desc: "Fast transactional email REST API (Recommended)" },
              { id: "zoho", name: "Zoho Mail SMTP", desc: "Institutional custom domain mailbox via SMTP" },
              { id: "smtp", name: "Custom SMTP", desc: "Generic server SMTP credentials" },
            ].map((prov) => (
              <label
                key={prov.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
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
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-sm">
                R
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Resend API Configuration</h3>
                <p className="text-[11px] text-slate-500">
                  Sending Domain: <strong>mail.brainlabacademy.com.ng</strong> &bull; Sender:{" "}
                  <strong>noreply@mail.brainlabacademy.com.ng</strong>
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                servicesConfig.resend.api_key
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {servicesConfig.resend.api_key ? "Connected" : "Simulated Mode"}
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
                Default Outbound Sender (From)
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
                placeholder="BrainLab Academy <noreply@mail.brainlabacademy.com.ng>"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inbound / Support Reply-To
              </label>
              <input
                type="text"
                value={servicesConfig.resend.reply_to || "support@brainlabacademy.com.ng"}
                onChange={(e) =>
                  setServicesConfig({
                    ...servicesConfig,
                    resend: { ...servicesConfig.resend, reply_to: e.target.value },
                  })
                }
                placeholder="support@brainlabacademy.com.ng"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Zoho Mail SMTP Configuration */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
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
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
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
                placeholder="support@brainlabacademy.com.ng"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Password</label>
              <input
                type="password"
                value={servicesConfig.zoho.smtp_pass}
                onChange={(e) =>
                  setServicesConfig({
                    ...servicesConfig,
                    zoho: { ...servicesConfig.zoho, smtp_pass: e.target.value },
                  })
                }
                placeholder="App password"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>
        </section>

        {/* Cloudflare Inbound & Turnstile */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white font-black text-sm">
                CF
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Cloudflare Email Routing &amp; Turnstile</h3>
                <p className="text-[11px] text-slate-500">Root MX inbound email routing preserved via Cloudflare Email Workers</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cloudflare Scoped Token</label>
              <input
                type="password"
                value={servicesConfig.cloudflare.api_token}
                onChange={(e) =>
                  setServicesConfig({
                    ...servicesConfig,
                    cloudflare: { ...servicesConfig.cloudflare, api_token: e.target.value },
                  })
                }
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>
          </div>
        </section>

        {/* Save Changes Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-700 hover:bg-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
          >
            {saving ? "Saving Changes…" : "Save All Gateway Credentials"}
          </button>
        </div>
      </form>

      {/* Real-time Connection Tester */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-xs">
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
              placeholder={adminEmail ? `Destination email (e.g. ${adminEmail})` : "Destination email"}
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
            className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
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
  );
}
