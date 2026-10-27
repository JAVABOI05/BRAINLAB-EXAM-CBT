"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import TierGateModal from "@/app/components/TierGateModal";
import DeviceNotificationPrompt from "@/app/components/DeviceNotificationPrompt";
import {
  requestDeviceNotificationPermission,
  sendDeviceNotification,
} from "@/app/lib/clientNotifications";
import {
  getStudentSubscriptionAndEntitlements,
  isCurrentUserAdmin,
  type StudentEntitlementsResult,
} from "@/app/lib/subscriptionEntitlements";

export default function ClassroomLobbyPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState("BL-LIVE-101");
  const [isStaff, setIsStaff] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<StudentEntitlementsResult | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);

  useEffect(() => {
    async function checkRole() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        setUserEmail(user.email || null);

        // Check if user is an Administrator or authorized tutor
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
      } else {
        const tier = await getStudentSubscriptionAndEntitlements();
        setSubscriptionInfo(tier);
      }
    }
    void checkRole();
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = classCode.trim().toUpperCase() || "BL-LIVE-101";
    router.push(`/classroom/${encodeURIComponent(code)}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Modernized Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 px-4 sm:px-6 py-3 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5 transition active:scale-95" aria-label="Home">
              <Image
                src="/brainlab-mark.png"
                alt="BrainLab Emblem"
                width={36}
                height={32}
                priority
                className="h-8 w-auto drop-shadow-sm group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col justify-center leading-none">
                <span className="text-base sm:text-lg font-black tracking-tight text-white">BrainLab</span>
                <span className="text-[9px] font-black tracking-[0.2em] uppercase text-cyan-400">ACADEMY</span>
              </div>
            </Link>
            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">/</span>
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Classrooms</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/cbt"
              className="hidden md:inline-flex rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              CBT Practice
            </Link>
            <Link
              href="/learn"
              className="hidden md:inline-flex rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              Curriculum
            </Link>
            <Link
              href="/pricing"
              className="hidden md:inline-flex rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              Plans
            </Link>

            {/* Quick Admin Portal Button if Staff */}
            {isStaff && (
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 px-3 py-1.5 text-xs font-black text-amber-300 transition shadow-sm active:scale-95"
                title="Switch back to Admin Portal"
              >
                <span>👑</span>
                <span>Admin Portal</span>
              </Link>
            )}

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1.5" />
                <rect width="7" height="5" x="14" y="3" rx="1.5" />
                <rect width="7" height="9" x="14" y="12" rx="1.5" />
                <rect width="7" height="5" x="3" y="16" rx="1.5" />
              </svg>
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 flex flex-col justify-center">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Real-Time Learning Stage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            BrainLab Live Virtual Classroom
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Connect to live tutor lectures, participate in live polls, view real-time smart whiteboard derivations, and ask questions.
          </p>
        </div>

        {/* Join by Class Code Box */}
        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur">
          <form onSubmit={handleJoin} className="space-y-4 max-w-md mx-auto">
            <div>
              <label htmlFor="class-code" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Enter Class or Room Code
              </label>
              <div className="flex gap-2">
                <input
                  id="class-code"
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="e.g. BL-LIVE-101"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-mono font-bold text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition"
                >
                  Join Class →
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Default live session code: <span className="font-mono font-semibold text-slate-400">BL-LIVE-101</span>
              </p>
            </div>
          </form>
        </div>

        {/* Featured Stages & Navigation Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Main Stage */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-blue-500/40 transition">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  General Lecture
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Now
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">BrainLab Main Stage (BL-LIVE-101)</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                UTME, SSCE &amp; JAMB live revision class with synchronized whiteboard, low-bandwidth voice notes, and instant quizzes.
              </p>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <Link
                href="/classroom/BL-LIVE-101"
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition active:scale-95 text-center"
              >
                Enter Main Stage →
              </Link>
              <button
                type="button"
                onClick={async () => {
                  const { granted } = await requestDeviceNotificationPermission();
                  if (granted) {
                    await sendDeviceNotification("🔔 Live Classroom Alerts Active!", {
                      body: "You'll be alerted with a ring notification as soon as your tutor goes live on stage.",
                      url: "/classroom/BL-LIVE-101",
                    });
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-950/40 hover:bg-blue-900/60 px-3.5 py-2.5 text-xs font-bold text-blue-200 transition"
                title="Get a phone/browser notification when tutor starts live class"
              >
                <span>🔔</span>
                <span>Get Alerts</span>
              </button>
            </div>
          </div>

          {/* Tutor / Studio Board Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-amber-500/40 transition">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Instructor Tools
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {isStaff ? "👑 Tutor Access" : "🎓 Learner Preview"}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">Whiteboard Studio &amp; Lesson Prep</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Tutor lesson board with math formulas, science diagram tools, multipage notes, and classroom recording options.
              </p>
            </div>
            <div className="mt-5">
              <Link
                href="/classroom/studio"
                className="inline-flex w-full items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-300 transition"
              >
                Launch Whiteboard Studio 🎨
              </Link>
            </div>
          </div>
        </div>

        {/* User Role Indicator */}
        <div className="mt-8 text-center text-xs text-slate-500">
          Signed in as: <span className="font-semibold text-slate-400">{userEmail || "Learner"}</span>{" "}
          {isStaff ? (
            <span className="ml-1 inline-flex items-center gap-1 rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 font-bold text-[10px]">
              👑 Super Admin &amp; Staff Mode (Universal Access)
            </span>
          ) : (
            <span className="ml-1 inline-flex items-center gap-1 rounded bg-blue-500/20 text-blue-300 px-1.5 py-0.5 font-bold text-[10px]">
              🎓 Student Mode · Tier: {subscriptionInfo?.planName || "Free"}
            </span>
          )}
        </div>

        {/* Tier Entitlement Gate Modal - Suppressed for Staff */}
        <TierGateModal
          isOpen={!isStaff && showTierModal}
          onClose={() => setShowTierModal(false)}
          featureTitle="Live Academic Classrooms"
          featureDescription="Real-time interactive tutor sessions with synchronized live whiteboard, math formulas, instant classroom polls, and direct question broadcast are included with Premium Study, Plus, and Pro tiers."
          requiredTierName="Premium Study"
          currentPlanName={subscriptionInfo?.planName || "Free Learner"}
        />
        <DeviceNotificationPrompt />
      </main>
    </div>
  );
}
