"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import TierGateModal from "@/app/components/TierGateModal";
import DeviceNotificationPrompt from "@/app/components/DeviceNotificationPrompt";
import { toast } from "@/app/lib/toast";
import {
  requestDeviceNotificationPermission,
  sendDeviceNotification,
} from "@/app/lib/clientNotifications";
import {
  getStudentSubscriptionAndEntitlements,
  isCurrentUserAdmin,
  type StudentEntitlementsResult,
} from "@/app/lib/subscriptionEntitlements";
import { DEFAULT_JAMB_SYLLABUS } from "@/app/lib/curriculumData";

interface LiveClassItem {
  id: string;
  title: string;
  description?: string;
  status: "scheduled" | "live" | "completed" | "cancelled" | "draft";
  scheduled_start_at: string;
  scheduled_end_at?: string;
  max_capacity: number;
  provider: string;
  is_recording_enabled: boolean;
  tutor_id: string;
  courses?: { title: string; slug: string };
  learning_subjects?: { name: string; slug: string };
}

function ClassroomLobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query pre-fills
  const initialCode = searchParams.get("code") || "BL-LIVE-101";

  const [classCode, setClassCode] = useState(initialCode);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Learner");
  const [subscriptionInfo, setSubscriptionInfo] = useState<StudentEntitlementsResult | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);

  // Portal View Mode: "tutor" | "student"
  const [portalMode, setPortalMode] = useState<"tutor" | "student">("student");

  // Inline Tutor Sign-In Modal
  const [showTutorAuthModal, setShowTutorAuthModal] = useState(false);
  const [tutorAuthEmail, setTutorAuthEmail] = useState("");
  const [tutorAuthPassword, setTutorAuthPassword] = useState("");
  const [tutorAuthBusy, setTutorAuthBusy] = useState(false);
  const [tutorAuthError, setTutorAuthError] = useState<string | null>(null);

  // Live & Scheduled Classes State
  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classFilter, setClassFilter] = useState<"all" | "live" | "scheduled" | "completed">("all");

  // Create Class Modal State (Tutor Only)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createCapacity, setCreateCapacity] = useState(100);
  const [createRecording, setCreateRecording] = useState(true);
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);
  const [isLaunchingInstant, setIsLaunchingInstant] = useState(false);
  const [isBroadcastingAlert, setIsBroadcastingAlert] = useState(false);
  const [selectedCurriculumSubject, setSelectedCurriculumSubject] = useState("");
  const [selectedCurriculumTopic, setSelectedCurriculumTopic] = useState("");

  // Load Classes from API
  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch("/api/classroom/classes", { cache: "no-store" });
      let data: any = { classes: [] };
      try { const _t = await res.text(); data = JSON.parse(_t); } catch { /* non-blocking */ }
      if (data.classes) {
        setClasses(data.classes);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  const checkUserRoleAndAuth = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    let adminCacheUser: any = null;
    let hasAdminCache = false;
    if (typeof window !== "undefined") {
      try {
        const sc = sessionStorage.getItem("brainlab_admin_session_cache");
        if (sc) {
          const parsed = JSON.parse(sc);
          if (parsed?.user) adminCacheUser = parsed.user;
        }
        if (sessionStorage.getItem("brainlab_admin_pin_verified") === "true") {
          hasAdminCache = true;
        }
        const lc = localStorage.getItem("admin_user");
        if (lc) {
          const parsedL = JSON.parse(lc);
          if (parsedL) adminCacheUser = adminCacheUser || parsedL;
        }
      } catch {}
    }

    if (user) {
      setUserId(user.id);
      setUserEmail(user.email || null);
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";
      setUserName(name);

      const isAdmin = (await isCurrentUserAdmin(user.id)) || hasAdminCache || Boolean(adminCacheUser);
      setIsAdminUser(isAdmin);
      let staffIdentified = isAdmin;

      const metaRole = String(
        user.user_metadata?.role || user.app_metadata?.role || ""
      ).toLowerCase();
      if (
        metaRole === "tutor" ||
        metaRole === "teacher" ||
        metaRole.includes("admin")
      ) {
        staffIdentified = true;
      }

      if (!staffIdentified && user.email) {
        const { getLiveClassroomConfig } = await import("@/app/lib/platformConfig");
        const config = await getLiveClassroomConfig();
        if (config.allowed_tutor_emails?.map((e) => e.toLowerCase()).includes(user.email.toLowerCase())) {
          staffIdentified = true;
        }
      }

      if (staffIdentified) {
        setIsStaff(true);
        setPortalMode("tutor"); // Auto-route verified tutors to Tutor Teaching Station
      } else {
        setIsStaff(false);
        setPortalMode("student");
      }

      const tier = await getStudentSubscriptionAndEntitlements(user.id);
      setSubscriptionInfo(tier);
    } else {
      if (adminCacheUser || hasAdminCache) {
        setUserId(adminCacheUser?.id || "admin-host");
        setUserEmail(adminCacheUser?.email || "admin@brainlabacademy.com.ng");
        setUserName(adminCacheUser?.name || adminCacheUser?.email?.split("@")[0] || "Instructor");
        setIsStaff(true);
        setIsAdminUser(true);
        setPortalMode("tutor");
      } else {
        setUserId(null);
        setUserEmail(null);
        setIsStaff(false);
        setIsAdminUser(false);
        setPortalMode("student");
      }
      const tier = await getStudentSubscriptionAndEntitlements();
      setSubscriptionInfo(tier);
    }
  }, []);

  useEffect(() => {
    void checkUserRoleAndAuth();
    void fetchClasses();
  }, [checkUserRoleAndAuth, fetchClasses]);

  // Handle Tutor Direct Sign In
  const handleTutorSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setTutorAuthBusy(true);
    setTutorAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: tutorAuthEmail.trim(),
        password: tutorAuthPassword,
      });

      if (error || !data.session) {
        throw new Error(error?.message || "Invalid tutor credentials.");
      }

      toast.success("Signed in successfully! Verifying instructor permissions…");
      setShowTutorAuthModal(false);
      await checkUserRoleAndAuth();
      await fetchClasses();
    } catch (err: unknown) {
      setTutorAuthError((err instanceof Error ? err.message : null) || "Failed to sign in. Check your instructor email and password.");
    } finally {
      setTutorAuthBusy(false);
    }
  };

  // Student Join Live Class Action
  const handleStudentJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = classCode.trim().toUpperCase() || "BL-LIVE-101";

    // Subscription entitlement gate for students
    if (subscriptionInfo && (!subscriptionInfo.isSubscribed || subscriptionInfo.planId === "free")) {
      const isFreeStage = code === "BL-LIVE-101";
      if (!isFreeStage && !isStaff && !isAdminUser) {
        setShowTierModal(true);
        return;
      }
    }

    if (isStaff || isAdminUser) {
      router.push(`/classroom/${code}?role=host`);
    } else {
      router.push(`/classroom/${code}`);
    }
  };

  // Tutor Launch Instant Stage
  const handleLaunchInstantClass = async () => {
    setIsLaunchingInstant(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      let user = sessionData?.session?.user;

      if (!user && typeof window !== "undefined") {
        try {
          const sc = sessionStorage.getItem("brainlab_admin_session_cache");
          if (sc) {
            const parsed = JSON.parse(sc);
            if (parsed?.user) user = parsed.user;
          }
          if (!user) {
            const lc = localStorage.getItem("admin_user");
            if (lc) user = JSON.parse(lc);
          }
        } catch {}
      }

      if (!user) {
        toast.error("Please sign in with your instructor account to launch a live stage.");
        setShowTutorAuthModal(true);
        setIsLaunchingInstant(false);
        return;
      }

      // Best-effort authoritative start for BL-LIVE-101
      try {
        await fetch(`/api/classroom/classes/BL-LIVE-101/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ asHost: true }),
        });
      } catch (startErr) {
        console.warn("[classroom] Background stage start notice:", startErr);
      }

      toast.success("Academic stage launched! Entering host cockpit…");
      router.push("/classroom/BL-LIVE-101?role=host");
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || "Could not launch stage.");
    } finally {
      setIsLaunchingInstant(false);
    }
  };

  // Tutor Start a Scheduled Class
  const handleStartScheduledClass = async (classItem: LiveClassItem) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const user = sessionData.session?.user;

      if (!user) {
        toast.error("Please sign in with your instructor account to start this class.");
        setShowTutorAuthModal(true);
        return;
      }

      const res = await fetch(`/api/classroom/classes/${classItem.id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 403) {
        setShowTutorAuthModal(true);
        toast.error("Only the assigned instructor or platform administrator can start this class.");
        return;
      }

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${res.status} (${res.statusText || "HTML Error"}). Please retry.`);
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to start class session.");
      }

      toast.success(`Stage started for "${classItem.title}"! Entering live room…`);
      router.push(`/classroom/${classItem.id}`);
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || "Could not start scheduled class.");
    }
  };

  // Tutor Create New Scheduled Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaff) return;
    setIsSubmittingClass(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Authentication required.");

      const payload = {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        scheduled_start_at: new Date(createStart).toISOString(),
        scheduled_end_at: createEnd ? new Date(createEnd).toISOString() : undefined,
        max_capacity: Number(createCapacity) || 100,
        is_recording_enabled: createRecording,
        provider: "livekit",
      };

      const res = await fetch("/api/classroom/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let json: any = null;
      try { const _t = await res.text(); json = JSON.parse(_t); } catch { throw new Error("Server error scheduling class. Please retry."); }
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to schedule class.");
      }

      toast.success("Masterclass scheduled successfully!");
      setShowCreateModal(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateStart("");
      setCreateEnd("");
      await fetchClasses();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || "Failed to schedule class.");
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Class code "${code}" copied to clipboard! Share with your students.`);
  };

  const handleWhatsAppShare = (roomCode = "BL-LIVE-101", title = "Academic Masterclass") => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://brainlabexam-cbt.vercel.app";
    const link = `${origin}/classroom/${roomCode.trim()}`;
    const text = `🎓 *BrainLab Live Academic Masterclass*\n📌 *Topic:* ${title}\n🎙️ *Format:* Interactive Audio, Whiteboard Derivations & Live Quizzes\n🔗 *Join Room Now:* ${link}\n\n_Works directly in phone or PC browser. No download required._`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleBroadcastAlert = async (roomCode = "BL-LIVE-101", title = "Live Class In Session") => {
    setIsBroadcastingAlert(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Please sign in before sending a classroom alert.");
        return;
      }

      const res = await fetch("/api/classroom/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId: roomCode.trim(),
          title: title,
          topic: "Interactive Classroom with Instructor",
        }),
      });

      let json: any = {};
      try { const _t = await res.text(); json = JSON.parse(_t); } catch { /* non-blocking */ }
      if (res.ok && json.success) {
        toast.success(json.message || "Live classroom alert dispatched to all students!");
      } else {
        toast.error(json.error || "Could not dispatch alert.");
      }
    } catch {
      toast.error("Network error dispatching alert.");
    } finally {
      setIsBroadcastingAlert(false);
    }
  };

  const filteredClasses = classes.filter((c) => {
    if (classFilter === "live") return c.status === "live";
    if (classFilter === "scheduled") return c.status === "scheduled";
    if (classFilter === "completed") return c.status === "completed";
    return true;
  });

  const liveClassesNow = classes.filter((c) => c.status === "live");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white transition-colors duration-200">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-10 space-y-8">
        
        {/* ================================================================== */}
        {/* TOP ROLE BAR & AUTHENTICATION IDENTIFICATION */}
        {/* ================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0B1536]/80 p-3.5 backdrop-blur-md shadow-sm">
          {/* Identity Pill */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#1356E8] to-blue-400 flex items-center justify-center text-white font-black text-sm shadow-md">
              {portalMode === "tutor" ? "👨‍🏫" : "🎓"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {userId ? userName : "Guest Learner"}
                </span>
                {isStaff ? (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                    Verified Instructor
                  </span>
                ) : userId ? (
                  <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.2 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    Student Account
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-500/15 border border-slate-500/30 px-2 py-0.2 text-[10px] font-bold text-slate-500">
                    Not Signed In
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {userId ? userEmail : "Sign in to track attendance, save lecture notes, and participate in live polls"}
              </p>
            </div>
          </div>

          {/* Right Action: Sign In buttons OR Portal Switcher */}
          <div className="flex items-center gap-2">
            {!userId ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTutorAuthModal(true)}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300 transition active:scale-95 shadow-sm"
                >
                  👨‍🏫 Instructor Sign In
                </button>
                <Link
                  href="/account?redirect=/classroom"
                  className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-3.5 py-1.5 text-xs font-black text-white shadow-md transition active:scale-95"
                >
                  🎓 Student Sign In
                </Link>
              </div>
            ) : isStaff ? (
              /* Tutor / Admin Portal Switcher */
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setPortalMode("tutor")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition flex items-center gap-1.5 ${
                    portalMode === "tutor"
                      ? "bg-[#1356E8] text-white shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:text-white"
                  }`}
                >
                  <span>👨‍🏫 Tutor Station</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalMode("student")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    portalMode === "student"
                      ? "bg-slate-700 text-white shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🎓 Student View</span>
                </button>
                {isAdminUser && (
                  <Link
                    href="/admin/classroom"
                    className="rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 transition flex items-center gap-1"
                    title="Open Live Classroom Platform Governance & LiveKit Settings"
                  >
                    <span>⚙️</span>
                    <span className="hidden sm:inline">Governance</span>
                  </Link>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowTutorAuthModal(true)}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Are you an instructor? Sign in with tutor account →
              </button>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* 1. TUTOR PORTAL (TEACHING COCKPIT & RESPONSIBILITIES) */}
        {/* ================================================================== */}
        {portalMode === "tutor" && isStaff && (
          <section className="space-y-6 animate-fade-in">
            {/* Tutor Header Hero */}
            <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-[#0B1536] via-[#0d1c47] to-[#070d1e] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10 space-y-3 max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-0.5 text-xs font-black text-amber-300">
                  <span>👨‍🏫 Authoritative Teaching Cockpit</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  Instructor Station &amp; Live Stage
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Only authorized instructors can launch live classes, start recordings, mute participants, and write on the synchronized whiteboard. Students cannot start sessions.
                </p>

                {/* Primary Tutor Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleLaunchInstantClass}
                    disabled={isLaunchingInstant}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-3 text-xs font-black text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                  >
                    <span>🚀</span>
                    <span>{isLaunchingInstant ? "Launching Stage…" : "Launch Instant Stage (Host)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#1356E8] hover:bg-blue-600 px-5 py-3 text-xs font-black text-white shadow-xl transition active:scale-95"
                  >
                    <span>📅</span>
                    <span>Schedule Masterclass</span>
                  </button>

                  <Link
                    href="/classroom/studio"
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-5 py-3 text-xs font-bold text-white transition active:scale-95 backdrop-blur"
                  >
                    <span>🎥</span>
                    <span>Video Lesson Studio (Offline)</span>
                  </Link>

                  <Link
                    href="/classroom/library"
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-5 py-3 text-xs font-bold text-white transition active:scale-95 backdrop-blur"
                  >
                    <span>📚</span>
                    <span>Teaching Library</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Link to Standard Main Stage */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Default General Stage Code
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Main Academic Stage (BL-LIVE-101)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  General stage for quick revisions and open lectures. Entering as instructor automatically opens the room for waiting students.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyCodeToClipboard("BL-LIVE-101")}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  📋 Copy Code
                </button>
                <button
                  type="button"
                  onClick={handleLaunchInstantClass}
                  className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-md transition active:scale-95"
                >
                  Launch &amp; Enter as Host →
                </button>
              </div>
            </div>

            {/* Tutor Broadcast, Outreach & Attendance Utilities */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* WhatsApp Broadcast Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">📢</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      WhatsApp Broadcast
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Invite students directly via WhatsApp groups with formatted stage link &amp; topic summary.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleWhatsAppShare("BL-LIVE-101", "JAMB Speed Drill Masterclass")}
                  className="mt-3.5 w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition text-center"
                >
                  Share to WhatsApp Group →
                </button>
              </div>

              {/* In-App Alert Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔔</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      In-App Student Alert
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Push an urgent live banner alert to all learners currently online on the platform.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isBroadcastingAlert}
                  onClick={() => handleBroadcastAlert("BL-LIVE-101", "Live Academic Stage Now Active")}
                  className="mt-3.5 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 transition text-center disabled:opacity-50"
                >
                  {isBroadcastingAlert ? "Dispatching…" : "Send In-App Alert →"}
                </button>
              </div>

              {/* Attendance Records Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">📥</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Attendance Records
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Download verified attendance CSV logs showing join/leave timestamps and active minutes.
                  </p>
                </div>
                <a
                  href="/api/classroom/attendance?classId=BL-LIVE-101&format=csv"
                  download="attendance-BL-LIVE-101.csv"
                  className="mt-3.5 block w-full rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 transition text-center"
                >
                  Download CSV Log →
                </a>
              </div>
            </div>

            {/* Official JAMB UTME Syllabus Fast-Track Selector */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Curriculum Integration
                  </span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Official JAMB UTME Syllabus Fast-Track
                  </h4>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Select a topic to quickly launch or prefill a scheduled masterclass
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Subject
                  </label>
                  <select
                    value={selectedCurriculumSubject}
                    onChange={(e) => {
                      const slug = e.target.value;
                      setSelectedCurriculumSubject(slug);
                      setSelectedCurriculumTopic("");
                      const subj = DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === slug);
                      if (subj && subj.topics.length > 0) {
                        setSelectedCurriculumTopic(subj.topics[0].id);
                        setCreateTitle(`JAMB UTME ${subj.name}: ${subj.topics[0].title}`);
                        setCreateDescription(subj.topics[0].subtopics.slice(0, 3).join(", "));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Syllabus Subject --</option>
                    {DEFAULT_JAMB_SYLLABUS.map((subj) => (
                      <option key={subj.slug} value={subj.slug}>
                        {subj.name} ({subj.topics.length} topics)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Syllabus Topic
                  </label>
                  <select
                    value={selectedCurriculumTopic}
                    disabled={!selectedCurriculumSubject}
                    onChange={(e) => {
                      const topId = e.target.value;
                      setSelectedCurriculumTopic(topId);
                      const subj = DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === selectedCurriculumSubject);
                      const top = subj?.topics.find((t) => t.id === topId);
                      if (subj && top) {
                        setCreateTitle(`JAMB UTME ${subj.name}: ${top.title}`);
                        setCreateDescription(top.subtopics.slice(0, 3).join(", "));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">-- Choose Syllabus Topic --</option>
                    {DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === selectedCurriculumSubject)?.topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.order_index}. {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCurriculumTopic && (
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ready to teach this topic?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                    >
                      Schedule as Masterclass →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const subj = DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === selectedCurriculumSubject);
                        const top = subj?.topics.find((t) => t.id === selectedCurriculumTopic);
                        handleWhatsAppShare("BL-LIVE-101", `JAMB UTME ${subj?.name}: ${top?.title}`);
                      }}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition"
                    >
                      Share Topic to WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================================================================== */}
        {/* 2. STUDENT PORTAL (LEARNING COCKPIT & SAFE WAITING ROOM) */}
        {/* ================================================================== */}
        {portalMode === "student" && (
          <section className="space-y-6 animate-fade-in">
            {/* Student Header Hero */}
            <div className="text-center space-y-3 py-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>BrainLab Live Academic Classroom • Student Hub</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                Live Interactive Lectures
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                Join real-time lectures led by verified BrainLab tutors. Write questions, participate in instant polls, and follow derivations on the whiteboard.
              </p>
            </div>

            {/* Student Class Code Input Box */}
            <div className="max-w-xl mx-auto rounded-3xl border border-blue-500/30 bg-white dark:bg-[#0B1536]/90 p-6 sm:p-8 shadow-2xl backdrop-blur">
              <form onSubmit={handleStudentJoin} className="space-y-4">
                <div className="text-left space-y-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Enter Class Code / Room ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={classCode}
                      onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                      placeholder="e.g. BL-LIVE-101 or 6-digit code"
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#070d1e] px-4 py-3.5 text-sm sm:text-base font-black text-slate-900 dark:text-white outline-none focus:border-[#1356E8] tracking-widest placeholder:tracking-normal placeholder:font-normal"
                      required
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-2 bottom-2 rounded-xl bg-gradient-to-r from-[#1356E8] to-blue-600 hover:from-blue-600 hover:to-blue-500 px-5 text-xs font-black text-white shadow-lg transition active:scale-95"
                    >
                      {isStaff || isAdminUser ? "Enter Stage as Host →" : "Enter Class →"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 text-left">
                  <span>🔒</span>
                  <span>Classes are conducted by BrainLab instructors. If the tutor has not started yet, you will safely wait in the waiting room.</span>
                </div>
              </form>
            </div>

            {/* Live Now: Active Tutor Stages */}
            {liveClassesNow.length > 0 && (
              <div className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/5 p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-base font-black text-emerald-800 dark:text-emerald-300">
                    Active Stages (Tutors Teaching Live Right Now)
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {liveClassesNow.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-[#0B1536] p-4 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-black px-1.5 py-0.5">
                            LIVE
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500">{c.id}</span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                          {c.title}
                        </h4>
                      </div>
                      <Link
                        href={`/classroom/${c.id}`}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-md transition active:scale-95 shrink-0"
                      >
                        Join Now →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================================================================== */}
        {/* 3. CLASSROOM SCHEDULE & SESSIONS DIRECTORY (Shared by Both) */}
        {/* ================================================================== */}
        <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Classroom Schedule &amp; Academic Stages
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track upcoming masterclasses, live lectures, and completed session archives.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                {(["all", "live", "scheduled", "completed"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setClassFilter(tab)}
                    className={`rounded-lg px-3 py-1 font-bold capitalize transition ${
                      classFilter === tab
                        ? "bg-[#1356E8] text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                type="button"
                onClick={fetchClasses}
                className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 p-2 text-xs text-slate-600 dark:text-slate-300 transition"
                title="Refresh Schedule"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Classes Table */}
          {loadingClasses ? (
            <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
              Loading scheduled academic classes…
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <span className="text-3xl">📅</span>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                No classes match the &quot;{classFilter}&quot; filter.
              </p>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#1356E8] px-4 py-2 text-xs font-black text-white hover:bg-blue-600 shadow-md"
                >
                  <span>＋ Schedule a Masterclass</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Class Details</th>
                    <th className="pb-3 px-4">Subject</th>
                    <th className="pb-3 px-4">Scheduled Time</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredClasses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 pr-4">
                        <div className="font-black text-slate-900 dark:text-white text-sm">
                          {item.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Code: {item.id}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-600 dark:text-slate-300">
                        {item.learning_subjects?.name || item.courses?.title || "General Lecture"}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(item.scheduled_start_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        ·{" "}
                        {new Date(item.scheduled_start_at).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.status === "live" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Live Now
                          </span>
                        ) : item.status === "scheduled" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            Scheduled
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            {item.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Copy code button */}
                          <button
                            type="button"
                            onClick={() => copyCodeToClipboard(item.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            title="Copy Class Code"
                          >
                            📋
                          </button>

                          {/* Action Button: Tutor starts, Student enters */}
                          {isStaff && item.status !== "completed" ? (
                            <button
                              type="button"
                              onClick={() => handleStartScheduledClass(item)}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-white shadow-xs transition active:scale-95"
                            >
                              🚀 {item.status === "live" ? "Enter Live" : "Start Stage"}
                            </button>
                          ) : item.status === "live" ? (
                            <Link
                              href={`/classroom/${item.id}`}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-white shadow-xs transition active:scale-95"
                            >
                              Join Live →
                            </Link>
                          ) : (
                            <Link
                              href={`/classroom/${item.id}`}
                              className="rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition"
                            >
                              Waiting Room →
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ================================================================== */}
        {/* INLINE TUTOR AUTHENTICATION MODAL */}
        {/* ================================================================== */}
        {showTutorAuthModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowTutorAuthModal(false)}
          >
            <div
              className="max-w-md w-full rounded-3xl border border-amber-500/40 bg-[#0B1536] p-6 sm:p-8 text-white shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👨‍🏫</span>
                  <h3 className="text-base font-black text-white">BrainLab Instructor Sign In</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTutorAuthModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Enter your instructor account credentials to access the authoritative Teaching Cockpit, launch instant live stages, write on the synchronized whiteboard, and moderate participants.
              </p>

              {tutorAuthError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {tutorAuthError}
                </div>
              )}

              <form onSubmit={handleTutorSignIn} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Instructor Email
                  </label>
                  <input
                    type="email"
                    value={tutorAuthEmail}
                    onChange={(e) => setTutorAuthEmail(e.target.value)}
                    placeholder="tutor@brainlab.ng"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    value={tutorAuthPassword}
                    onChange={(e) => setTutorAuthPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTutorAuthModal(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={tutorAuthBusy}
                    className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 px-5 py-2 text-xs font-black text-slate-950 shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    {tutorAuthBusy ? "Verifying Instructor…" : "Sign In as Tutor →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SCHEDULE MASTERCLASS MODAL (Tutor Only) */}
        {/* ================================================================== */}
        {showCreateModal && isStaff && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowCreateModal(false)}
          >
            <div
              className="max-w-lg w-full rounded-3xl border border-blue-500/40 bg-[#0B1536] p-6 sm:p-8 text-white shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <h3 className="text-base font-black text-white">Schedule New Masterclass</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Masterclass Title *
                  </label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Organic Chemistry & Reaction Mechanisms Masterclass"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Description &amp; Learning Objectives
                  </label>
                  <textarea
                    rows={2}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Key concepts to cover, target students, homework review..."
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={createStart}
                      onChange={(e) => setCreateStart(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      End Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={createEnd}
                      onChange={(e) => setCreateEnd(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Max Capacity
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      value={createCapacity}
                      onChange={(e) => setCreateCapacity(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-5 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="rec-check"
                      checked={createRecording}
                      onChange={(e) => setCreateRecording(e.target.checked)}
                      className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0"
                    />
                    <label htmlFor="rec-check" className="text-xs text-slate-300">
                      Enable Cloud Video Recording
                    </label>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClass}
                    className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-5 py-2 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingClass ? "Scheduling…" : "Publish Masterclass Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Subscription Tier Gate Modal */}
      <TierGateModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        requiredTierName="BrainLab Pro"
        featureTitle="BrainLab Academic Masterclasses & Live Stage"
        featureDescription="Interactive live classes with verified tutors require an active BrainLab Pro or Premium subscription."
      />
    </div>
  );
}

export default function ClassroomLobbyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">Loading Live Classroom…</div>}>
      <ClassroomLobbyContent />
    </Suspense>
  );
}
