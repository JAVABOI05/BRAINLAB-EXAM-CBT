"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import {
  getAcademicConfig,
  saveAcademicConfig,
  type AcademicConfig,
} from "../../lib/platformConfig";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import "../admin.css";

interface SubjectStat {
  name: string;
  questionCount: number;
}

export default function AdminAcademicPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [config, setConfig] = useState<AcademicConfig | null>(null);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Edit subject modal/state
  const [editingSubject, setEditingSubject] = useState<{ oldName: string; newName: string } | null>(null);

  // Inputs
  const [sessionInput, setSessionInput] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newCurriculum, setNewCurriculum] = useState("");
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) {
        router.replace("/account");
        return;
      }
      setAdmin(session);
      const data = await getAcademicConfig();

      // Load question counts per subject
      fetch("/api/admin/subjects")
        .then((r) => r.json())
        .then((res) => {
          if (active && res.ok && Array.isArray(res.subjectStats)) {
            setSubjectStats(res.subjectStats);
          }
        })
        .catch(() => {});

      if (active) {
        setConfig(data);
        setSessionInput(data.current_session);
        setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSaveSession(e: React.FormEvent) {
    e.preventDefault();
    if (!config || !admin || !sessionInput.trim()) return;
    setWorking(true);
    const updated = { ...config, current_session: sessionInput.trim() };
    const success = await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
    if (success) {
      setConfig(updated);
      setMessage(`Academic session updated to "${sessionInput.trim()}".`);
    } else {
      setError("Failed to update session.");
    }
    setWorking(false);
  }

  async function addClass() {
    if (!config || !admin || !newClass.trim()) return;
    if (config.classes.includes(newClass.trim())) return;
    setWorking(true);
    const updated = { ...config, classes: [...config.classes, newClass.trim()] };
    await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
    setConfig(updated);
    setNewClass("");
    setWorking(false);
  }

  async function removeClass(cls: string) {
    if (!config || !admin) return;
    setWorking(true);
    const updated = { ...config, classes: config.classes.filter((c) => c !== cls) };
    await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
    setConfig(updated);
    setWorking(false);
  }

  async function addCurriculum() {
    if (!config || !admin || !newCurriculum.trim()) return;
    if (config.curricula.includes(newCurriculum.trim())) return;
    setWorking(true);
    const updated = { ...config, curricula: [...config.curricula, newCurriculum.trim()] };
    await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
    setConfig(updated);
    setNewCurriculum("");
    setWorking(false);
  }

  async function removeCurriculum(cur: string) {
    if (!config || !admin) return;
    setWorking(true);
    const updated = { ...config, curricula: config.curricula.filter((c) => c !== cur) };
    await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
    setConfig(updated);
    setWorking(false);
  }

  // Add a new official subject
  async function addSubject() {
    if (!config || !admin || !newSubject.trim()) return;
    const cleanName = newSubject.trim();
    if (config.available_subjects.some((s) => s.toLowerCase() === cleanName.toLowerCase())) {
      setError(`Subject "${cleanName}" already exists.`);
      return;
    }
    setWorking(true);
    setMessage("");
    setError("");

    try {
      const updated = { ...config, available_subjects: [...config.available_subjects, cleanName] };
      await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
      setConfig(updated);
      setNewSubject("");
      setMessage(`Subject "${cleanName}" added successfully! It is now active for CBT candidate selection.`);
      
      // Refresh stats
      setSubjectStats((prev) => [...prev, { name: cleanName, questionCount: 0 }]);
    } catch {
      setError("Failed to add subject.");
    } finally {
      setWorking(false);
    }
  }

  // Update/Rename an existing subject
  async function handleSaveEditedSubject() {
    if (!editingSubject || !config || !admin) return;
    const { oldName, newName } = editingSubject;
    const cleanNew = newName.trim();
    if (!cleanNew) {
      setError("Subject name cannot be empty.");
      return;
    }
    setWorking(true);
    setMessage("");
    setError("");

    try {
      const updatedList = config.available_subjects.map((s) => (s === oldName ? cleanNew : s));
      const updated = { ...config, available_subjects: updatedList };
      await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
      setConfig(updated);

      setSubjectStats((prev) =>
        prev.map((stat) => (stat.name === oldName ? { ...stat, name: cleanNew } : stat))
      );

      setMessage(`Subject renamed from "${oldName}" to "${cleanNew}".`);
      setEditingSubject(null);
    } catch {
      setError("Failed to update subject name.");
    } finally {
      setWorking(false);
    }
  }

  // Remove a subject
  async function removeSubject(subj: string) {
    if (!config || !admin) return;
    if (!confirm(`Are you sure you want to remove "${subj}" from active examination subjects?`)) return;

    setWorking(true);
    setMessage("");
    setError("");

    try {
      const updated = { ...config, available_subjects: config.available_subjects.filter((s) => s !== subj) };
      await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
      setConfig(updated);
      setSubjectStats((prev) => prev.filter((stat) => stat.name !== subj));
      setMessage(`Subject "${subj}" removed from active selection.`);
    } catch {
      setError("Failed to remove subject.");
    } finally {
      setWorking(false);
    }
  }

  if (loading || !config) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card">Loading academic structure…</section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        {/* Navigation Header */}
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Platform Control Engine · Academics</div>
              <h1 className="admin-title">Academic Structure &amp; Subjects</h1>
              <p className="admin-subtitle">
                Configure national examination boards, class cohorts, and manage active CBT subjects with live question counts.
              </p>
              {admin && (
                <div className="admin-user-chip">
                  {admin.email} · {admin.role.replaceAll("_", " ")}
                </div>
              )}
            </div>
            <div className="admin-actions">
              <Link href="/admin/questions" className="admin-btn-light">
                Question Bank
              </Link>
              <Link href="/admin/dashboard" className="admin-btn-light">
                Dashboard
              </Link>
              <AdminNotificationBell />
            </div>
          </div>
        </section>

        {message && (
          <div className="admin-section rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 font-bold text-sm text-emerald-800 dark:text-emerald-300">
            ✓ {message}
          </div>
        )}
        {error && (
          <div className="admin-section rounded-2xl bg-rose-500/15 border border-rose-500/30 p-4 font-bold text-sm text-rose-800 dark:text-rose-300">
            ⚠️ {error}
          </div>
        )}

        {/* Active Subjects Manager (Primary Feature) */}
        <section className="admin-section admin-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Active Examination Subjects</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                These subjects are selectable by candidates during CBT mock registrations and self-practice.
              </p>
            </div>
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-xs font-black text-blue-900 dark:text-cyan-300">
              {config.available_subjects.length} Official Subjects
            </span>
          </div>

          {/* Subjects Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {config.available_subjects.map((subj) => {
              const stat = subjectStats.find((s) => s.name.toLowerCase() === subj.toLowerCase());
              const count = stat?.questionCount ?? 0;

              return (
                <div
                  key={subj}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>📚</span>
                        <span>{subj}</span>
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {count > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {count.toLocaleString()} questions in bank
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">0 questions (ready to upload)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <button
                      type="button"
                      onClick={() => setEditingSubject({ oldName: subj, newName: subj })}
                      className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSubject(subj)}
                      className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Subject Input Box */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-4">
            <label className="block text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-2">
              Add New Official Subject
            </label>
            <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <input
                type="text"
                placeholder="e.g. Economics, Commerce, Further Mathematics…"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-bold text-slate-900 dark:text-white"
              />
              <button
                type="button"
                disabled={working || !newSubject.trim()}
                onClick={() => void addSubject()}
                className="rounded-xl bg-[#012153] hover:bg-blue-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                + Add Subject
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Adding a subject immediately makes it selectable by candidates in the CBT 4-subject selector.
            </p>
          </div>
        </section>

        {/* Edit Subject Modal */}
        {editingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Rename Subject: {editingSubject.oldName}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Update the official subject title used across the portal and question bank.
              </p>

              <div className="mt-4">
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  New Subject Name
                </label>
                <input
                  type="text"
                  value={editingSubject.newName}
                  onChange={(e) => setEditingSubject({ ...editingSubject, newName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm font-bold text-slate-900 dark:text-white"
                  placeholder="Enter subject name…"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={working || !editingSubject.newName.trim()}
                  onClick={() => void handleSaveEditedSubject()}
                  className="rounded-xl bg-[#012153] hover:bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Session & Cohorts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Current Session */}
          <section className="admin-card">
            <h2 className="text-base font-black text-slate-950 dark:text-white mb-1">Active Academic Session</h2>
            <p className="text-xs text-slate-500 mb-4">Governs student registration and timetable cohort calendars.</p>
            <form onSubmit={handleSaveSession} className="flex gap-2">
              <input
                type="text"
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                placeholder="e.g. 2026/2027"
                required
              />
              <button
                type="submit"
                disabled={working}
                className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white shadow-xs"
              >
                Update
              </button>
            </form>
          </section>

          {/* Curricula */}
          <section className="admin-card">
            <h2 className="text-base font-black text-slate-950 dark:text-white mb-1">Examination Boards & Curricula</h2>
            <p className="text-xs text-slate-500 mb-3">Supported national examination frameworks.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {config.curricula.map((cur) => (
                <span
                  key={cur}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <span>{cur}</span>
                  <button
                    type="button"
                    onClick={() => void removeCurriculum(cur)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add examination curriculum…"
                value={newCurriculum}
                onChange={(e) => setNewCurriculum(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs"
              />
              <button
                type="button"
                onClick={() => void addCurriculum()}
                className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white"
              >
                Add
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
