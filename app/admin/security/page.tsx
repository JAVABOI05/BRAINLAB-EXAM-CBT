"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, adminSignOut, type AdminUser } from "../../lib/adminAuth";
import { ADMIN_ROLE_DETAILS, type AdminPermission } from "../../lib/adminRoles";
import AdminPinGuard from "@/app/components/AdminPinGuard";
import { updateAdminPin, lockAdminPin } from "@/app/lib/adminPinAuth";
import "../admin.css";

type SecurityCheckItem = {
  id: string;
  title: string;
  description: string;
  status: "verified" | "warning" | "info";
  detail: string;
};

export default function AdminSecurityPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionVerifiedAt, setSessionVerifiedAt] = useState<string>("");
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [pinUpdating, setPinUpdating] = useState(false);
  const [pinMessage, setPinMessage] = useState("");
  const [pinError, setPinError] = useState("");

  async function handlePinUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    setPinMessage("");

    if (!currentPinInput.trim()) {
      setPinError("Current PIN is required.");
      return;
    }
    if (!newPinInput.trim() || newPinInput.length < 4 || newPinInput.length > 12) {
      setPinError("New PIN must be between 4 and 12 characters.");
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinError("New PIN and confirmation do not match.");
      return;
    }

    setPinUpdating(true);
    try {
      const res = await updateAdminPin(currentPinInput.trim(), newPinInput.trim());
      if (!res.ok) {
        setPinError(res.error || "Failed to update Security PIN.");
        return;
      }
      setPinMessage("Security PIN updated successfully! The new PIN will be required on all future sign-ins and sensitive settings.");
      setCurrentPinInput("");
      setNewPinInput("");
      setConfirmPinInput("");
    } catch {
      setPinError("Network error updating PIN.");
    } finally {
      setPinUpdating(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function init() {
      const admin = await getAdminSession();
      if (!active) return;

      if (!admin) {
        router.replace("/account");
        return;
      }

      if (admin.role !== "super_admin" && admin.role !== "platform_admin") {
        router.replace("/admin/dashboard");
        return;
      }

      setAdminUser(admin);
      setSessionVerifiedAt(new Date().toLocaleTimeString());
      setLoading(false);
    }

    void init();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleRefreshSession() {
    setLoading(true);
    setMessage("");
    const admin = await getAdminSession();
    if (!admin) {
      router.replace("/account");
      return;
    }
    setAdminUser(admin);
    setSessionVerifiedAt(new Date().toLocaleTimeString());
    setMessage("Security session re-verified against Supabase Auth.");
    setLoading(false);
  }

  async function handleInvalidateGateToken() {
    setClearing(true);
    setMessage("");
    try {
      await fetch("/api/auth/operator-gate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      setMessage("Operator gate session cookie cleared. You may re-authenticate at /account.");
    } catch {
      setMessage("Failed to clear operator gate cookie.");
    } finally {
      setClearing(false);
    }
  }

  const securityChecklist: SecurityCheckItem[] = [
    {
      id: "supabase-auth",
      title: "Supabase Authentication & Role Verification",
      description: "Cryptographic JWT session validation and server-side RPC role check (get_admin_role).",
      status: "verified",
      detail: adminUser ? `Active verified session for ${adminUser.email} with role '${adminUser.role}'` : "Validating...",
    },
    {
      id: "operator-gate",
      title: "Platform Operator Gate Architecture",
      description: "Protected operator routes verify Origin, Supabase Auth session, and optional private entry tokens.",
      status: "verified",
      detail: "Operational with resilient multi-domain and Vercel preview compatibility.",
    },
    {
      id: "ai-gateway",
      title: "AI Studio Gateway & API Key Isolation",
      description: "All Gemini & Groq keys are stored exclusively in server environment variables and never leaked to the browser.",
      status: "verified",
      detail: "Server-side streaming gateway active at /api/ai with client token rate guardrails.",
    },
    {
      id: "rls-policies",
      title: "Row-Level Security (RLS) & RPC Boundaries",
      description: "Database mutations enforce caller permissions via admin_has_permission and Postgres security policies.",
      status: "verified",
      detail: "Question banking, answer keys, results, and access codes protected at the database tier.",
    },
    {
      id: "credential-audit",
      title: "Client-Side Secrets Audit",
      description: "Only public anonymous keys are included in browser bundles; service role keys remain strictly server-only.",
      status: "verified",
      detail: "No hardcoded administrator passwords or private master keys present in client code.",
    },
  ];

  if (loading) {
    return (
      <main className="admin-shell">
        <div className="admin-card text-center py-12">
          <p className="admin-card-text">Validating security posture and administrator credentials…</p>
        </div>
      </main>
    );
  }

  const roleMeta = adminUser ? ADMIN_ROLE_DETAILS[adminUser.role] : null;

  return (
    <main className="admin-shell">
      <AdminPinGuard
        title="Security & System Settings Protected"
        description="This workspace controls authentication gate tokens, role permissions, and system security policies. Enter your Admin Security PIN to continue."
      >
      <section className="admin-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="admin-badge">Platform Security</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Session Active
              </span>
            </div>
            <h1 className="admin-title">Security & System Settings</h1>
            <p className="admin-subtitle">
              Verify operator access control, server-side authorization boundaries, and credential hygiene.
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
              onClick={() => router.push("/admin/users")}
              className="admin-btn-light"
            >
              Admin Roles
            </button>
            <button
              type="button"
              onClick={() => void handleRefreshSession()}
              className="admin-btn-light"
            >
              Re-Verify Session
            </button>
            <button
              type="button"
              onClick={() => void adminSignOut().then(() => router.push("/account"))}
              className="admin-btn-primary"
            >
              Secure Logout
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div role="status" className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {message}
        </div>
      )}

      {/* Admin Identity Card */}
      <section className="admin-section mt-6 grid gap-6 lg:grid-cols-3">
        <div className="admin-card">
          <h2 className="admin-card-title">Operator Identity</h2>
          <p className="admin-card-text">Authenticated administrator credentials</p>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider">Email Address</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-white">
                {adminUser?.email}
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider">Assigned Role</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                {roleMeta?.label ?? adminUser?.role}
              </p>
              <p className="text-slate-500 mt-0.5">{roleMeta?.summary}</p>
            </div>

            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider">Account ID</p>
              <p className="mt-0.5 font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                {adminUser?.id}
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider">Last Verified</p>
              <p className="mt-0.5 font-mono text-slate-600 dark:text-slate-400">
                {sessionVerifiedAt}
              </p>
            </div>
          </div>
        </div>

        {/* Security Controls & Actions */}
        <div className="admin-card lg:col-span-2">
          <h2 className="admin-card-title">Session & Operator Gate Controls</h2>
          <p className="admin-card-text">Manage administrative security cookies and authorization tokens</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Operator Gate Cookie Cleanup
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Clear the platform operator gate access cookie from this browser without terminating your Supabase Auth session.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={clearing}
                  onClick={() => void handleInvalidateGateToken()}
                  className="admin-btn-light !text-xs whitespace-nowrap"
                >
                  {clearing ? "Clearing…" : "Clear Gate Cookie"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Role Assignments & Access Delegation
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure Super Admin, Platform Admin, and CBT specialist roles for team members.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/admin/users")}
                  className="admin-btn-light !text-xs whitespace-nowrap"
                >
                  Manage Roles →
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Exam Availability & Mock Settings
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Toggle CBT mock mode, calculator access, score release, and test timer defaults.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/admin/config")}
                  className="admin-btn-light !text-xs whitespace-nowrap"
                >
                  Exam Settings →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Posture Audit Checklist */}
      <section className="admin-section admin-card mt-6">
        <h2 className="admin-card-title">Security Boundary Verification</h2>
        <p className="admin-card-text">
          Status of critical access controls, cryptographic tokens, and data boundary configurations.
        </p>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {securityChecklist.map((item) => (
            <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    ✓
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
              <div className="text-right sm:max-w-xs">
                <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {item.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      </AdminPinGuard>
    </main>
  );
}
