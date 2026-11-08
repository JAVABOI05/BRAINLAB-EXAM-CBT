"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getAuthRedirectUrl, sanitizeRedirectUrl } from "../lib/authRedirect";
import { isAdminPinLocallyVerified } from "../lib/adminPinAuth";
import { isGovernanceAdminRole, isInstructorRole } from "../lib/adminRoles";
import { setCachedAdminSession, type AdminUser } from "../lib/adminAuth";
import { trackEvent } from "@/app/lib/analytics";
import PasswordStrengthMeter from "@/app/components/ui/PasswordStrengthMeter";
import { evaluatePasswordStrength } from "@/app/lib/passwordStrength";

type AuthMode = "signin" | "signup";

function CentralLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  // Handle PKCE code callbacks or initial mode
  useEffect(() => {
    const code = searchParams.get("code");
    const err = searchParams.get("error");
    if (code || err) {
      window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
      return;
    }
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
      trackEvent("signup_started", { source: "url_param" });
    }

    let active = true;

    async function redirectIfAlreadySignedIn() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!active || sessionError || !session) return;

      if (session.user.email && !session.user.email_confirmed_at) {
        await clearOperatorGate();
        await supabase.auth.signOut();
        setError("Please verify your email before entering BrainLab Academy. Check your inbox for the confirmation link.");
        return;
      }

      await routeAuthenticatedSession(session);
    }

    void redirectIfAlreadySignedIn().catch(() => {});

    return () => {
      active = false;
    };
  }, [searchParams]);

  async function clearOperatorGate() {
    try {
      await fetch("/api/auth/operator-gate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    } catch {}
  }

  async function routeAuthenticatedSession(session: Session) {
    // 1. Authoritative check for role
    const { data: adminRole, error: permissionError } = await supabase.rpc("get_admin_role");

    if (permissionError) {
      setError("We could not verify your account permissions. Please try signing in again.");
      return;
    }

    const roleStr = typeof adminRole === "string" ? adminRole.trim() : null;

    // 2. Route Governance Admin
    if (isGovernanceAdminRole(roleStr)) {
      const gateResponse = await fetch("/api/auth/operator-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: session.access_token }),
        cache: "no-store",
      });

      if (!gateResponse.ok) {
        const errorData = await gateResponse.json().catch(() => null);
        setError(errorData?.error || "Your administrator credentials are valid, but secure operator gate initialization failed.");
        return;
      }

      window.localStorage.removeItem("admin_user");
      const adminObj: AdminUser = {
        id: session.user.id,
        email: session.user.email || "",
        role: roleStr as any,
      };
      setCachedAdminSession(adminObj);

      const redirectParam = searchParams.get("redirect") || searchParams.get("next");
      if (redirectParam && redirectParam !== "/admin/dashboard" && redirectParam !== "/admin/login") {
        const safeTarget = sanitizeRedirectUrl(redirectParam, "/dashboard");
        router.replace(safeTarget);
        return;
      }

      if (isAdminPinLocallyVerified()) {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/admin/login?pinRequired=true");
      }
      return;
    }

    // 3. Route Instructor / Tutor
    if (isInstructorRole(roleStr)) {
      await clearOperatorGate();
      const redirectParam = searchParams.get("redirect") || searchParams.get("next");
      if (redirectParam) {
        const safeTarget = sanitizeRedirectUrl(redirectParam, "/tutor");
        router.replace(safeTarget);
        return;
      }
      router.replace("/tutor");
      return;
    }

    // 4. Route Candidate / Student
    await clearOperatorGate();
    const redirectParam = searchParams.get("redirect") || searchParams.get("next");
    const safeTarget = sanitizeRedirectUrl(redirectParam, "/dashboard");
    router.replace(safeTarget);
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (!email.trim() || !password) {
        setError("Please enter your email and password.");
        return;
      }

      if (mode === "signup") {
        if (!name.trim()) {
          setError("Please enter your full name.");
          return;
        }

        const strength = evaluatePasswordStrength(password, "student");
        if (!strength.isValid) {
          setError(strength.feedback || "Please choose a stronger password with at least 8 characters.");
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

        trackEvent("signup_completed", { auth_provider: "email", role: "student" });

        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setError("An account with this email already exists. Please sign in or reset your password.");
          return;
        }

        if (data.session) {
          await routeAuthenticatedSession(data.session);
        } else {
          setMessage("Account created successfully! Please check your email to confirm your address before logging in.");
          setMode("signin");
          setPassword("");
        }
        return;
      }

      // Mode === "signin"
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.session) {
        setError("Sign-in succeeded, but no active session was returned. Please try again.");
        return;
      }

      await routeAuthenticatedSession(data.session);
    } catch {
      setError("An unexpected error occurred during authentication. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleOAuth() {
    setBusy(true);
    setError("");
    try {
      const redirectTarget = searchParams.get("redirect") || searchParams.get("next") || "/dashboard";
      const safeRedirect = sanitizeRedirectUrl(redirectTarget, "/dashboard");
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthRedirectUrl(`/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`),
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setBusy(false);
      }
    } catch {
      setError("Failed to initiate Google Sign-In. Please try again.");
      setBusy(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setResetBusy(true);
    setResetError("");
    setResetMessage("");

    try {
      if (!resetEmail.trim()) {
        setResetError("Please enter your registered email address.");
        return;
      }

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: getAuthRedirectUrl("/auth/callback?next=/account/reset-password"),
      });

      if (resetErr) {
        setResetError(resetErr.message);
        return;
      }

      setResetMessage("Password reset instructions have been sent to your email. Check your inbox and spam folder.");
    } catch {
      setResetError("Could not send reset instructions. Please try again later.");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-[#020b18] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Simple Portal Bar */}
      <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 transition opacity-90 hover:opacity-100">
          <Image
            src="/icon-192.png"
            alt="BrainLab Academy"
            width={34}
            height={34}
            className="rounded-xl shadow-md ring-1 ring-cyan-500/30"
          />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider uppercase text-white font-mono">BrainLab</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Academy Portal</span>
          </div>
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5"
        >
          <span>← Back to Website</span>
        </Link>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Card Header & Portal Mode Switcher */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {mode === "signin" ? "Sign In to BrainLab" : "Join BrainLab Academy"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              {mode === "signin"
                ? "Access your candidate dashboard, instructor studio, or administrative workspace."
                : "Create your student account to access UTME/WASSCE CBT practice and interactive learning."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6 ring-1 ring-white/5">
            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950/80 border border-white/10 text-xs font-black">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setMessage("");
                }}
                className={`py-2.5 rounded-xl transition-all ${
                  mode === "signin"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-950/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  trackEvent("signup_started", { source: "tab_toggle" });
                  setMessage("");
                }}
                className={`py-2.5 rounded-xl transition-all ${
                  mode === "signup"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-950/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Status Feedback Messages */}
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 leading-relaxed flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="text-rose-400 text-base leading-none">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div
                role="status"
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 leading-relaxed flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="text-emerald-400 text-base leading-none">✓</span>
                <span>{message}</span>
              </div>
            )}

            {/* Social Google OAuth Button */}
            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleOAuth}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{mode === "signin" ? "Sign in with Google" : "Sign up with Google"}</span>
            </button>

            {/* Separator Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-slate-900 px-3 text-[10px] uppercase font-black tracking-widest text-slate-500">
                Or with institutional email
              </span>
            </div>

            {/* Standard Credentials Form */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label htmlFor="fullname" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="fullname"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Samuel Adekunle"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setResetModalOpen(true);
                      }}
                      className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signin" ? "••••••••" : "Minimum 8 characters"}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition text-xs"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {mode === "signup" && (
                  <PasswordStrengthMeter password={password} role="student" />
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-950/40 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {busy ? "Authenticating..." : mode === "signin" ? "Sign In →" : "Create Student Account →"}
              </button>
            </form>

            {/* Institutional Provisioning Notice for Instructors / Staff */}
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/30 p-3.5 text-[11px] text-cyan-300/80 leading-relaxed">
              <span className="font-bold text-cyan-300">Staff &amp; Instructors:</span> Authoring and administrative accounts are provisioned directly by Academy governance. Use your registered institutional email to sign in above.
            </div>
          </div>
        </div>
      </main>

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Reset Password</h2>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="text-slate-400 hover:text-white transition text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your account email. We will send you a secure link to reset your BrainLab password.
            </p>

            {resetError && (
              <p className="text-xs text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
                {resetError}
              </p>
            )}
            {resetMessage && (
              <p className="text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30">
                {resetMessage}
              </p>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {resetBusy ? "Sending..." : "Send Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean Portal Footer */}
      <footer className="px-6 py-4 border-t border-white/5 text-center text-[11px] text-slate-500">
        © {new Date().getFullYear()} BrainLab Academy. High-Yield Learning &amp; Examination Ecosystem.
      </footer>
    </div>
  );
}

export default function CentralLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Loading authentication gateway...
        </div>
      }
    >
      <CentralLoginForm />
    </Suspense>
  );
}
