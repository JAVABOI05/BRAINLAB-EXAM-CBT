"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";
import DifficultySlider from "../../components/DifficultySlider";
import type { DifficultyAllocationResult } from "../../lib/difficultyEngine";

type Organisation = { id: string; name: string; status: string };
type Subject = { name: string; question_count: number; categories: string[] };
type Assessment = {
  id: string;
  slug: string;
  assessment_type: string;
  title: string;
  organisation_id: string | null;
  question_count: number;
  duration_seconds: number | null;
  max_attempts: number;
  starts_at: string | null;
  ends_at: string | null;
  access_code_required: boolean;
  result_release: string;
  is_published: boolean;
};

type AssessmentCode = {
  id: string;
  assessment_id: string;
  code_hint: string;
  max_redemptions: number;
  redemption_count: number;
  permanent: boolean;
  expires_at: string | null;
  revoked_at: string | null;
};

export default function OrganisedAssessmentsAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentCodes, setAssessmentCodes] = useState<Record<string, AssessmentCode>>({});
  const [kind, setKind] = useState<"organisation_quiz" | "competition">("organisation_quiz");
  const [organisationId, setOrganisationId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [categories, setCategories] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [accessRequired, setAccessRequired] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [maxRedemptionsInput, setMaxRedemptionsInput] = useState(500);
  const [resultRelease, setResultRelease] = useState<"after_submit" | "after_close" | "admin_only">("after_submit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newlyCreatedCode, setNewlyCreatedCode] = useState<{ title: string; code: string; id: string; slug: string } | null>(null);

  // Modal for managing code on an existing assessment
  const [modalAssessment, setModalAssessment] = useState<Assessment | null>(null);
  const [modalActionLoading, setModalActionLoading] = useState(false);
  const [modalCustomCode, setModalCustomCode] = useState("");
  const [modalMaxRedemptions, setModalMaxRedemptions] = useState(500);
  const [difficultyAllocation, setDifficultyAllocation] = useState<DifficultyAllocationResult | null>(null);

  const load = useCallback(async () => {
    setError("");
    const [o, a, catalog, c] = await Promise.all([
      supabase.from("learning_organisations").select("id,name,status").order("name"),
      supabase
        .from("learning_assessments")
        .select("id,slug,assessment_type,title,organisation_id,question_count,duration_seconds,max_attempts,starts_at,ends_at,access_code_required,result_release,is_published")
        .order("created_at", { ascending: false }),
      supabase.rpc("get_self_practice_catalog"),
      supabase
        .from("learning_access_codes")
        .select("id,assessment_id,code_hint,max_redemptions,redemption_count,permanent,expires_at,revoked_at")
        .eq("scope_type", "assessment")
        .order("created_at", { ascending: false }),
    ]);

    if (o.error || a.error || catalog.error) {
      setError("Could not load organisation assessment settings.");
    }
    setOrganisations((o.data ?? []) as Organisation[]);
    setAssessments((a.data ?? []) as Assessment[]);
    setSubjects((catalog.data?.subjects ?? []) as Subject[]);

    const codesMap: Record<string, AssessmentCode> = {};
    if (c.data) {
      for (const row of c.data as AssessmentCode[]) {
        if (row.assessment_id && !codesMap[row.assessment_id] && !row.revoked_at) {
          codesMap[row.assessment_id] = row;
        }
      }
    }
    setAssessmentCodes(codesMap);

    setOrganisationId((v) => v || o.data?.find((x) => x.status === "active")?.id || "");
  }, []);

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
      const allowed = await adminHasPermission("institution.manage");
      const global = await adminHasPermission("learning.content.manage");
      if (!active) return;
      if (!allowed && !global) {
        setError("This workspace requires institution management or Learning Hub administration permission.");
        setLoading(false);
        return;
      }
      await load();
      if (active) setLoading(false);
    }
    void init().catch(() => {
      if (active) {
        setError("Could not verify administrator access.");
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [router, load]);

  async function createAssessment(event: { preventDefault: () => void }) {
    event.preventDefault();
    setError("");
    setMessage("");
    setNewlyCreatedCode(null);

    if (!title.trim()) {
      setError("Enter an assessment title.");
      return;
    }
    if (kind === "organisation_quiz" && !organisationId) {
      setError("Choose an organisation for an organisation quiz.");
      return;
    }
    if (!selectedSubjects.length) {
      setError("Choose at least one question-bank subject.");
      return;
    }
    if (endsAt && startsAt && new Date(endsAt) <= new Date(startsAt)) {
      setError("End time must be later than start time.");
      return;
    }
    if (difficultyAllocation && difficultyAllocation.policyApplied === "strict" && !difficultyAllocation.ok) {
      setError(difficultyAllocation.errorMessage || "Strict difficulty distribution requirements cannot be satisfied.");
      return;
    }

    setSaving(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in again to continue.");

      const res = await fetch("/api/admin/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          assessment_type: kind,
          question_source: "bank",
          subjects: selectedSubjects,
          categories: categories.split(",").map((x) => x.trim()).filter(Boolean),
          question_count: Math.min(500, Math.max(1, questionCount)),
          duration_minutes: durationMinutes,
          max_attempts: Math.min(100, Math.max(1, maxAttempts)),
          starts_at: startsAt || null,
          ends_at: endsAt || null,
          access_code_required: accessRequired,
          custom_code: accessRequired && customCodeInput.trim() ? customCodeInput.trim() : undefined,
          max_redemptions: accessRequired ? maxRedemptionsInput : undefined,
          result_release: resultRelease,
          status: "draft",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not create assessment.");
      }

      const created = data.assessment;
      if (data.access_code) {
        setNewlyCreatedCode({
          title: created.title,
          code: data.access_code,
          id: created.id,
          slug: created.slug || created.id,
        });
      }

      setTitle("");
      setDescription("");
      setCategories("");
      setCustomCodeInput("");
      setMessage(
        data.access_code
          ? `Assessment draft saved with Examination Code: ${data.access_code}. Publish when ready to accept candidates.`
          : "Assessment saved as a draft. Publish after confirming the question pool and access settings."
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create assessment.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(a: Assessment) {
    if (!a.is_published && !window.confirm("Publish this assessment configuration? Learners will be able to start it as soon as its schedule and access rules permit.")) return;
    setSaving(true);
    setError("");
    setMessage("");
    const { error: updateError } = await supabase.from("learning_assessments").update({ is_published: !a.is_published }).eq("id", a.id);
    if (updateError) setError(updateError.message);
    else {
      setMessage(a.is_published ? "Assessment unpublished." : "Assessment published and live!");
      await load();
    }
    setSaving(false);
  }

  async function handleGenerateOrSetCode(a: Assessment, customCode?: string) {
    setModalActionLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/admin/assessments/${a.id}/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: customCode ? "set" : "generate",
          custom_code: customCode || undefined,
          max_redemptions: modalMaxRedemptions || 500,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to configure examination code.");
      }

      setNewlyCreatedCode({
        title: a.title,
        code: data.code,
        id: a.id,
        slug: a.slug || a.id,
      });
      setMessage(`New examination code generated: ${data.code}`);
      setModalAssessment(null);
      setModalCustomCode("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error managing code.");
    } finally {
      setModalActionLoading(false);
    }
  }

  async function handleRevokeCode(a: Assessment) {
    if (!window.confirm(`Revoke the access code for "${a.title}"? Students with this code will no longer be permitted entry.`)) return;
    setModalActionLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/admin/assessments/${a.id}/code`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to revoke code.");
      }
      setMessage(`Examination access code for "${a.title}" has been revoked.`);
      setModalAssessment(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error revoking code.");
    } finally {
      setModalActionLoading(false);
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setMessage(`Copied ${label} to clipboard!`);
    }
  };

  const orgName = (id: string | null) => (id ? organisations.find((o) => o.id === id)?.name ?? "Organisation" : "Open competition");

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card">Loading organised assessments…</section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">BrainLab Academy · Assessment administration</div>
              <h1 className="admin-title">Organisation Quizzes, Tests & Competitions</h1>
              <p className="admin-subtitle">
                Configure assessment rules, subjects, questions, duration, schedules, access codes, attempt limits, and result policies.
              </p>
              {admin && <div className="admin-user-chip">{admin.email} · {admin.role.replaceAll("_", " ")}</div>}
            </div>
            <div className="admin-actions">
              <button className="admin-btn-light" onClick={() => router.push("/admin/dashboard")}>Dashboard</button>
              <button className="admin-btn-light" onClick={() => router.push("/admin/academy-access")}>Access codes</button>
            </div>
          </div>
        </section>

        {error && <div className="admin-message text-rose-600 bg-rose-50 border border-rose-200" role="alert">{error}</div>}
        {message && <div className="admin-message text-emerald-700 bg-emerald-50 border border-emerald-200" role="status">{message}</div>}

        {/* Newly Created Code Share Banner */}
        {newlyCreatedCode && (
          <div className="admin-card bg-blue-50/80 dark:bg-blue-950/40 border-2 border-blue-400 p-6 rounded-2xl mb-6 shadow-md animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300">
                  🎉 Examination Code Ready to Share
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {newlyCreatedCode.title}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-mono text-2xl font-black px-4 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 rounded-xl text-blue-800 dark:text-cyan-400 select-all">
                    {newlyCreatedCode.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newlyCreatedCode.code, "Examination Code")}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    Copy Code
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const host = typeof window !== "undefined" ? window.location.origin : "https://www.brainlabacademy.com.ng";
                    copyToClipboard(`${host}/assessments/${newlyCreatedCode.slug || newlyCreatedCode.id}?code=${encodeURIComponent(newlyCreatedCode.code)}`, "Direct Examination Link");
                  }}
                  className="px-4 py-2 rounded-xl border border-blue-300 bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-slate-800 text-xs font-bold text-blue-900 dark:text-cyan-300 transition text-center cursor-pointer"
                >
                  🔗 Copy Direct Exam Link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hello, here is your examination link and code for ${newlyCreatedCode.title}:\n\nCode: ${newlyCreatedCode.code}\nLink: https://www.brainlabacademy.com.ng/cbt`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition text-center cursor-pointer"
                >
                  💬 Share to WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        <section className="admin-section admin-grid-2">
          {/* Create Assessment Form */}
          <form className="admin-card" onSubmit={createAssessment}>
            <h2 className="admin-card-title">Create assessment draft</h2>
            <label className="admin-label">Assessment type</label>
            <select className="admin-input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="organisation_quiz">Organisation quiz</option>
              <option value="competition">Competition</option>
            </select>

            {kind === "organisation_quiz" && (
              <>
                <label className="admin-label">Organisation</label>
                <select className="admin-input" value={organisationId} onChange={(e) => setOrganisationId(e.target.value)} required>
                  <option value="">Choose organisation</option>
                  {organisations.filter((o) => o.status === "active").map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </>
            )}

            {kind === "competition" && (
              <>
                <label className="admin-label">Organisation (optional)</label>
                <select className="admin-input" value={organisationId} onChange={(e) => setOrganisationId(e.target.value)}>
                  <option value="">Open competition</option>
                  {organisations.filter((o) => o.status === "active").map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </>
            )}

            <label className="admin-label">Title</label>
            <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />

            <label className="admin-label">Description and instructions</label>
            <textarea className="admin-input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

            <fieldset className="mt-4">
              <legend className="admin-label">Question subjects</legend>
              <div className="grid grid-cols-2 gap-2">
                {subjects.map((s) => (
                  <label key={s.name} className="flex gap-2 rounded border p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(s.name)}
                      onChange={(e) => setSelectedSubjects((old) => (e.target.checked ? [...old, s.name] : old.filter((x) => x !== s.name)))}
                    />
                    <span>{s.name} ({s.question_count})</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="admin-label">Categories (optional, comma separated)</label>
            <input className="admin-input" value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="e.g. algebra, geometry" />

            <label className="admin-label">Question count</label>
            <input className="admin-input" type="number" min={1} max={500} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value) || 1)} />

            <div className="mt-4 mb-2">
              <DifficultySlider
                totalQuestions={Math.min(500, Math.max(1, questionCount))}
                onChange={setDifficultyAllocation}
              />
            </div>

            <label className="admin-label">Duration (minutes; 0 = untimed)</label>
            <input className="admin-input" type="number" min={0} max={480} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)} />

            <label className="admin-label">Maximum attempts</label>
            <input className="admin-input" type="number" min={1} max={100} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)} />

            <label className="admin-label">Start time (optional)</label>
            <input className="admin-input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />

            <label className="admin-label">End time (optional)</label>
            <input className="admin-input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />

            {/* Access Code Options */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 mt-3 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <label className="admin-toggle">
                <input type="checkbox" checked={accessRequired} onChange={(e) => setAccessRequired(e.target.checked)} />
                <span className="font-bold">Require an assessment-specific examination code</span>
              </label>

              {accessRequired && (
                <div className="pl-6 space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Custom Examination Code (optional)
                    </label>
                    <input
                      className="admin-input font-mono uppercase mt-1"
                      value={customCodeInput}
                      onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. MTH101-MIDTERM or leave blank to auto-generate"
                    />
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Leave blank to automatically generate a clean 8-character PIN (e.g. BLT-7X2W9M).
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Redemption Capacity (Max candidates)
                    </label>
                    <input
                      className="admin-input mt-1"
                      type="number"
                      min={1}
                      max={100000}
                      value={maxRedemptionsInput}
                      onChange={(e) => setMaxRedemptionsInput(Number(e.target.value) || 500)}
                    />
                  </div>
                </div>
              )}
            </div>

            <label className="admin-label mt-3">Result release</label>
            <select className="admin-input" value={resultRelease} onChange={(e) => setResultRelease(e.target.value as typeof resultRelease)}>
              <option value="after_submit">After submission</option>
              <option value="after_close">After assessment closes</option>
              <option value="admin_only">Administrator only</option>
            </select>

            <button className="admin-btn-primary mt-4" disabled={saving || !title.trim() || !selectedSubjects.length}>
              {saving ? "Saving…" : "Save draft"}
            </button>
          </form>

          {/* Configured Assessments List */}
          <div className="admin-card">
            <h2 className="admin-card-title">Configured assessments</h2>
            {assessments.length === 0 ? (
              <p className="admin-help">No organisation quizzes or competitions yet.</p>
            ) : (
              assessments.map((a) => {
                const codeObj = assessmentCodes[a.id];
                return (
                  <article key={a.id} className="border-b py-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <strong>{a.title}</strong>
                        <p className="admin-help">{a.assessment_type.replaceAll("_", " ")} · {orgName(a.organisation_id)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={a.is_published ? "admin-btn-light" : "admin-btn-primary"}
                          disabled={saving}
                          onClick={() => void togglePublished(a)}
                        >
                          {a.is_published ? "Unpublish" : "Publish"}
                        </button>
                      </div>
                    </div>

                    <p className="admin-help">
                      {a.question_count} questions · {a.duration_seconds ? Math.round(a.duration_seconds / 60) + " min" : "untimed"} · {a.max_attempts} attempt(s) · results: {a.result_release.replaceAll("_", " ")}
                    </p>

                    {(a.starts_at || a.ends_at) && (
                      <p className="admin-help text-xs">
                        {a.starts_at ? new Date(a.starts_at).toLocaleString() : "No start"} → {a.ends_at ? new Date(a.ends_at).toLocaleString() : "No end"}
                      </p>
                    )}

                    {/* Examination Code Status & Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        {a.access_code_required ? (
                          codeObj ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                              <span>🔑 Code ending in</span>
                              <span className="font-black underline">{codeObj.code_hint}</span>
                              <span className="text-[10px] font-sans font-normal opacity-80">({codeObj.redemption_count}/{codeObj.max_redemptions} used)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 font-bold">
                              ⚠️ Code required but unassigned
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 font-semibold">Open access (No code required)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setModalAssessment(a)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          🔑 {codeObj ? "Manage Code" : "Set Code"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const host = typeof window !== "undefined" ? window.location.origin : "https://www.brainlabacademy.com.ng";
                            copyToClipboard(`${host}/assessments/${a.slug || a.id}`, "Assessment Link");
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          🔗 Copy Link
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Modal for Managing Assessment Code */}
        {modalAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Manage Examination Code
                </h3>
                <button
                  type="button"
                  onClick={() => setModalAssessment(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{modalAssessment.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set a custom code or generate a clean PIN for your students to enter.
                </p>
              </div>

              {assessmentCodes[modalAssessment.id] && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Active Code:</span>
                    <span className="font-black">Ending in ****{assessmentCodes[modalAssessment.id].code_hint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Redemptions:</span>
                    <span>{assessmentCodes[modalAssessment.id].redemption_count} of {assessmentCodes[modalAssessment.id].max_redemptions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Expires:</span>
                    <span>{assessmentCodes[modalAssessment.id].expires_at ? new Date(assessmentCodes[modalAssessment.id].expires_at!).toLocaleDateString() : "Never"}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Set Custom Code (or leave blank to auto-generate)
                  </label>
                  <input
                    className="admin-input uppercase font-mono mt-1"
                    placeholder="e.g. MTH101-MIDTERM"
                    value={modalCustomCode}
                    onChange={(e) => setModalCustomCode(e.target.value.toUpperCase())}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Max Redemptions
                  </label>
                  <input
                    className="admin-input mt-1"
                    type="number"
                    min={1}
                    max={100000}
                    value={modalMaxRedemptions}
                    onChange={(e) => setModalMaxRedemptions(Number(e.target.value) || 500)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  disabled={modalActionLoading}
                  onClick={() => void handleGenerateOrSetCode(modalAssessment, modalCustomCode.trim() || undefined)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {modalActionLoading ? "Processing…" : modalCustomCode.trim() ? "Set Custom Code" : "Generate Clean Code"}
                </button>

                {assessmentCodes[modalAssessment.id] && (
                  <button
                    type="button"
                    disabled={modalActionLoading}
                    onClick={() => void handleRevokeCode(modalAssessment)}
                    className="py-2.5 px-3 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    Revoke Code
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
