"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import LeaderboardCard from "../components/LeaderboardCard";
import { toast } from "../lib/toast";

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

  const availableElectiveSubjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Government",
    "Literature in English",
    "Economics",
    "Commerce",
    "Christian Religious Studies",
  ];

  // Dynamic 4 Subjects Selection (Slot 1 English is Compulsory for all candidates)
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([
    "English",
    ...availableElectiveSubjects,
  ]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    "English",
    "Mathematics",
    "Physics",
    "Chemistry",
  ]);

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
        // Fetch dynamically configured subjects from backend
        fetch("/api/subjects")
          .then((r) => r.json())
          .then((data) => {
            if (active && data.ok && Array.isArray(data.subjects) && data.subjects.length > 0) {
              setAvailableSubjects(data.subjects);
            }
          })
          .catch(() => {});

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
            if (Array.isArray(parsedSaved?.subjects) && parsedSaved.subjects.length === 4) {
              setSelectedSubjects(parsedSaved.subjects);
            } else if (parsedSaved?.subject) {
              setSelectedSubjects(["English", "Mathematics", "Physics", parsedSaved.subject]);
            }
          } else if (parsedSaved) {
            setName(parsedSaved.name || "");
            setPhone(parsedSaved.phone || "");
            if (Array.isArray(parsedSaved?.subjects) && parsedSaved.subjects.length === 4) {
              setSelectedSubjects(parsedSaved.subjects);
            } else if (parsedSaved?.subject) {
              setSelectedSubjects(["English", "Mathematics", "Physics", parsedSaved.subject]);
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

  const handleApplyPreset = (presetSubjects: string[]) => {
    // English Language is always Slot 1 (Compulsory for all UTME candidates)
    const electives = presetSubjects.filter((s) => s.toLowerCase() !== "english");
    setSelectedSubjects([
      "English",
      electives[0] || "Mathematics",
      electives[1] || "Physics",
      electives[2] || "Chemistry",
    ]);
    toast.success("Applied subject combination preset.");
  };

  const handleUpdateSubjectSlot = (index: number, newSubject: string) => {
    if (index === 0) return; // Slot 1 English is locked and compulsory
    setSelectedSubjects((prev) => {
      const next = [...prev];
      next[index] = newSubject;
      return next;
    });
  };

  const handleStartExam = async () => {
    const effectiveName =
      name.trim() ||
      currentUser?.user_metadata?.full_name ||
      currentUser?.user_metadata?.name ||
      currentUser?.email?.split("@")[0] ||
      "";

    if (!effectiveName) {
      toast.error("Please enter your candidate name.");
      return;
    }

    const effectivePhone =
      phone.trim() ||
      currentUser?.user_metadata?.phone ||
      currentUser?.phone ||
      (currentUser?.email ? currentUser.email.split("@")[0] : "");

    if (!effectivePhone) {
      toast.error("Please enter your phone number to link your result.");
      return;
    }

    if (selectedSubjects.length !== 4) {
      toast.error("Please select exactly 4 subjects for your examination.");
      return;
    }

    setStarting(true);

    const savedCode = localStorage.getItem("access_code") || "";

    localStorage.setItem(
      "candidate",
      JSON.stringify({
        name: effectiveName,
        phone: effectivePhone,
        subject: selectedSubjects[0], // legacy compatibility
        subjects: selectedSubjects,
        code: savedCode,
        user_id: currentUser?.id || null,
      })
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("brainlab-candidate-change"));
    }

    setStarting(false);

    if (accessCodeRequired && !savedCode) {
      router.push("/access");
    } else {
      router.push("/instructions");
    }
  };

  const handleCheckResult = () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number to look up your result.");
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
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              BrainLab CBT Examination Room
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Configure your candidate identity and chosen 4 examination subjects. Questions are curriculum-aligned with authentic CBT timing, auto-sync, and instant performance analysis.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              {showLeaderboard ? "Hide Leaderboard" : "🏆 View Leaderboard"}
            </button>
            <Link
              href="/instructions"
              className="rounded-2xl border border-blue-600 bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 text-xs font-bold text-blue-700 dark:text-cyan-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
            >
              📖 Exam Rules
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        {/* Candidate Registration & 4-Subject Setup */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-xl shadow-blue-100/30 dark:shadow-none backdrop-blur-md md:p-8">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Candidate Examination Setup
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Fill in your details and select your 4 examination subjects.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {/* Candidate Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Full Name
              </label>
              <input
                placeholder="Candidate Full Name (e.g. Chukwuemeka Adebayo)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>

            {/* Candidate Phone */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Phone Number (For Result Certificate Linking)
              </label>
              <input
                placeholder="Phone (e.g. 08012345678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>

            {/* Dynamic 4 Subjects Selector */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Your 4 Examination Subjects
                </label>
                <span className="text-[11px] font-bold text-blue-600 dark:text-cyan-400">
                  4 Selected
                </span>
              </div>

              {/* Department Presets */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(["English", "Mathematics", "Physics", "Chemistry"])}
                  className="rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-[11px] font-bold text-blue-800 dark:text-blue-300 hover:bg-blue-100 transition active:scale-95"
                >
                  🧪 Science (Eng, Mth, Phy, Chm)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(["English", "Biology", "Physics", "Chemistry"])}
                  className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition active:scale-95"
                >
                  🩺 Medical (Eng, Bio, Phy, Chm)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(["English", "Mathematics", "Economics", "Commerce"])}
                  className="rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition active:scale-95"
                >
                  📊 Commercial
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(["English", "Literature in English", "Government", "Christian Religious Studies"])}
                  className="rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2.5 py-1 text-[11px] font-bold text-purple-800 dark:text-purple-300 hover:bg-purple-100 transition active:scale-95"
                >
                  ⚖️ Arts / Law
                </button>
              </div>

              {/* 4 Slot Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Slot 1: Locked Compulsory English */}
                <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="block text-[10px] font-extrabold uppercase text-blue-800 dark:text-cyan-400">
                      Subject 1 (Compulsory)
                    </span>
                    <span className="rounded-full bg-blue-200/60 dark:bg-blue-900/80 px-2 py-0.5 text-[9px] font-black text-blue-900 dark:text-cyan-300">
                      🔒 All Candidates
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-black text-blue-950 dark:text-white">
                    <span>English Language</span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-cyan-400">60 Questions</span>
                  </div>
                </div>

                {/* Slots 2, 3, 4: Electives chosen by candidate */}
                {[1, 2, 3].map((slotIdx) => (
                  <div key={slotIdx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
                        Subject {slotIdx + 1} (Elective)
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">40 Questions</span>
                    </div>
                    <select
                      value={selectedSubjects[slotIdx] || availableElectiveSubjects[slotIdx - 1]}
                      onChange={(e) => handleUpdateSubjectSlot(slotIdx, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {availableElectiveSubjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                You can customize each subject individually to match your registration slip.
              </p>
            </div>

            {/* Launch Action Button */}
            <button
              onClick={handleStartExam}
              disabled={starting || (!currentUser && (!name.trim() || !phone.trim()))}
              className="mt-4 w-full rounded-xl bg-[#012153] hover:bg-blue-900 py-3.5 text-center text-sm font-extrabold text-white shadow-lg transition active-press disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{starting ? "Verifying…" : "🚀 Proceed to Examination Instructions"}</span>
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
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Need access codes, revision coaching, or syllabus materials?
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-blue-100 dark:border-blue-950/60 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                <span className="text-xs font-bold text-blue-900 dark:text-cyan-300">
                  🔑 Need a CBT Access Code?
                </span>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Examination tokens allow you to unlock timed mock trials, comprehensive grading, and step-by-step corrections.
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/access"
                    className="inline-block rounded-xl bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition"
                  >
                    Enter Code
                  </Link>
                  <a
                    href={accessLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-xl border border-blue-300 dark:border-blue-700 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-cyan-300 hover:bg-blue-100/60 transition"
                  >
                    WhatsApp Helpdesk
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  🎯 Revision Masterclass
                </span>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Join BrainLab Academy intensive revision webinars covering past question trends and high-frequency examination topics.
                </p>
                <div className="mt-3">
                  <Link
                    href="/learning-hub"
                    className="inline-block rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
                  >
                    Explore Learning Hub
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Help Links */}
          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
            <Link href="/self-practice" className="hover:text-blue-600 dark:hover:text-cyan-400">
              Self Practice Mode
            </Link>
            <Link href="/challenge-arena" className="hover:text-blue-600 dark:hover:text-cyan-400">
              Live Challenge Arena
            </Link>
            <Link href="/support" className="hover:text-blue-600 dark:hover:text-cyan-400">
              Open Support
            </Link>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal / Drawer */}
      {showLeaderboard && (
        <div className="mx-auto mt-8 max-w-6xl">
          <LeaderboardCard limit={15} />
        </div>
      )}
    </main>
  );
}
