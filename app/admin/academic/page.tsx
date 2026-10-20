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
import "../admin.css";

export default function AdminAcademicPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [config, setConfig] = useState<AcademicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  async function addSubject() {
    if (!config || !admin || !newSubject.trim()) return;
    if (config.available_subjects.includes(newSubject.trim())) return;
    setWorking(true);
    const updated = { ...config, available_subjects: [...config.available_subjects, newSubject.trim()] };
    await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
    setConfig(updated);
    setNewSubject("");
    setWorking(false);
  }

  async function removeSubject(subj: string) {
    if (!config || !admin) return;
    setWorking(true);
    const updated = { ...config, available_subjects: config.available_subjects.filter((s) => s !== subj) };
    await saveAcademicConfig(updated, { id: admin.id, email: admin.email });
    setConfig(updated);
    setWorking(false);
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
              <h1 className="admin-title">Academic Structure &amp; Curricula</h1>
              <p className="admin-subtitle">
                Configure academic sessions, class cohorts, national examination boards, and official subjects.
              </p>
              {admin && (
                <div className="admin-user-chip">
                  {admin.email} · {admin.role.replaceAll("_", " ")}
                </div>
              )}
            </div>
            <div className="admin-actions">
              <Link href="/admin/dashboard" className="admin-btn-light">
                ← Dashboard
              </Link>
            </div>
          </div>
        </section>

        {message && <div className="admin-message" role="status">✓ {message}</div>}
        {error && <div className="admin-message" role="alert" style={{ background: "#fee2e2", color: "#991b1b" }}>⚠️ {error}</div>}

        {/* Current Session */}
        <section className="admin-section admin-card">
          <h2 className="text-lg font-black text-slate-950 mb-2">Active Academic Session</h2>
          <p className="text-xs text-slate-500 mb-4">Governs current student enrollments and competition calendars.</p>
          <form onSubmit={handleSaveSession} className="flex gap-3 max-w-md">
            <input
              type="text"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 p-3 font-bold text-slate-900"
              placeholder="e.g. 2026/2027"
              required
            />
            <button type="submit" disabled={working} className="rounded-xl bg-[#061a3a] px-5 py-3 font-bold text-white hover:bg-[#123566]">
              Update Session
            </button>
          </form>
        </section>

        {/* Classes & Curricula Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Classes */}
          <section className="admin-section admin-card">
            <h2 className="text-lg font-black text-slate-950 mb-1">Class Levels &amp; Cohorts</h2>
            <p className="text-xs text-slate-500 mb-4">Targeted by courses, practice papers, and school assessments.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {config.classes.map((cls) => (
                <span key={cls} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800">
                  <span>{cls}</span>
                  <button type="button" onClick={() => void removeClass(cls)} className="text-slate-400 hover:text-red-700">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add new class level…"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 p-2.5 text-xs"
              />
              <button type="button" onClick={() => void addClass()} className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white">
                Add
              </button>
            </div>
          </section>

          {/* Curricula */}
          <section className="admin-section admin-card">
            <h2 className="text-lg font-black text-slate-950 mb-1">Curricula &amp; Exam Categories</h2>
            <p className="text-xs text-slate-500 mb-4">National and international exam standards supported.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {config.curricula.map((cur) => (
                <span key={cur} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-950">
                  <span>{cur}</span>
                  <button type="button" onClick={() => void removeCurriculum(cur)} className="text-indigo-400 hover:text-red-700">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add examination curriculum…"
                value={newCurriculum}
                onChange={(e) => setNewCurriculum(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 p-2.5 text-xs"
              />
              <button type="button" onClick={() => void addCurriculum()} className="rounded-xl bg-indigo-900 px-4 py-2.5 text-xs font-bold text-white">
                Add
              </button>
            </div>
          </section>
        </div>

        {/* Subjects List */}
        <section className="admin-section admin-card">
          <h2 className="text-lg font-black text-slate-950 mb-1">Active Question Bank Subjects</h2>
          <p className="text-xs text-slate-500 mb-4">Available for candidate registration and self-practice attempts.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {config.available_subjects.map((subj) => (
              <span key={subj} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-950">
                <span>📚 {subj}</span>
                <button type="button" onClick={() => void removeSubject(subj)} className="text-emerald-500 hover:text-red-700">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="Add official subject…"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 p-2.5 text-xs"
            />
            <button type="button" onClick={() => void addSubject()} className="rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white">
              Add Subject
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
