"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function ClassroomLobbyPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState("BL-LIVE-101");
  const [isStaff, setIsStaff] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function checkRole() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        setUserEmail(user.email || null);
        const { data: adminRole } = await supabase
          .from("admin_user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (adminRole && ["super_admin", "platform_admin", "cbt_admin", "teacher"].includes(adminRole.role)) {
          setIsStaff(true);
        } else if (user.email) {
          const { getLiveClassroomConfig } = await import("@/app/lib/platformConfig");
          const config = await getLiveClassroomConfig();
          if (config.allowed_tutor_emails?.map((e) => e.toLowerCase()).includes(user.email.toLowerCase())) {
            setIsStaff(true);
          }
        }
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
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-lg font-black tracking-tight text-blue-400 hover:text-blue-300">
              BrainLab
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm font-bold text-slate-300">Live Academic Classrooms</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Back to Dashboard
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
            <div className="mt-5">
              <Link
                href="/classroom/BL-LIVE-101"
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow transition"
              >
                Enter Main Stage (BL-LIVE-101) →
              </Link>
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
              👑 Tutor &amp; Staff Mode
            </span>
          ) : (
            <span className="ml-1 inline-flex items-center gap-1 rounded bg-blue-500/20 text-blue-300 px-1.5 py-0.5 font-bold text-[10px]">
              🎓 Student Mode
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
