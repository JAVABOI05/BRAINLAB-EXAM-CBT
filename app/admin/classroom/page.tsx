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
  const [sessionClassType, setSessionClassType] = useState<"open" | "masterclass">("open");
  const [sessionEntryCode, setSessionEntryCode] = useState("BL-MASTER-2026");
  const [sessionRequirePermission, setSessionRequirePermission] = useState(true);
  const [allowedTutorsList, setAllowedTutorsList] = useState<string[]>([]);
  const [newTutorEmail, setNewTutorEmail] = useState("");
  const [savingTutors, setSavingTutors] = useState(false);
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("Your session has expired. Please sign in again before broadcasting a classroom alert.");
      }

      const res = await fetch("/api/classroom/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
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

  // Live Services Super Admin State
  const [selectedServiceTab, setSelectedServiceTab] = useState<"webrtc" | "livekit" | "agora" | "daily">("livekit");
  const [liveServicesCreds, setLiveServicesCreds] = useState({
    livekit_url: "",
    livekit_api_key: "",
    livekit_api_secret: "",
    agora_app_id: "",
    agora_app_certificate: "",
    daily_domain: "",
    daily_api_key: "",
    webrtc_ice_servers: "",
  });
  const [hasLivekitSecret, setHasLivekitSecret] = useState(false);
  const [hasAgoraCert, setHasAgoraCert] = useState(false);
  const [hasDailyKey, setHasDailyKey] = useState(false);
  const [testingService, setTestingService] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tokenPreview?: string; serverUrl?: string } | null>(null);
  const [savingService, setSavingService] = useState(false);
  const [serviceFeedback, setServiceFeedback] = useState("");

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
        if (currentConfig.allowed_tutor_emails) {
          setAllowedTutorsList(currentConfig.allowed_tutor_emails);
        }
        const existingRoom = currentConfig.room_configs?.["BL-LIVE-101"];
        if (existingRoom) {
          setSessionClassType(existingRoom.class_type || "open");
          if (existingRoom.entry_code) setSessionEntryCode(existingRoom.entry_code);
          if (typeof existingRoom.require_permission === "boolean") setSessionRequirePermission(existingRoom.require_permission);
        }
        setWhiteboardWatermarkEnabled(await getPlatformConfig<boolean>("whiteboard_watermark_enabled", true));
        setProviderStatuses(getAllVideoProvidersStatus(currentConfig.provider_credentials));
        if (currentConfig.provider) {
          setSelectedServiceTab(currentConfig.provider);
        }
        if (currentConfig.provider_credentials) {
          const pc = currentConfig.provider_credentials;
          setLiveServicesCreds({
            livekit_url: pc.livekit_url || "",
            livekit_api_key: pc.livekit_api_key || "",
            livekit_api_secret: "",
            agora_app_id: pc.agora_app_id || "",
            agora_app_certificate: "",
            daily_domain: pc.daily_domain || "",
            daily_api_key: "",
            webrtc_ice_servers: pc.webrtc_ice_servers || "",
          });
          setHasLivekitSecret(Boolean(pc.livekit_api_secret));
          setHasAgoraCert(Boolean(pc.agora_app_certificate));
          setHasDailyKey(Boolean(pc.daily_api_key));
        }

        // Load superadmin live service config via API
        if (admin.role === "super_admin") {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              const res = await fetch("/api/admin/live-services", {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              const lsData = await res.json();
              if (res.ok && lsData.success) {
                if (lsData.credentials) {
                  setLiveServicesCreds((prev) => ({
                    ...prev,
                    livekit_url: lsData.credentials.livekit_url || prev.livekit_url,
                    livekit_api_key: lsData.credentials.livekit_api_key || prev.livekit_api_key,
                    agora_app_id: lsData.credentials.agora_app_id || prev.agora_app_id,
                    daily_domain: lsData.credentials.daily_domain || prev.daily_domain,
                    webrtc_ice_servers: lsData.credentials.webrtc_ice_servers || prev.webrtc_ice_servers,
                  }));
                  setHasLivekitSecret(Boolean(lsData.credentials.has_livekit_secret));
                  setHasAgoraCert(Boolean(lsData.credentials.has_agora_certificate));
                  setHasDailyKey(Boolean(lsData.credentials.has_daily_api_key));
                }
                if (lsData.statuses) {
                  setProviderStatuses(lsData.statuses);
                }
              }
            }
          } catch {
            // Silently fallback to platformConfig
          }
        }
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

  const handleLaunchStage = async () => {
    if (!adminUser) return;
    try {
      const roomSlug = sessionRoomId.trim() || "BL-LIVE-101";
      const currentConfig = await getLiveClassroomConfig();
      const updatedRooms = { ...(currentConfig.room_configs || {}) };
      updatedRooms[roomSlug] = {
        class_type: sessionClassType,
        entry_code: sessionClassType === "masterclass" ? sessionEntryCode.trim().toUpperCase() : undefined,
        require_permission: sessionClassType === "masterclass" ? sessionRequirePermission : false,
        is_active: true,
        title: sessionTitle,
        topic: sessionTopic,
        started_at: new Date().toISOString(),
        active_host_id: adminUser.id,
        active_host_name: adminUser.email,
        admitted_students: updatedRooms[roomSlug]?.admitted_students || [],
      };
      await saveLiveClassroomConfig(
        { room_configs: updatedRooms },
        { id: adminUser.id, email: adminUser.email },
        `Admin configured live session ${roomSlug} as ${sessionClassType}`
      );
      router.push(`/classroom/${roomSlug}`);
    } catch {
      router.push(`/classroom/${sessionRoomId.trim() || "BL-LIVE-101"}`);
    }
  };

  const handleAddAllowedTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !newTutorEmail.trim()) return;
    const email = newTutorEmail.trim().toLowerCase();
    if (allowedTutorsList.includes(email)) return;
    const updated = [...allowedTutorsList, email];
    setSavingTutors(true);
    try {
      const current = await getLiveClassroomConfig();
      await saveLiveClassroomConfig(
        { allowed_tutor_emails: updated },
        { id: adminUser.id, email: adminUser.email },
        `Added allowed tutor ${email}`
      );
      setAllowedTutorsList(updated);
      setNewTutorEmail("");
      setFeedback(`Authorized ${email} to start and host live classrooms.`);
    } catch (err: any) {
      setFeedback(err.message || "Failed to add tutor.");
    } finally {
      setSavingTutors(false);
    }
  };

  const handleRemoveAllowedTutor = async (emailToRemove: string) => {
    if (!adminUser) return;
    const updated = allowedTutorsList.filter((e) => e !== emailToRemove);
    setSavingTutors(true);
    try {
      await saveLiveClassroomConfig(
        { allowed_tutor_emails: updated },
        { id: adminUser.id, email: adminUser.email },
        `Removed allowed tutor ${emailToRemove}`
      );
      setAllowedTutorsList(updated);
      setFeedback(`Removed ${emailToRemove} from authorized tutors.`);
    } catch (err: any) {
      setFeedback(err.message || "Failed to remove tutor.");
    } finally {
      setSavingTutors(false);
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
                <a
                  href={`/api/classroom/attendance?classId=${sessionRoomId || "BL-LIVE-101"}&format=csv`}
                  download={`attendance-${sessionRoomId || "BL-LIVE-101"}.csv`}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 px-4 py-2.5 text-xs font-bold text-emerald-300 transition flex items-center gap-1.5 active-press"
                  title="Download verified attendance report CSV"
                >
                  <span>📥</span>
                  <span>Export Attendance CSV</span>
                </a>
                <button
                  type="button"
                  onClick={handleLaunchStage}
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

            {/* Masterclass vs Open Class Controls */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">Classroom Access Mode</span>
                  <p className="text-xs text-slate-300">
                    Choose whether this is a general open class or a protected masterclass.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionClassType("open")}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                      sessionClassType === "open"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    🌍 Open Class (No Code)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionClassType("masterclass")}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                      sessionClassType === "masterclass"
                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-400"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    👑 Masterclass (Restricted)
                  </button>
                </div>
              </div>

              {sessionClassType === "masterclass" && (
                <div className="mt-3 pt-3 border-t border-white/10 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300">
                      Masterclass Access Code (Optional)
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={sessionEntryCode}
                        onChange={(e) => setSessionEntryCode(e.target.value.toUpperCase())}
                        placeholder="e.g. BL-MASTER-2026"
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setSessionEntryCode(`MC-${Math.floor(1000 + Math.random() * 9000)}`)}
                        className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-900/60"
                        title="Generate random 4-digit code"
                      >
                        🎲 Code
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Learners must enter this exact code to enter the masterclass.
                    </p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sessionRequirePermission}
                        onChange={(e) => setSessionRequirePermission(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded accent-amber-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-white">Require Tutor Permission (Waiting Room)</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          Students wait in waiting room until host clicks &quot;Admit / Grant Permission&quot;.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-white/10 text-xs text-slate-300">
              <span className="font-bold text-slate-400">Classroom Features Active:</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">✓ Audio &amp; Voice Notes</span>
              <span className="inline-flex items-center gap-1 text-cyan-400">✓ Multimedia Diagram Sharing</span>
              <span className="inline-flex items-center gap-1 text-amber-400">✓ In-Chat Quizzes &amp; Polls</span>
              <span className="inline-flex items-center gap-1 text-blue-300">✓ Nigerian 3G/4G Bandwidth Optimized</span>
            </div>
          </section>

          {/* Authorized Tutors & Host Permission Management Section */}
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-800">
                  🛡️ Tutor Access &amp; Host Authorization
                </span>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Authorized Instructors &amp; Classroom Hosts
                </h2>
                <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                  Enforce that only tutors and instructors explicitly authorized by administration can launch or enter live classrooms as host. Students are strictly prevented from hosting or entering unstarted sessions.
                </p>
              </div>
            </div>

            {/* Default Role Hosts Notice */}
            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">System Roles with Default Host Access</h4>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1 font-bold">✓ Super Administrators</span>
                <span className="rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1 font-bold">✓ Platform Administrators</span>
                <span className="rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1 font-bold">✓ CBT Administrators</span>
                <span className="rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1 font-bold">✓ Teachers &amp; Assigned Instructors</span>
              </div>
            </div>

            {/* Custom Authorized Tutor Emails */}
            <div className="mt-5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Custom Authorized Tutor Emails
              </h4>

              {allowedTutorsList.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No custom tutor email overrides set. Default administrators and teachers have host permissions.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allowedTutorsList.map((email) => (
                    <div
                      key={email}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-900"
                    >
                      <span>👨‍🏫 {email}</span>
                      <button
                        type="button"
                        onClick={() => void handleRemoveAllowedTutor(email)}
                        className="text-red-500 hover:text-red-700 ml-1 font-black"
                        title="Revoke host authorization"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Tutor Form */}
              <form onSubmit={handleAddAllowedTutor} className="mt-3 flex max-w-md gap-2">
                <input
                  type="email"
                  value={newTutorEmail}
                  onChange={(e) => setNewTutorEmail(e.target.value)}
                  placeholder="e.g. instructor@brainlabacademy.com.ng"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  required
                />
                <button
                  type="submit"
                  disabled={savingTutors || !newTutorEmail.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingTutors ? "Saving…" : "+ Authorize Tutor"}
                </button>
              </form>
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
