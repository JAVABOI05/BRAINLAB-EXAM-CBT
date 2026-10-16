"use client";

import { useEffect, useState } from "react";
import { getPublicSettings } from "../lib/examApi";

export default function TestPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Checking the public exam settings endpoint…");

  useEffect(() => {
    let active = true;

    async function checkConnection() {
      const settings = await getPublicSettings();
      if (!active) return;

      if (!settings) {
        setStatus("error");
        setMessage("The public settings endpoint could not be reached. No question or answer-key data was requested.");
        return;
      }

      setStatus("ready");
      setMessage("Public settings endpoint is responding. This diagnostic intentionally does not read questions, candidate records, results, or answer keys.");
    }

    void checkConnection();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold">BrainLab Connection Check</h1>
        <p className="mt-4 text-slate-700">{message}</p>
        <p className="mt-3 text-sm text-slate-500">Status: {status}</p>
      </div>
    </main>
  );
}
