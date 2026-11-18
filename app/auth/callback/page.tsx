"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { sanitizeRedirectUrl } from "../../lib/authRedirect";
import type { Session } from "@supabase/supabase-js";

const EXAM_SPEED_TIPS = [
  {
    icon: "⚡",
    title: "CBT Speed Strategy",
    text: "Use keyboard keys A, B, C, D to answer questions and N / P to navigate instantly without touching your mouse.",
  },
  {
    icon: "🎯",
    title: "Formula First",
    text: "In Mathematics & Physics, note down the governing formula immediately to eliminate distractor options.",
  },
  {
    icon: "💡",
    title: "Curriculum Alignment",
    text: "BrainLab questions are indexed strictly against current JAMB UTME, WAEC, and NECO syllabus standards.",
  },
  {
    icon: "🚀",
    title: "Daily Micro-Drills",
    text: "15 targeted questions each day boosts retention and speed by over 40% compared to cramming before exams.",
  },
];

export default function AuthCallbackPage() {
  const router = useRouter();
  const started = useRef(false);
  const [statusText, setStatusText] = useState("Securing your learning credentials…");
  const [progress, setProgress] = useState(25);
  const [activeStep, setActiveStep] = useState(1);
  const [tipIndex, setTipIndex] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Rotate study tips smoothly every 3 seconds if on slow connection
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % EXAM_SPEED_TIPS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Smooth visual progress accelerator
    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 120);

    // Non-blocking cleanup of operator gate cookie for students
    function clearOperatorGateNonBlocking() {
      fetch("/api/auth/operator-gate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }).catch(() => {});
    }

    async function completeSignIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const nextParam = params.get("next") || params.get("redirect");

      if (params.has("error") || params.has("error_description")) {
        clearInterval(progressTimer);
        clearOperatorGateNonBlocking();
        const errDesc = params.get("error_description") || params.get("error") || "The sign-in could not be completed.";
        setErrorDetails(`${errDesc} Please return to BrainLab Academy and try signing in again.`);
        return;
      }

      let activeSession: Session | null = null;

      // 1. Fast Code Exchange
      if (code) {
        setStatusText("Verifying authentication token…");
        setActiveStep(1);
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError && exchangeData?.session) {
          activeSession = exchangeData.session;
        } else {
          // Check if session is already active in local storage / cookies
          const { data: existing } = await supabase.auth.getSession();
          if (existing?.session) {
            activeSession = existing.session;
          } else {
            clearInterval(progressTimer);
            clearOperatorGateNonBlocking();
            setErrorDetails("This sign-in link could not be verified or has expired. Please sign in again.");
            return;
          }
        }
      } else {
        const { data: existing } = await supabase.auth.getSession();
        activeSession = existing?.session ?? null;
      }

      if (!activeSession) {
        clearInterval(progressTimer);
        clearOperatorGateNonBlocking();
        setErrorDetails("No active sign-in session was found. Please return to the sign in page.");
        return;
      }

      // 2. Email verification sanity check for password users
      const isEmailProvider = activeSession.user.app_metadata?.provider === "email";
      if (isEmailProvider && activeSession.user.email && !activeSession.user.email_confirmed_at) {
        clearInterval(progressTimer);
        await supabase.auth.signOut();
        clearOperatorGateNonBlocking();
        setErrorDetails("Your email address has not been confirmed yet. Please check your inbox for the confirmation link.");
        return;
      }

      setActiveStep(2);
      setStatusText("Connecting syllabus & study subjects…");
      setProgress(75);

      // 3. Resolve operator/admin status with database
      let isOperator = false;
      try {
        const { data: adminRole, error: roleError } = await supabase.rpc("get_admin_role");
        if (!roleError && typeof adminRole === "string" && adminRole.length > 0) {
          isOperator = true;
        }
      } catch {
        // Default to student view if lookup times out
        isOperator = false;
      }

      setActiveStep(3);
      clearInterval(progressTimer);
      setProgress(100);

      if (isOperator) {
        setStatusText("Welcome back, Administrator. Launching Control Hub…");
        try {
          await fetch("/api/auth/operator-gate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: activeSession.access_token }),
            cache: "no-store",
          });
        } catch {
          // proceed
        }
        // Support returning an authenticated administrator to an intended admin screen (e.g. PIN recovery)
        const safeAdminTarget =
          nextParam && nextParam.startsWith("/admin")
            ? sanitizeRedirectUrl(nextParam, "/admin/dashboard")
            : "/admin/dashboard";
        router.replace(safeAdminTarget);
        return;
      }

      // Standard learner: fast-route to dashboard
      clearOperatorGateNonBlocking();
      setStatusText("Welcome to BrainLab Academy! Launching…");
      // Prevent standard students from being redirected into admin pages
      let safeLearnerTarget = sanitizeRedirectUrl(nextParam, "/dashboard");
      if (safeLearnerTarget.startsWith("/admin")) {
        safeLearnerTarget = "/dashboard";
      }

      router.replace(safeLearnerTarget);
    }

    void completeSignIn().catch((err) => {
      clearInterval(progressTimer);
      clearOperatorGateNonBlocking();
      setErrorDetails(err instanceof Error ? err.message : "The sign-in could not be completed. Please try again.");
    });

    return () => {
      clearInterval(progressTimer);
    };
  }, [router]);

  const currentTip = EXAM_SPEED_TIPS[tipIndex];

  return (
    <main
      id="main"
      className="flex min-h-[85vh] items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 via-blue-50/40 to-slate-100 dark:from-[#030712] dark:via-[#071328] dark:to-[#020617] text-slate-900 dark:text-slate-100 transition-colors"
    >
      <section className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-9 text-center shadow-2xl backdrop-blur-xl animate-fade-in">
        {/* Glow backgrounds */}
        <div
          className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {errorDetails ? (
          /* Error State */
          <div className="relative z-10 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-slate-950 dark:text-white">Sign-in Notice</h1>
            <p role="alert" className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {errorDetails}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] hover:bg-blue-900 px-5 py-2.5 text-xs font-bold text-white shadow transition active:scale-95"
              >
                ← Return to Sign In
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
              >
                Homepage
              </Link>
            </div>
          </div>
        ) : (
          /* Active High-Energy Animated Loading State */
          <div className="relative z-10 space-y-5">
            {/* Animated Brand Emblem Lockup */}
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-500 opacity-25 blur-md animate-pulse"
                aria-hidden="true"
              />
              <div
                className="absolute inset-1 rounded-2xl border-2 border-transparent border-t-blue-600 border-r-cyan-400 animate-spin"
                style={{ animationDuration: "1.2s" }}
                aria-hidden="true"
              />
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-950 shadow-md border border-slate-100 dark:border-slate-800">
                <Image
                  src="/brainlab-mark.png"
                  alt="BrainLab Academy"
                  width={38}
                  height={34}
                  priority
                  className="h-9 w-auto drop-shadow-xs"
                />
              </div>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                Finishing Sign-In
              </h1>
              <p
                role="status"
                aria-live="polite"
                className="mt-1 text-xs sm:text-sm font-semibold text-blue-700 dark:text-cyan-400"
              >
                {statusText}
              </p>
            </div>

            {/* Glowing Micro-Progress Bar */}
            <div className="mx-auto max-w-sm space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 transition-all duration-200 ease-out shadow-xs"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                <span>BrainLab Secure Auth</span>
                <span>{progress}%</span>
              </div>
            </div>

            {/* Micro-Step Status Indicator Cards */}
            <div className="grid grid-cols-3 gap-2 text-left">
              <div
                className={`rounded-xl border p-2 text-center transition ${
                  activeStep >= 1
                    ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40"
                }`}
              >
                <div className="text-[11px] font-black">{activeStep >= 1 ? "✓ Done" : "1"}</div>
                <div className="text-[10px] font-semibold truncate">Authentication</div>
              </div>
              <div
                className={`rounded-xl border p-2 text-center transition ${
                  activeStep >= 2
                    ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40"
                }`}
              >
                <div className="text-[11px] font-black">{activeStep >= 2 ? "✓ Done" : "2"}</div>
                <div className="text-[10px] font-semibold truncate">Subjects & Profile</div>
              </div>
              <div
                className={`rounded-xl border p-2 text-center transition ${
                  activeStep >= 3
                    ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40"
                }`}
              >
                <div className="text-[11px] font-black">{activeStep >= 3 ? "✓ Ready" : "3"}</div>
                <div className="text-[10px] font-semibold truncate">Launch Hub</div>
              </div>
            </div>

            {/* High-Energy Exam Speed Strategy Carousel Tile */}
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950/70 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/30 p-3.5 text-left transition-all duration-300">
              <div className="flex items-center gap-2">
                <span className="text-base">{currentTip.icon}</span>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-cyan-300">
                  {currentTip.title}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {currentTip.text}
              </p>
            </div>

            {/* Reassuring badge */}
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Encrypted Session Established
              </span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
