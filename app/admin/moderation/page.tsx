"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";

type FlaggedReport = {
  id: string;
  type: "question_typo" | "wrong_answer_key" | "image_missing" | "learner_dispute";
  target: string;
  reporter: string;
  note: string;
  created_at: string;
  status: "open" | "resolved" | "dismissed";
};

export default function AdminModerationPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [reports, setReports] = useState<FlaggedReport[]>([
    {
      id: "REP-101",
      type: "wrong_answer_key",
      target: "Physics - Question #14 (Hooke's Law)",
      reporter: "08012345678 (Candidate)",
      note: "Option C calculates spring constant as 250 N/m instead of 200 N/m.",
      created_at: "2026-10-25T08:00:00.000Z",
      status: "open",
    },
    {
      id: "REP-102",
      type: "image_missing",
      target: "Biology - Question #8 (Cell Division)",
      reporter: "09087654321 (Candidate)",
      note: "Diagram for metaphase stage is not rendering on mobile screen.",
      created_at: "2026-10-25T05:00:00.000Z",
      status: "open",
    },
    {
      id: "REP-103",
      type: "question_typo",
      target: "Chemistry - Question #22 (Stoichiometry)",
      reporter: "Tutor Reviewer",
      note: "Typo in chemical equation for combustion of ethane: missing coefficient.",
      created_at: "2026-10-24T10:00:00.000Z",
      status: "resolved",
    },
  ]);

  const loadAnnouncement = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["platform_announcement", "announcement_enabled"]);

      if (!fetchErr && data) {
        data.forEach((row) => {
          if (row.key === "platform_announcement" && typeof row.value === "string") {
            setAnnouncementText(row.value);
          }
          if (row.key === "announcement_enabled") {
            setAnnouncementEnabled(row.value === true || row.value === "true");
          }
        });
      }
    } catch {
      // Non-fatal if setting table row doesn't exist yet
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      const admin = await getAdminSession();
      if (!active) return;

      if (!admin) {
        router.replace("/account");
        return;
      }

      const canModerate =
        admin.role === "super_admin" ||
        admin.role === "platform_admin" ||
        admin.role === "community_moderator" ||
        (await adminHasPermission("community.moderate")) ||
        (await adminHasPermission("student.support"));

      if (!canModerate) {
        router.replace("/admin/dashboard");
        return;
      }

      setAdminUser(admin);
      await loadAnnouncement();
      setLoading(false);
    }

    void init();

    return () => {
      active = false;
    };
  }, [router, loadAnnouncement]);

  async function handleSaveAnnouncement() {
    setSavingAnnouncement(true);
    setMessage("");
    setError("");

    try {
      const { error: upsertErr1 } = await supabase
        .from("settings")
        .upsert({ key: "platform_announcement", value: announcementText });

      const { error: upsertErr2 } = await supabase
        .from("settings")
        .upsert({ key: "announcement_enabled", value: announcementEnabled });

      if (upsertErr1 || upsertErr2) {
        setError("Could not update announcement. Permission or database error.");
      } else {
        setMessage("Platform banner announcement updated successfully.");
      }
    } catch {
      setError("An unexpected error occurred while saving platform announcement.");
    } finally {
      setSavingAnnouncement(false);
    }
  }

  function handleUpdateReportStatus(id: string, newStatus: "resolved" | "dismissed") {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    setMessage(`Report ${id} marked as ${newStatus}.`);
  }

  if (loading) {
    return (
      <main className="admin-shell">
        <div className="admin-card text-center py-12">
          <p className="admin-card-text">Loading moderation and student support workspace…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="admin-badge">Student Support</span>
              {adminUser && (
                <span className="text-xs font-semibold text-slate-500">
                  Moderator: {adminUser.email}
                </span>
              )}
            </div>
            <h1 className="admin-title">Community Moderation & Support</h1>
            <p className="admin-subtitle">
              Manage platform-wide learner announcements, review flagged question disputes, and maintain content standards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="admin-btn-light"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/questions/manage")}
              className="admin-btn-light"
            >
              Question Bank
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {message}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Global Announcements Manager */}
      <section className="admin-section admin-card mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="admin-card-title">Learner Announcement Banner</h2>
            <p className="admin-card-text">
              Broadcast high-priority notices across the learner dashboard and exam entry screens.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={announcementEnabled}
              onChange={(e) => setAnnouncementEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show Banner to Learners
          </label>
        </div>

        <div className="mt-4">
          <textarea
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="e.g. BrainLab National Mock CBT Registration is open! Complete your mock exam by Saturday 6:00 PM."
            rows={3}
            className="admin-input !h-auto py-2.5 text-sm"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={savingAnnouncement}
              onClick={() => void handleSaveAnnouncement()}
              className="admin-btn-primary"
            >
              {savingAnnouncement ? "Saving Notice…" : "Publish Announcement"}
            </button>
          </div>
        </div>
      </section>

      {/* Question & Content Dispute Queue */}
      <section className="admin-section admin-card mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="admin-card-title">Content Dispute & Question Flag Queue</h2>
            <p className="admin-card-text">
              Candidate and tutor reports regarding question clarity, typos, and answer keys.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {reports.filter((r) => r.status === "open").length} Open Action Items
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {reports.map((report) => (
            <div key={report.id} className="py-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      report.type === "wrong_answer_key"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : report.type === "image_missing"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {report.type.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500">[{report.id}]</span>
                  <span className="text-xs text-slate-400">
                    {new Date(report.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {report.target}
                </h3>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {report.note}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Reported by: <span className="font-medium text-slate-600 dark:text-slate-300">{report.reporter}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-center">
                {report.status === "open" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateReportStatus(report.id, "resolved")}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      Resolve ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateReportStatus(report.id, "dismissed")}
                      className="admin-btn-light !text-xs !py-1.5"
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      report.status === "resolved"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {report.status === "resolved" ? "Resolved ✓" : "Dismissed"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
