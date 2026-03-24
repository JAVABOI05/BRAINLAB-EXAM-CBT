"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ResultRow = {
  id: number;
  name: string;
  phone: string;
  subject: string;
  score: number;
  total: number;
  created_at?: string;
};

export default function CheckResultPage() {
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get("phone") || "";

  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [result, setResult] = useState<ResultRow | null>(null);

  const handleCheckResult = async (phoneValue?: string) => {
    const value = (phoneValue ?? phone).trim();

    if (!value) {
      setErrorText("Please enter your phone number.");
      setResult(null);
      return;
    }

    setLoading(true);
    setErrorText("");
    setResult(null);

    const { data, error } = await supabase
      .from("results")
      .select("id, name, phone, subject, score, total, created_at")
      .eq("phone", value)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    if (!data) {
      setErrorText("No result found for this phone number.");
      return;
    }

    setResult(data);
  };

  useEffect(() => {
    if (initialPhone) {
      handleCheckResult(initialPhone);
    }
  }, [initialPhone]);

  return (
    <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-md">
        <h1 className="text-center text-3xl font-bold text-gray-800">
          Check Your Result
        </h1>

        <div className="mt-6">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter Phone Number"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={() => handleCheckResult()}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? "Checking..." : "Check Result"}
          </button>
        </div>

        {errorText && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">
            {errorText}
          </div>
        )}

        {result && (
          <div className="mt-8 rounded-2xl bg-gray-50 p-6">
            <h2 className="text-2xl font-bold text-gray-800">
              BRAINLAB CBT RESULT
            </h2>

            <div className="mt-4 space-y-2 text-lg text-gray-700">
              <p>
                <span className="font-semibold">Name:</span> {result.name}
              </p>
              <p>
                <span className="font-semibold">Phone Number:</span> {result.phone}
              </p>
              <p>
                <span className="font-semibold">Subject:</span> {result.subject}
              </p>
              <p className="pt-2 text-2xl font-bold text-blue-700">
                Total Score: {result.score} / {result.total}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}