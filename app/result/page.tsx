"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-md">
          <p className="text-lg text-gray-700">Loading result settings.</p>
        </div>
      </main>
    );
  }

  if (!resultsEnabled) {
    return (
      <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-md">
          <h1 className="text-2xl font-bold text-gray-800">
            Results Not Released
          </h1>
          <p className="mt-3 text-gray-600">
            Results are not yet available. Please check back later.
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Back Home
          </button>
        </div>
      </main>
    );
  }

  if (lookupMode) {
    return (
      <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-md">
          <h1 className="text-center text-3xl font-bold text-gray-800">
            Check Your Result
          </h1>

          <div className="mt-6">
            <input
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
              placeholder="Enter Phone Number"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

            {codeRequired && (
              <input
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                placeholder="Enter the access code you used"
                className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 uppercase outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            <button
              onClick={handleLookup}
              disabled={lookupLoading}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.01] disabled:opacity-50"
            >
              {lookupLoading ? "Checking..." : "Check Result"}
            </button>

            <button
              onClick={() => router.push("/")}
              className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Back Home
            </button>
          </div>

          {lookupError && (
            <div className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">
              {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className="mt-8 rounded-2xl bg-gray-50 p-6">
              <h2 className="text-2xl font-bold text-gray-800">
                BRAINLAB CBT RESULT
              </h2>

              <div className="mt-4 space-y-2 text-lg text-gray-700">
                <p>
                  <span className="font-semibold">Name:</span> {lookupResult.name}
                </p>
                <p>
                  <span className="font-semibold">Phone Number:</span> {lookupPhone.trim()}
                </p>
                <p>
                  <span className="font-semibold">Subject:</span> {lookupResult.subject}
                </p>
                <p className="pt-2 text-2xl font-bold text-blue-700">
                  Total Score: {lookupResult.score} / {lookupResult.total}
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
      <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-md">
          <p className="text-lg text-gray-700">Loading result.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-md">
        <h1 className="text-center text-3xl font-bold text-gray-800 md:text-4xl">
          BRAINLAB CBT RESULT
        </h1>

        <div className="mt-8 space-y-2 text-lg text-gray-700">
          <p>
            <span className="font-semibold">Name:</span> {candidate.name}
          </p>
          <p>
            <span className="font-semibold">Phone Number:</span> {candidate.phone}
          </p>
          <p>
            <span className="font-semibold">English:</span> {subjectScores.English ?? 0}
          </p>
          <p>
            <span className="font-semibold">Chemistry:</span> {subjectScores.Chemistry ?? 0}
          </p>
          <p>
            <span className="font-semibold">Physics:</span> {subjectScores.Physics ?? 0}
          </p>
          <p>
            <span className="font-semibold">{candidate.subject}:</span>{" "}
            {candidate.subject === "Biology"
              ? subjectScores.Biology
              : subjectScores.Mathematics}
          </p>
          <p className="pt-3 text-2xl font-bold text-blue-700">
            Total Score: {totalScore} / {totalPossible}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row">
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to Home
          </button>

          <button
            onClick={() => router.push("/corrections")}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.01]"
          >
            VIEW CORRECTIONS
          </button>
        </div>
      </div>
    </main>
  );
}