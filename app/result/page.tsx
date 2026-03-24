"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type ResultItem = {
  id: string | number;
  subject: string;
  type?: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  userAnswer: "A" | "B" | "C" | "D" | null;
  isCorrect: boolean;
  flagged?: boolean;
  marks?: number;
};

type Candidate = {
  name: string;
  phone: string;
  subject: string;
  code: string;
};

type SavedResultRow = {
  id: number;
  name: string;
  phone: string;
  subject: string;
  score: number;
  total: number;
  created_at?: string;
};

export default function ResultPage() {
  const router = useRouter();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [resultsEnabled, setResultsEnabled] = useState<boolean | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [lookupMode, setLookupMode] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState<SavedResultRow | null>(null);

  const hasSavedRef = useRef(false);

  useEffect(() => {
    async function loadPage() {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "show_results")
        .single();

      setResultsEnabled(data?.value === true || data?.value === "true");

      const savedCandidate = localStorage.getItem("candidate");
      const savedResults = localStorage.getItem("exam_result");

      if (!savedCandidate || !savedResults) {
        setLookupMode(true);
        return;
      }

      try {
        const parsedCandidate = JSON.parse(savedCandidate) as Candidate;
        const parsedResults = JSON.parse(savedResults) as ResultItem[];

        setCandidate(parsedCandidate);
        setResults(parsedResults);
        setLookupMode(false);
      } catch {
        setLookupMode(true);
      }
    }

    loadPage();
  }, []);

  const subjectScores = useMemo(() => {
    const scores: Record<string, number> = {
      English: 0,
      Chemistry: 0,
      Physics: 0,
      Biology: 0,
      Mathematics: 0,
    };

    results.forEach((item) => {
      const markValue =
        typeof item.marks === "number" && !Number.isNaN(item.marks)
          ? item.marks
          : 1;

      if (item.isCorrect && scores[item.subject] !== undefined) {
        scores[item.subject] += markValue;
      }
    });

    return {
      English: Math.round(scores.English),
      Chemistry: Math.round(scores.Chemistry),
      Physics: Math.round(scores.Physics),
      Biology: Math.round(scores.Biology),
      Mathematics: Math.round(scores.Mathematics),
    };
  }, [results]);

  const totalScore = useMemo(() => {
    return (
      subjectScores.English +
      subjectScores.Chemistry +
      subjectScores.Physics +
      subjectScores.Biology +
      subjectScores.Mathematics
    );
  }, [subjectScores]);

  useEffect(() => {
    async function saveResultAndAnswers() {
      if (
        resultsEnabled !== true ||
        !candidate ||
        results.length === 0 ||
        hasSavedRef.current ||
        lookupMode
      ) {
        return;
      }

      hasSavedRef.current = true;
      setSaveStatus("saving");

      const { data: insertedResult, error: resultError } = await supabase
        .from("results")
        .insert([
          {
            name: candidate.name,
            phone: candidate.phone,
            subject: candidate.subject,
            score: totalScore,
            total: 400,
          },
        ])
        .select("id")
        .single();

      if (resultError || !insertedResult) {
        console.error("Supabase result save error:", resultError?.message);
        setSaveStatus("error");
        return;
      }

      localStorage.setItem("latest_result_id", String(insertedResult.id));

      const answerRows = results.map((item) => ({
        result_id: insertedResult.id,
        question_id: Number(item.id),
        selected_answer: item.userAnswer,
        is_correct: item.isCorrect,
      }));

      const { error: answersError } = await supabase
        .from("answers")
        .insert(answerRows);

      if (answersError) {
        console.error("Supabase answers save error:", answersError.message);
        setSaveStatus("error");
        return;
      }

      setSaveStatus("saved");
    }

    saveResultAndAnswers();
  }, [candidate, results, totalScore, resultsEnabled, lookupMode]);

  const handleLookup = async () => {
    const value = lookupPhone.trim();

    if (!value) {
      setLookupError("Please enter your phone number.");
      setLookupResult(null);
      return;
    }

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);

    const { data, error } = await supabase
      .from("results")
      .select("id, name, phone, subject, score, total, created_at")
      .eq("phone", value)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLookupLoading(false);

    if (error) {
      setLookupError(error.message);
      return;
    }

    if (!data) {
      setLookupError("No result found for this phone number.");
      return;
    }

    setLookupResult(data);
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
                  <span className="font-semibold">Phone Number:</span> {lookupResult.phone}
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

        <div className="mt-4">
          {saveStatus === "saving" && (
            <p className="text-sm text-blue-700">Saving result and answers.</p>
          )}
          {saveStatus === "saved" && (
            <p className="text-sm text-green-700">
              Result and answers saved successfully.
            </p>
          )}
          {saveStatus === "error" && (
            <p className="text-sm text-red-700">
              Result or answers could not be saved to backend.
            </p>
          )}
        </div>

        <div className="mt-8 space-y-2 text-lg text-gray-700">
          <p>
            <span className="font-semibold">Name:</span> {candidate.name}
          </p>
          <p>
            <span className="font-semibold">Phone Number:</span> {candidate.phone}
          </p>
          <p>
            <span className="font-semibold">English:</span> {subjectScores.English}
          </p>
          <p>
            <span className="font-semibold">Chemistry:</span> {subjectScores.Chemistry}
          </p>
          <p>
            <span className="font-semibold">Physics:</span> {subjectScores.Physics}
          </p>
          <p>
            <span className="font-semibold">{candidate.subject}:</span>{" "}
            {candidate.subject === "Biology"
              ? subjectScores.Biology
              : subjectScores.Mathematics}
          </p>
          <p className="pt-3 text-2xl font-bold text-blue-700">
            Total Score: {totalScore} / 400
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