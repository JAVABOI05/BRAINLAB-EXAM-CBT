/* eslint @typescript-eslint/no-explicit-any: "off", react/no-unescaped-entities: "off" */
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import {
  getLiveClassroomConfig,
  saveLiveClassroomConfig,
  getPlatformConfig,
  type LiveClassroomConfig,
} from "../../lib/platformConfig";
import { getAllVideoProvidersStatus } from "../../lib/liveClassroom/provider";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import "../admin.css";

export default function AdminLiveClassroomControlPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Instant Live Class Launcher State
  const [sessionTitle, setSessionTitle] = useState("JAMB CBT Live Speed Drill & Audio Masterclass");
  const [sessionTopic, setSessionTopic] = useState("Mathematics & Physics Speed Strategies");
  const [sessionRoomId, setSessionRoomId] = useState("BL-LIVE-101");
  const [sessionFormat, setSessionFormat] = useState<"interactive" | "quiz" | "broadcast">("interactive");
  const [isCopied, setIsCopied] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState("");

  const handleWhatsAppShare = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://brainlabexam-cbt.vercel.app";
    const link = `${origin}/classroom/${sessionRoomId.trim() || "live-session"}`;
    const text = `🎓 *BrainLab Live Academic Masterclass*\n📌 *Topic:* ${sessionTitle} - ${sessionTopic}\n🎙️ *Format:* Interactive Audio, Diagram Whiteboard & Speed Quizzes\n🔗 *Join Room Now:* ${link}\n\n_No downloads required. Works smoothly on phone or PC._`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleBroadcastAlert = async () => {
    setIsBroadcasting(true);
    setBroadcastFeedback("");
    try {
      const res = await fetch("/api/classroom/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: sessionRoomId.trim() || "live-session",
          title: sessionTitle,
          topic: sessionTopic,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastFeedback(data.message || "Alert dispatched to learners!");
      } else {
        setBroadcastFeedback(data.error || "Failed to dispatch alert.");
      }
    } catch {
      setBroadcastFeedback("Network error broadcasting alert.");
    } finally {
      setIsBroadcasting(false);
    }
  };
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
  const [whiteboardWatermarkEnabled, setWhiteboardWatermarkEnabled] = useState(true);
  const [savingWatermark, setSavingWatermark] = useState(false);

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
        setWhiteboardWatermarkEnabled(await getPlatformConfig<boolean>("whiteboard_watermark_enabled", true));
        setProviderStatuses(getAllVideoProvidersStatus());
        setLoading(false);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSaveWatermark = async () => {
    if (!adminUser || adminUser.role !== "super_admin") return;
    setSavingWatermark(true);
    setFeedback("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again before changing platform branding.");
      const response = await fetch("/api/admin/whiteboard-watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ enabled: whiteboardWatermarkEnabled }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save the watermark policy.");
      setFeedback("Whiteboard watermark policy saved.");
    } catch (error: any) {
      setFeedback(error?.message || "Could not save the watermark policy.");
    } finally {
      setSavingWatermark(false);
    }
  };

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
          <AdminNotificationBell />
          <Link href="/classroom/BL-LIVE-101" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition">🎥 Live Room (BL-LIVE-101)</Link>
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
        <>
          {/* 1-Click Instant Live Class Stage Launcher */}
          <section className="mt-6 rounded-3xl border-2 border-blue-500/30 bg-gradient-to-br from-slate-900 via-[#012153] to-slate-950 p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <span className="rounded-full bg-cyan-400/20 border border-cyan-400/40 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                  🔴 Live Interactive Classroom Launcher
                </span>
                <h2 className="mt-2 text-2xl font-black text-white">Start &amp; Host an Academic Stage</h2>
                <p className="mt-1 text-xs text-slate-300 max-w-xl">
                  Launch instant sessions with interactive audio, voice note recordings, diagram sharing, live in-chat checkpoint polls, and screen-sharing. Zero complex setup required.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="rounded-xl border border-emerald-400/40 bg-emerald-950/60 hover:bg-emerald-900/60 px-3.5 py-2.5 text-xs font-bold text-emerald-300 transition flex items-center gap-2"
                  title="Share invitation with prefilled details directly to WhatsApp class group"
                >
                  <span>📲 Broadcast to WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleBroadcastAlert}
                  disabled={isBroadcasting}
                  className="rounded-xl border border-amber-400/40 bg-amber-950/60 hover:bg-amber-900/60 px-3.5 py-2.5 text-xs font-bold text-amber-300 transition flex items-center gap-2 disabled:opacity-50"
                  title="Dispatch in-app notifications and banner to all logged-in students"
                >
                  <span>{isBroadcasting ? "Sending..." : "🔔 In-App Alert to Students"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/classroom/${sessionRoomId.trim() || "live-session"}`;
                    navigator.clipboard.writeText(link);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2500);
                  }}
                  className="rounded-xl border border-cyan-400/40 bg-cyan-950/60 hover:bg-cyan-900/60 px-3.5 py-2.5 text-xs font-bold text-cyan-300 transition flex items-center gap-2"
                >
                  <span>{isCopied ? "✅ Link Copied!" : "📋 Copy Link"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/classroom/${sessionRoomId.trim() || "live-session"}`)}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
                >
                  <span>🚀 Launch Live Stage →</span>
                </button>
              </div>
            </div>

            {broadcastFeedback && (
              <div
                className={`mt-4 rounded-xl p-3 text-xs font-bold ${
                  broadcastFeedback.includes("success") || broadcastFeedback.includes("dispatched")
                    ? "bg-emerald-900/60 border border-emerald-500/40 text-emerald-200"
                    : "bg-rose-900/60 border border-rose-500/40 text-rose-200"
                }`}
              >
                {broadcastFeedback}
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                  Class Session Title
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="E.g., JAMB CBT Physics &amp; Math Speed Drill"
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                  Subject / Topic Focus
                </label>
                <input
                  type="text"
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  placeholder="E.g., Wave Optics, Calculus &amp; Exam Hacks"
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                  Classroom Room Slug / ID
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={sessionRoomId}
                    onChange={(e) => setSessionRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="room-slug-123"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setSessionRoomId(`live-${Math.random().toString(36).substring(2, 8)}`)}
                    title="Generate new ID"
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-white/10 text-xs text-slate-300">
              <span className="font-bold text-slate-400">Classroom Features Active:</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">✓ Audio &amp; Voice Notes</span>
              <span className="inline-flex items-center gap-1 text-cyan-400">✓ Multimedia Diagram Sharing</span>
              <span className="inline-flex items-center gap-1 text-amber-400">✓ In-Chat Quizzes &amp; Polls</span>
              <span className="inline-flex items-center gap-1 text-blue-300">✓ Nigerian 3G/4G Bandwidth Optimized</span>
            </div>
          </section>

          {adminUser?.role === "super_admin" && (
        <section className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-base font-black text-slate-900">BrainLab Whiteboard Watermark</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">The BrainLab Academy logo appears on live whiteboards by default. Only Super Admin can change this platform-wide setting.</p>
            </div>
            <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <input type="checkbox" checked={whiteboardWatermarkEnabled} onChange={(event) => setWhiteboardWatermarkEnabled(event.target.checked)} className="h-5 w-5 accent-blue-700" />
              <span className="text-sm font-bold text-slate-800">{whiteboardWatermarkEnabled ? "Watermark on" : "Watermark off"}</span>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" disabled={savingWatermark} onClick={handleSaveWatermark} className="rounded-xl bg-[#0B1536] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
              {savingWatermark ? "Saving…" : "Save watermark setting"}
            </button>
          </div>
        </section>
      )}

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
        </>
      )}
    </main>
  );
}
