"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  checkAdminPinStatus,
  verifyAdminPin,
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
  const [defaultHint, setDefaultHint] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function init() {
      // First check local fast storage
      if (isAdminPinLocallyVerified()) {
        if (active) {
          setIsVerified(true);
          setChecking(false);
        }
        return;
      }

      // Check server cookie
      const status = await checkAdminPinStatus();
      if (!active) return;
      setIsVerified(status.isVerified);
      setDefaultHint(status.defaultHint);
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

  async function handleLock() {
    setBusy(true);
    await lockAdminPin();
    setIsVerified(false);
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
            backgroundColor: "#eff6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2563eb",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <span
          style={{
            display: "inline-block",
            fontSize: "0.75rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#2563eb",
            backgroundColor: "#dbeafe",
            padding: "4px 10px",
            borderRadius: 9999,
            marginBottom: 10,
          }}
        >
          SECURITY PIN REQUIRED
        </span>

        <h2 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.02em" }}>
          {title}
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: 24 }}>
          {description}
        </p>

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

          {defaultHint && (
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 16 }}>
              💡 <em>Default initial PIN is <strong>1234</strong>. You can change this in Security Workspace.</em>
            </p>
          )}

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
        </form>
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
