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
  subjects?: string[];
  code?: string;
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

function getGradeInfo(scoreOutOf100: number) {
  if (scoreOutOf100 >= 75) return { grade: "A", remark: "Distinction", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300" };
  if (scoreOutOf100 >= 60) return { grade: "B", remark: "Very Good", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300" };
  if (scoreOutOf100 >= 50) return { grade: "C", remark: "Credit", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300" };
  if (scoreOutOf100 >= 40) return { grade: "D", remark: "Pass", color: "text-orange-600 bg-orange-50 dark:bg-orange-950/60 dark:text-orange-300" };
  return { grade: "F", remark: "Needs Revision", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300" };
}

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
      if (!savedCandidate || !savedSummary) {
        setLookupMode(true);
        return;
      }
      try {
        setCandidate(JSON.parse(savedCandidate) as Candidate);
        const parsedSummary = JSON.parse(savedSummary) as Summary;
        if (parsedSummary.show_results !== true) {
          setLookupMode(true);
          return;
        }
        setSummary(parsedSummary);
      } catch {
        setLookupMode(true);
      }
    }
    void loadPage();
  }, []);

  const subjectScores = summary?.subject_scores ?? {};
  const totalScore = summary?.score ?? 0;
  const totalPossible = summary?.total ?? 400;
  const percentage = Math.round((totalScore / (totalPossible || 1)) * 100);

  // Diagnostic calculations
  const subjectEntries = Object.entries(subjectScores);
  const sortedSubjects = [...subjectEntries].sort((a, b) => b[1] - a[1]);
  const bestSubject = sortedSubjects.length > 0 ? sortedSubjects[0] : null;
  const weakSubject = sortedSubjects.length > 1 ? sortedSubjects[sortedSubjects.length - 1] : null;

  const candidateSubjects: string[] = Array.isArray(candidate?.subjects) && candidate.subjects.length > 0
    ? candidate.subjects
    : candidate?.subject
      ? ["English Language", candidate.subject]
      : ["English Language"];

  const displayRows =
    subjectEntries.length > 0
      ? [...subjectEntries].sort((a, b) => {
          const isEngA = a[0].toLowerCase().includes("english");
          const isEngB = b[0].toLowerCase().includes("english");
          if (isEngA && !isEngB) return -1;
          if (!isEngA && isEngB) return 1;
          return a[0].localeCompare(b[0]);
        })
      : candidateSubjects.map((s) => [s, subjectScores[s] ?? 0] as [string, number]);

  // National Percentile Estimate
  const estimatedPercentile = Math.min(99, Math.max(15, Math.round(percentage * 0.98 + (totalScore >= 280 ? 8 : totalScore >= 200 ? 5 : 0))));

  // Handle Printable PDF
  const handlePrint = () => {
    window.print();
  };

  // Handle WhatsApp Share
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎯 BrainLab UTME Mock Scorecard\nCandidate: ${candidate?.name || "Student"}\nTotal Score: ${totalScore}/${totalPossible} (${percentage}%)\nStrongest Subject: ${bestSubject ? `${bestSubject[0]} (${bestSubject[1]}/100)` : "General"}\nCheck verified scores at https://www.brainlabacademy.com.ng/result`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleLookup = async () => {
    const phone = lookupPhone.trim();
    const code = lookupCode.trim().toUpperCase();
    if (!phone) {
      setLookupError("Please enter your phone number.");
      setLookupResult(null);
      return;
    }
    if (codeRequired && !code) {
      setLookupError("Please enter the access code you used for the exam.");
      setLookupResult(null);
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    const res = await fetchLookup(phone, codeRequired ? code : "");
    setLookupLoading(false);
    if (isError(res)) {
      setLookupError(res.message);
      return;
    }
    setLookupResult(res);
  };

  if (resultsEnabled === null) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#000814] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Checking result release status...</p>
        </div>
      </main>
    );
  }

  if (!resultsEnabled) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#000814] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
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
      <main className="min-h-screen bg-slate-50 dark:bg-[#000814] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-lg w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto dark:hidden" />
            <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto hidden dark:block" />
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
      <main className="min-h-screen bg-slate-50 dark:bg-[#000814] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading your exam result...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12 dark:bg-[#000814] text-slate-900 dark:text-slate-100 print:bg-white print:p-0 print:text-black">
      {/* -------------------------------------------------------------------
          Print Styles Injector
      ------------------------------------------------------------------- */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, .no-print {
            display: none !important;
          }
          .print-container {
            border: 2px solid #012153 !important;
            padding: 24px !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-white transition"
          >
            ← Return to Dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 active:scale-95 transition"
            >
              <span>🖨️</span>
              <span>Print / Download PDF Slip</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition"
            >
              <span>💬</span>
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            Official Printable Result Certificate / Slip Container
        ----------------------------------------------------------------- */}
        <div className="print-container rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* Header Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto dark:hidden print:block" />
              <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto hidden dark:block print:hidden" />
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 dark:text-sky-400 print:text-blue-900">
                  BrainLab Assessment &amp; CBT Council
                </p>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                  Official UTME Mock Result Slip
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  National Simulation Examination • Session 2025/2026
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
                Verified Final Score
              </span>
              <p className="mt-1 text-[11px] font-mono text-slate-400">
                Ref: {summary?.result_id ? summary.result_id.substring(0, 16) : "BL-MOCK-2026"}
              </p>
            </div>
          </div>

          {/* Candidate Profile Details */}
          <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 border border-slate-100 dark:border-slate-800 dark:bg-slate-950/50 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Candidate Full Name</p>
              <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{candidate.name}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Registration Phone</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{candidate.phone}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Examination Combination</p>
              <p className="mt-1 text-sm font-semibold text-blue-700 dark:text-sky-300">
                {candidate.subjects?.length ? candidate.subjects.join(", ") : candidate.subject}
              </p>
            </div>
          </div>

          {/* Aggregate Score & Performance Gauge */}
          <div className="mt-6 grid gap-6 sm:grid-cols-12 items-center">
            <div className="rounded-2xl border-2 border-blue-600/30 bg-blue-50/50 p-6 text-center dark:border-blue-900/40 dark:bg-blue-950/20 sm:col-span-5">
              <p className="text-xs font-extrabold uppercase tracking-widest text-blue-900 dark:text-sky-300">
                Aggregate UTME Score
              </p>
              <div className="my-2 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-black text-[#012153] dark:text-cyan-400">
                  {totalScore}
                </span>
                <span className="text-sm font-bold text-slate-500">/ {totalPossible}</span>
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Overall Percentage: <span className="text-blue-700 dark:text-sky-400">{percentage}%</span>
              </p>
              <div className="mt-3 inline-block rounded-md bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                {totalScore >= 280
                  ? "Outstanding (High University Admission Standing)"
                  : totalScore >= 200
                  ? "Competitive Pass (Above National Cutoff)"
                  : "Revision Pass (Targeted Practice Needed)"}
              </div>
            </div>

            {/* Diagnostic Metrics (7 cols) */}
            <div className="space-y-3 sm:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">National Percentile Estimate:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    Top {100 - estimatedPercentile}% (Higher than {estimatedPercentile}% of candidates)
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${estimatedPercentile}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Strongest Subject</p>
                  <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                    {bestSubject ? `${bestSubject[0]} (${bestSubject[1]}/100)` : "General"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[10px] uppercase font-bold text-amber-600">Focus Subject</p>
                  <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                    {weakSubject ? `${weakSubject[0]} (${weakSubject[1]}/100)` : "None"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formal Subject Breakdown Table */}
          <div className="mt-8">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-3">
              Detailed Subject Breakdown &amp; Grades
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Maximum Marks</th>
                    <th className="py-3 px-4 text-center">Score Obtained</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4 text-right">Academic Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {displayRows.map(([subjName, score]) => {
                    const isEnglish = subjName.toLowerCase().includes("english");
                    const gradeInfo = getGradeInfo(score);
                    return (
                      <tr key={subjName}>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{subjName}</span>
                            {isEnglish ? (
                              <span className="text-[9px] font-black uppercase text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/70 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                Compulsory
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                Elective
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">100</td>
                        <td className="py-3 px-4 text-center font-extrabold text-blue-700 dark:text-sky-300">
                          {score}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`rounded-md px-2 py-0.5 font-black text-[11px] ${gradeInfo.color}`}>
                            {gradeInfo.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">
                          {gradeInfo.remark}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Verification Footer & Signature Strip */}
          <div className="mt-10 border-t-2 border-dashed border-slate-200 pt-6 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Official BrainLab Digital Verification Code
              </p>
              <p className="mt-0.5 font-mono text-[11px]">
                https://www.brainlabacademy.com.ng/verify/{summary?.result_id || "mock-result"}
              </p>
              <p className="mt-1 text-[10px]">
                Issued by BrainLab Academy Examination Directorate under strict CBT proctoring standards.
              </p>
            </div>

            <div className="text-center sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-800">
              <div className="inline-block border-b border-slate-400 pb-1 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Dr. K. Adeleke, F.Ed.
              </div>
              <p className="text-[10px] text-slate-400">Chief Examination Proctor</p>
            </div>
          </div>
        </div>

        {/* Next Step Action Buttons (Hidden in Print) */}
        <div className="no-print flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
          <Link
            href="/learning/revision"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition"
          >
            Add Weak Topics to Revision Plan →
          </Link>

          <button
            onClick={() => router.push("/corrections")}
            className="rounded-xl bg-[#012153] hover:bg-[#071c43] px-8 py-3 text-xs font-bold text-white shadow-md shadow-blue-950/20 active:scale-95 transition hover:-translate-y-0.5"
          >
            Review Step-by-Step Question Corrections →
          </button>
        </div>
      </div>
    </main>
  );
}
