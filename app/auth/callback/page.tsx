"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function AuthCallbackPage() {
  const router = useRouter();
  const started = useRef(false);
  const [statusText, setStatusText] = useState("Securing your learning credentials…");
  const [progress, setProgress] = useState(20);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Smoothly advance visual progress bar
    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev < 88 ? prev + 12 : prev));
    }, 180);

    // Non-blocking cleanup of operator gate cookie for students
    function clearOperatorGateNonBlocking() {
      fetch("/api/auth/operator-gate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }).catch(() => {
        // Safe fail-closed cleanup
      });
    }

    async function completeSignIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const nextParam = params.get("next");

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

      setStatusText("Preparing your personalized study hub…");
      setProgress(90);

      // 3. Resolve the database-backed role before choosing a destination.
      // A slow or failed role lookup must not silently send an administrator to
      // the candidate dashboard.
      let isOperator = false;
      try {
        const { data: adminRole, error: roleError } = await supabase.rpc("get_admin_role");
        if (roleError) {
          clearInterval(progressTimer);
          setErrorDetails("We could not verify your account permissions. Please return to the account page and try again.");
          return;
        }
        isOperator = typeof adminRole === "string" && adminRole.length > 0;
      } catch {
        clearInterval(progressTimer);
        setErrorDetails("We could not verify your account permissions. Please return to the account page and try again.");
        return;
      }

      // 4. Route only after role resolution has completed.
      clearInterval(progressTimer);
      setProgress(100);

      if (isOperator) {
        setStatusText("Welcome back, Administrator. Opening Control Hub…");
        try {
          await fetch("/api/auth/operator-gate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: activeSession.access_token }),
            cache: "no-store",
          });
        } catch {
          // If gate fails, proceed to admin dashboard
        }
        router.replace("/admin/dashboard");
        return;
      }

      // Standard learner: Fire cleanup non-blocking and redirect immediately
      clearOperatorGateNonBlocking();
      setStatusText("Welcome to BrainLab Academy! Launching…");
      const targetDestination = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/dashboard";

      router.replace(targetDestination);
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

  return (
    <main
      id="main"
      className="flex min-h-[80vh] items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 dark:from-[#030712] dark:via-[#071328] dark:to-[#020617] text-slate-900 dark:text-slate-100 transition-colors"
    >
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-8 sm:p-10 text-center shadow-2xl backdrop-blur-xl animate-fade-in">
        {/* Subtle background glow */}
        <div
          className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {errorDetails ? (
          /* Error State */
          <div className="relative z-10 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-2xl text-rose-600 dark:text-rose-400">
              ⚠️
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
          /* Active High-Energy Loading State */
          <div className="relative z-10 space-y-5">
            {/* Animated Brand Emblem Lockup */}
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              {/* Outer pulsing ring */}
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-500 opacity-20 blur-md animate-pulse"
                aria-hidden="true"
              />
              {/* Inner rotating gradient accent */}
              <div
                className="absolute inset-1 rounded-2xl border-2 border-transparent border-t-blue-600 border-r-cyan-400 animate-spin"
                style={{ animationDuration: "1.6s" }}
                aria-hidden="true"
              />
              {/* Central Logo */}
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
                Signing You In…
              </h1>
              <p
                role="status"
                aria-live="polite"
                className="mt-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 animate-pulse"
              >
                {statusText}
              </p>
            </div>

            {/* Glowing Micro-Progress Bar */}
            <div className="mx-auto max-w-xs space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                <span>BrainLab Academy</span>
                <span>{progress}%</span>
              </div>
            </div>

            {/* Reassuring badge */}
            <div className="pt-2">
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
