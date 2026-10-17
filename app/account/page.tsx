"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Mode = "signin" | "signup";

export default function AccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") {
      setMode("signup");
    }
  }, []);

  async function clearOperatorGate() {
    try {
      await fetch("/api/auth/operator-gate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Permission checks remain fail-closed even if cleanup cannot complete.
    }
  }

  async function continueWithSession(session: Session) {
    setError("");
    const { data: isOperator, error: permissionError } = await supabase.rpc("is_admin");

    if (permissionError) {
      await clearOperatorGate();
      setError("We could not verify your account permissions. Please try again.");
      return;
    }

    if (isOperator === true) {
      const response = await fetch("/api/auth/operator-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: session.access_token }),
      });
      if (!response.ok) {
        await clearOperatorGate();
        setError("Your sign-in was successful, but secure access could not be prepared. Please contact the platform owner.");
        return;
      }

      // The dashboard re-checks the current role from Supabase before loading data.
      // Do not persist an admin role in browser storage as an authorization signal.
      window.localStorage.removeItem("admin_user");
      router.replace("/admin/dashboard");
      return;
    }

    await clearOperatorGate();
    router.replace("/dashboard");
  }

  async function submitCredentials() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (!email.trim() || !password) {
        setError("Enter your email address and password.");
        return;
      }
      if (mode === "signup") {
        if (!name.trim()) {
          setError("Enter your name to create an account.");
          return;
        }
        if (password.length < 8) {
          setError("Use a password with at least 8 characters.");
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          await continueWithSession(data.session);
        } else {
          setMessage("Account request received. Check your email for the verification link, then return here to sign in.");
          setMode("signin");
          setPassword("");
        }
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !data.session) {
        setError("We could not sign you in with those details. Check them and try again.");
        return;
      }
      await continueWithSession(data.session);
    } catch {
      setError("Something went wrong while contacting BrainLab. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) setError("Google sign-in is unavailable. Please try email sign-in or contact support.");
    } catch {
      setError("Google sign-in is unavailable. Please try email sign-in or contact support.");
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      setError("Enter your email address first so we can send a recovery link.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) setError("We could not send a recovery email. Check the address and try again.");
      else setMessage("If an account exists for that address, a password recovery link will arrive by email.");
    } catch {
      setError("We could not send a recovery email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" className="min-h-[75vh] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-blue-950/5 md:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-[#012153] p-7 text-white sm:p-10">
          <Link href="/" className="text-sm font-semibold text-blue-100 hover:text-white">← BrainLab Academy</Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Your learning journey</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
            Learn with purpose. Keep moving forward.
          </h1>
          <p className="mt-5 leading-7 text-blue-100">
            Use one BrainLab account to return to your learning space. Existing CBT practice remains available while account-linked learning features are developed.
          </p>
          <div className="mt-8 space-y-3 text-sm text-blue-100">
            <p>✓ A personal account for your learning journey</p>
            <p>✓ Email sign-in and Google sign-in</p>
            <p>✓ Secure account recovery</p>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); }} className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-bold ${mode === "signin" ? "bg-white text-[#012153] shadow-sm" : "text-slate-600"}`}>Sign in</button>
            <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-bold ${mode === "signup" ? "bg-white text-[#012153] shadow-sm" : "text-slate-600"}`}>Create account</button>
          </div>

          <h2 className="mt-7 text-2xl font-extrabold text-slate-950">{mode === "signup" ? "Create your BrainLab account" : "Welcome back"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{mode === "signup" ? "Start with a few details. We may ask you to verify your email." : "Sign in to continue to your learning space."}</p>

          <button type="button" onClick={signInWithGoogle} disabled={busy} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60">
            <span aria-hidden="true" className="text-lg font-extrabold">G</span>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" /></div>

          <form onSubmit={(event) => { event.preventDefault(); void submitCredentials(); }} className="space-y-4">
            {mode === "signup" && <div><label htmlFor="account-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label><input id="account-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" placeholder="Your full name" /></div>}
            <div><label htmlFor="account-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" placeholder="you@example.com" /></div>
            <div><label htmlFor="account-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label><div className="flex gap-2"><input id="account-password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700">{showPassword ? "Hide" : "Show"}</button></div></div>
            {mode === "signin" && <button type="button" onClick={() => void sendPasswordReset()} disabled={busy} className="text-sm font-semibold text-blue-800 underline underline-offset-4">Forgot your password?</button>}
            <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-[#012153] px-4 py-3 font-bold text-white transition hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in securely"}</button>
          </form>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}
          {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">{message}</p>}
          <p className="mt-6 text-xs leading-5 text-slate-500">By continuing, you agree to use BrainLab responsibly. Account permissions are assigned separately and cannot be selected during registration.</p>
        </section>
      </div>
    </main>
  );
}
