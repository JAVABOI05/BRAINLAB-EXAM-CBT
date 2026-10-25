"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getAuthRedirectUrl } from "../lib/authRedirect";

type Mode = "signin" | "signup";

function subscribeToAccountMode(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getAccountModeSnapshot(): Mode {
  return new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "signin";
}

function getServerAccountModeSnapshot(): Mode {
  return "signin";
}

export default function AccountPage() {
  const router = useRouter();
  const queryMode = useSyncExternalStore(subscribeToAccountMode, getAccountModeSnapshot, getServerAccountModeSnapshot);
  const [manualMode, setManualMode] = useState<Mode | null>(null);
  const mode = manualMode ?? queryMode;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const err = searchParams.get("error");
    if (code || err) {
      window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
      return;
    }
    let active = true;
    async function redirectIfAlreadySignedIn() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!active || sessionError || !session) return;

      // Never treat a persisted browser session as proof that email verification
      // is complete. This is a client-side guard; Supabase settings and server
      // authorization must also enforce the policy.
      if (session.user.email && !session.user.email_confirmed_at) {
        await clearOperatorGate();
        await supabase.auth.signOut();
        setError("Please verify your email before entering BrainLab. Check your inbox for the verification link, then sign in again.");
        return;
      }
      // Restore the destination from the verified database role, not from a
      // default candidate redirect. A role lookup failure must never downgrade
      // an administrator to the candidate dashboard.
      const { data: adminRole, error: permissionError } = await supabase.rpc("get_admin_role");
      const isOperator = typeof adminRole === "string" && adminRole.length > 0;
      if (!active) return;

      if (permissionError) {
        setError("We could not verify your account permissions. Please try again.");
        return;
      }

      if (isOperator === true) {
        const gateResponse = await fetch("/api/auth/operator-gate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: session.access_token }),
          cache: "no-store",
        });
        if (!active) return;
        if (!gateResponse.ok) {
          const errorData = await gateResponse.json().catch(() => null);
          setError(errorData?.error || "Your administrator session is valid, but secure admin access could not be restored. Please try signing in again.");
          return;
        }
        window.localStorage.removeItem("admin_user");
        router.replace("/admin/dashboard");
        return;
      }

      await clearOperatorGate();
      if (active) router.replace("/dashboard");
    }
    void redirectIfAlreadySignedIn().catch(() => {
      // Keep the form available if session restoration temporarily fails.
    });
    return () => { active = false; };
  }, [router]);

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
    setMessage("");

    // Defense in depth for projects where email confirmation is enabled.
    // The Supabase project must still have Confirm email enabled; otherwise
    // Supabase may mark new accounts confirmed without sending a verification email.
    if (session.user.email && !session.user.email_confirmed_at) {
      await clearOperatorGate();
      await supabase.auth.signOut();
      setMessage("Your account needs email verification before you can continue. Check your inbox for the verification link, then sign in again.");
      setManualMode("signin");
      setPassword("");
      return;
    }

    const { data: adminRole, error: permissionError } = await supabase.rpc("get_admin_role");
      const isOperator = typeof adminRole === "string" && adminRole.length > 0;

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
        const errorData = await response.json().catch(() => null);
        await clearOperatorGate();
        setError(errorData?.error || "Your sign-in was successful, but secure access could not be prepared. Please contact the platform owner.");
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
            emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setError("An account may already exist for this email. Try signing in or use password recovery.");
          return;
        }
        if (data.session) {
          await continueWithSession(data.session);
        } else {
          setMessage("Account request received. Check your email for the verification link, then return here to sign in.");
          setManualMode("signin");
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
        options: { redirectTo: getAuthRedirectUrl("/auth/callback") },
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
        redirectTo: getAuthRedirectUrl("/auth/reset-password"),
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
    <main id="main" className="public-surface min-h-[75vh] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-blue-950/5 md:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-[#012153] p-7 text-white sm:p-10">
          <Link href="/" className="inline-flex items-center gap-2 transition hover:opacity-90">
            <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={110} height={94} className="h-10 w-auto" />
          </Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Your learning journey</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
            Learn with purpose. Keep moving forward.
          </h1>
          <p className="mt-5 leading-7 text-blue-100">
            Your personal gateway to CBT practice, Learning Hub modules, live video masterclasses, AI study tools, and community messaging.
          </p>
          <div className="mt-8 space-y-3 text-sm text-blue-100">
            <p>✓ A personal account for your learning journey</p>
            <p>✓ Email sign-in and 1-tap Google sign-in</p>
            <p>✓ Live Interactive Classrooms &amp; Session Recordings</p>
            <p>✓ Timed CBT exam simulations with offline protection</p>
            <p>✓ Secure account recovery</p>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => { setManualMode("signin"); setError(""); setMessage(""); }} className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-bold ${mode === "signin" ? "bg-white text-[#012153] shadow-sm" : "text-slate-600"}`}>Sign in</button>
            <button type="button" onClick={() => { setManualMode("signup"); setError(""); setMessage(""); }} className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-bold ${mode === "signup" ? "bg-white text-[#012153] shadow-sm" : "text-slate-600"}`}>Create account</button>
          </div>

          <h2 className="mt-7 text-2xl font-extrabold text-slate-950">{mode === "signup" ? "Create your BrainLab account" : "Welcome back"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{mode === "signup" ? "Start with a few details. We may ask you to verify your email." : "Sign in to continue to your learning space."}</p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={busy}
            aria-label="Continue with Google"
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{busy ? "Connecting to Google…" : "Continue with Google"}</span>
          </button>

          <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" /></div>

          <form onSubmit={(event) => { event.preventDefault(); void submitCredentials(); }} className="space-y-4">
            {mode === "signup" && <div><label htmlFor="account-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label><input id="account-name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" placeholder="Your full name" /></div>}
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


