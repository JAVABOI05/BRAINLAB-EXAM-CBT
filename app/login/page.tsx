"use client";

import LeaderboardCard from "../components/LeaderboardCard";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff245%,#f8fbff_80%)] px-6 py-12">

      <div className="mx-auto mb-8 max-w-6xl rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-blue-100/60 backdrop-blur md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">
              BrainLab CBT Portal
            </p>

            <h1 className="text-3xl font-bold text-gray-800 md:text-5xl">
              BrainLab CBT Portal
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">
      
            </p>
          </div>

          <button
            onClick={() => router.push("/admin/login")}
            className="shrink-0 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2 font-semibold text-white shadow-md transition hover:scale-[1.02]"
          >
            Admin Login
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-lg shadow-blue-100/40">
          <h3 className="text-2xl font-bold text-gray-800">
            Access Code Support
          </h3>

          <div className="mt-4 rounded-2xl bg-green-50 p-4">
            <p className="font-semibold text-gray-800">Need an Access Code?</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Send a WhatsApp message to request a valid exam code.
            </p>

            <a
              href={accessLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 text-center font-semibold text-white shadow-md transition hover:scale-[1.02]"
            >
              Contact Us on WhatsApp
            </a>
          </div>

          <p className="mt-5 text-sm leading-7 text-gray-600">
            0907 431 0204
            <br />
            0902 111 8231
          </p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-lg shadow-blue-100/40">
          <h3 className="mb-4 text-center text-2xl font-bold text-gray-800">
            Candidate Login
          </h3>

          <input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
          />

          <input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
          >
            <option>Mathematics</option>
            <option>Biology</option>
          </select>

          <button
            onClick={handleStart}
            disabled={starting}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.02] disabled:opacity-60"
          >
            {starting ? "Checking..." : "Continue"}
          </button>

          <div className="mt-5 rounded-2xl bg-gray-100 p-4 text-sm">
            <b className="text-gray-800">Exam Shortcuts</b>
            <p className="mt-2 leading-6 text-gray-600">
              N = Next · P = Previous · F = Flag · S = Submit
              <br />
              A/B/C/D = Answer
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-lg shadow-blue-200/50">
          <h3 className="text-2xl font-bold">Join Our WhatsApp Channel</h3>

          <p className="mt-2 text-sm leading-6 text-blue-100">
            Stay updated with notices, revision tips, and exam updates.
          </p>

          <a
            href={CONFIG.channelLink}
            target="_blank"
            rel="noreferrer"
            className="mt-6 block w-full rounded-xl bg-white px-4 py-3 text-center font-bold text-blue-700 transition hover:scale-[1.02]"
          >
            Join Channel
          </a>
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-lg shadow-blue-100/40">
          <h3 className="text-2xl font-bold text-gray-800">
            Check Your Result
          </h3>

          <input
            placeholder="Enter Phone Number or Access code"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleCheckResult}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.02]"
          >
            Check Result
          </button>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white shadow-lg shadow-blue-100/40">
          <button
            type="button"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex w-full items-center justify-between px-6 py-5 text-left"
          >
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                Top Candidates Leaderboard
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Click to {showLeaderboard ? "hide" : "view"} leaderboard
              </p>
            </div>

            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600">
              {showLeaderboard ? "−" : "+"}
            </span>
          </button>

          {showLeaderboard && (
            <div className="border-t border-gray-100 px-6 pb-6 pt-4">
              <LeaderboardCard />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl rounded-3xl border border-white/60 bg-white p-6 shadow-lg shadow-blue-100/40">
        <h3 className="text-2xl font-bold text-gray-800">
          Join Our 2 Weeks Final Revision Classes
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Prepare thoroughly before the exam with our structured revision
          sessions.
        </p>

        <a
          href={revisionLink}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 text-center font-semibold text-white shadow-md transition hover:scale-[1.02]"
        >
          Join Revision Classes
        </a>
      </div>
    </main>
  );
}