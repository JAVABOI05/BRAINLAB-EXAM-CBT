"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAccessCode, getPublicSettings, isError } from "../lib/examApi";

export default function AccessPage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [mockEnabled, setMockEnabled] = useState(true);
  const [accessCodeRequired, setAccessCodeRequired] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const settings = await getPublicSettings();

      if (!settings) {
        setErrorText("Could not load exam settings. Please refresh the page.");
        setPageLoading(false);
        return;
      }

      setMockEnabled(settings.mock_enabled);
      setAccessCodeRequired(settings.access_code_required);

      if (!settings.access_code_required) {
        router.push("/instructions");
        return;
      }

      setPageLoading(false);
    }

    void loadSettings();
  }, [router]);

  const handleValidateCode = async () => {
    if (!mockEnabled) {
      setErrorText("The exam is currently unavailable.");
      return;
    }

    if (!code.trim()) {
      setErrorText("Please enter your access code.");
      return;
    }

    if (!phone.trim()) {
      setErrorText("Please enter your phone number.");
      return;
    }

    setLoading(true);
    setErrorText("");

    const normalizedCode = code.trim().toUpperCase();
    const trimmedPhone = phone.trim();

    const result = await checkAccessCode(normalizedCode, trimmedPhone);

    if (isError(result)) {
      setErrorText(result.message || "Invalid access code.");
      setLoading(false);
      return;
    }

    localStorage.setItem("access_code", normalizedCode);

    const savedCandidate = localStorage.getItem("candidate");

    if (savedCandidate) {
      try {
        const parsed = JSON.parse(savedCandidate);
        localStorage.setItem(
          "candidate",
          JSON.stringify({
            ...parsed,
            code: normalizedCode,
            phone: trimmedPhone,
            access_type: result.type === "master" ? "master" : "normal",
          })
        );
      } catch {
        localStorage.setItem(
          "candidate",
          JSON.stringify({
            name: "",
            phone: trimmedPhone,
            subject: "",
            code: normalizedCode,
            access_type: result.type === "master" ? "master" : "normal",
          })
        );
      }
    } else {
      localStorage.setItem(
        "candidate",
        JSON.stringify({
          name: "",
          phone: trimmedPhone,
          subject: "",
          code: normalizedCode,
          access_type: result.type === "master" ? "master" : "normal",
        })
      );
    }

    setLoading(false);
    router.push("/instructions");
  };

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-md">
          <p className="text-lg text-gray-700">Loading access page...</p>
        </div>
      </main>
    );
  }

  if (!mockEnabled) {
    return (
      <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-md">
          <h1 className="text-2xl font-bold text-gray-800">
            Exam Currently Unavailable
          </h1>
          <p className="mt-3 text-gray-600">
            The exam is currently closed. Please check back later.
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.01]"
          >
            Back Home
          </button>
        </div>
      </main>
    );
  }

  if (!accessCodeRequired) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-md">
        <h1 className="text-center text-3xl font-bold text-gray-800">
          Enter Access Code
        </h1>

        <p className="mt-3 text-center text-sm text-gray-600">
          Enter your phone number and valid access code to continue.
        </p>

        <div className="mt-6 space-y-4">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone Number"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="BLT-XXXX-XXXX or master code"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 uppercase outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleValidateCode}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? "Checking..." : "Continue"}
          </button>
        </div>

        {errorText && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        )}
      </div>
    </main>
  );
}