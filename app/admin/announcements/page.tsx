"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, adminSignOut, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, type AdminPermission } from "../../lib/adminRoles";
import { supabase } from "../../lib/supabase";
import AdminWorkspaceShell from "../AdminWorkspaceShell";
import type { AnnouncementConfig, MaintenanceModeConfig } from "../../lib/platformConfig";

export default function AnnouncementsAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<AdminPermission, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Announcement State
  const [announcement, setAnnouncement] = useState<AnnouncementConfig>({
    enabled: false,
    message: "National UTME Mock Exam 2026 registration is now open across all testing centers.",
    severity: "info",
    dismissible: true,
    target_audience: "all",
    link_url: "/pricing",
    link_label: "Register Now",
  });

  // Maintenance Mode State
  const [maintenance, setMaintenance] = useState<MaintenanceModeConfig>({
    cbt_maintenance_enabled: false,
    title: "CBT Examination Engine Maintenance",
    message: "The CBT Testing Engine is undergoing routine scheduled maintenance to update question blueprints. We will resume shortly.",
    estimated_resumption: "Within 45 minutes",
    allow_admin_bypass: true,
    notify_users: false,
    notification_title: "System Advisory: CBT Maintenance Mode Active",
    notification_message: "BrainLab CBT testing engine is undergoing scheduled maintenance. Mock exams and test sessions are temporarily paused and will resume shortly.",
    notification_channels: {
      in_app: true,
      email: true,
      device_push: true,
    },
    last_notified_at: null,
  });

  // Authenticated fetch helper attaching Bearer token
  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(init?.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    return fetch(input, { ...init, headers });
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      const currentAdmin = await getAdminSession();
      if (!active) return;
      if (!currentAdmin) {
        router.replace("/account");
        return;
      }
      setAdmin(currentAdmin);

      const perms: Partial<Record<AdminPermission, boolean>> = {};
      perms["cbt.config.manage"] = await adminHasPermission("cbt.config.manage");
      perms["community.moderate"] = await adminHasPermission("community.moderate");
      setPermissions(perms);

      try {
        const res = await authFetch("/api/admin/announcements");
        const data = await res.json();
        if (active && res.ok && data.ok) {
          if (data.announcement) setAnnouncement(data.announcement);
          if (data.maintenance) {
            setMaintenance((prev) => ({
              ...prev,
              ...data.maintenance,
              notification_channels: {
                ...prev.notification_channels,
                ...(data.maintenance.notification_channels || {}),
              },
            }));
          }
        }
      } catch {
        // Fallback
      } finally {
        if (active) setLoading(false);
      }
    }

    init();

    return () => {
      active = false;
    };
  }, [router, authFetch]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await authFetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement, maintenance }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({ type: "success", text: data.message || "Announcements & Maintenance configurations saved successfully!" });
        if (data.broadcast_result) {
          setMaintenance((prev) => ({ ...prev, last_notified_at: new Date().toISOString(), notify_users: false }));
        }
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save configurations." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving configurations." });
    } finally {
      setSaving(false);
    }
  }

  async function handleBroadcastNow() {
    if (!window.confirm("Broadcast this customizable maintenance notification immediately to candidates across in-app and email channels?")) {
      return;
    }

    setBroadcasting(true);
    setMessage(null);

    try {
      const res = await authFetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcement,
          maintenance: { ...maintenance, notify_users: true },
          broadcast_maintenance_now: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          type: "success",
          text: data.message || "Maintenance alert dispatched successfully to candidates!",
        });
        setMaintenance((prev) => ({
          ...prev,
          last_notified_at: new Date().toISOString(),
          notify_users: false,
        }));
      } else {
        setMessage({ type: "error", text: data.error || "Failed to dispatch notification." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error broadcasting notification." });
    } finally {
      setBroadcasting(false);
    }
  }

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <span className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <span>Loading Announcements & Maintenance Hub...</span>
        </div>
      </div>
    );
  }

  return (
    <AdminWorkspaceShell
      user={admin}
      permissions={permissions}
      onLogout={adminSignOut}
    >
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Status Message */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-black text-[#012153] tracking-tight">
              Announcements & Maintenance Mode
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Broadcast urgent announcements to candidates or lock the CBT testing engine with customizable alerts.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="self-start sm:self-auto rounded-2xl bg-[#012153] hover:bg-[#071c43] px-6 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save All Settings →</span>
            )}
          </button>
        </div>

        {/* SECTION 1: SITE-WIDE ANNOUNCEMENT BANNER */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <h2 className="text-base font-black text-slate-900">Site-Wide Broadcast Banner</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays a prominent banner at the very top of all student-facing and public pages.
              </p>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={announcement.enabled}
                onChange={(e) => setAnnouncement((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
              <span className="ml-3 text-xs font-black uppercase text-slate-700">
                {announcement.enabled ? "ACTIVE" : "OFF"}
              </span>
            </label>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Announcement Message
              </label>
              <textarea
                rows={2}
                value={announcement.message}
                onChange={(e) => setAnnouncement((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Enter important alert or notice..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Severity / Style</label>
                <select
                  value={announcement.severity}
                  onChange={(e) =>
                    setAnnouncement((prev) => ({
                      ...prev,
                      severity: e.target.value as "info" | "warning" | "urgent" | "success",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none bg-white"
                >
                  <option value="info">ℹ️ Informational (Blue)</option>
                  <option value="success">✅ Success (Green)</option>
                  <option value="warning">⚠️ Warning (Amber)</option>
                  <option value="urgent">🚨 Critical Alert (Red)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={announcement.target_audience}
                  onChange={(e) =>
                    setAnnouncement((prev) => ({
                      ...prev,
                      target_audience: e.target.value as "all" | "students" | "unsubscribed",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none bg-white"
                >
                  <option value="all">🌐 All Visitors & Candidates</option>
                  <option value="students">🎓 Registered Students Only</option>
                  <option value="unsubscribed">✉️ Unsubscribed Audience Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Action Link URL</label>
                <input
                  type="text"
                  value={announcement.link_url || ""}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, link_url: e.target.value }))}
                  placeholder="/pricing or https://..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Action Button Text</label>
                <input
                  type="text"
                  value={announcement.link_label || ""}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, link_label: e.target.value }))}
                  placeholder="e.g. Register Now"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={announcement.dismissible}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, dismissible: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                Allow candidates to dismiss during their session
              </label>
            </div>
          </div>
        </section>

        {/* SECTION 2: CBT ENGINE MAINTENANCE MODE & CUSTOMIZABLE NOTIFICATIONS */}
        <section
          className={`rounded-3xl border transition-all duration-300 p-6 sm:p-8 shadow-sm space-y-6 ${
            maintenance.cbt_maintenance_enabled
              ? "bg-rose-50/50 border-rose-300 ring-2 ring-rose-200"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🛠️</span>
                <h2 className="text-base font-black text-slate-900">
                  CBT Examination Engine Maintenance Mode
                </h2>
                {maintenance.cbt_maintenance_enabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    MAINTENANCE ACTIVE (LOCKED)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    NORMAL TESTING ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                When enabled, candidates cannot start new CBT mock attempts or practice exams. Active administrators can still preview.
              </p>
            </div>

            <label className="relative inline-flex cursor-pointer items-center self-start sm:self-auto">
              <input
                type="checkbox"
                checked={maintenance.cbt_maintenance_enabled}
                onChange={(e) =>
                  setMaintenance((prev) => ({
                    ...prev,
                    cbt_maintenance_enabled: e.target.checked,
                  }))
                }
                className="peer sr-only"
              />
              <div className="peer h-7 w-12 rounded-full bg-slate-300 after:absolute after:left-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-rose-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
              <span
                className={`ml-3 text-xs font-black uppercase tracking-wider ${
                  maintenance.cbt_maintenance_enabled ? "text-rose-700" : "text-slate-600"
                }`}
              >
                {maintenance.cbt_maintenance_enabled ? "ON (LOCKED)" : "OFF (NORMAL)"}
              </span>
            </label>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Maintenance Header / Title
                </label>
                <input
                  type="text"
                  value={maintenance.title || ""}
                  onChange={(e) => setMaintenance((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. CBT Examination Engine Maintenance"
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Estimated Resumption Notice
                </label>
                <input
                  type="text"
                  value={maintenance.estimated_resumption || ""}
                  onChange={(e) => setMaintenance((prev) => ({ ...prev, estimated_resumption: e.target.value }))}
                  placeholder="e.g. Within 45 minutes / Today at 3:00 PM WAT"
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none font-semibold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Candidate Maintenance Notice (Customizable User Message)
              </label>
              <textarea
                rows={3}
                value={maintenance.message}
                onChange={(e) => setMaintenance((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Explain the routine maintenance and instructions for students..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs focus:border-rose-500 focus:outline-none font-medium leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This exact message is displayed to any candidate who visits CBT exam launch pages (/cbt, /exam, /access) while maintenance mode is active.
              </p>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={maintenance.allow_admin_bypass}
                  onChange={(e) => setMaintenance((prev) => ({ ...prev, allow_admin_bypass: e.target.checked }))}
                  className="rounded border-slate-300 text-rose-600 focus:ring-0"
                />
                Allow signed-in administrators & proctors to bypass lock and test questions
              </label>
            </div>

            {/* CUSTOMIZABLE NOTIFICATION DISPATCH TO USERS */}
            <div className="mt-6 pt-5 border-t border-slate-200 bg-slate-50/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span>📢</span> Customizable Maintenance Notification to Users
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Send a customized notification advisory to candidates informing them of this maintenance schedule.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBroadcastNow}
                  disabled={broadcasting || saving}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow transition active:scale-95 disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {broadcasting ? (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <span>📢 Dispatch Alert Now</span>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notification Subject / Header
                </label>
                <input
                  type="text"
                  value={maintenance.notification_title || ""}
                  onChange={(e) => setMaintenance((prev) => ({ ...prev, notification_title: e.target.value }))}
                  placeholder="e.g. Scheduled CBT Engine Maintenance Advisory"
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customizable Notification Message Body
                </label>
                <textarea
                  rows={2}
                  value={maintenance.notification_message || ""}
                  onChange={(e) => setMaintenance((prev) => ({ ...prev, notification_message: e.target.value }))}
                  placeholder="Enter the custom message sent to candidate inboxes and emails..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none font-medium"
                />
              </div>

              {/* Notification Channels */}
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-2">
                  Delivery Channels
                </span>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={maintenance.notification_channels?.in_app !== false}
                      onChange={(e) =>
                        setMaintenance((prev) => ({
                          ...prev,
                          notification_channels: {
                            ...prev.notification_channels!,
                            in_app: e.target.checked,
                          },
                        }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span>🔔 In-App Candidate Inbox (/notifications)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={maintenance.notification_channels?.email !== false}
                      onChange={(e) =>
                        setMaintenance((prev) => ({
                          ...prev,
                          notification_channels: {
                            ...prev.notification_channels!,
                            email: e.target.checked,
                          },
                        }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span>📧 Email Advisory (Resend / Zoho)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={maintenance.notification_channels?.device_push !== false}
                      onChange={(e) =>
                        setMaintenance((prev) => ({
                          ...prev,
                          notification_channels: {
                            ...prev.notification_channels!,
                            device_push: e.target.checked,
                          },
                        }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span>📱 Browser & Device Push</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900">
                  <input
                    type="checkbox"
                    checked={Boolean(maintenance.notify_users)}
                    onChange={(e) => setMaintenance((prev) => ({ ...prev, notify_users: e.target.checked }))}
                    className="rounded border-rose-300 text-rose-600 focus:ring-0"
                  />
                  Automatically dispatch this notification when saving settings
                </label>

                {maintenance.last_notified_at && (
                  <span className="text-slate-400">
                    Last broadcast: {new Date(maintenance.last_notified_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Save Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-2xl bg-[#012153] hover:bg-[#071c43] px-8 py-3 text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? "Saving Configurations..." : "Save Announcement & Maintenance Settings →"}
          </button>
        </div>
      </div>
    </AdminWorkspaceShell>
  );
}
