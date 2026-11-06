"use client";

import { useEffect, useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { adminSignIn, adminSignOut, getAdminSession, setCachedAdminSession } from "../../lib/adminAuth";
import { getAuthRedirectUrl } from "../../lib/authRedirect";
import { supabase } from "../../lib/supabase";
import {
  checkAdminPinStatus,
  verifyAdminPin,
  isAdminPinLocallyVerified,
} from "../../lib/adminPinAuth";

function AdminSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forcePinStep = searchParams?.get("pinRequired") === "true";

  const [step, setStep] = useState<"credentials" | "pin">("credentials");
  const [adminEmail, setAdminEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [defaultPinHint, setDefaultPinHint] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const admin = await getAdminSession();
        if (!active) return;

        if (admin) {
          setAdminEmail(admin.email);
          const pinStatus = await checkAdminPinStatus();
          if (!active) return;
          setDefaultPinHint(pinStatus.defaultHint);

          if (pinStatus.isVerified || isAdminPinLocallyVerified()) {
            if (!forcePinStep) {
              setCachedAdminSession(admin);
              router.replace("/admin/dashboard");
              return;
            }
          }
          // If admin session exists but PIN is not yet verified, transition directly to Step 2 (PIN)
          setStep("pin");
        }
      } catch {
        // Keep the sign-in form available if session restoration fails
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkSession();
    return () => {
      active = false;
    };
  }, [router, forcePinStep]);

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      if (!email.trim() || !password) {
        setError("Enter the email address and password for your administrator account.");
        return;
      }

      const result = await adminSignIn(email.trim(), password);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setAdminEmail(email.trim());

      // Check PIN status
      const pinStatus = await checkAdminPinStatus();
      setDefaultPinHint(pinStatus.defaultHint);

      // Advance immediately to Step 2: Security PIN
      setStep("pin");
      setMessage("Credentials verified. Enter your Admin Security PIN to continue.");
    } catch {
      setError("We could not verify administrator access right now. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!pin.trim()) {
      setError("Please enter your Admin Security PIN.");
      return;
    }

    setBusy(true);
    try {
      const res = await verifyAdminPin(pin.trim());
      if (!res.ok) {
        setError(res.error || "Incorrect Security PIN. Please try again.");
        return;
      }

      const admin = await getAdminSession();
      if (admin) {
        setCachedAdminSession(admin);
      }
      setMessage("Security PIN verified. Opening Administrator Workspace…");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("PIN verification failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelPin() {
    setBusy(true);
    await adminSignOut();
    setStep("credentials");
    setPassword("");
    setPin("");
    setError("");
    setMessage("Signed out. Sign in with another account.");
    setBusy(false);
  }

  async function resetPassword() {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Enter your administrator email first, then choose password recovery.");
      return;
    }
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAuthRedirectUrl("/auth/reset-password"),
      });
      if (resetError) setError("We could not send a recovery email. Check the address and try again.");
      else setMessage("If this email belongs to an account, a password recovery link will be sent.");
    } catch {
      setError("Password recovery is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-labelledby="admin-signin-title">
        <Link href="/" className="admin-auth-brand" aria-label="BrainLab Academy homepage">
          <span className="admin-auth-mark" aria-hidden="true">B</span>
          <span><strong>BRAINLAB</strong><small>ACADEMY ADMIN</small></span>
        </Link>
        <div className="admin-auth-eyebrow">SECURE 2-STEP ADMINISTRATION</div>

        {step === "credentials" ? (
          <>
            <h1 id="admin-signin-title">Administrator sign in</h1>
            <p className="admin-auth-intro">
              Use your assigned BrainLab administrator email and password. Access is verified against your current Supabase role and requires a Security PIN.
            </p>
            {checking && <p className="admin-auth-check" role="status">Checking for an active administrator session…</p>}

            <form className="admin-auth-form" onSubmit={handleCredentialsSubmit}>
              <label htmlFor="admin-email">Administrator email</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@brainlabacademy.com.ng"
              />

              <label htmlFor="admin-password">Password</label>
              <div className="admin-auth-password">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button className="admin-auth-submit" type="submit" disabled={busy}>
                {busy ? "Verifying credentials…" : "Continue with credentials"}
              </button>
              <button
                className="admin-auth-recovery"
                type="button"
                onClick={() => void resetPassword()}
                disabled={busy}
              >
                Forgot your password?
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 id="admin-signin-title">Admin Security PIN</h1>
            <p className="admin-auth-intro">
              Two-step verification required. Enter your Security PIN to unlock the administration workspace.
            </p>

            {adminEmail && (
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: 9999,
                  backgroundColor: "#eff6ff",
                  color: "#1e40af",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  marginBottom: 16,
                  border: "1px solid #bfdbfe",
                }}
              >
                👤 Signed in as <strong>{adminEmail}</strong>
              </div>
            )}

            <form className="admin-auth-form" onSubmit={handlePinSubmit}>
              <label htmlFor="admin-security-pin">Security PIN</label>
              <div className="admin-auth-password">
                <input
                  id="admin-security-pin"
                  type={showPin ? "text" : "password"}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  maxLength={12}
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  placeholder="••••"
                  style={{
                    letterSpacing: showPin ? "normal" : "0.3em",
                    fontFamily: showPin ? "inherit" : "monospace",
                    fontSize: "1.125rem",
                    fontWeight: 600,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((value) => !value)}
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>

              {defaultPinHint && (
                <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "-6px 0 12px" }}>
                  💡 <em>Initial default PIN is <strong>1234</strong>. You can change this in Security Workspace.</em>
                </p>
              )}

              <button className="admin-auth-submit" type="submit" disabled={busy || !pin.trim()}>
                {busy ? "Verifying PIN…" : "Verify PIN & Access Portal"}
              </button>
              <button
                className="admin-auth-recovery"
                type="button"
                onClick={handleCancelPin}
                disabled={busy}
              >
                Cancel / Switch Account
              </button>
            </form>
          </>
        )}

        {error && <p className="admin-auth-error" role="alert">{error}</p>}
        {message && <p className="admin-auth-success" role="status">{message}</p>}

        <div className="admin-auth-footer">
          <span>Administrator access only</span>
          <Link href="/account">Candidate sign in</Link>
        </div>
      </section>
      <p className="admin-auth-legal">BrainLab Academy · Secure administration workspace</p>
    </main>
  );
}

export default function AdminSignInPage() {
  return (
    <Suspense
      fallback={
        <main className="admin-auth-page">
          <section className="admin-auth-card">
            <p className="admin-auth-check">Loading administration sign in…</p>
          </section>
        </main>
      }
    >
      <AdminSignInForm />
    </Suspense>
  );
}
