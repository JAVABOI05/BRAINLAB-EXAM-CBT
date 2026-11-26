"use client";

import { useEffect, useState, useCallback, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PasswordStrengthMeter from "@/app/components/ui/PasswordStrengthMeter";
import {
  checkAdminPinStatus,
  verifyAdminPin,
  setupAdminPin,
  resetAdminPin,
  lockAdminPin,
  isAdminPinLocallyVerified,
} from "@/app/lib/adminPinAuth";
import { supabase } from "@/app/lib/supabase";
import { getAuthRedirectUrl } from "@/app/lib/authRedirect";

interface AdminPinGuardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showLockControls?: boolean;
}

export default function AdminPinGuard({
  children,
  title = "Sensitive Settings Protected",
  description = "This configuration workspace contains sensitive credentials, financial rules, or institutional settings. Please enter your Admin Security PIN to view and modify.",
  showLockControls = true,
}: AdminPinGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isSet, setIsSet] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [mode, setMode] = useState<"verify" | "setup" | "reset">("verify");

  // Form fields
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Google OAuth verification state
  const [googleVerified, setGoogleVerified] = useState(false);
  const [verifiedGoogleEmail, setVerifiedGoogleEmail] = useState("");
  const [oauthInitiating, setOauthInitiating] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const checkGoogleAuth = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setGoogleVerified(false);
        setVerifiedGoogleEmail("");
        return false;
      }

      const user = session.user;
      const hasGoogle =
        user.app_metadata?.provider === "google" ||
        (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("google")) ||
        (Array.isArray(user.identities) && user.identities.some((id: any) => id?.provider === "google"));

      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
      const isRecent = !!(lastSignIn && Date.now() - lastSignIn < 30 * 60 * 1000);

      const isValid = Boolean(hasGoogle && isRecent);
      setGoogleVerified(isValid);
      setVerifiedGoogleEmail(user.email || "");
      return isValid;
    } catch {
      setGoogleVerified(false);
      setVerifiedGoogleEmail("");
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      // Check query param for pin_reset recovery flag
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (
          params.get("pin_reset") === "recovery" ||
          params.get("pin_reset") === "verified" ||
          params.get("adminPinReset") === "1" ||
          params.get("adminPinReset") === "recovery"
        ) {
          setMode("reset");
        }
      }

      // Fast check local storage
      if (isAdminPinLocallyVerified()) {
        if (active) {
          setIsVerified(true);
          setChecking(false);
        }
        return;
      }

      // Check server cookie and PIN record status
      const status = await checkAdminPinStatus();
      if (!active) return;

      setIsVerified(status.isVerified);
      setIsSet(status.isSet);
      setCanManage(!!status.canManage);
      setAdminEmail(status.adminEmail || "");
      setAdminRole(status.adminRole || "");

      // Check Google auth status from session
      await checkGoogleAuth();

      // If PIN is not initialized yet and current admin has setup privileges, default to setup mode
      if (!status.isSet && status.canManage) {
        setMode("setup");
      }

      setChecking(false);
    }

    void init();

    return () => {
      active = false;
    };
  }, [checkGoogleAuth]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!pin.trim()) {
      setError("Please enter your Security PIN.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const res = await verifyAdminPin(pin.trim());
      if (!res.ok) {
        setError(res.error || "Incorrect Security PIN. Please try again.");
        return;
      }

      setIsVerified(true);
      setPin("");
      setMessage("Workspace unlocked successfully.");
    } catch {
      setError("Could not verify PIN. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetup(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const cleanNewPin = newPin.trim();
    if (!cleanNewPin || cleanNewPin.length < 4 || cleanNewPin.length > 12) {
      setError("Security PIN must be between 4 and 12 characters.");
      return;
    }

    if (cleanNewPin !== confirmPin.trim()) {
      setError("Security PIN confirmation does not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await setupAdminPin(cleanNewPin);
      if (!res.ok) {
        setError(res.error || "Failed to initialize Security PIN.");
        return;
      }

      setIsSet(true);
      setIsVerified(true);
      setNewPin("");
      setConfirmPin("");
      setMessage("Master Security PIN initialized and workspace unlocked.");
    } catch {
      setError("Network error initializing Security PIN.");
    } finally {
      setBusy(false);
    }
  }

  async function handleContinueWithGoogle() {
    setOauthInitiating(true);
    setError("");
    setMessage("");
    try {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "/admin/dashboard";
      const returnTarget = `${currentPath}?pin_reset=recovery`;
      const callbackUrl = getAuthRedirectUrl(`/auth/callback?redirect=${encodeURIComponent(returnTarget)}`);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setOauthInitiating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate Google authentication.");
      setOauthInitiating(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const cleanNewPin = newPin.trim();
    if (!cleanNewPin || cleanNewPin.length < 4 || cleanNewPin.length > 12) {
      setError("New Security PIN must be between 4 and 12 characters.");
      return;
    }

    if (cleanNewPin !== confirmPin.trim()) {
      setError("New Security PIN and confirmation do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await resetAdminPin({
        newPin: cleanNewPin,
      });

      if (!res.ok) {
        setError(res.error || "Failed to reset Security PIN.");
        if (
          res.error?.toLowerCase().includes("re-authenticate") ||
          res.error?.toLowerCase().includes("expired") ||
          res.error?.toLowerCase().includes("google")
        ) {
          setGoogleVerified(false);
        }
        return;
      }

      setIsSet(true);
      setIsVerified(true);
      setNewPin("");
      setConfirmPin("");
      setMessage("Security PIN successfully reset and workspace unlocked.");
      setMode("verify");
    } catch {
      setError("Network error resetting Security PIN.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLock() {
    setBusy(true);
    await lockAdminPin();
    setIsVerified(false);
    setMode("verify");
    setPin("");
    setMessage("Workspace locked.");
    setBusy(false);
  }

  if (checking) {
    return (
      <div className="admin-card max-w-md mx-auto my-12 p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xl">
        <div className="inline-block w-8 h-8 border-3 border-slate-300 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-4 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
          Verifying security clearance…
        </p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <section
        className="admin-card max-w-xl mx-auto my-8 p-6 sm:p-9 text-center rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors"
      >
        {/* BrainLab Academy Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <Image
            src="/brainlab-logo.png"
            alt="BrainLab Academy"
            width={34}
            height={34}
            className="rounded-lg object-contain"
            priority
          />
          <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
            BrainLab Academy
          </span>
        </div>

        {/* Status Icon */}
        <div
          className={`w-14 h-14 mx-auto mb-3.5 rounded-2xl flex items-center justify-center ${
            mode === "setup"
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : mode === "reset"
              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
              : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
          }`}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {/* Eyebrow Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-2 ${
            mode === "setup"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : mode === "reset"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
              : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
          }`}
        >
          {mode === "setup"
            ? "INITIAL SECURITY SETUP"
            : mode === "reset"
            ? "SUPER ADMIN PIN RECOVERY"
            : "SECURITY PIN REQUIRED"}
        </span>

        {/* Header Title & Description */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mb-2 tracking-tight">
          {mode === "setup"
            ? "Initialize Admin Security PIN"
            : mode === "reset"
            ? "Reset Administrator Security PIN"
            : title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
          {mode === "setup"
            ? "A master Security PIN has not yet been established. Set a secure 4 to 12-character PIN to safeguard platform governance, user permissions, and sensitive controls."
            : mode === "reset"
            ? googleVerified
              ? "Google Super Admin identity verified. Enter and confirm your new Security PIN to restore full workspace governance."
              : "To safeguard institutional examination data and candidate records, Security PIN recovery requires Google OAuth re-authentication by an authorized Super Administrator."
            : description}
        </p>

        {/* Alert when PIN not initialized and cannot setup */}
        {!isSet && !canManage && mode !== "setup" && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs font-semibold text-amber-800 dark:text-amber-300 text-left"
          >
            The master Security PIN has not yet been initialized. Please have a Super Administrator configure the platform PIN to unlock this workspace.
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs font-semibold text-rose-800 dark:text-rose-300 text-left flex items-start gap-2.5"
          >
            <svg className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Success Notification */}
        {message && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 text-left flex items-start gap-2.5"
          >
            <svg className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        {/* 1. SETUP FORM (When PIN not set) */}
        {mode === "setup" && canManage && (
          <form onSubmit={handleSetup} className="text-left space-y-4">
            <div>
              <label
                htmlFor="admin-new-pin"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Create Master Security PIN (4–12 characters)
              </label>
              <div className="relative">
                <input
                  id="admin-new-pin"
                  type={showPin ? "text" : "password"}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Enter new PIN"
                  autoFocus
                  maxLength={12}
                  required
                  disabled={busy}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>
              <div className="mt-2">
                <PasswordStrengthMeter password={newPin} role="pin" />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-confirm-pin"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Confirm Master Security PIN
              </label>
              <input
                id="admin-confirm-pin"
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm new PIN"
                maxLength={12}
                required
                disabled={busy}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={busy || !newPin.trim() || !confirmPin.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow transition active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                {busy ? "Initializing PIN…" : "Set PIN & Unlock Workspace"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/dashboard")}
                className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                Dashboard
              </button>
            </div>
          </form>
        )}

        {/* 2. RESET FORM (Google OAuth Super Admin Identity Verification) */}
        {mode === "reset" && (
          <div className="space-y-4">
            {!googleVerified ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                    <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                      <strong className="block font-bold mb-0.5 text-blue-950 dark:text-blue-100">
                        Google OAuth Identity Verification Required
                      </strong>
                      Sign in with your Google administrator account to confirm your identity. Once verified, you will immediately be prompted to create and confirm a new Security PIN.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={oauthInitiating}
                  onClick={handleContinueWithGoogle}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs sm:text-sm font-bold text-slate-900 dark:text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[48px]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{oauthInitiating ? "Connecting to Google…" : "Continue with Google"}</span>
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("verify");
                      setError("");
                      setMessage("");
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    ← Return to PIN verification
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Authentication Success Indicator */}
                <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-left flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Google Identity Verified
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                        {adminRole || "Super Admin"}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate mt-0.5 font-medium">
                      {verifiedGoogleEmail || adminEmail}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleContinueWithGoogle}
                    disabled={oauthInitiating}
                    className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 underline shrink-0 hover:text-emerald-950 dark:hover:text-emerald-100 cursor-pointer"
                    title="Switch or re-verify Google Account"
                  >
                    Re-verify
                  </button>
                </div>

                <form onSubmit={handleReset} className="space-y-4 text-left">
                  <div>
                    <label
                      htmlFor="admin-reset-new-pin"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      New Security PIN (4–12 characters)
                    </label>
                    <div className="relative">
                      <input
                        id="admin-reset-new-pin"
                        type={showPin ? "text" : "password"}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="Enter new PIN"
                        autoFocus
                        maxLength={12}
                        required
                        disabled={busy}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showPin ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="mt-2">
                      <PasswordStrengthMeter password={newPin} role="pin" />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-reset-confirm-pin"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Confirm New Security PIN
                    </label>
                    <input
                      id="admin-reset-confirm-pin"
                      type={showPin ? "text" : "password"}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      placeholder="Confirm new PIN"
                      maxLength={12}
                      required
                      disabled={busy}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="submit"
                      disabled={busy || !newPin.trim() || !confirmPin.trim()}
                      className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow transition active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[44px]"
                    >
                      {busy ? "Resetting Security PIN…" : "Reset Security PIN"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("verify");
                        setError("");
                        setMessage("");
                      }}
                      className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 3. VERIFY FORM (Standard verification) */}
        {mode === "verify" && (
          <form onSubmit={handleVerify} className="text-left space-y-4">
            <div>
              <label
                htmlFor="admin-pin-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Enter Admin Security PIN
              </label>
              <div className="relative">
                <input
                  id="admin-pin-input"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  maxLength={12}
                  required
                  disabled={busy}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={busy || !pin.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow transition active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                {busy ? "Verifying PIN…" : "Unlock Settings"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/dashboard")}
                className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                Dashboard
              </button>
            </div>

            {/* Reset / Setup action triggers */}
            <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-slate-800 text-center space-y-2">
              {!isSet && canManage && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("setup");
                      setError("");
                      setMessage("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>Set up initial Security PIN now</span>
                  </button>
                </div>
              )}

              {isSet && canManage && (
                <div>
                  <button
                    type="button"
                    onClick={async () => {
                      setMode("reset");
                      setError("");
                      setMessage("");
                      await checkGoogleAuth();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 16h5v5" />
                    </svg>
                    <span>Forgot Security PIN? Reset with Google verification</span>
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </section>
    );
  }

  return (
    <>
      {showLockControls && (
        <div className="flex items-center justify-between px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl mb-5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
            Security PIN Verified · Sensitive settings unlocked
          </span>
          <button
            type="button"
            onClick={handleLock}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Lock Now</span>
          </button>
        </div>
      )}
      {children}
    </>
  );
}
