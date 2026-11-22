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
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<"medicine" | "engineering" | "law" | "accounting">("medicine");
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
    const modeParam = searchParams.get("mode");
    if (modeParam === "signin") {
      setMode("signin");
    } else {
      // Default to signup when visitors click "Start Free"
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
      const cleanIdentifier = email.trim();
      if (!cleanIdentifier || !password) {
        setError("Please enter your email or username and password.");
        return;
      }

      const isEmail = cleanIdentifier.includes("@");
      const authEmail = isEmail
        ? cleanIdentifier.toLowerCase()
        : `${cleanIdentifier.toLowerCase().replace(/\s+/g, "")}@student.brainlab.ng`;
      const displayName = isEmail ? cleanIdentifier.split("@")[0] : cleanIdentifier;

      if (mode === "signup") {
        const strength = evaluatePasswordStrength(password, "student");
        if (!strength.isValid) {
          setError(strength.feedback || "Please choose a stronger password with at least 8 characters.");
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: {
            data: {
              full_name: displayName,
              username: cleanIdentifier,
            },
            emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        trackEvent("signup_completed", { auth_provider: "credentials", role: "student" });

        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setError("An account with this email or username already exists. Please sign in or reset your password.");
          return;
        }

        if (data.session) {
          await routeAuthenticatedSession(data.session);
        } else {
          setMessage(
            isEmail
              ? "Account created successfully! Please check your email to confirm your address before logging in."
              : "Account created successfully! You can now sign in with your username."
          );
          setMode("signin");
          setPassword("");
        }
        return;
      }

      // Mode === "signin"
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
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
      const cleanReset = resetEmail.trim();
      if (!cleanReset) {
        setResetError("Please enter your registered email address or username.");
        return;
      }

      const resetTargetEmail = cleanReset.includes("@")
        ? cleanReset.toLowerCase()
        : `${cleanReset.toLowerCase().replace(/\s+/g, "")}@student.brainlab.ng`;

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetTargetEmail, {
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#060B18] via-[#091226] to-[#040814] text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* World-Class Atmospheric Ambient Mesh Glows */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[550px] w-[550px] rounded-full bg-blue-600/15 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[600px] rounded-full bg-sky-500/10 blur-[150px]"
        aria-hidden="true"
      />

      {/* Subtle Academic Precision Grid Texture */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.03]"
        aria-hidden="true"
      />

      {/* Top Academic Bar */}
      <header className="relative z-10 px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-3 transition-opacity opacity-95 hover:opacity-100 group">
          <Image
            src="/icon-192.png"
            alt="BrainLab Academy"
            width={36}
            height={36}
            className="rounded-xl shadow-md ring-1 ring-blue-500/30 group-hover:ring-blue-400 transition"
          />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider uppercase text-white font-mono">BrainLab</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Academy Portal</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-950/60 text-blue-300 border border-blue-800/60">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Secure Authentication Gateway</span>
          </span>

          <Link
            href="/"
            className="text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-slate-800 min-h-[36px]"
          >
            <span>&larr; Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Interactive Admissions Target Cockpit & Ecosystem Badges */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>100% FREE STARTER ACADEMY ACCESS</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.12]">
                A Smarter Way to <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400">
                  Learn, Practise &amp; Achieve.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg mx-auto lg:mx-0 font-normal">
                Create a free student account to practise with official JAMB 8-key simulation, explore interactive STEM labs, and master tough concepts with Socratic AI explanations.
              </p>

              {/* Interactive Target Discipline Selector Tabs */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-md shadow-xl text-left space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[11px]">Select Your Ambition:</span>
                  <span className="text-cyan-400 font-bold font-mono text-[11px]">Target Score Matrix</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "medicine", label: "Medicine", score: "325+" },
                      { id: "engineering", label: "Engineering", score: "298+" },
                      { id: "law", label: "Law", score: "305+" },
                      { id: "accounting", label: "Management", score: "280+" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTrack(t.id)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                        selectedTrack === t.id
                          ? "bg-blue-600/30 border-cyan-400 text-white shadow-xs"
                          : "bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/15"
                      }`}
                    >
                      <div className="leading-tight">{t.label}</div>
                      <div className="text-[10px] text-cyan-300 font-mono mt-0.5">{t.score}</div>
                    </button>
                  ))}
                </div>

                {/* Dynamic Subject Breakdown Pill Rail */}
                <div className="pt-1">
                  {selectedTrack === "medicine" && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Subject Plan (UNILAG · UI · OAU):</span>
                        <span className="text-emerald-400 font-mono font-bold">Aggregate: 325 / 400</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">ENG</span><strong className="text-white">78</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">BIO</span><strong className="text-emerald-400">84</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">CHM</span><strong className="text-emerald-400">82</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">PHY</span><strong className="text-cyan-400">81</strong></div>
                      </div>
                    </div>
                  )}

                  {selectedTrack === "engineering" && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Subject Plan (FUTA · UNILAG · OAU):</span>
                        <span className="text-cyan-400 font-mono font-bold">Aggregate: 298 / 400</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">ENG</span><strong className="text-white">74</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">MTH</span><strong className="text-cyan-400">78</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">PHY</span><strong className="text-cyan-400">76</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">CHM</span><strong className="text-white">70</strong></div>
                      </div>
                    </div>
                  )}

                  {selectedTrack === "law" && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Subject Plan (UI · UNILAG · UNN):</span>
                        <span className="text-purple-400 font-mono font-bold">Aggregate: 305 / 400</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">ENG</span><strong className="text-purple-300">84</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">LIT</span><strong className="text-purple-300">78</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">GOV</span><strong className="text-white">74</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">CRS</span><strong className="text-white">69</strong></div>
                      </div>
                    </div>
                  )}

                  {selectedTrack === "accounting" && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Subject Plan (UNILAG · UNIBEN · ABU):</span>
                        <span className="text-amber-400 font-mono font-bold">Aggregate: 280 / 400</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">ENG</span><strong className="text-white">72</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">MTH</span><strong className="text-white">70</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">ECN</span><strong className="text-amber-300">72</strong></div>
                        <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5"><span className="text-slate-400 block">ACC</span><strong className="text-white">66</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Feature Badges with Custom SVG Glyphs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-left">
                <div className="p-3.5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
                    </svg>
                    <h3 className="font-bold text-white text-xs">JAMB 8-Key Engine</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Full 400-mark timed mocks with exact examination hall keyboard navigation.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10 2v7.31L4.1 19.34A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.66L14 9.31V2" />
                      <path d="M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
                    </svg>
                    <h3 className="font-bold text-white text-xs">STEM Virtual Labs</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Interactive simulations for physics circuits, chemistry titration &amp; biology.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
                    </svg>
                    <h3 className="font-bold text-white text-xs">Socratic AI Tutor</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Step-by-step master derivations and explanations for difficult questions.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                    </svg>
                    <h3 className="font-bold text-white text-xs">Zero-Data Offline PWA</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Install on phone or laptop. Practise offline with ultra-low data sync.
                  </p>
                </div>
              </div>

              {/* University Target Social Proof */}
              <div className="pt-1 text-xs text-slate-400 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="font-bold text-slate-300">Targeting:</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px]">UNILAG</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px]">UI</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px]">OAU</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px]">UNIBEN</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px]">UNN</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px]">ABU</span>
              </div>
            </div>

            {/* Right Column: Unified Authentication Card */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/10 space-y-5">
                
                {/* Mode Switch Tabs (Create Account vs Sign In) */}
                <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs font-black">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                      trackEvent("signup_started", { source: "tab_toggle" });
                      setMessage("");
                    }}
                    className={`py-2.5 rounded-xl transition-all duration-200 cursor-pointer bl-focus-ring ${
                      mode === "signup"
                        ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-900/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError("");
                      setMessage("");
                    }}
                    className={`py-2.5 rounded-xl transition-all duration-200 cursor-pointer bl-focus-ring ${
                      mode === "signin"
                        ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-900/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sign In
                  </button>
                </div>

                {/* Card Title & Context */}
                <div className="text-center space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {mode === "signup" ? "Create Your Free Account" : "Welcome Back"}
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {mode === "signup"
                      ? "Start practising immediately with full UTME & SSCE question sets."
                      : "Access your candidate scores, diagnostic radar, and learning milestones."}
                  </p>
                </div>

                {/* Status Feedback Messages */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200 leading-relaxed flex items-start gap-2.5 animate-in fade-in"
                  >
                    <svg className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
                {message && (
                  <div
                    role="status"
                    className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-200 leading-relaxed flex items-start gap-2.5 animate-in fade-in"
                  >
                    <svg className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{message}</span>
                  </div>
                )}

                {/* Social Google OAuth Button */}
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGoogleOAuth}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-750 text-xs font-bold text-white transition-all shadow-xs hover:border-slate-600 active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[46px] bl-focus-ring"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span>{mode === "signup" ? "Continue with Google" : "Sign in with Google"}</span>
                </button>

                {/* Separator Divider */}
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-3 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    Or continue with email / username
                  </span>
                </div>

                {/* Standard Credentials Form */}
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="auth-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Email or Username
                    </label>
                    <input
                      id="auth-email"
                      type="text"
                      autoComplete="username email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com or username"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition min-h-[44px]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="auth-password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Password
                      </label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(email);
                            setResetModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition cursor-pointer"
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
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition pr-10 min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {mode === "signup" && (
                      <PasswordStrengthMeter password={password} role="student" />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-950/50 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[48px] bl-focus-ring"
                  >
                    {busy ? "Authenticating..." : mode === "signup" ? "Create Student Account →" : "Sign In to Workspace →"}
                  </button>
                </form>

                {/* Alternate Mode Text Toggle */}
                <div className="text-center pt-1">
                  {mode === "signup" ? (
                    <p className="text-xs text-slate-400">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signin");
                          setError("");
                          setMessage("");
                        }}
                        className="font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                      >
                        Sign In
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Don&apos;t have an account yet?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signup");
                          setError("");
                          setMessage("");
                        }}
                        className="font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                      >
                        Create one for free
                      </button>
                    </p>
                  )}
                </div>

                {/* Institutional Provisioning Notice for Instructors / Staff */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-400 leading-relaxed text-center sm:text-left">
                  <span className="font-bold text-slate-300">Staff &amp; Instructors:</span> Examiner and administrative accounts are provisioned directly by Academy governance. Use your institutional email to sign in above.
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Reset Password</h2>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="text-slate-400 hover:text-white transition text-sm p-1"
                aria-label="Close reset modal"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your account email or username. We will send you a secure link to reset your BrainLab password.
            </p>

            {resetError && (
              <p className="text-xs text-rose-200 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/40">
                {resetError}
              </p>
            )}
            {resetMessage && (
              <p className="text-xs text-emerald-200 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/40">
                {resetMessage}
              </p>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-3">
              <input
                type="text"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email or username"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none min-h-[44px]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition disabled:opacity-50 min-h-[44px]"
                >
                  {resetBusy ? "Sending..." : "Send Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean Portal Footer */}
      <footer className="relative z-10 px-6 py-4 border-t border-slate-800/80 bg-slate-950/40 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>&copy; {new Date().getFullYear()} BrainLab Academy. West Africa&apos;s Connected Learning Ecosystem.</span>
        <div className="flex items-center gap-4 text-xs font-medium">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Notice</Link>
          <span className="text-slate-700">&bull;</span>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
          <span className="text-slate-700">&bull;</span>
          <span className="text-slate-400">NDPA 2023 Compliant</span>
        </div>
      </footer>
    </div>
  );
}

export default function CentralLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060B18] flex items-center justify-center text-slate-400 text-xs">
          Loading authentication gateway...
        </div>
      }
    >
      <CentralLoginForm />
    </Suspense>
  );
}
