"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "../lib/toast";

type Candidate = {
  name: string;
  phone: string;
  subject: string;
  subjects?: string[];
  code: string;
};

export default function InstructionsPage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [agreed, setAgreed] = useState(false);

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

  const handleStartExam = () => {
    if (!agreed) {
      toast.error("Please confirm that you have read and agreed to the exam instructions.");
      return;
    }

    router.push("/exam");
  };

  if (!candidate) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading instructions...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 sm:p-10 shadow-2xl shadow-blue-100/40 dark:shadow-none backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto dark:hidden" />
            <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto hidden dark:block" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Candidate Examination Briefing
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Computer-Based Testing Guidelines
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto rounded-full bg-blue-100 dark:bg-blue-900/40 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-800 dark:text-cyan-400">
            UTME Simulation
          </span>
        </div>

        {/* Candidate & Paper Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/30 p-5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-cyan-300 mb-2">Candidate Details</h2>
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Full Name:</span> {candidate.name}
              <br />
              <span className="font-semibold text-slate-900 dark:text-white">Phone:</span> {candidate.phone}
              <br />
              <span className="font-semibold text-slate-900 dark:text-white">Subjects:</span>{" "}
              {candidate.subjects?.length ? candidate.subjects.join(", ") : candidate.subject}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Selected 4-Subject Breakdown</h2>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
              {(candidate.subjects && candidate.subjects.length > 0
                ? candidate.subjects
                : ["English", "Mathematics", "Physics", candidate.subject || "Chemistry"]
              ).map((subj, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>
                    {subj}: <strong className="text-slate-900 dark:text-white">{subj.toLowerCase().includes("english") ? "60 Qs" : "40 Qs"}</strong>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-bold text-blue-700 dark:text-cyan-400">
              Total: ~180 Questions · 400 Marks · 2 Hours Allowed
            </p>
          </div>
        </div>

        {/* Examination Rules */}
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Essential Rules &amp; Navigation
          </h2>

          <ol className="list-decimal space-y-2.5 pl-5 text-xs sm:text-sm">
            <li>
              Review all questions across all 4 subjects before submitting your final attempt.
            </li>
            <li>
              Your responses are automatically synced to the cloud every few seconds. If your network disconnects, answers remain safely preserved on this device until you reconnect.
            </li>
            <li>
              <span className="font-semibold text-slate-900 dark:text-white">Keyboard Navigation:</span>
              <span className="mt-1 block rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200">
                A / B / C / D = Select option · N = Next · P = Previous · F = Flag for review · S = Submit
              </span>
            </li>
            <li>
              An on-screen scientific calculator is available at the top right of your exam interface.
            </li>
            <li>
              <span className="font-semibold text-rose-700 dark:text-rose-400">Anti-Cheat Tab Lock:</span> Do not leave the exam tab or minimize the browser window. Doing so triggers a warning; staying away for 10 consecutive seconds submits your exam automatically.
            </li>
          </ol>
        </div>

        {/* Anti-cheat warning alert */}
        <div className="mt-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-300">Important Security Notice</p>
          <p className="mt-1 text-xs sm:text-sm leading-6 text-rose-800 dark:text-rose-200">
            Leaving this window for more than 10 seconds will trigger automatic final submission. Keep your browser in focus for the entire duration of the test.
          </p>
        </div>

        {/* Agreement Checkbox */}
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 transition hover:bg-slate-100 dark:hover:bg-slate-800/60">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-[#012153] focus:ring-[#012153]"
          />
          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            I have read and understood the instructions, timing constraints, and conduct rules. I am ready to begin.
          </span>
        </label>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={() => router.push("/cbt")}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition"
          >
            ← Back to CBT Launchpad
          </button>

          <button
            onClick={handleStartExam}
            className="rounded-xl bg-[#012153] hover:bg-[#071c43] px-8 py-3 text-sm font-bold text-white shadow-md shadow-blue-950/20 active:scale-95 transition hover:-translate-y-0.5"
          >
            Proceed to Exam Environment →
          </button>
        </div>
      </div>
    </main>
  );
}
