"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminSignOut, getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, type AdminPermission } from "../../lib/adminRoles";
import AdminWorkspaceShell from "../AdminWorkspaceShell";
import type { PaymentGatewaysConfig } from "../../lib/platformConfig";
import "../admin.css";

type Access = Partial<Record<AdminPermission, boolean>>;

export default function AdminPaymentGatewaysPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Access>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [webhookUrl, setWebhookUrl] = useState("");

  const [config, setConfig] = useState<PaymentGatewaysConfig>({
    active_provider: "paystack",
    allow_candidate_choice: true,
    providers: {
      paystack: {
        enabled: true,
        test_mode: false,
        public_key: "",
        secret_key: "",
        webhook_secret: "",
      },
      flutterwave: {
        enabled: false,
        test_mode: false,
        public_key: "",
        secret_key: "",
        webhook_secret: "",
      },
      bachs: {
        enabled: true,
        test_mode: false,
        api_key: "",
        webhook_secret: "",
      },
      bank_transfer: {
        enabled: true,
        bank_name: "Guaranty Trust Bank (GTBank)",
        account_number: "0123456789",
        account_name: "BrainLab Educational Technologies Ltd",
        instructions: "Transfer the plan amount to the account above and retain your transaction receipt.",
      },
    },
  });

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);

      const hasPerm =
        admin.role === "super_admin" ||
        admin.role === "platform_admin" ||
        (await adminHasPermission("finance.billing.manage"));

      if (!hasPerm) {
        setMessage("You do not have permission to configure payment gateways.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      setPermissions({
        "finance.billing.manage": true,
        "cbt.config.read": true,
      });

      if (typeof window !== "undefined") {
        setWebhookUrl(`${window.location.origin}/api/payments/webhook`);
      }

      // Load config from server
      try {
        const res = await fetch("/api/admin/payments/gateways");
        const data = await res.json();
        if (data.ok && data.config) {
          setConfig(data.config);
        }
      } catch {
        setMessage("Could not load gateway configuration from server.");
        setMessageType("error");
      }

      setLoading(false);
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage("");

      const res = await fetch("/api/admin/payments/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.message || data.error || "Failed to save payment gateway settings.");
        setMessageType("error");
        return;
      }

      setMessage(data.message || "Payment gateway settings saved successfully.");
      setMessageType("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error saving payment settings.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestGateway = async (provider: "paystack" | "flutterwave" | "bachs") => {
    try {
      setTestingProvider(provider);
      setMessage(`Testing ${provider.toUpperCase()} credentials...`);
      setMessageType("success");

      const body: Record<string, string> = { provider };
      if (provider === "paystack") {
        body.secretKey = config.providers.paystack.secret_key || "";
      } else if (provider === "flutterwave") {
        body.secretKey = config.providers.flutterwave.secret_key || "";
      } else if (provider === "bachs") {
        body.apiKey = config.providers.bachs.api_key || "";
      }

      const res = await fetch("/api/admin/payments/test-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setMessage(data.message || (data.ok ? "Connection OK" : "Connection Failed"));
      setMessageType(data.ok ? "success" : "error");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Network error testing gateway.");
      setMessageType("error");
    } finally {
      setTestingProvider(null);
    }
  };

  const onLogout = () => {
    void adminSignOut();
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#000814] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="font-bold">Loading Payment Gateway Configuration...</span>
        </div>
      </main>
    );
  }

  if (!adminUser) return null;

  return (
    <AdminWorkspaceShell user={adminUser} permissions={permissions} onLogout={onLogout}>
      <div className="admin-page-container">
        {/* Header */}
        <section className="admin-section admin-hero">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-cyan-300"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
                <h1 className="admin-title">Payment Gateways &amp; Merchant Settings</h1>
              </div>
              <p className="admin-subtitle mt-1">
                Configure live and test merchant API keys dynamically. Seamlessly switch between Paystack, Flutterwave, Bachs, and Bank Transfer with zero downtime.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="admin-badge admin-badge-primary">
                Active: <strong className="uppercase">{config.active_provider}</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Global Alert Notification */}
        {message && (
          <div
            role="alert"
            className={`admin-alert ${
              messageType === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900"
            }`}
          >
            <span>{messageType === "error" ? "⚠️" : "✓"}</span>
            <span>{message}</span>
          </div>
        )}

        {/* Global Webhook Callback Helper Strip */}
        <section className="admin-section admin-card bg-slate-900 text-white border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                Central Webhook Callback URL
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste this exact webhook URL into your Paystack, Flutterwave, or Bachs merchant dashboard.
              </p>
              <div className="mt-2 font-mono text-xs bg-slate-950 text-emerald-400 px-3 py-1.5 rounded-lg border border-slate-800 select-all inline-block">
                {webhookUrl || "/api/payments/webhook"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (webhookUrl) {
                  navigator.clipboard.writeText(webhookUrl);
                  setMessage("Webhook URL copied to clipboard!");
                  setMessageType("success");
                }
              }}
              className="admin-btn-light text-xs self-start sm:self-center"
            >
              Copy Webhook URL
            </button>
          </div>
        </section>

        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 1: DEFAULT ACTIVE PROVIDER */}
          <section className="admin-section admin-card">
            <h2 className="admin-card-title">Default Active Payment Gateway</h2>
            <p className="admin-card-text">
              Select which gateway handles primary candidate checkouts. If one provider experiences downtime, change it here to redirect all traffic immediately.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
              {[
                {
                  id: "paystack",
                  name: "Paystack",
                  icon: "",
                  desc: "Nigerian standard. Cards, Bank Transfer, USSD, Apple Pay.",
                  color: "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20",
                },
                {
                  id: "flutterwave",
                  name: "Flutterwave",
                  icon: "",
                  desc: "Pan-African & International cards, Barter, Mobile Money.",
                  color: "border-purple-500 bg-purple-50/30 dark:bg-purple-950/20",
                },
                {
                  id: "bachs",
                  name: "Bachs",
                  icon: "",
                  desc: "Direct collections & automated settlement checkout.",
                  color: "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20",
                },
                {
                  id: "bank_transfer",
                  name: "Manual Bank Transfer",
                  icon: "",
                  desc: "Direct Nigerian bank deposits with proof of payment.",
                  color: "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20",
                },
              ].map((provider) => (
                <label
                  key={provider.id}
                  className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                    config.active_provider === provider.id
                      ? `${provider.color} ring-2 ring-blue-600/50`
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{provider.icon}</span>
                      <input
                        type="radio"
                        name="active_provider"
                        value={provider.id}
                        checked={config.active_provider === provider.id}
                        onChange={() =>
                          setConfig((prev) => ({
                            ...prev,
                            active_provider: provider.id as PaymentGatewaysConfig["active_provider"],
                          }))
                        }
                        className="h-4 w-4 text-blue-600"
                      />
                    </div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white mt-2">{provider.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{provider.desc}</p>
                  </div>
                  {config.active_provider === provider.id && (
                    <span className="mt-3 text-[10px] font-extrabold uppercase text-blue-600 dark:text-cyan-400 tracking-wider">
                      Active Gateway
                    </span>
                  )}
                </label>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Allow Candidates to Choose Gateway at Checkout
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  When enabled, candidates on the pricing page can toggle between Paystack, Flutterwave, or Bachs.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({ ...prev, allow_candidate_choice: !prev.allow_candidate_choice }))
                }
                className={config.allow_candidate_choice ? "admin-btn-primary" : "admin-btn-light"}
              >
                {config.allow_candidate_choice ? "Multi-Gateway Choice ON" : "Fixed Single Gateway"}
              </button>
            </div>
          </section>

          {/* SECTION 2: PAYSTACK CONFIGURATION */}
          <section className="admin-section admin-card border-l-4 border-l-emerald-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Paystack Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure Secret &amp; Public keys for Paystack API transactions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestGateway("paystack")}
                  disabled={testingProvider === "paystack"}
                  className="admin-btn-light text-xs font-bold"
                >
                  {testingProvider === "paystack" ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        paystack: {
                          ...prev.providers.paystack,
                          test_mode: !prev.providers.paystack.test_mode,
                        },
                      },
                    }))
                  }
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                    config.providers.paystack.test_mode
                      ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60"
                  }`}
                >
                  {config.providers.paystack.test_mode ? "Test Mode (Sandbox)" : "Live Production"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="admin-label">Paystack Secret Key (sk_...)</label>
                <input
                  type="password"
                  value={config.providers.paystack.secret_key || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        paystack: { ...prev.providers.paystack, secret_key: e.target.value },
                      },
                    }))
                  }
                  placeholder="sk_live_... or sk_test_..."
                  className="admin-input font-mono text-xs"
                />
              </div>

              <div>
                <label className="admin-label">Paystack Public Key (pk_...)</label>
                <input
                  type="text"
                  value={config.providers.paystack.public_key || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        paystack: { ...prev.providers.paystack, public_key: e.target.value },
                      },
                    }))
                  }
                  placeholder="pk_live_... or pk_test_..."
                  className="admin-input font-mono text-xs"
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: FLUTTERWAVE CONFIGURATION */}
          <section className="admin-section admin-card border-l-4 border-l-purple-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Flutterwave Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure Flutterwave v3 credentials for global and African payments.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestGateway("flutterwave")}
                  disabled={testingProvider === "flutterwave"}
                  className="admin-btn-light text-xs font-bold"
                >
                  {testingProvider === "flutterwave" ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        flutterwave: {
                          ...prev.providers.flutterwave,
                          test_mode: !prev.providers.flutterwave.test_mode,
                        },
                      },
                    }))
                  }
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                    config.providers.flutterwave.test_mode
                      ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60"
                  }`}
                >
                  {config.providers.flutterwave.test_mode ? "Test Mode (Sandbox)" : "Live Production"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="admin-label">Flutterwave Secret Key (FLWSECK-...)</label>
                <input
                  type="password"
                  value={config.providers.flutterwave.secret_key || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        flutterwave: { ...prev.providers.flutterwave, secret_key: e.target.value },
                      },
                    }))
                  }
                  placeholder="FLWSECK_TEST-... or FLWSECK-..."
                  className="admin-input font-mono text-xs"
                />
              </div>

              <div>
                <label className="admin-label">Flutterwave Public Key (FLWPUBK-...)</label>
                <input
                  type="text"
                  value={config.providers.flutterwave.public_key || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        flutterwave: { ...prev.providers.flutterwave, public_key: e.target.value },
                      },
                    }))
                  }
                  placeholder="FLWPUBK_TEST-... or FLWPUBK-..."
                  className="admin-input font-mono text-xs"
                />
              </div>
            </div>
          </section>

          {/* SECTION 4: BACHS CONFIGURATION */}
          <section className="admin-section admin-card border-l-4 border-l-blue-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Bachs Checkout Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure Bachs API Key and Webhook Signing Secret.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestGateway("bachs")}
                  disabled={testingProvider === "bachs"}
                  className="admin-btn-light text-xs font-bold"
                >
                  {testingProvider === "bachs" ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        bachs: {
                          ...prev.providers.bachs,
                          test_mode: !prev.providers.bachs.test_mode,
                        },
                      },
                    }))
                  }
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                    config.providers.bachs.test_mode
                      ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60"
                  }`}
                >
                  {config.providers.bachs.test_mode ? "Test Mode (Sandbox)" : "Live Production"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="admin-label">Bachs API Key (sk_...)</label>
                <input
                  type="password"
                  value={config.providers.bachs.api_key || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        bachs: { ...prev.providers.bachs, api_key: e.target.value },
                      },
                    }))
                  }
                  placeholder="sk_live_... or sk_test_..."
                  className="admin-input font-mono text-xs"
                />
              </div>

              <div>
                <label className="admin-label">Bachs Webhook Secret</label>
                <input
                  type="password"
                  value={config.providers.bachs.webhook_secret || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        bachs: { ...prev.providers.bachs, webhook_secret: e.target.value },
                      },
                    }))
                  }
                  placeholder="whsec_..."
                  className="admin-input font-mono text-xs"
                />
              </div>
            </div>
          </section>

          {/* SECTION 5: BANK TRANSFER */}
          <section className="admin-section admin-card border-l-4 border-l-amber-500">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Manual Bank Transfer Details
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide institutional bank account details for students or schools wishing to pay via direct Nigerian bank deposit.
            </p>

            <div className="grid gap-4 sm:grid-cols-3 mt-4">
              <div>
                <label className="admin-label">Bank Name</label>
                <input
                  type="text"
                  value={config.providers.bank_transfer.bank_name}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        bank_transfer: { ...prev.providers.bank_transfer, bank_name: e.target.value },
                      },
                    }))
                  }
                  className="admin-input text-xs"
                />
              </div>

              <div>
                <label className="admin-label">Account Number</label>
                <input
                  type="text"
                  value={config.providers.bank_transfer.account_number}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        bank_transfer: { ...prev.providers.bank_transfer, account_number: e.target.value },
                      },
                    }))
                  }
                  className="admin-input font-mono text-xs"
                />
              </div>

              <div>
                <label className="admin-label">Account Name</label>
                <input
                  type="text"
                  value={config.providers.bank_transfer.account_name}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        bank_transfer: { ...prev.providers.bank_transfer, account_name: e.target.value },
                      },
                    }))
                  }
                  className="admin-input text-xs"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="admin-label">Transfer Instructions for Candidates</label>
              <textarea
                rows={2}
                value={config.providers.bank_transfer.instructions || ""}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    providers: {
                      ...prev.providers,
                      bank_transfer: { ...prev.providers.bank_transfer, instructions: e.target.value },
                    },
                  }))
                }
                className="admin-input text-xs"
              />
            </div>
          </section>

          {/* Action Bar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => router.push("/admin/pricing")}
              className="admin-btn-light"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="admin-btn-primary px-8"
            >
              {saving ? "Saving Changes..." : "Save Payment Gateway Settings"}
            </button>
          </div>
        </form>
      </div>
    </AdminWorkspaceShell>
  );
}
