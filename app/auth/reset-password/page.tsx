"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import PasswordStrengthMeter from "@/app/components/ui/PasswordStrengthMeter";
import { evaluatePasswordStrength } from "../../lib/passwordStrength";

export default function ResetPasswordPage() {
  const router = useRouter();
  const started = useRef(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let isMounted = true;

    // Listen for auth state events (e.g. PASSWORD_RECOVERY or session hydration from hash)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setError("");
      }
    });

    async function prepare() {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (isMounted) setError(exchangeError.message);
          return;
        }
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        if (isMounted) {
          setReady(true);
          setError("");
        }
        return;
      }

      // If session is not immediately available, give a brief grace period for hash fragment hydration
      setTimeout(async () => {
        if (!isMounted) return;
        const { data: recheck } = await supabase.auth.getSession();
        if (recheck?.session) {
          setReady(true);
          setError("");
        } else {
          setError("Your reset session has expired or is invalid. Please request a new link.");
        }
      }, 1000);
    }
    void prepare();

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const strength = evaluatePasswordStrength(password, "student");
    if (!strength.isValid) {
      setError(strength.feedback);
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password successfully updated. Redirecting to your dashboard…");
    setTimeout(() => {
      router.replace("/dashboard");
    }, 1500);
  }

  return (
    <main className="min-h-[75vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-[#070e1b] text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full bg-white dark:bg-[#0d1b2a] rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
        <h1 className="text-xl font-black text-slate-950 dark:text-white">Choose a new password</h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Enter a secure password with at least 8 characters.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            {message}
          </p>
        )}

        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={!ready || busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter at least 8 characters"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 pr-10 text-sm shadow-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-2">
              <PasswordStrengthMeter password={password} role="student" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                disabled={!ready || busy}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-type your new password"
                className={`w-full rounded-xl border bg-white dark:bg-slate-900 px-3 py-2.5 pr-10 text-sm shadow-xs outline-none transition ${
                  confirm.length > 0
                    ? password === confirm
                      ? "border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950"
                      : "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950"
                    : "border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none"
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirm ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Live Password Match Feedback */}
            {confirm.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold">
                {password === confirm ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Passwords match
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!ready || busy || (confirm.length > 0 && password !== confirm) || password.length < 8}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-black text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Updating Password…" : "Save New Password"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          <Link href="/login" className="font-bold text-blue-600 hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
