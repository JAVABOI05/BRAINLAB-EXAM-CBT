"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminWorkspaceShell from "@/app/admin/AdminWorkspaceShell";
import AdminPinGuard from "@/app/components/AdminPinGuard";
import { getAdminSession, adminSignOut, type AdminUser } from "@/app/lib/adminAuth";
import { adminHasPermission, type AdminPermission } from "@/app/lib/adminRoles";
import { toast } from "@/app/lib/toast";
import {
  EXAM_CATEGORIES_REGISTRY,
  SeasonalExamFocusConfig,
  DEFAULT_SEASONAL_FOCUS_CONFIG,
} from "@/app/lib/examFocus";

export default function SeasonalExamFocusAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<AdminPermission, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SeasonalExamFocusConfig>(DEFAULT_SEASONAL_FOCUS_CONFIG);
  const [changeReason, setChangeReason] = useState("");

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
      perms["cbt.questions.manage"] = await adminHasPermission("cbt.questions.manage");
      perms["learning.content.manage"] = await adminHasPermission("learning.content.manage");
      perms["institution.manage"] = await adminHasPermission("institution.manage");
      setPermissions(perms);

      await fetchConfig();
    }

    init();

    return () => {
      active = false;
    };
  }, [router]);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seasonal-focus");
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig(data.config);
      }
    } catch {
      toast.error("Failed to load seasonal examination focus configuration");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/seasonal-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active_mode: config.active_mode,
          manual_priority_order: config.manual_priority_order,
          scheduled_presets: config.scheduled_presets,
          change_reason: changeReason || "Updated examination priorities from Super Admin console",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Examination focus priorities successfully updated! 🚀");
        setChangeReason("");
        if (data.config) setConfig(data.config);
      } else {
        toast.error(data.error || "Failed to save configuration");
      }
    } catch {
      toast.error("Network error while updating configuration");
    } finally {
      setSaving(false);
    }
  }

  function moveItem(index: number, direction: "up" | "down") {
    const list = [...config.manual_priority_order];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    setConfig({ ...config, manual_priority_order: list });
  }

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading Administrative Console...</p>
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
      <AdminPinGuard
        title="Seasonal Exam Focus Protection"
        description="Configure dynamic examination priority, deadlines, and seasonal scheduling. Please enter your Admin Security PIN."
      >
        <div className="space-y-8 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Directive Section 6
                </span>
                <span className="text-xs text-slate-500 font-mono">Dynamic Seasonal Focus</span>
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                Examination Positioning &amp; Seasonal Focus Engine
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Configure examination hierarchy and promotional prominence across the homepage, navigation, CBT simulator, and student dashboards without redeploying code.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Examination Focus"}
            </button>
          </div>

          {/* Operating Mode Selector */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Focus Scheduling Mode
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  config.active_mode === "automatic_schedule"
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="mode"
                    value="automatic_schedule"
                    checked={config.active_mode === "automatic_schedule"}
                    onChange={() => setConfig({ ...config, active_mode: "automatic_schedule" })}
                    className="mt-1"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      Automatic Date Schedule (Recommended)
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 block">
                      Switches between UTME Season (Nov–Apr), Post-UTME Season (May–Aug), and WAEC/NECO Season (Sep–Oct) automatically by calendar dates.
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  config.active_mode === "manual_override"
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="mode"
                    value="manual_override"
                    checked={config.active_mode === "manual_override"}
                    onChange={() => setConfig({ ...config, active_mode: "manual_override" })}
                    className="mt-1"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      Manual Priority Order Override
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 block">
                      Enforce the custom hierarchy defined below regardless of current date.
                    </span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Priority Order Drag/Move Section */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Active Examination Priority Hierarchy
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Item #1 is prominently featured across the Hero, top of the navigation menu, and first on the CBT mock selection list.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                5 Exam Categories
              </span>
            </div>

            <div className="space-y-2.5">
              {config.manual_priority_order.map((key, idx) => {
                const meta = EXAM_CATEGORIES_REGISTRY[key] || EXAM_CATEGORIES_REGISTRY.OTHER;
                const isFirst = idx === 0;
                const isLast = idx === config.manual_priority_order.length - 1;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-black text-slate-700 dark:text-slate-200">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {meta.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {meta.badge}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {meta.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveItem(idx, "up")}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold"
                        title="Move Higher Priority"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveItem(idx, "down")}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold"
                        title="Move Lower Priority"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Note */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Audit Trail Change Note
            </h2>
            <input
              type="text"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. Switched priority to Post-UTME following conclusion of 2027 JAMB exam window"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {config.last_updated_at && (
              <p className="text-[11px] text-slate-400 font-mono">
                Last modified: {new Date(config.last_updated_at).toLocaleString()} by {config.last_updated_by || "Admin"}
              </p>
            )}
          </div>
        </div>
      </AdminPinGuard>
    </AdminWorkspaceShell>
  );
}
