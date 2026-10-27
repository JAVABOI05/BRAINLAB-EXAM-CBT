"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Dynamic Subjects Configuration (loaded from admin platform config / database)
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([
    "English",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Government",
    "Literature in English",
    "Economics",
    "Commerce",
    "Christian Religious Studies",
  ]);

  const availableElectiveSubjects = useMemo(() => {
    return availableSubjects.filter(
      (s: string) => s.toLowerCase() !== "english" && s.toLowerCase() !== "english language"
    );
  }, [availableSubjects]);

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
        let parsedSaved: { name?: string; phone?: string; subjects?: string[]; subject?: string } | null = null;
        if (savedCandidate) {
          try {
            const parsed: unknown = JSON.parse(savedCandidate);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              parsedSaved = parsed as { name?: string; phone?: string; subjects?: string[]; subject?: string };
            }
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
              {showLeaderboard ? (
                "Hide Leaderboard"
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H7v2h10v-2h-2c-.55 0-1-.45-1-1v-2.34c3.27-.4 5-2.46 5-5.66V4H6v5c0 3.2 1.73 5.26 5 5.66Z" />
                  </svg>
                  <span>View Leaderboard</span>
                </span>
              )}
            </button>
            <Link
              href="/instructions"
              className="rounded-2xl border border-blue-600 bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 text-xs font-bold text-blue-700 dark:text-cyan-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
            >
              <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" /><path d="M6 6h10" /><path d="M6 10h10" /></svg><span>Exam Rules</span></span>
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
                  <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" /><path d="M8.5 2h7" /><path d="M7 16h10" /></svg><span>Science (Eng, Mth, Phy, Chm)</span></span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(["English", "Biology", "Physics", "Chemistry"])}
                  className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition active:scale-95"
                >
                  <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg><span>Medical (Eng, Bio, Phy, Chm)</span></span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(["English", "Mathematics", "Economics", "Commerce"])}
                  className="rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition active:scale-95"
                >
                  <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg><span>Commercial</span></span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(["English", "Literature in English", "Government", "Christian Religious Studies"])}
                  className="rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2.5 py-1 text-[11px] font-bold text-purple-800 dark:text-purple-300 hover:bg-purple-100 transition active:scale-95"
                >
                  <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg><span>Arts / Law</span></span>
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
                      <span className="flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg><span>All Candidates</span></span>
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
                      {availableElectiveSubjects.map((s: string) => (
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
              <span>{starting ? "Verifying…" : "Proceed to Examination Instructions"}</span><span aria-hidden="true">→</span>
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
                  <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></svg><span>Need a CBT Access Code?</span></span>
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
                  <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg><span>Revision Masterclass</span></span>
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
