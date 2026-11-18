"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import PasswordStrengthMeter from "@/app/components/ui/PasswordStrengthMeter";
import { supabase } from "@/app/lib/supabase";
import { getAuthRedirectUrl } from "@/app/lib/authRedirect";
import {
  checkAdminPinStatus,
  verifyAdminPin,
  setupAdminPin,
  resetAdminPin,
  lockAdminPin,
  isAdminPinLocallyVerified,
} from "@/app/lib/adminPinAuth";

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
  const [mode, setMode] = useState<"verify" | "setup" | "reset">("verify");

  // Form fields
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [googleReauthenticated, setGoogleReauthenticated] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function init() {
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

      const resetReturn = new URLSearchParams(window.location.search).get("adminPinReset");
      if (resetReturn === "1") {
        setMode("reset");
        setGoogleReauthenticated(true);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("adminPinReset");
        window.history.replaceState({}, "", cleanUrl.toString());
      } else if (!status.isSet && status.canManage) {
        setMode("setup");
      } else {
        setMode("verify");
      }

      setChecking(false);
    }

    void init();

    return () => {
      active = false;
    };
  }, []);

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

  async function handleGoogleReauthentication() {
    setBusy(true);
    setError("");
    const returnTo = `${window.location.pathname}?adminPinReset=1`;
    const redirectTo = getAuthRedirectUrl(`/auth/callback?redirect=${encodeURIComponent(returnTo)}`);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });
    if (oauthError) {
      setError(oauthError.message || "Could not start Google sign-in. Please try again.");
      setBusy(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!googleReauthenticated) {
      setError("Please continue with Google before resetting your PIN.");
      return;
    }

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
      const res = await resetAdminPin({ newPin: cleanNewPin });
      if (!res.ok) {
        setError(res.error || "Failed to reset Security PIN.");
        return;
      }
      setIsSet(true);
      setIsVerified(true);
      setGoogleReauthenticated(false);
      setNewPin("");
      setConfirmPin("");
      setMessage("Security PIN successfully reset and workspace unlocked.");
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
      <div className="admin-card" style={{ padding: "40px 24px", textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 28, height: 28, border: "3px solid #cbd5e1", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: 16, color: "#64748b", fontSize: "0.875rem", fontWeight: 500 }}>
          Verifying security clearance…
        </p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <section
        className="admin-card"
        style={{
          maxWidth: 580,
          margin: "32px auto",
          padding: "36px 28px",
          textAlign: "center",
          borderRadius: 16,
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
          border: "1px solid #e2e8f0",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 16px",
            borderRadius: "50%",
            backgroundColor: mode === "setup" ? "#ecfdf5" : mode === "reset" ? "#fef3c7" : "#eff6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: mode === "setup" ? "#059669" : mode === "reset" ? "#d97706" : "#2563eb",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {/* Eyebrow Badge */}
        <span
          style={{
            display: "inline-block",
            fontSize: "0.75rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: mode === "setup" ? "#047857" : mode === "reset" ? "#b45309" : "#2563eb",
            backgroundColor: mode === "setup" ? "#d1fae5" : mode === "reset" ? "#fef3c7" : "#dbeafe",
            padding: "4px 10px",
            borderRadius: 9999,
            marginBottom: 10,
          }}
        >
          {mode === "setup"
            ? "INITIAL SECURITY SETUP"
            : mode === "reset"
            ? "ADMINISTRATOR RE-AUTHENTICATION"
            : "SECURITY PIN REQUIRED"}
        </span>

        {/* Header Title & Description */}
        <h2 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.02em" }}>
          {mode === "setup"
            ? "Initialize Admin Security PIN"
            : mode === "reset"
            ? "Reset Security PIN"
            : title}
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: 24 }}>
          {mode === "setup"
            ? "A master Security PIN has not yet been established. Set a secure 4 to 12-character PIN to safeguard platform governance, user permissions, and sensitive controls."
            : mode === "reset"
            ? `Verify your administrator Google account${adminEmail ? ` (${adminEmail})` : ""}, then create a new Security PIN.`
            : description}
        </p>

        {/* Informative alert when PIN not initialized and cannot setup */}
        {!isSet && !canManage && mode !== "setup" && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              backgroundColor: "#fef3c7",
              color: "#92400e",
              borderRadius: 8,
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "1px solid #fde68a",
              marginBottom: 18,
              textAlign: "left",
            }}
          >
            The master Security PIN has not yet been initialized. Please have a Super Administrator configure the platform PIN to unlock this workspace.
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              borderRadius: 8,
              fontSize: "0.8125rem",
              fontWeight: 600,
              border: "1px solid #fecaca",
              marginBottom: 16,
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              padding: "10px 14px",
              backgroundColor: "#f0fdf4",
              color: "#166534",
              borderRadius: 8,
              fontSize: "0.8125rem",
              fontWeight: 600,
              border: "1px solid #bbf7d0",
              marginBottom: 16,
              textAlign: "left",
            }}
          >
            {message}
          </div>
        )}

        {/* 1. SETUP FORM (When PIN not set) */}
        {mode === "setup" && canManage && (
          <form onSubmit={handleSetup} style={{ textAlign: "left" }}>
            <label
              htmlFor="admin-new-pin"
              style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}
            >
              Create Master Security PIN (4–12 characters)
            </label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                id="admin-new-pin"
                type={showPin ? "text" : "password"}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter new PIN"
                autoFocus
                maxLength={12}
                required
                style={{
                  width: "100%",
                  padding: "12px 48px 12px 14px",
                  fontSize: "1rem",
                  letterSpacing: showPin ? "normal" : "0.2em",
                  borderRadius: 10,
                  border: "1.5px solid #cbd5e1",
                  outline: "none",
                  fontWeight: 600,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showPin ? "Hide" : "Show"}
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <PasswordStrengthMeter password={newPin} role="pin" />
            </div>

            <label
              htmlFor="admin-confirm-pin"
              style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}
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
              style={{
                width: "100%",
                padding: "12px 14px",
                fontSize: "1rem",
                letterSpacing: showPin ? "normal" : "0.2em",
                borderRadius: 10,
                border: "1.5px solid #cbd5e1",
                outline: "none",
                fontWeight: 600,
                marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="submit"
                disabled={busy || !newPin.trim() || !confirmPin.trim()}
                className="admin-btn-primary"
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  borderRadius: 10,
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  border: "none",
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Initializing PIN…" : "Set PIN & Unlock Workspace"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/dashboard")}
                className="admin-btn-light"
                style={{
                  padding: "12px 16px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Dashboard
              </button>
            </div>
          </form>
        )}

        {/* 2. RESET FORM (Google identity verification) */}
        {mode === "reset" && (
          <form onSubmit={handleReset} style={{ textAlign: "left" }}>
            <div style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e40af", marginBottom: 16, fontSize: "0.875rem", lineHeight: 1.5 }}>
              {googleReauthenticated
                ? "Google account verified for this reset. You can now choose a new Security PIN."
                : "Because you use Google to sign in, you do not need to enter a Gmail password here. Continue with Google to verify your administrator account."}
            </div>
            {!googleReauthenticated && (
              <button type="button" onClick={handleGoogleReauthentication} disabled={busy} className="admin-btn-primary" style={{ width: "100%", padding: "12px 18px", marginBottom: 18, borderRadius: 10, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
                {busy ? "Opening Google…" : "Continue with Google"}
              </button>
            )}

            <label
              htmlFor="admin-reset-new-pin"
              style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}
            >
              New Security PIN (4–12 characters)
            </label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                id="admin-reset-new-pin"
                type={showPin ? "text" : "password"}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter new PIN"
                maxLength={12}
                required
                style={{
                  width: "100%",
                  padding: "12px 48px 12px 14px",
                  fontSize: "1rem",
                  letterSpacing: showPin ? "normal" : "0.2em",
                  borderRadius: 10,
                  border: "1.5px solid #cbd5e1",
                  outline: "none",
                  fontWeight: 600,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showPin ? "Hide" : "Show"}
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <PasswordStrengthMeter password={newPin} role="pin" />
            </div>

            <label
              htmlFor="admin-reset-confirm-pin"
              style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}
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
              style={{
                width: "100%",
                padding: "12px 14px",
                fontSize: "1rem",
                letterSpacing: showPin ? "normal" : "0.2em",
                borderRadius: 10,
                border: "1.5px solid #cbd5e1",
                outline: "none",
                fontWeight: 600,
                marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="submit"
                disabled={busy || !googleReauthenticated || !newPin.trim() || !confirmPin.trim()}
                className="admin-btn-primary"
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  borderRadius: 10,
                  backgroundColor: "#d97706",
                  color: "#ffffff",
                  border: "none",
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Resetting PIN…" : "Reset Security PIN"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("verify");
                  setError("");
                  setMessage("");
                }}
                className="admin-btn-light"
                style={{
                  padding: "12px 16px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* 3. VERIFY FORM (Normal verification) */}
        {mode === "verify" && (
          <form onSubmit={handleVerify} style={{ textAlign: "left" }}>
            <label
              htmlFor="admin-pin-input"
              style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}
            >
              Enter Admin Security PIN
            </label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                id="admin-pin-input"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                autoFocus
                maxLength={12}
                required
                style={{
                  width: "100%",
                  padding: "12px 48px 12px 14px",
                  fontSize: "1.125rem",
                  letterSpacing: showPin ? "normal" : "0.25em",
                  borderRadius: 10,
                  border: "1.5px solid #cbd5e1",
                  outline: "none",
                  fontWeight: 600,
                  fontFamily: showPin ? "inherit" : "monospace",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showPin ? "Hide" : "Show"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="submit"
                disabled={busy || !pin.trim()}
                className="admin-btn-primary"
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  borderRadius: 10,
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Verifying PIN…" : "Unlock Settings"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/dashboard")}
                className="admin-btn-light"
                style={{
                  padding: "12px 16px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Dashboard
              </button>
            </div>

            {/* Reset / Setup actions */}
            <div style={{ marginTop: 20, textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
              {!isSet && canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("setup");
                    setError("");
                    setMessage("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#059669",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  ⚡ Set up initial Security PIN now
                </button>
              )}

              {isSet && canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError("");
                    setMessage("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#475569",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Forgot Security PIN? Reset with administrator password
                </button>
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 10,
            marginBottom: 20,
            fontSize: "0.8125rem",
            color: "#166534",
            fontWeight: 600,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
            Security PIN Verified · Sensitive settings unlocked
          </span>
          <button
            type="button"
            onClick={handleLock}
            disabled={busy}
            style={{
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: 700,
              backgroundColor: "#ffffff",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            🔒 Lock Now
          </button>
        </div>
      )}
      {children}
    </>
  );
}

