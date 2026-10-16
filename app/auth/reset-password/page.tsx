"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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
    async function prepare() {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError("This recovery link is invalid or has expired. Request a new one.");
          return;
        }
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setReady(true);
      else setError("Open this page from the password recovery link in your email.");
    }
    void prepare().catch(() => setError("We could not verify the recovery link. Request a new one."));
  }, []);

  async function updatePassword() {
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("We could not update your password. Request a fresh recovery link and try again.");
      } else {
        setMessage("Your password has been updated. You can now sign in.");
        window.setTimeout(() => router.replace("/account"), 900);
      }
    } catch {
      setError("We could not update your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main id="main" className="mx-auto flex min-h-[65vh] max-w-xl items-center px-5 py-14"><section className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">Account security</p><h1 className="mt-3 text-3xl font-extrabold text-slate-950">Set a new password</h1><p className="mt-3 leading-7 text-slate-600">Choose a new password for your BrainLab account.</p>{ready && <div className="mt-6 space-y-4"><div><label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold">New password</label><input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></div><div><label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></div><button type="button" disabled={busy} onClick={() => void updatePassword()} className="min-h-12 w-full rounded-xl bg-[#012153] px-4 py-3 font-bold text-white disabled:opacity-60">{busy ? "Updating…" : "Update password"}</button></div>}{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}{message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">{message}</p>}<Link href="/account" className="mt-6 inline-flex text-sm font-semibold text-blue-800 underline underline-offset-4">Return to sign in</Link></section></main>;
}
