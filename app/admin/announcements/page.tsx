"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, adminSignOut, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, type AdminPermission } from "../../lib/adminRoles";
import AdminWorkspaceShell from "../AdminWorkspaceShell";
import { supabase } from "../../lib/supabase";
import type { AnnouncementConfig, MaintenanceModeConfig } from "../../lib/platformConfig";

export default function AnnouncementsAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<AdminPermission, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    message: "The CBT Testing Engine is undergoing routine scheduled maintenance to update question blueprints. We will resume shortly.",
    estimated_resumption: "Within 30 minutes",
    allow_admin_bypass: true,
  });

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
        const { data: authData } = await supabase.auth.getSession();
        const accessToken = authData.session?.access_token;
        if (!accessToken) throw new Error("Your admin session has expired. Please sign in again.");
        const res = await fetch("/api/admin/announcements", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (active && res.ok && data.ok) {
          if (data.announcement) setAnnouncement(data.announcement);
          if (data.maintenance) setMaintenance(data.maintenance);
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
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData.session?.access_token;
      if (!accessToken) throw new Error("Your admin session has expired. Please sign in again.");
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ announcement, maintenance }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({ type: "success", text: "Announcements & Maintenance configurations saved successfully!" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save configurations." });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Network error saving settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading Announcement & Maintenance Controls...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminWorkspaceShell
      user={admin}
      permissions={permissions}
      onLogout={async () => {
        await adminSignOut();
        router.replace("/account");
      }}
    >
      <div className="max-w-4xl space-y-8 p-6 lg:p-8">
        {/* Header */}
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
            System & Broadcast Controls
          </span>
          <h1 className="text-2xl font-black text-slate-900">
            Announcements & Maintenance Mode
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast urgent alerts to candidates or temporarily lock CBT testing for maintenance.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-2xl p-4 text-xs font-bold border ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* SECTION 1: GLOBAL ANNOUNCEMENT BANNER */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Site-Wide Announcement Banner
              </h2>
              <p className="text-xs text-slate-500">
                Displays a prominent responsive notification strip across all candidate pages.
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
              <span className="ml-3 text-xs font-bold text-slate-700">
                {announcement.enabled ? "ACTIVE" : "DISABLED"}
              </span>
            </label>
          </div>

          {/* Banner Live Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Live Banner Preview
            </label>
            <div
              className={`rounded-xl p-3.5 text-xs flex items-center justify-between shadow-xs ${
                announcement.severity === "urgent"
                  ? "bg-rose-600 text-white font-bold"
                  : announcement.severity === "warning"
                  ? "bg-amber-500 text-slate-950 font-medium"
                  : announcement.severity === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>
                  {announcement.severity === "urgent"
                    ? "🚨"
                    : announcement.severity === "warning"
                    ? "⚠️"
                    : announcement.severity === "success"
                    ? "🎉"
                    : "📢"}
                </span>
                <span>{announcement.message || "Enter banner text below..."}</span>
                {announcement.link_url && (
                  <span className="underline font-bold ml-2">
                    {announcement.link_label || "Learn More →"}
                  </span>
                )}
              </div>
              {announcement.dismissible && <span className="opacity-70 text-[11px]">✕</span>}
            </div>
          </div>

          {/* Banner Configuration Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Announcement Message
              </label>
              <textarea
                rows={2}
                value={announcement.message}
                onChange={(e) => setAnnouncement((prev) => ({ ...prev, message: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-blue-500 focus:outline-none font-medium"
                placeholder="e.g. BrainLab JAMB UTME National Mock Exam starts this Saturday at 9:00 AM..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alert Severity
                </label>
                <select
                  value={announcement.severity}
                  onChange={(e) =>
                    setAnnouncement((prev) => ({
                      ...prev,
                      severity: e.target.value as "info" | "warning" | "urgent" | "success",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                >
                  <option value="info">🔵 Info (Blue)</option>
                  <option value="warning">🟡 Warning (Amber)</option>
                  <option value="urgent">🔴 Urgent / Critical (Red)</option>
                  <option value="success">🟢 Success / Promo (Green)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Call to Action Link (Optional)
                </label>
                <input
                  type="text"
                  value={announcement.link_url || ""}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, link_url: e.target.value }))}
                  placeholder="/pricing or /cbt"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Link Button Label
                </label>
                <input
                  type="text"
                  value={announcement.link_label || ""}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, link_label: e.target.value }))}
                  placeholder="View Plans →"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
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

        {/* SECTION 2: CBT ENGINE MAINTENANCE MODE */}
        <section className="rounded-3xl border border-rose-200 bg-rose-50/40 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-rose-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🛠️</span>
                <h2 className="text-base font-black text-rose-950">
                  CBT Examination Engine Maintenance Mode
                </h2>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                When enabled, students cannot start new CBT exams or mock attempts. Active administrators can still preview.
              </p>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
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
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-rose-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
              <span className="ml-3 text-xs font-black uppercase text-rose-900">
                {maintenance.cbt_maintenance_enabled ? "MAINTENANCE ON" : "NORMAL"}
              </span>
            </label>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-rose-950 mb-1">
                Candidate Maintenance Notice
              </label>
              <textarea
                rows={2}
                value={maintenance.message}
                onChange={(e) => setMaintenance((prev) => ({ ...prev, message: e.target.value }))}
                className="w-full rounded-xl border border-rose-200 bg-white p-3 text-xs focus:border-rose-500 focus:outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-rose-950 mb-1">
                  Estimated Resumption Notice
                </label>
                <input
                  type="text"
                  value={maintenance.estimated_resumption || ""}
                  onChange={(e) => setMaintenance((prev) => ({ ...prev, estimated_resumption: e.target.value }))}
                  placeholder="e.g. Within 45 minutes / Today at 2:00 PM"
                  className="w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-900">
                  <input
                    type="checkbox"
                    checked={maintenance.allow_admin_bypass}
                    onChange={(e) => setMaintenance((prev) => ({ ...prev, allow_admin_bypass: e.target.checked }))}
                    className="rounded border-rose-300 text-rose-600 focus:ring-0"
                  />
                  Allow signed-in administrators to bypass and test
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Save Bar */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-[#012153] hover:bg-[#071c43] px-8 py-3 text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving Configurations..." : "Save Announcement & Maintenance Settings →"}
          </button>
        </div>
      </div>
    </AdminWorkspaceShell>
  );
}
