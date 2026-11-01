"use client";

import { adminSignOut, getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "../admin.css";

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

type SessionRow = {
  id: string;
  candidate_name: string | null;
  phone: string | null;
  subject: string | null;
  access_code: string | null;
  status: string;
  tab_switch_count: number;
  auto_submitted: boolean;
  time_left_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
  created_at: string;
};

export default function AdminSessionsPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [autoOnly, setAutoOnly] = useState(false);

  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(init?.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    return fetch(input, { ...init, headers });
  }, []);

  async function loadSessions() {
    setLoading(true);
    setMessage("");

    try {
      const res = await authFetch("/api/admin/sessions/live?filter=all");
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.sessions)) {
        setSessions(data.sessions as SessionRow[]);
      } else {
        setMessage(data.error || "Failed to load examination sessions.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load examination sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) { router.replace("/account"); return; }
      if (!(await adminHasPermission("cbt.sessions.read"))) {
        if (active) { setMessage("You do not have permission to view examination sessions."); setLoading(false); }
        return;
      }
      setAdminUser(admin);
      await loadSessions();
    }
    void init().catch(() => { if (active) { setMessage("Could not verify administrator access."); setLoading(false); } });
    return () => { active = false; };
  }, [router]);



  function handleLogout() {
    void adminSignOut();
    router.push("/admin/login");
  }

  function formatTimeLeft(seconds: number | null) {
    if (seconds === null || Number.isNaN(seconds)) return "-";

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
  }

  function isSuspicious(session: SessionRow) {
    return session.auto_submitted || session.tab_switch_count >= 3;
  }

  const filteredSessions = useMemo(() => {
    const filtered = sessions.filter((session) => {
      const search = searchText.trim().toLowerCase();

      const searchMatch =
        search === "" ||
        (session.candidate_name || "").toLowerCase().includes(search) ||
        (session.phone || "").toLowerCase().includes(search) ||
        (session.subject || "").toLowerCase().includes(search);

      const statusMatch =
        statusFilter === "All" || session.status === statusFilter;

      const autoMatch = !autoOnly || session.auto_submitted;

      return searchMatch && statusMatch && autoMatch;
    });

    return filtered.sort((a, b) => {
      const aSuspicious = isSuspicious(a) ? 1 : 0;
      const bSuspicious = isSuspicious(b) ? 1 : 0;

      if (aSuspicious !== bSuspicious) {
        return bSuspicious - aSuspicious;
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [sessions, searchText, statusFilter, autoOnly]);

  const suspiciousCount = filteredSessions.filter(isSuspicious).length;

  const statuses = useMemo(() => {
    const values = Array.from(new Set(sessions.map((s) => s.status))).sort();
    return ["All", ...values];
  }, [sessions]);

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Brainlab Session Monitor</div>
              <h1 className="admin-title">Track live and completed exam sessions</h1>
              <p className="admin-subtitle">
                Monitor candidate exam behavior, tab switching, suspicious activity,
                and auto-submissions from one admin workspace.
              </p>

              {adminUser && (
                <div className="admin-user-chip">
                  Signed in as <strong>{adminUser.email}</strong>
                </div>
              )}
            </div>

            <div className="admin-actions">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="admin-btn-light"
              >
                Dashboard
              </button>

              <button
                onClick={() => router.push("/admin/results")}
                className="admin-btn-light"
              >
                Results
              </button>

              <button
                onClick={() => router.push("/admin/questions/manage")}
                className="admin-btn-light"
              >
                Questions
              </button>

              <button onClick={handleLogout} className="admin-btn-primary">
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="admin-section admin-stats">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Total Sessions</p>
            <p className="admin-stat-value">{sessions.length}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Filtered Sessions</p>
            <p className="admin-stat-value">{filteredSessions.length}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Suspicious</p>
            <p className="admin-stat-value">{suspiciousCount}</p>
          </div>
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Filters</h2>
          <p className="admin-card-text">
            Search candidates and surface suspicious activity quickly.
          </p>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">Search</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by name, phone, or subject"
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-input"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-setting-box" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={autoOnly}
                  onChange={(e) => setAutoOnly(e.target.checked)}
                />
                <span>Show only auto-submitted sessions</span>
              </label>
              <p className="admin-help">
                Useful for spotting candidates who were forced out of the exam.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button onClick={loadSessions} className="admin-btn-primary">
              Refresh
            </button>

            <button
              onClick={() => {
                setSearchText("");
                setStatusFilter("All");
                setAutoOnly(false);
              }}
              className="admin-btn-light"
            >
              Clear Filters
            </button>
          </div>

          {message && <div className="admin-message">{message}</div>}
        </section>

        <section className="admin-section admin-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="admin-card-title">Exam Sessions</h2>
              <p className="admin-card-text">
                Suspicious sessions are pushed to the top automatically.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-slate-600">Loading sessions...</p>
          ) : filteredSessions.length === 0 ? (
            <p className="mt-6 text-slate-600">No sessions found.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Alert</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Tab Switches</th>
                    <th>Auto Submitted</th>
                    <th>Time Left</th>
                    <th>Started</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => {
                    const suspicious = isSuspicious(session);

                    return (
                      <tr key={session.id}>
                        <td>
                          {suspicious ? (
                            <span className="admin-status-used">Alert</span>
                          ) : (
                            <span className="admin-status-unused">Normal</span>
                          )}
                        </td>
                        <td>{session.candidate_name || "-"}</td>
                        <td>{session.phone || "-"}</td>
                        <td>{session.subject || "-"}</td>
                        <td>{session.status}</td>
                        <td>
                          {session.tab_switch_count >= 3 ? (
                            <span className="admin-status-used">
                              {session.tab_switch_count}
                            </span>
                          ) : (
                            <span className="admin-status-unused">
                              {session.tab_switch_count}
                            </span>
                          )}
                        </td>
                        <td>
                          {session.auto_submitted ? (
                            <span className="admin-status-used">Yes</span>
                          ) : (
                            <span className="admin-status-unused">No</span>
                          )}
                        </td>
                        <td>{formatTimeLeft(session.time_left_seconds)}</td>
                        <td>{new Date(session.started_at).toLocaleString()}</td>
                        <td>
                          {session.submitted_at
                            ? new Date(session.submitted_at).toLocaleString()
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}