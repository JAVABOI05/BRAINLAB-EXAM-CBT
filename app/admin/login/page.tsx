"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminSignIn, getAdminSession } from "../../lib/adminAuth";
import { getAuthRedirectUrl } from "../../lib/authRedirect";
import { supabase } from "../../lib/supabase";

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSession().then((admin) => {
      if (active && admin) router.replace("/admin/dashboard");
    }).catch(() => {
      // Keep the administrator sign-in available if session restoration fails.
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("We could not verify administrator access right now. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
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

  return <main className="admin-auth-page">
    <section className="admin-auth-card" aria-labelledby="admin-signin-title">
      <Link href="/" className="admin-auth-brand" aria-label="BrainLab Academy homepage">
        <span className="admin-auth-mark" aria-hidden="true">B</span>
        <span><strong>BRAINLAB</strong><small>ACADEMY ADMIN</small></span>
      </Link>
      <div className="admin-auth-eyebrow">SECURE ADMINISTRATION</div>
      <h1 id="admin-signin-title">Administrator sign in</h1>
      <p className="admin-auth-intro">Use your assigned BrainLab administrator account. Access is verified against your current Supabase role.</p>
      {checking && <p className="admin-auth-check" role="status">Checking for an active administrator session…</p>}
      <form className="admin-auth-form" onSubmit={submit}>
        <label htmlFor="admin-email">Administrator email</label>
        <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@brainlabacademy.com.ng" />
        <label htmlFor="admin-password">Password</label>
        <div className="admin-auth-password">
          <input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
        </div>
        <button className="admin-auth-submit" type="submit" disabled={busy}>{busy ? "Verifying access…" : "Sign in to admin"}</button>
        <button className="admin-auth-recovery" type="button" onClick={() => void resetPassword()} disabled={busy}>Forgot your password?</button>
      </form>
      {error && <p className="admin-auth-error" role="alert">{error}</p>}
      {message && <p className="admin-auth-success" role="status">{message}</p>}
      <div className="admin-auth-footer">
        <span>Administrator access only</span>
        <Link href="/account">Candidate sign in</Link>
      </div>
    </section>
    <p className="admin-auth-legal">BrainLab Academy · Secure administration workspace</p>
  </main>;
}
