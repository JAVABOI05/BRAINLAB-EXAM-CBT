"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import {
  getLiveClassroomConfig,
  saveLiveClassroomConfig,
  type LiveClassroomConfig,
} from "../../lib/platformConfig";
import { getAllVideoProvidersStatus } from "../../lib/liveClassroom/provider";
import "../admin.css";

export default function AdminLiveClassroomControlPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [config, setConfig] = useState<LiveClassroomConfig>({
    provider: "webrtc",
    max_capacity_default: 100,
    default_duration_minutes: 60,
    student_mic_default: true,
    student_cam_default: false,
    student_chat_default: true,
    student_screenshare_default: false,
    recordings_enabled: true,
    attendance_min_minutes: 15,
    attendance_threshold_percent: 60,
    waiting_room_default: false,
    formats_enabled: ["interactive", "broadcast", "hybrid"],
  });

  const [providerStatuses, setProviderStatuses] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);

      const hasPerm = await adminHasPermission("security.settings.manage");
      if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
        setFeedback("You do not have permission to modify live classroom configuration.");
        setLoading(false);
        return;
      }

      const currentConfig = await getLiveClassroomConfig();
      if (active) {
        setConfig(currentConfig);
        setProviderStatuses(getAllVideoProvidersStatus());
        setLoading(false);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    setSaving(true);
    setFeedback("");

    try {
      const ok = await saveLiveClassroomConfig(
        config,
        { id: adminUser.id, email: adminUser.email },
        "Administrator modified live classroom policies"
      );

      if (ok) {
        setFeedback("Live Classroom settings saved and applied platform-wide.");
      } else {
        setFeedback("Failed to update classroom configuration. Check database permissions.");
      }
    } catch (err: any) {
      setFeedback(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
            Platform Administration
          </span>
          <h1 className="mt-1 text-3xl font-black text-slate-950">
            Live Classroom Governance
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Configure real-time audio/video infrastructure, attendance thresholds, recording policies and room limits without redeployment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            ← Admin Dashboard
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`mt-4 rounded-2xl p-4 text-xs font-semibold ${
            feedback.includes("saved")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {feedback}
        </div>
      )}

      {loading ? (
        <p className="p-8 text-center text-xs text-slate-500">Loading classroom configuration…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-6">
          {/* Provider Infrastructure Status */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-950">
              1. Real-Time Video Provider
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select which real-time streaming vendor powers live classes. The built-in WebRTC provider works with zero external vendor credentials.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {providerStatuses.map((p) => {
                const isSelected = config.provider === p.name;
                return (
                  <div
                    key={p.name}
                    onClick={() => setConfig({ ...config, provider: p.name })}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        {p.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.isConfigured
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.isConfigured ? "Ready" : "Pending Keys"}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-600">
                      {p.name === "webrtc"
                        ? "Built-in low-bandwidth WebRTC mesh (Zero cost, works out of the box)."
                        : p.name === "livekit"
                        ? "High-scale selective forwarding unit (SFU) with recording."
                        : p.name === "agora"
                        ? "Global real-time communication network with native mobile SDKs."
                        : "Daily.co managed video room infrastructure."}
                    </p>

                    {p.missingConfig.length > 0 && (
                      <p className="mt-2 text-[10px] text-rose-600 font-mono">
                        Needs: {p.missingConfig.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Classroom Formats & Capacity */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-950">
              2. Capacity & Class Formats
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Maximum Capacity (Students)
                </label>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={config.max_capacity_default}
                  onChange={(e) =>
                    setConfig({ ...config, max_capacity_default: parseInt(e.target.value) || 100 })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Class Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={240}
                  value={config.default_duration_minutes}
                  onChange={(e) =>
                    setConfig({ ...config, default_duration_minutes: parseInt(e.target.value) || 60 })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
                />
              </div>
            </div>
          </section>

          {/* Attendance Governance */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-950">
              3. Attendance Tracking & Verification
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Control the minimum participation duration before a student's session is marked as attended.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Minimum Attendance Threshold (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={config.attendance_min_minutes}
                  onChange={(e) =>
                    setConfig({ ...config, attendance_min_minutes: parseInt(e.target.value) || 15 })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attendance Required Percentage (%)
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={config.attendance_threshold_percent}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      attendance_threshold_percent: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
                />
              </div>
            </div>
          </section>

          {/* Student Permissions & Defaults */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-950">
              4. Student Permissions & Safety Defaults
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.student_mic_default}
                  onChange={(e) => setConfig({ ...config, student_mic_default: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Allow student microphone participation (interactive sessions)
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.student_cam_default}
                  onChange={(e) => setConfig({ ...config, student_cam_default: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Allow student camera streaming by default
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.student_chat_default}
                  onChange={(e) => setConfig({ ...config, student_chat_default: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Enable live in-class student text chat
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.recordings_enabled}
                  onChange={(e) => setConfig({ ...config, recordings_enabled: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Enable live lecture recording for student revision
                </span>
              </label>
            </div>
          </section>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#012153] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-900 transition disabled:opacity-50"
            >
              {saving ? "Saving Policy…" : "Save Live Classroom Policy"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
