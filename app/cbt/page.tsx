"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import LeaderboardCard from "../components/LeaderboardCard";

const CONFIG = {
  whatsappNumber: "2349074310204",
  accessCodeMessage:
    "Good day BRAINLAB TUTORIALS, I would like to get my access code for the CBT exam. Please can I get more information on the registration and access process?",
  revisionMessage:
    "Good day BRAINLAB TUTORIALS, I would like to join your 2 weeks final JAMB revision class. Please can I get more information about the schedule, fee, and how to register?",
};

export default function CBTExamPortalPage() {
  const router = useRouter();

  const [loadingSession, setLoadingSession] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [starting, setStarting] = useState(false);
  const [accessCodeRequired, setAccessCodeRequired] = useState(true);

  const accessLink = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(
    CONFIG.accessCodeMessage
  )}`;

  useEffect(() => {
    let active = true;

    async function checkAuthAndLoadSettings() {
      try {
        // 1. Check if user is already signed into BrainLab
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        // 2. Read any previously saved candidate info from localStorage
        const savedCandidate = localStorage.getItem("candidate");
        let parsedSaved: any = null;
        if (savedCandidate) {
          try {
            parsedSaved = JSON.parse(savedCandidate);
          } catch {
            // ignore
          }
        }

        if (active) {
          if (user) {
            setCurrentUser(user);
            const userFullName =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "";
            setName(userFullName || parsedSaved?.name || "");
            setPhone(parsedSaved?.phone || user.user_metadata?.phone || user.phone || "");
            if (parsedSaved?.subject) {
              setSubject(parsedSaved.subject);
            }
          } else if (parsedSaved) {
            setName(parsedSaved.name || "");
            setPhone(parsedSaved.phone || "");
            if (parsedSaved.subject) {
              setSubject(parsedSaved.subject);
            }
          }
        }

        // 3. Check public exam settings
        const { data: settingsData } = await supabase.rpc("get_public_settings");
        const settings = settingsData as { access_code_required?: unknown } | null;
        if (active) {
          setAccessCodeRequired(
            settings ? settings.access_code_required === true || settings.access_code_required === "true" : true
          );
        }
      } catch (err) {
        console.warn("Could not check session or settings:", err);
      } finally {
        if (active) setLoadingSession(false);
      }
    }

    void checkAuthAndLoadSettings();
    return () => {
      active = false;
    };
  }, []);

  const handleStartExam = async () => {
    if (!name.trim()) {
      alert("Please provide your candidate name.");
      return;
    }

    if (!phone.trim()) {
      alert("Please enter a phone number to link your result.");
      return;
    }

    setStarting(true);

    const savedCode = localStorage.getItem("access_code") || "";

    localStorage.setItem(
      "candidate",
      JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        subject,
        code: savedCode,
        user_id: currentUser?.id || null,
      })
    );

    setStarting(false);

    if (accessCodeRequired && !savedCode) {
      router.push("/access");
    } else {
      router.push("/instructions");
    }
  };

  const handleCheckResult = () => {
    if (!phone.trim()) {
      alert("Please enter your phone number to look up your result.");
      return;
    }
    router.push("/result");
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] px-4 py-8 sm:px-6 sm:py-12 transition-colors duration-200">
      {/* Hero Header */}
      <div className="mx-auto mb-8 max-w-6xl rounded-[32px] border border-white/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 shadow-2xl shadow-blue-100/40 dark:shadow-none backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/40 px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800 dark:text-cyan-400">
                Examination Portal
              </span>
              <span className="hidden sm:inline-block text-xs font-bold text-slate-400 dark:text-slate-500">•</span>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 dark:text-slate-400">
                JAMB / UTME Standard Simulation
              </span>
            </div>

            <h1 className="text-3xl font-black text-slate-900 dark:text-white md:text-5xl tracking-tight">
              BrainLab CBT Examination
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
              {currentUser
                ? `You are signed in as ${currentUser.user_metadata?.full_name || currentUser.email}. Your assessment results will be saved directly to your account.`
                : "Launch your computer-based test session. Sign in to automatically link your scores, streaks, and skills passport."}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-0.5 active:scale-95"
            >
              ← My Dashboard
            </Link>
            <Link
              href="/skills-passport"
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 dark:bg-cyan-500 px-4 py-2.5 text-xs font-extrabold text-[#061a3a] shadow-sm transition hover:bg-cyan-300 hover:-translate-y-0.5 active:scale-95"
            >
              Skills Passport →
            </Link>
          </div>
        </div>
      </div>

      {/* Main 3-Column Grid */}
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {/* Support & Access Code Card */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-lg shadow-blue-100/30 dark:shadow-none flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Access Code & Registration</h3>

            <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-4">
              <p className="font-bold text-emerald-950 dark:text-emerald-200">Official Exam Access</p>
              <p className="mt-2 text-xs sm:text-sm leading-6 text-emerald-900 dark:text-emerald-300">
                Contact BrainLab official support to receive your candidate passcode or enroll in full-length mock examinations.
              </p>

              <a
                href={accessLink}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-full rounded-xl bg-[#012153] hover:bg-[#071c43] px-4 py-3 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 active:scale-95"
              >
                Contact Us on WhatsApp
              </a>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
              Helpline: <strong className="text-slate-700 dark:text-slate-300">0907 431 0204</strong>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Candidate support available 8:00 AM – 9:00 PM daily.
            </p>
          </div>
        </div>

        {/* Central Candidate Examination Launchpad */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-lg shadow-blue-100/30 dark:shadow-none space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {currentUser ? "Candidate Session" : "Start CBT Session"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {currentUser
                ? "Your BrainLab account is recognized. Launch your exam below."
                : "Enter candidate details or sign in to save your history."}
            </p>
          </div>

          {/* Signed-in Recognition Banner */}
          {currentUser ? (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#012153] text-cyan-300 font-black text-xs">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {name}
                  </p>
                  <p className="text-[10px] text-blue-700 dark:text-cyan-400 font-medium truncate">
                    ✓ Verified Account · {currentUser.email}
                  </p>
                </div>
              </div>

              <Link
                href="/account"
                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline shrink-0"
              >
                Switch
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                Have a BrainLab student account?
              </p>
              <Link
                href="/account?redirect=/cbt"
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition active-press"
              >
                Sign In to Keep Scores
              </Link>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Candidate Name
              </label>
              <input
                placeholder="Full Name (e.g. John Doe)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Candidate Phone Number
              </label>
              <input
                placeholder="Phone (e.g. 08012345678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Elective Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
              >
                <option value="Mathematics">Mathematics (Science & Commercial)</option>
                <option value="Biology">Biology (Medical & Agricultural)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Core subjects (English, Physics, Chemistry) are included automatically in the 4-subject exam.
              </p>
            </div>

            {/* Launch Action Button */}
            <button
              onClick={handleStartExam}
              disabled={starting || !name.trim() || !phone.trim()}
              className="mt-4 w-full rounded-xl bg-[#012153] hover:bg-blue-900 py-3.5 text-center text-sm font-extrabold text-white shadow-lg transition active-press disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{starting ? "Verifying…" : "🚀 Launch CBT Exam Session"}</span>
            </button>

            {/* Check Results Action */}
            <button
              onClick={handleCheckResult}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 text-center text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
            >
              Check My Previous Results
            </button>
          </div>
        </div>

        {/* Revision & Leaderboard Card */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-lg shadow-blue-100/30 dark:shadow-none flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Exam Preparation</h3>

            <div className="mt-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 p-4">
              <p className="font-bold text-blue-950 dark:text-cyan-200">JAMB Final Revision Class</p>
              <p className="mt-2 text-xs sm:text-sm leading-6 text-blue-900 dark:text-blue-300">
                Join BrainLab intensive revision batches covering high-frequency WAEC and UTME topics.
              </p>

              <a
                href={`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(CONFIG.revisionMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-full rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2.5 text-center text-xs font-bold text-white shadow transition"
              >
                Inquire About Revision Classes
              </a>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                {showLeaderboard ? "Hide Leaderboard" : "🏆 View Top Candidates"}
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            <Link
              href="/learning/revision"
              className="text-xs font-bold text-blue-700 dark:text-cyan-400 hover:underline block text-center"
            >
              Open Personalized Study Plan →
            </Link>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal / Drawer */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">CBT Exam Leaderboard</h3>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <LeaderboardCard />
          </div>
        </div>
      )}
    </main>
  );
}
