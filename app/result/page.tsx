"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPublicSettings, isError, lookupResult as fetchLookup } from "../lib/examApi";
import VerificationQRCode from "../components/VerificationQRCode";

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
  session_id?: string;
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
  const [allowCorrections, setAllowCorrections] = useState(true);
  const [resultNotifications, setResultNotifications] = useState(true);
  const [heldForReview, setHeldForReview] = useState(false);
  const [codeRequired, setCodeRequired] = useState(true);
  const [lookupMode, setLookupMode] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState<SavedResultRow | null>(null);
  const [chiefProctorName, setChiefProctorName] = useState("Chief Examination Proctor");
  const [chiefProctorTitle, setChiefProctorTitle] = useState("BrainLab CBT Directorate");

  useEffect(() => {
    async function loadPage() {
      const settings = await getPublicSettings(true);
      const isResultsReleased = settings?.show_results === true;
      setResultsEnabled(isResultsReleased);
      setAllowCorrections(settings?.allow_corrections !== false);
      setResultNotifications(settings?.result_notifications !== false);
      setCodeRequired(settings ? settings.access_code_required : true);
      if (settings?.chief_proctor_name) setChiefProctorName(settings.chief_proctor_name);
      if (settings?.chief_proctor_title) setChiefProctorTitle(settings.chief_proctor_title);
      const savedCandidate = localStorage.getItem("candidate");
      const savedSummary = localStorage.getItem("exam_summary");
      if (!savedSummary) {
        setLookupMode(true);
        return;
      }
      try {
        const parsedSummary = JSON.parse(savedSummary) as Summary;
        setSummary(parsedSummary);
        let activeCandidate: Candidate = {
          name: "Verified Candidate",
          phone: "080-BrainLab",
          subject: "JAMB UTME Simulation",
          subjects: Object.keys(parsedSummary.subject_scores || {}),
        };
        if (savedCandidate) {
          try {
            activeCandidate = JSON.parse(savedCandidate) as Candidate;
          } catch {
            // fallback activeCandidate initialized above
          }
        }
        setCandidate(activeCandidate);

        if (!isResultsReleased || parsedSummary.show_results === false) {
          setHeldForReview(true);
          return;
        }
      } catch {
        setLookupMode(true);
      }
    }
    void loadPage();
  }, []);

  const subjectScores = summary?.subject_scores ?? {};
  const totalScore = Math.min(400, Math.max(0, summary?.score ?? 0));
  const totalPossible = 400;
  const percentage = Math.min(100, Math.max(0, Math.round((totalScore / 400) * 100)));

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

  const [certDownloading, setCertDownloading] = useState(false);

  const handleDownloadCertificate = async () => {
    const targetResultId = summary?.result_id || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null);
    if (!targetResultId) return;
    setCertDownloading(true);
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result_id: targetResultId,
          session_id: summary?.session_id,
        }),
      });
      const data = await res.json();
      if (data?.certificate?.id) {
        window.open(`/api/certificates/download/${data.certificate.id}`, "_blank");
      }
    } catch (err) {
      console.error("Failed to generate digital certificate:", err);
    } finally {
      setCertDownloading(false);
    }
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

  if (heldForReview && candidate) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#000814] px-4 py-8 flex items-center justify-center">
        <div className="mx-auto max-w-2xl w-full">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto dark:hidden" />
                <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto hidden dark:block" />
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 dark:text-sky-400">
                    BrainLab Examination Directorate
                  </p>
                  <h1 className="text-xl font-black text-slate-950 dark:text-white">
                    Exam Submission Receipt
                  </h1>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-3 py-1 text-xs font-bold border border-amber-300 dark:border-amber-800">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg><span>Under Proctor Review</span>
              </span>
            </div>

            <div className="mt-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg></span>
                <div>
                  <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    Exam Answers Successfully Submitted &amp; Encrypted
                  </h2>
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300 leading-5">
                    Your responses have been securely archived in the BrainLab database with tamper-evident cryptographic verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-200 dark:border-slate-800 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Candidate Name</p>
                <p className="mt-0.5 text-sm font-black text-slate-950 dark:text-white">{candidate.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Registered Phone</p>
                <p className="mt-0.5 text-sm font-mono text-slate-800 dark:text-slate-200">{candidate.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subject Combination</p>
                <p className="mt-0.5 text-xs font-medium text-blue-700 dark:text-sky-300">
                  {candidate.subjects?.length ? candidate.subjects.join(", ") : candidate.subject}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Submission Reference</p>
                <p className="mt-0.5 text-xs font-mono text-slate-700 dark:text-slate-300">
                  {summary?.result_id ? summary.result_id.substring(0, 18) : "BL-CONFIRMED"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /></svg><span>Directorate Release Policy</span>
              </h3>
              <p className="leading-5">
                The Examination Board has scheduled official score releases to occur once the active testing window concludes.
                This ensures equal testing conditions across all participating computer centres.
              </p>
              <p className="leading-5 font-medium text-slate-700 dark:text-slate-300">
                You will be able to access your complete score certificate and question corrections directly on this portal using your registered phone number once released.
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end border-t border-slate-200 dark:border-slate-800 pt-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg><span>Print Submission Slip</span></span>
              </button>
              <Link
                href="/"
                className="rounded-xl bg-[#012153] hover:bg-[#071c43] px-6 py-2.5 text-xs font-bold text-white shadow transition text-center"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!resultsEnabled) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#000814] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
          <span className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></span>
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
              onClick={handleDownloadCertificate}
              disabled={certDownloading}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition disabled:opacity-50"
            >
              <span>{certDownloading ? "Generating..." : "Download Verifiable Certificate (PDF)"}</span>
            </button>
            <Link
              href="/student/exams"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <span>Exam History</span>
            </Link>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 active:scale-95 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg><span>Print / Download PDF Slip</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg><span>Share on WhatsApp</span>
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
              {resultNotifications ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SMS &amp; Email Dispatch Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 mt-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="2" x2="22" y1="2" y2="22" /><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" /><path d="M5 10v2a7 7 0 0 0 12 5" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg><span>Notification Dispatch Paused</span>
                </span>
              )}
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
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <VerificationQRCode
                url={`https://www.brainlabacademy.com.ng/verify/${summary?.result_id || "mock-result"}`}
                size={80}
                label="Scan to Verify"
                className="shrink-0"
              />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Official BrainLab Digital Verification Code
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-blue-700 dark:text-sky-400">
                  https://www.brainlabacademy.com.ng/verify/{summary?.result_id || "mock-result"}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Issued by BrainLab Academy Examination Directorate under strict CBT proctoring standards. Tamper-evident verification slip.
                </p>
              </div>
            </div>

            <div className="text-center sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-800">
              <div className="inline-block border-b border-slate-400 pb-1 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                {chiefProctorName}
              </div>
              <p className="text-[10px] text-slate-400">{chiefProctorTitle}</p>
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

          {allowCorrections ? (
            <button
              onClick={() => router.push("/corrections")}
              className="rounded-xl bg-[#012153] hover:bg-[#071c43] px-8 py-3 text-xs font-bold text-white shadow-md shadow-blue-950/20 active:scale-95 transition hover:-translate-y-0.5"
            >
              Review Step-by-Step Question Corrections →
            </button>
          ) : (
            <div className="flex flex-col items-center sm:items-end">
              <button
                disabled
                className="rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-6 py-3 text-xs font-bold cursor-not-allowed flex items-center gap-2 border border-slate-300 dark:border-slate-700"
                title="Question corrections are withheld during the examination window."
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg><span>Corrections Withheld by Proctor</span>
              </button>
              <span className="text-[10px] text-slate-500 mt-1">Detailed solutions will unlock once the testing cycle closes.</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
