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
            <input
              type="password"
              required
              disabled={!ready || busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-xs"
            />
            <div className="mt-2">
              <PasswordStrengthMeter password={password} role="student" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              disabled={!ready || busy}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-xs"
            />
          </div>

          <button
            type="submit"
            disabled={!ready || busy}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-black text-white shadow-sm transition disabled:opacity-50"
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
