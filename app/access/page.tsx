"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { checkAccessCode, getPublicSettings, isError } from "../lib/examApi";

export default function AccessPage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [mockEnabled, setMockEnabled] = useState(true);
  const [accessCodeRequired, setAccessCodeRequired] = useState(true);
  const [maintenanceNotice, setMaintenanceNotice] = useState<{
    active: boolean;
    title?: string;
    message: string;
    estimated_resumption?: string;
    allow_admin_bypass?: boolean;
  } | null>(null);
  const [errorText, setErrorText] = useState("");
  const [failedCount, setFailedCount] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  useEffect(() => {
    async function loadSettings() {
      // Reuse candidate details already entered on the CBT launchpad.
      // This avoids making candidates retype their phone number after choosing "Enter Code".
      try {
        const savedCandidate = localStorage.getItem("candidate");
        if (savedCandidate) {
          const candidate = JSON.parse(savedCandidate) as { phone?: string };
          if (candidate.phone) setPhone(candidate.phone);
        }
        const previouslyEnteredCode = localStorage.getItem("access_code");
        if (previouslyEnteredCode) setCode(previouslyEnteredCode);
      } catch {
        // Ignore stale or malformed browser data; the candidate can enter details manually.
      }

      const settings = await getPublicSettings();

      if (!settings) {
        setErrorText("Could not load exam settings. Please refresh the page.");
        setPageLoading(false);
        return;
      }

      setMockEnabled(settings.mock_enabled);
      setAccessCodeRequired(settings.access_code_required);
      try {
        const annRes = await fetch("/api/announcements/active").then((r) => r.json());
        if (annRes?.maintenance?.active) {
          setMaintenanceNotice(annRes.maintenance);
        }
      } catch {}

      if (!settings.access_code_required) {
        router.push("/instructions");
        return;
      }

      setPageLoading(false);
    }

    void loadSettings();
  }, [router]);

  const handleValidateCode = async () => {
    if (lockoutRemaining > 0) {
      setErrorText(`Too many failed attempts. Please wait ${lockoutRemaining} seconds.`);
      return;
    }

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

    try {
      const res = await fetch("/api/exam/resolve-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode, phone: trimmedPhone }),
      });
      const result = await res.json();

      if (!res.ok || !result.ok) {
        const nextFail = failedCount + 1;
        setFailedCount(nextFail);
        if (nextFail >= 4) {
          setLockoutRemaining(30);
          setErrorText("Too many invalid attempts. Please wait 30 seconds before trying again.");
        } else {
          setErrorText(result.message || "Invalid examination code.");
        }
        setLoading(false);
        return;
      }

      if (maintenanceNotice?.active && !result.resumed_attempt) {
        setErrorText(`CBT Engine Under Maintenance: ${maintenanceNotice.message}`);
        setLoading(false);
        return;
      }

      setFailedCount(0);
      setLockoutRemaining(0);
      localStorage.setItem("access_code", normalizedCode);

      // 1. Instructor Assessment Flow: Route directly to assessment briefing
      if (result.type === "instructor_assessment" && result.destination) {
        setLoading(false);
        router.push(result.destination);
        return;
      }

      // 2. UTME Mock Flow: Update candidate record and route to instructions
      const savedCandidate = localStorage.getItem("candidate");
      let candidateData: Record<string, unknown> = {};
      if (savedCandidate) {
        try {
          candidateData = JSON.parse(savedCandidate) || {};
        } catch {}
      }

      const existingSubjects = Array.isArray(candidateData.subjects) && candidateData.subjects.length === 4
        ? candidateData.subjects
        : ["English", "Mathematics", "Physics", "Chemistry"];

      localStorage.setItem(
        "candidate",
        JSON.stringify({
          ...candidateData,
          name: candidateData.name || result.candidate_name || "",
          phone: trimmedPhone,
          subject: result.preconfigured_subject || candidateData.subject || existingSubjects[1] || "Mathematics",
          subjects: existingSubjects,
          code: normalizedCode,
          access_type: result.access_mode === "master" ? "master" : "normal",
        })
      );

      setLoading(false);
      router.push("/instructions");
    } catch {
      // Fallback to legacy checkAccessCode RPC
      const result = await checkAccessCode(normalizedCode, trimmedPhone);

      if (isError(result)) {
        const nextFail = failedCount + 1;
        setFailedCount(nextFail);
        if (nextFail >= 3) {
          setLockoutRemaining(30);
          setErrorText("Too many invalid attempts. Please wait 30 seconds before trying again.");
        } else {
          setErrorText(result.message || "Invalid access code.");
        }
        setLoading(false);
        return;
      }

      if (result.type === "none") {
        const nextFail = failedCount + 1;
        setFailedCount(nextFail);
        if (nextFail >= 3) {
          setLockoutRemaining(30);
          setErrorText("Too many invalid attempts. Please wait 30 seconds before trying again.");
        } else {
          setErrorText("Invalid access code or phone number. Please check your details and try again.");
        }
        setLoading(false);
        return;
      }

      setFailedCount(0);
      setLockoutRemaining(0);
      localStorage.setItem("access_code", normalizedCode);

      const savedCandidate = localStorage.getItem("candidate");

      let candidateData: Record<string, unknown> = {};
      if (savedCandidate) {
        try {
          candidateData = JSON.parse(savedCandidate) || {};
        } catch {}
      }

      const existingSubjects = Array.isArray(candidateData.subjects) && candidateData.subjects.length === 4
        ? candidateData.subjects
        : ["English", "Mathematics", "Physics", "Chemistry"];

      localStorage.setItem(
        "candidate",
        JSON.stringify({
          ...candidateData,
          name: candidateData.name || "",
          phone: trimmedPhone,
          subject: candidateData.subject || existingSubjects[1] || "Mathematics",
          subjects: existingSubjects,
          code: normalizedCode,
          access_type: result.type === "master" ? "master" : "normal",
        })
      );

      setLoading(false);
      router.push("/instructions");
    }
  };

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading access requirements...</p>
        </div>
      </main>
    );
  }

  if (!mockEnabled) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-white/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
          <span className="text-4xl" aria-hidden="true">🔒</span>
          <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            Exam Currently Unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            The exam session is currently closed by the administrator. Please check back later.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#012153] hover:bg-[#071c43] px-4 py-3 font-bold text-white shadow transition hover:-translate-y-0.5 active:scale-95 text-sm"
          >
            ← Return to Home
          </Link>
        </div>
      </main>
    );
  }

  if (!accessCodeRequired) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe8f7_0%,#eaf2ff_45%,#f8fbff_80%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#060e1a_0%,#030712_100%)] flex items-center justify-center px-4 py-8">
      <div className="mx-auto max-w-md w-full rounded-3xl border border-white/70 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-2xl shadow-blue-100/40 dark:shadow-none backdrop-blur-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto dark:hidden" />
          <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto hidden dark:block" />
        </div>

        <h1 className="text-center text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Enter Exam Access Code
        </h1>

        <p className="mt-2 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Provide your candidate phone number and the access code issued for this session.
        </p>

        {maintenanceNotice?.active && (
          <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">🛠️</span>
              <div className="space-y-1 text-rose-950 dark:text-rose-200">
                <p className="font-bold text-xs uppercase tracking-wide text-rose-800 dark:text-rose-300">
                  {maintenanceNotice.title || "CBT Examination Engine Maintenance"}
                </p>
                <p className="font-medium text-xs leading-relaxed text-rose-900 dark:text-rose-100">
                  {maintenanceNotice.message}
                </p>
                {maintenanceNotice.estimated_resumption && (
                  <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 pt-1">
                    ⏱️ Estimated Resumption: {maintenanceNotice.estimated_resumption}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3.5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Candidate Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Access Code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BLT-XXXX-XXXX"
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm uppercase text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono tracking-wider"
            />
          </div>

          <button
            onClick={handleValidateCode}
            disabled={loading || lockoutRemaining > 0}
            className="mt-2 w-full rounded-xl bg-[#012153] hover:bg-[#071c43] px-4 py-3.5 font-bold text-white shadow-md shadow-blue-950/20 transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:transform-none text-sm"
          >
            {lockoutRemaining > 0
              ? `Cooldown active (${lockoutRemaining}s)`
              : loading
              ? "Verifying Code..."
              : "Validate and Continue →"}
          </button>
        </div>

        {errorText && (
          <div className="mt-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-semibold text-rose-800 dark:text-rose-200">
            {errorText}
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
          <Link
            href="/login"
            className="text-xs font-bold text-blue-700 dark:text-cyan-400 hover:underline"
          >
            ← Back to CBT Launchpad
          </Link>
        </div>
      </div>
    </main>
  );
}
