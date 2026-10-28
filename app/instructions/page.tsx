"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "../lib/toast";
import { getPublicSettings } from "../lib/examApi";
import { useLearnerTheme } from "../components/LearnerThemeProvider";
import FloatingCalculator from "../components/FloatingCalculator";

type Candidate = {
  name: string;
  phone: string;
  subject: string;
  subjects?: string[];
  code: string;
};

export default function InstructionsPage() {
  const router = useRouter();
  const { resolvedTheme, setAppearance } = useLearnerTheme();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showMarksInExam, setShowMarksInExam] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    void getPublicSettings().then((settings) => {
      if (settings) {
        setShowMarksInExam(settings.show_marks_in_exam !== false);
      }
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("candidate");

    if (!saved) {
      router.push("/cbt");
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Candidate;
      queueMicrotask(() => setCandidate(parsed));
    } catch {
      router.push("/cbt");
    }
  }, [router]);

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setAppearance(nextTheme);
  };

  const handleStartExam = () => {
    if (!agreed) {
      toast.error("Please confirm that you have read and agreed to the exam instructions.");
      return;
    }

    // Clear stale session tokens so a new examination attempt starts fresh without auto-submitting
    localStorage.removeItem("exam_session_id");
    localStorage.removeItem("exam_token");
    localStorage.removeItem("exam_time_left");
    localStorage.removeItem("exam_answers");
    localStorage.removeItem("exam_flagged");
    localStorage.removeItem("exam_current_index");
    localStorage.removeItem("exam_tab_switch_count");

    router.push("/exam?start=true");
  };

  if (!candidate) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#071224_0%,#030712_100%)] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Loading instructions...</p>
        </div>
      </main>
    );
  }

  const subjectsList = candidate.subjects && candidate.subjects.length > 0
    ? candidate.subjects
    : ["English", "Mathematics", "Physics", candidate.subject || "Chemistry"];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#dfe8f7_50%,#f8fbff_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] px-4 py-6 sm:px-6 sm:py-10 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#071328] p-6 sm:p-10 shadow-2xl shadow-blue-900/5 dark:shadow-none">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={110} height={94} priority className="h-10 w-auto dark:hidden" />
            <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={110} height={94} priority className="h-10 w-auto hidden dark:block" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                Candidate Examination Briefing
              </h1>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Official Computer-Based Testing Guidelines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
              title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle dark/light mode"
            >
              <span>{resolvedTheme === "dark" ? "☀️" : "🌙"}</span>
              <span className="hidden sm:inline">{resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {/* Calculator Test Trigger */}
            <button
              type="button"
              onClick={() => setShowCalculator((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-full border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 px-3 py-1.5 text-xs font-bold text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition active:scale-95"
              title="Test the CBT on-screen calculator"
              aria-label="Test Calculator"
            >
              <span>🧮</span>
              <span>Calculator</span>
            </button>

            <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-cyan-300 border border-blue-200 dark:border-blue-800">
              UTME Simulation
            </span>
          </div>
        </div>

        {/* Candidate & Paper Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/40 p-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-cyan-300 mb-2">Candidate Details</h2>
            <div className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
              <p><span className="font-bold text-slate-900 dark:text-white">Full Name:</span> {candidate.name}</p>
              <p><span className="font-bold text-slate-900 dark:text-white">Phone:</span> {candidate.phone}</p>
              <p><span className="font-bold text-slate-900 dark:text-white">Combination:</span> {subjectsList.join(", ")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Selected 4-Subject Breakdown</h2>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-800 dark:text-slate-200">
              {subjectsList.map((subj, idx) => {
                const isEnglish = subj.toLowerCase().includes("english");
                return (
                  <div key={idx} className="flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 shrink-0" />
                    <span className="truncate">
                      {subj}: <strong className="text-slate-950 dark:text-white font-bold">{isEnglish ? "60 Qs" : "40 Qs"}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs font-black text-blue-700 dark:text-cyan-400 border-t border-slate-200 dark:border-slate-800 pt-2">
              Total: ~180 Questions{showMarksInExam ? " · 400 Marks" : ""} · 2 Hours Allowed
            </p>
          </div>
        </div>

        {/* Examination Rules */}
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          <h2 className="text-base font-black text-slate-950 dark:text-white">
            Essential Rules &amp; Navigation
          </h2>

          <ol className="list-decimal space-y-3 pl-5 text-xs sm:text-sm">
            <li>
              Review all questions across all 4 subjects using the subject tabs at the top before submitting your final attempt.
            </li>
            <li>
              Your answers are continuously saved to the cloud. If your internet fluctuates, answers stay securely cached on this device and synchronize automatically when connection resumes.
            </li>
            <li>
              <span className="font-bold text-slate-950 dark:text-white">Keyboard Navigation:</span>
              <span className="mt-1 block rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-3 text-xs font-mono font-bold text-slate-900 dark:text-cyan-300">
                A / B / C / D / E = Select option · N = Next · P = Previous · F = Flag for review · S = Submit
              </span>
            </li>
            <li>
              <span className="font-bold text-slate-950 dark:text-white">On-Screen Calculator:</span> Available anytime via the &quot;Calculator&quot; button in the header or the floating widget in the bottom right corner.
            </li>
            <li>
              <span className="font-bold text-rose-700 dark:text-rose-400">Anti-Cheat Tab Lock:</span> Do not leave this tab or minimize your browser. Leaving triggers an active warning; remaining away for 10 consecutive seconds submits your exam automatically.
            </li>
          </ol>
        </div>

        {/* Anti-cheat warning alert */}
        <div className="mt-6 rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-rose-950 dark:text-rose-300">Important Security Notice</p>
          <p className="mt-1 text-xs sm:text-sm leading-6 text-rose-900 dark:text-rose-200 font-medium">
            Leaving this window for more than 10 seconds will trigger automatic final submission. Keep your browser in focus for the entire duration of the test.
          </p>
        </div>

        {/* Agreement Checkbox */}
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 transition hover:bg-slate-100 dark:hover:bg-slate-800/60">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-[#012153] focus:ring-[#012153]"
          />
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            I have read and understood the instructions, timing constraints, and conduct rules. I am ready to begin.
          </span>
        </label>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => router.push("/cbt")}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition"
          >
            ← Back to CBT Launchpad
          </button>

          <button
            onClick={handleStartExam}
            className="rounded-xl bg-[#012153] hover:bg-[#071c43] dark:bg-blue-600 dark:hover:bg-blue-500 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/20 active:scale-95 transition hover:-translate-y-0.5"
          >
            Proceed to Exam Environment →
          </button>
        </div>
      </div>

      {/* Test Floating Calculator */}
      <FloatingCalculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
    </main>
  );
}
