"use client";

import LeaderboardCard from "../components/LeaderboardCard";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const CONFIG = {
  whatsappNumber: "2349074310204",
  accessCodeMessage:
    "Good day BRAINLAB TUTORIALS, I would like to get my access code for the CBT exam. Please can I get more information on the registration and access process?",
  revisionMessage:
    "Good day BRAINLAB TUTORIALS, I would like to join your 2 weeks final JAMB revision class. Please can I get more information about the schedule, fee, and how to register?",
  channelLink:
    "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m",
};

export default function Page() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [starting, setStarting] = useState(false);

  const accessLink = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(
    CONFIG.accessCodeMessage
  )}`;

  const revisionLink = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(
    CONFIG.revisionMessage
  )}`;

  const handleStart = async () => {
    if (!name.trim() || !phone.trim()) {
      alert("Please fill all fields");
      return;
    }

    setStarting(true);

    localStorage.setItem(
      "candidate",
      JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        subject,
        code: "",
      })
    );

    const { data, error } = await supabase.rpc("get_public_settings");
    const settings = data as { access_code_required?: unknown } | null;
    const settingValue = settings?.access_code_required;
    // Fail closed: require an access code if settings cannot be read.
    const accessCodeRequired =
      error || !settings
        ? true
        : settingValue === true || settingValue === "true";

    setStarting(false);

    if (accessCodeRequired) {
      router.push("/access");
    } else {
      router.push("/instructions");
    }
  };

  const handleCheckResult = () => {
    if (!phone.trim()) {
      alert("Enter your phone number first.");
      return;
    }

    router.push("/result");
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] px-4 py-8 sm:px-6 sm:py-12 transition-colors duration-200">
      <div role="status" className="mx-auto mb-6 max-w-6xl rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm leading-6 text-amber-950 dark:text-amber-200 shadow-sm">
        <strong>Platform upgrade notice:</strong> BrainLab is undergoing a website and assessment-system overhaul. Some features may be temporarily unavailable, and a timed attempt could be interrupted. Please avoid starting a high-stakes exam during the maintenance window.
      </div>

      <div className="mx-auto mb-8 max-w-6xl rounded-[32px] border border-white/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 shadow-2xl shadow-blue-100/40 dark:shadow-none backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/40 px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800 dark:text-cyan-400">
                Examination Portal
              </span>
              <span className="hidden sm:inline-block text-xs font-bold text-slate-400 dark:text-slate-500">•</span>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 dark:text-slate-400">JAMB / UTME Standard Simulation</span>
            </div>

            <h1 className="text-3xl font-black text-slate-900 dark:text-white md:text-5xl tracking-tight">
              BrainLab CBT Exam
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
              Enter your candidate details below to launch your exam session. Your progress is synced to the server with offline backup protection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-0.5 active:scale-95"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {/* Support Card */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-lg shadow-blue-100/30 dark:shadow-none flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Access Code Support
            </h3>

            <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-4">
              <p className="font-bold text-emerald-950 dark:text-emerald-200">Need an Access Code?</p>
              <p className="mt-2 text-xs sm:text-sm leading-6 text-emerald-900 dark:text-emerald-300">
                Send a WhatsApp message to request an official exam access code.
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

          <p className="mt-5 text-xs leading-6 text-slate-500 dark:text-slate-400">
            Dedicated Support Lines:
            <br />
            <strong className="text-slate-700 dark:text-slate-300">0907 431 0204</strong> · <strong className="text-slate-700 dark:text-slate-300">0902 111 8231</strong>
          </p>
        </div>

        {/* Candidate Login Card */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-lg shadow-blue-100/30 dark:shadow-none">
          <h3 className="mb-4 text-center text-xl font-bold text-slate-900 dark:text-white">
            Candidate Login
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Candidate Name
              </label>
              <input
                placeholder="Full Name (e.g. John Doe)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Phone Number
              </label>
              <input
                placeholder="Phone Number (e.g. 08012345678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Elective Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={starting}
            className="mt-5 w-full rounded-xl bg-[#012153] hover:bg-[#071c43] px-4 py-3.5 font-bold text-white shadow-md shadow-blue-950/20 transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:transform-none text-sm"
          >
            {starting ? "Verifying Access..." : "Continue to Examination →"}
          </button>

          <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 text-xs">
            <b className="text-slate-900 dark:text-white">Keyboard Navigation Shortcuts</b>
            <p className="mt-1.5 leading-5 text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">N</span> = Next · <span className="font-semibold text-slate-800 dark:text-slate-200">P</span> = Previous · <span className="font-semibold text-slate-800 dark:text-slate-200">F</span> = Flag · <span className="font-semibold text-slate-800 dark:text-slate-200">S</span> = Submit
              <br />
              <span className="font-semibold text-slate-800 dark:text-slate-200">A / B / C / D</span> = Choose Option
            </p>
          </div>
        </div>

        {/* WhatsApp Channel Card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#012153] to-[#071c43] p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="inline-flex rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3">
              Official Updates
            </div>
            <h3 className="text-2xl font-black">Join Our WhatsApp Channel</h3>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Stay ahead with past question breakdowns, exam announcements, revision timetables, and top scorer leaderboards.
            </p>
          </div>

          <a
            href={CONFIG.channelLink}
            target="_blank"
            rel="noreferrer"
            className="mt-6 block w-full rounded-xl bg-white hover:bg-slate-100 px-4 py-3.5 text-center font-bold text-[#012153] transition hover:-translate-y-0.5 active:scale-95 shadow-md text-sm"
          >
            Join WhatsApp Channel ↗
          </a>
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 md:grid-cols-2">
        {/* Check Result Card */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-lg shadow-blue-100/30 dark:shadow-none">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Check Your Result
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            View released scores and detailed question-by-question corrections.
          </p>

          <input
            placeholder="Enter Phone Number or Result Reference"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-4 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
          />

          <button
            onClick={handleCheckResult}
            className="mt-4 w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-3 font-bold text-white shadow transition hover:-translate-y-0.5 active:scale-95 text-sm"
          >
            Check Result →
          </button>
        </div>

        {/* Leaderboard Toggle Card */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-lg shadow-blue-100/30 dark:shadow-none">
          <button
            type="button"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex w-full items-center justify-between px-6 py-5 text-left transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-3xl"
          >
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Top Candidates Leaderboard
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Click to {showLeaderboard ? "hide" : "view"} top performing students
              </p>
            </div>

            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-lg font-bold text-slate-700 dark:text-slate-200 transition-transform">
              {showLeaderboard ? "−" : "+"}
            </span>
          </button>

          {showLeaderboard && (
            <div className="border-t border-slate-100 dark:border-slate-800 px-6 pb-6 pt-4">
              <LeaderboardCard />
            </div>
          )}
        </div>
      </div>

      {/* Revision Classes Banner */}
      <div className="mx-auto mt-8 max-w-6xl rounded-3xl border border-white/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-lg shadow-blue-100/30 dark:shadow-none">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Join Our 2 Weeks Final Revision Classes
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Prepare thoroughly before your official examination with our live structured revision sessions, exam tricks, and topic breakdowns.
        </p>

        <a
          href={revisionLink}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-[#071c43] px-6 py-3 font-bold text-white shadow-md transition hover:-translate-y-0.5 active:scale-95 text-sm"
        >
          Join Revision Classes ↗
        </a>
      </div>
    </main>
  );
}
