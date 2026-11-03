"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

interface LiveClassItem {
  id: string;
  title: string;
  description?: string;
  status: "scheduled" | "live" | "completed" | "cancelled" | "draft";
  scheduled_start_at: string;
  scheduled_end_at: string;
  max_capacity: number;
  provider: string;
  is_recording_enabled: boolean;
  tutor_id: string;
  courses?: { title: string; slug: string };
  learning_subjects?: { name: string; slug: string };
}

export default function ClassroomLobbyPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState("BL-LIVE-101");
  const [isStaff, setIsStaff] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<StudentEntitlementsResult | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);

  // Live & Scheduled Classes State
  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classFilter, setClassFilter] = useState<"all" | "live" | "scheduled" | "completed">("all");

  // Create Class Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createCapacity, setCreateCapacity] = useState(100);
  const [createRecording, setCreateRecording] = useState(true);
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  // Load Classes from API
  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch("/api/classroom/classes", { cache: "no-store" });
      const data = await res.json();
      if (data.classes) {
        setClasses(data.classes);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    async function checkRole() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || null);

        const isAdmin = await isCurrentUserAdmin(user.id);
        if (isAdmin) {
          setIsStaff(true);
        } else if (user.email) {
          const { getLiveClassroomConfig } = await import("@/app/lib/platformConfig");
          const config = await getLiveClassroomConfig();
          if (config.allowed_tutor_emails?.map((e) => e.toLowerCase()).includes(user.email.toLowerCase())) {
            setIsStaff(true);
          }
        }

        const tier = await getStudentSubscriptionAndEntitlements(user.id);
        setSubscriptionInfo(tier);
        if (!isAdmin && (!tier.isSubscribed || tier.planId === "free")) {
          const { nudgeLiveClassroom } = await import("@/app/lib/proNudge");
          void nudgeLiveClassroom();
        }
      } else {
        const tier = await getStudentSubscriptionAndEntitlements();
        setSubscriptionInfo(tier);
      }
    }
    void checkRole();
    void fetchClasses();
  }, [fetchClasses]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = classCode.trim().toUpperCase() || "BL-LIVE-101";
    router.push(`/classroom/${encodeURIComponent(code)}`);
  };

  // Create Class Submission
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !createStart || !createEnd) {
      toast.error("Please fill in the class title, start time, and end time.");
      return;
    }

    setIsSubmittingClass(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch("/api/classroom/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDescription.trim(),
          scheduled_start_at: new Date(createStart).toISOString(),
          scheduled_end_at: new Date(createEnd).toISOString(),
          max_capacity: createCapacity,
          is_recording_enabled: createRecording,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule class.");

      toast.success("Live class scheduled successfully!");
      setShowCreateModal(false);
      setCreateTitle("");
      setCreateDescription("");
      void fetchClasses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error creating class.");
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const filteredClasses = classes.filter((c) => {
    if (classFilter === "live") return c.status === "live";
    if (classFilter === "scheduled") return c.status === "scheduled";
    if (classFilter === "completed") return c.status === "completed";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white transition-colors duration-200">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12 space-y-10">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>BrainLab Academy Live Learning &amp; Studio Stage</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Live Virtual Classroom &amp; Studio
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Participate in real-time tutor masterclasses, write derivations on the interactive smart whiteboard, or use the Video Lesson Studio to produce lessons offline.
          </p>
        </div>

        {/* 3 Core Capability Cards */}
        <div className="grid gap-5 sm:grid-cols-3">
          {/* Card 1: Live Interactive Classroom */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-6 flex flex-col justify-between shadow-xl transition hover:border-blue-500/40">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                  Interactive Stage
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Now
                </span>
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">BrainLab Main Stage</h2>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect directly to our high-capacity lecture stage with LiveKit audio/video, synchronized whiteboard derivations, and live polls.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/classroom/BL-LIVE-101"
                className="inline-flex items-center justify-center rounded-xl bg-[#1356E8] hover:bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95 text-center"
              >
                Enter Main Stage (BL-LIVE-101) →
              </Link>
            </div>
          </div>

          {/* Card 2: Video Lesson Studio */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-6 flex flex-col justify-between shadow-xl transition hover:border-amber-500/40">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                  Lesson Production
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Offline / Independent
                </span>
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">Video Lesson Studio</h2>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Produce professional video lessons with draggable PiP camera, ✍️ laser pointer, PowerPoint/PDF slides, and direct phone/desktop downloads.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/classroom/studio"
                className="inline-flex w-full items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-black text-amber-800 dark:text-amber-300 transition text-center active:scale-95"
              >
                Launch Lesson Studio →
              </Link>
            </div>
          </div>

          {/* Card 3: Teaching & Video Library */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-6 flex flex-col justify-between shadow-xl transition hover:border-emerald-500/40">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Cloud Archive
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Reusable
                </span>
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">Teaching &amp; Video Library</h2>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Access your saved lesson projects, recorded lecture videos, slide presentation assets, and reusable whiteboard derivations.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/classroom/library"
                className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2.5 text-xs font-black text-emerald-800 dark:text-emerald-300 transition text-center active:scale-95"
              >
                Browse Teaching Library →
              </Link>
            </div>
          </div>
        </div>

        {/* Join by Class Code Box */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/60 p-6 sm:p-8 shadow-xl backdrop-blur">
          <form onSubmit={handleJoin} className="space-y-4 max-w-lg mx-auto">
            <div>
              <label htmlFor="class-code" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Join Classroom by Code
              </label>
              <div className="flex gap-2">
                <input
                  id="class-code"
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="e.g. BL-LIVE-101"
                  className="flex-1 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#070d1e] px-4 py-3 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#1356E8] hover:bg-blue-600 active:scale-95 px-6 py-3 text-xs font-black text-white shadow-lg transition"
                >
                  Join Stage →
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ================================================================== */}
        {/* LIVE & SCHEDULED CLASSES DASHBOARD TABLE (Section 5.1 Requirements) */}
        {/* ================================================================== */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1536]/80 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Classroom Schedule &amp; Live Sessions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track upcoming tutor lectures, active live classes, and completed session archives.
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

              {/* Schedule New Class Action for Tutors/Staff */}
              {isStaff && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-xl bg-gradient-to-r from-[#1356E8] to-blue-600 hover:from-blue-600 hover:to-blue-500 px-4 py-2 text-xs font-black text-white shadow-lg transition active:scale-95"
                >
                  ＋ Schedule Class
                </button>
              )}
            </div>
          </div>

          {/* Classes Table */}
          {loadingClasses ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Loading classroom schedule...
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <span className="text-3xl">📅</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No classes matching the selected filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="pb-3">Class Title</th>
                    <th className="pb-3">Subject / Course</th>
                    <th className="pb-3">Scheduled Time</th>
                    <th className="pb-3">Capacity</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredClasses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 pr-3">
                        <span className="block font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        {item.description && (
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {item.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-3 text-slate-600 dark:text-slate-300">
                        {item.learning_subjects?.name || item.courses?.title || "General Lecture"}
                      </td>
                      <td className="py-3.5 pr-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {new Date(item.scheduled_start_at).toLocaleDateString()} ·{" "}
                        {new Date(item.scheduled_start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3.5 pr-3 text-slate-500 dark:text-slate-400">
                        max {item.max_capacity}
                      </td>
                      <td className="py-3.5 pr-3">
                        {item.status === "live" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Now
                          </span>
                        ) : item.status === "completed" ? (
                          <span className="rounded-full bg-slate-500/20 border border-slate-500/30 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            Completed
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            Scheduled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/classroom/${item.id}`}
                          className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-black transition active:scale-95 ${
                            item.status === "live"
                              ? "bg-[#1356E8] hover:bg-blue-600 text-white shadow-md"
                              : "border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {item.status === "live" ? "Enter Class →" : "View Details"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Role & Notification Footer */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          Signed in as: <span className="font-semibold text-slate-700 dark:text-slate-300">{userEmail || "Learner"}</span>{" "}
          {isStaff ? (
            <span className="ml-1 inline-flex items-center gap-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 font-bold text-[10px]">
              Tutor &amp; Administrator Mode
            </span>
          ) : (
            <span className="ml-1 inline-flex items-center gap-1 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 font-bold text-[10px]">
              Student Mode · Tier: {subscriptionInfo?.planName || "Free"}
            </span>
          )}
        </div>

        {/* Tier Entitlement Gate Modal */}
        <TierGateModal
          isOpen={!isStaff && showTierModal}
          onClose={() => setShowTierModal(false)}
          featureTitle="Live Academic Classrooms"
          featureDescription="Real-time interactive tutor sessions with synchronized live whiteboard, math formulas, instant classroom polls, and direct question broadcast are included with Premium Study, Plus, and Pro tiers."
          requiredTierName="Premium Study"
          currentPlanName={subscriptionInfo?.planName || "Free Learner"}
        />
        <DeviceNotificationPrompt />

        {/* ================================================================== */}
        {/* SCHEDULE NEW CLASS MODAL (Tutor / Staff Only) */}
        {/* ================================================================== */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0B1536] p-6 sm:p-8 text-white shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-lg font-black text-white">Schedule New Live Class</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Class Title *
                  </label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. JAMB Mathematics: Calculus & Graphs Speed Drill"
                    className="w-full rounded-xl border border-white/15 bg-[#070d1e] p-3 text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Description &amp; Goals
                  </label>
                  <textarea
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    rows={2}
                    placeholder="Key concepts to cover, expected practice exercises..."
                    className="w-full rounded-xl border border-white/15 bg-[#070d1e] p-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={createStart}
                      onChange={(e) => setCreateStart(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-[#070d1e] p-2.5 text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                      End Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={createEnd}
                      onChange={(e) => setCreateEnd(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-[#070d1e] p-2.5 text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Max Student Capacity
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      value={createCapacity}
                      onChange={(e) => setCreateCapacity(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/15 bg-[#070d1e] p-2.5 text-white outline-none"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={createRecording}
                        onChange={(e) => setCreateRecording(e.target.checked)}
                        className="rounded accent-[#1356E8] h-4 w-4"
                      />
                      <span>Enable Recording</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClass}
                    className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-5 py-2 text-xs font-black text-white shadow-lg disabled:opacity-50 transition active:scale-95"
                  >
                    {isSubmittingClass ? "Scheduling..." : "Create Live Class"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
