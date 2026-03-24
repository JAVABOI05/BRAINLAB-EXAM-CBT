"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
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
      setErrorText("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setErrorText("");

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, role")
      .eq("email", email.trim())
      .eq("password", password.trim())
      .single();

    if (error || !data) {
      setErrorText("Invalid login credentials.");
      setLoading(false);
      return;
    }

    localStorage.setItem("admin_user", JSON.stringify(data));
    router.push("/admin/dashboard");
  };

  return (
    <main className="admin-login-shell">
      <div className="admin-login-card">
        <div className="admin-badge">Brainlab Admin Portal</div>

        <h1 className="admin-login-title">Admin Login</h1>
        <p className="admin-login-subtitle">
          Sign in to access the dashboard and manage the CBT platform.
        </p>

        <div className="admin-form-group">
          <label className="admin-label">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter admin email"
            className="admin-input"
          />
        </div>

        <div className="admin-form-group">
          <label className="admin-label">Password</label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="admin-input"
              style={{ flex: 1 }}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="admin-btn-light"
              style={{ padding: "12px 16px" }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="admin-form-actions">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="admin-btn-primary"
            style={{ width: "100%" }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </div>

        {errorText && <div className="admin-message">{errorText}</div>}
      </div>
    </main>
  );
}