"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPublicSettings, isError, lookupResult as fetchLookup } from "../lib/examApi";

type Candidate = {
  name: string;
  phone: string;
  subject: string;
  code: string;
};

type SavedResultRow = {
  name: string;
  subject: string;
  score: number;
  total: number;
  created_at?: string;
};

type Summary = {
  result_id: string;
  score: number;
  total: number;
  subject_scores: Record<string, number>;
  show_results: boolean;
  status: string;
};

export default function ResultPage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [resultsEnabled, setResultsEnabled] = useState<boolean | null>(null);
  const [codeRequired, setCodeRequired] = useState(true);
  const [lookupMode, setLookupMode] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState<SavedResultRow | null>(null);

  useEffect(() => {
    async function loadPage() {
      const settings = await getPublicSettings();
      setResultsEnabled(settings?.show_results === true);
      setCodeRequired(settings ? settings.access_code_required : true);
      const savedCandidate = localStorage.getItem("candidate");
      const savedSummary = localStorage.getItem("exam_summary");
      if (!savedCandidate || !savedSummary) { setLookupMode(true); return; }
      try {
        setCandidate(JSON.parse(savedCandidate) as Candidate);
        const parsedSummary = JSON.parse(savedSummary) as Summary;
        if (parsedSummary.show_results !== true) { setLookupMode(true); return; }
        setSummary(parsedSummary);
      } catch { setLookupMode(true); }
    }
    void loadPage();
  }, []);

  const subjectScores = summary?.subject_scores ?? {};
  const totalScore = summary?.score ?? 0;
  const totalPossible = summary?.total ?? 400;

  const handleLookup = async () => {
    const phone = lookupPhone.trim();
    const code = lookupCode.trim().toUpperCase();
    if (!phone) { setLookupError("Please enter your phone number."); setLookupResult(null); return; }
    if (codeRequired && !code) { setLookupError("Please enter the access code you used for the exam."); setLookupResult(null); return; }
    setLookupLoading(true); setLookupError(""); setLookupResult(null);
    const res = await fetchLookup(phone, codeRequired ? code : "");
    setLookupLoading(false);
    if (isError(res)) { setLookupError(res.message); return; }
    setLookupResult(res);
  };

  if (resultsEnabled === null) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Checking result release status...</p>
        </div>
      </main>
    );
  }

  if (!resultsEnabled) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-white/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
          <span className="text-4xl" aria-hidden="true">⏳</span>
          <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            Results Not Released Yet
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Examination scores and item corrections are currently pending administrator release. Please check back later.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#012153] hover:bg-[#071c43] px-4 py-3 font-bold text-white shadow transition hover:-translate-y-0.5 active:scale-95 text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (lookupMode) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-lg w-full rounded-3xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 sm:p-8 shadow-2xl shadow-blue-100/40 dark:shadow-none backdrop-blur-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image src="/brainlab-logo.svg" alt="BrainLab Academy" width={90} height={48} className="h-8 w-auto dark:hidden" />
            <Image src="/brainlab-logo-light.svg" alt="BrainLab Academy" width={90} height={48} className="h-8 w-auto hidden dark:block" />
          </div>

          <h1 className="text-center text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Check Your CBT Result
          </h1>
          <p className="mt-2 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Enter the phone number used during exam registration.
          </p>

          <div className="mt-6 space-y-3.5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Candidate Phone
              </label>
              <input
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="Enter Phone Number"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {codeRequired && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Access Code
                </label>
                <input
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                  placeholder="Enter the access code you used"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm uppercase text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono tracking-wider"
                />
              </div>
            )}

            <button
              onClick={handleLookup}
              disabled={lookupLoading}
              className="mt-2 w-full rounded-xl bg-[#012153] hover:bg-[#071c43] px-4 py-3.5 font-bold text-white shadow-md shadow-blue-950/20 transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:transform-none text-sm"
            >
              {lookupLoading ? "Looking up..." : "Retrieve Result →"}
            </button>

            <Link
              href="/"
              className="mt-2 flex w-full items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition"
            >
              Back to Home
            </Link>
          </div>

          {lookupError && (
            <div className="mt-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-semibold text-rose-800 dark:text-rose-200">
              {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className="mt-6 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/30 p-5">
              <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/60 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-cyan-300 mb-2">
                Official Score Record
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {lookupResult.name}
              </h2>

              <div className="mt-3 space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <p><span className="font-semibold text-slate-900 dark:text-white">Phone:</span> {lookupPhone.trim()}</p>
                <p><span className="font-semibold text-slate-900 dark:text-white">Elective:</span> {lookupResult.subject}</p>
                <p className="pt-2 text-2xl font-black text-[#012153] dark:text-cyan-400">
                  {lookupResult.score} <span className="text-base font-semibold text-slate-500 dark:text-slate-400">/ {lookupResult.total} Marks</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (!candidate) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading your exam result...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 sm:p-10 shadow-2xl shadow-blue-100/40 dark:shadow-none backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <Image src="/brainlab-logo.svg" alt="BrainLab Academy" width={90} height={48} className="h-9 w-auto dark:hidden" />
            <Image src="/brainlab-logo-light.svg" alt="BrainLab Academy" width={90} height={48} className="h-9 w-auto hidden dark:block" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Official Examination Scorecard
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                BrainLab UTME CBT Assessment
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
            Finalised &amp; Verified
          </span>
        </div>

        {/* Candidate Details & Overall Score */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Candidate Information</h2>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p><span className="font-semibold text-slate-900 dark:text-white">Full Name:</span> {candidate.name}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Phone Number:</span> {candidate.phone}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">Elective Selected:</span> {candidate.subject}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-slate-900 p-6 flex flex-col justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-cyan-300">Total Aggregate</span>
            <div className="my-2">
              <span className="text-4xl sm:text-5xl font-black text-[#012153] dark:text-cyan-400 tracking-tight">
                {totalScore}
              </span>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-2">/ {totalPossible} Marks</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Percentage: {Math.round((totalScore / (totalPossible || 1)) * 100)}%
            </p>
          </div>
        </div>

        {/* Subject Score Breakdown */}
        <div className="mt-6">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Subject Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">English</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {subjectScores.English ?? 0}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Chemistry</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {subjectScores.Chemistry ?? 0}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Physics</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {subjectScores.Physics ?? 0}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">{candidate.subject}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {candidate.subject === "Biology" ? subjectScores.Biology ?? 0 : subjectScores.Mathematics ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
          <Link
            href="/"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-center text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition"
          >
            ← Back to Home
          </Link>

          <button
            onClick={() => router.push("/corrections")}
            className="rounded-xl bg-[#012153] hover:bg-[#071c43] px-8 py-3 text-sm font-bold text-white shadow-md shadow-blue-950/20 active:scale-95 transition hover:-translate-y-0.5"
          >
            Review Step-by-Step Corrections →
          </button>
        </div>
      </div>
    </main>
  );
}
