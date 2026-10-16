"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminSignIn } from "../../lib/adminAuth";
import "../admin.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorText("Enter your authorized sign-in details.");
      return;
    }
    setLoading(true);
    setErrorText("");
    const result = await adminSignIn(email.trim(), password);
    if (!result.ok) {
      setErrorText("Sign-in could not be verified. Check your details or contact the platform owner.");
      setLoading(false);
      return;
    }
    router.push("/admin/dashboard");
  };

  return (
    <main className="admin-login-shell">
      <div className="admin-login-card">
        <div className="admin-badge">Private Platform Access</div>
        <h1 className="admin-login-title">Secure Console Sign-In</h1>
        <p className="admin-login-subtitle">Authorized operators only. Access is verified before platform controls become available.</p>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="console-email">Email Address</label>
          <input id="console-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="admin-input" />
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="console-password">Password</label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input id="console-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="admin-input" style={{ flex: 1 }} />
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="admin-btn-light" style={{ padding: "12px 16px" }}>{showPassword ? "Hide" : "Show"}</button>
          </div>
        </div>
        <div className="admin-form-actions">
          <button onClick={handleLogin} disabled={loading} className="admin-btn-primary" style={{ width: "100%" }}>{loading ? "Verifying..." : "Continue securely"}</button>
        </div>
        {errorText && <div className="admin-message" role="alert">{errorText}</div>}
      </div>
    </main>
  );
}
