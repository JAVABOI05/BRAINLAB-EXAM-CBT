"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";

type Subject = { id: string; name: string; slug: string; description: string | null; is_published: boolean; order_index: number };
type Topic = { id: string; subject_id: string; title: string; slug: string; description: string | null; is_published: boolean; order_index: number };
type Lesson = { id: string; topic_id: string; title: string; summary: string | null; is_published: boolean; order_index: number; estimated_duration_mins: number };
const slugify = (value: string) => value.toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminContentPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [topicSubjectId, setTopicSubjectId] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [lessonTopicId, setLessonTopicId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonMinutes, setLessonMinutes] = useState(5);

  const loadContent = useCallback(async () => {
    setError("");
    const [s, t, l] = await Promise.all([
      supabase.from("learning_subjects").select("id,name,slug,description,is_published,order_index").order("order_index").order("name"),
      supabase.from("learning_topics").select("id,subject_id,title,slug,description,is_published,order_index").order("order_index").order("title"),
      supabase.from("learning_lessons").select("id,topic_id,title,summary,is_published,order_index,estimated_duration_mins").order("order_index").order("title"),
    ]);
    if (s.error || t.error || l.error) {
      setError("Could not load content. Confirm the Learning Hub migration is installed and your administrator role has access.");
      setSubjects([]); setTopics([]); setLessons([]);
      return;
    }
    const nextSubjects = (s.data ?? []) as Subject[];
    const nextTopics = (t.data ?? []) as Topic[];
    setSubjects(nextSubjects); setTopics(nextTopics); setLessons((l.data ?? []) as Lesson[]);
    setTopicSubjectId((v) => v || nextSubjects[0]?.id || "");
    setLessonTopicId((v) => v || nextTopics[0]?.id || "");
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) { router.replace("/account"); return; }
      const allowed = await adminHasPermission("learning.content.manage");
      if (!active) return;
      setAdmin(session);
      if (!allowed || !["super_admin", "platform_admin", "ai_learning_admin"].includes(session.role)) {
        setError("This workspace requires Super Admin, Platform Admin, or AI & Learning Admin. Teacher permissions remain scoped to assigned subjects.");
        setLoading(false); return;
      }
      await loadContent();
      if (active) setLoading(false);
    }
    void init().catch(() => { if (active) { setError("Could not verify administrator session."); setLoading(false); } });
    return () => { active = false; };
  }, [router, loadContent]);

  async function createRecord(table: "learning_subjects" | "learning_topics" | "learning_lessons", values: Record<string, unknown>) {
    setSaving(true); setError(""); setMessage("");
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Your administrator session expired. Sign in again.");
      const { error: insertError } = await supabase.from(table).insert({ ...values, created_by: data.user.id, is_published: false });
      if (insertError) throw insertError;
      setMessage("Draft created. Review it before publishing.");
      await loadContent();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save this item."); }
    finally { setSaving(false); }
  }

  async function togglePublished(table: "learning_subjects" | "learning_topics" | "learning_lessons", id: string, current: boolean) {
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from(table).update({ is_published: !current }).eq("id", id);
    if (updateError) setError(updateError.message);
    else { setMessage(current ? "Item unpublished." : "Item published."); await loadContent(); }
    setSaving(false);
  }

  const subjectNameFor = (id: string) => subjects.find((s) => s.id === id)?.name ?? "Unknown subject";
  const topicNameFor = (id: string) => topics.find((t) => t.id === id)?.title ?? "Unknown topic";

  if (loading) return <main className="admin-page"><div className="admin-container"><section className="admin-card">Loading Learning Hub administration…</section></div></main>;

  return <main className="admin-page"><div className="admin-container">
    <section className="admin-hero"><div className="admin-hero-top"><div>
      <div className="admin-badge">BrainLab Academy · Content administration</div>
      <h1 className="admin-title">Learning Hub Manager</h1>
      <p className="admin-subtitle">Create subjects, organise topics, build lesson shells, and control what learners can see. New records start unpublished.</p>
      {admin && <div className="admin-user-chip">Signed in as <strong>{admin.email}</strong> · {admin.role.replaceAll("_", " ")}</div>}
    </div><div className="admin-actions"><button className="admin-btn-light" onClick={() => router.push("/admin/dashboard")}>Dashboard</button><button className="admin-btn-light" onClick={() => router.push("/admin/users")}>Admin roles</button><button className="admin-btn-light" onClick={() => router.push("/admin/lesson-blocks")}>Lesson blocks</button><button className="admin-btn-light" onClick={() => router.push("/admin/academy-assessments")}>Assessments</button></div></div></section>
    {error && <div className="admin-message" role="alert">{error}</div>}{message && <div className="admin-message" role="status">{message}</div>}
    <section className="admin-section admin-stats">{[["Subjects", subjects.length], ["Topics", topics.length], ["Lessons", lessons.length], ["Published lessons", lessons.filter((x) => x.is_published).length]].map(([label, value]) => <div className="admin-stat-card" key={String(label)}><p className="admin-stat-label">{label}</p><p className="admin-stat-value">{value}</p></div>)}</section>
    <section className="admin-section admin-grid-2">
      <form className="admin-card" onSubmit={(e) => { e.preventDefault(); if (!subjectName.trim()) return; void createRecord("learning_subjects", { name: subjectName.trim(), slug: slugify(subjectName), description: subjectDescription.trim() || null }); setSubjectName(""); setSubjectDescription(""); }}>
        <h2 className="admin-card-title">Create subject</h2><label className="admin-label">Subject name</label><input className="admin-input" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} maxLength={255} required placeholder="e.g. Mathematics" />
        <label className="admin-label">Description</label><textarea className="admin-input" value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)} rows={3} />
        <p className="admin-help">Slug: {slugify(subjectName) || "subject-slug"} (must be unique)</p><button className="admin-btn-primary" disabled={saving || !subjectName.trim()}>Create draft subject</button>
      </form>
      <form className="admin-card" onSubmit={(e) => { e.preventDefault(); if (!topicSubjectId || !topicTitle.trim()) return; void createRecord("learning_topics", { subject_id: topicSubjectId, title: topicTitle.trim(), slug: slugify(topicTitle), description: topicDescription.trim() || null }); setTopicTitle(""); setTopicDescription(""); }}>
        <h2 className="admin-card-title">Create topic</h2><label className="admin-label">Parent subject</label><select className="admin-input" value={topicSubjectId} onChange={(e) => setTopicSubjectId(e.target.value)} required><option value="">Choose subject</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <label className="admin-label">Topic title</label><input className="admin-input" value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} maxLength={255} required placeholder="e.g. Fractions" />
        <label className="admin-label">Description</label><textarea className="admin-input" value={topicDescription} onChange={(e) => setTopicDescription(e.target.value)} rows={3} /><p className="admin-help">Slug: {slugify(topicTitle) || "topic-slug"} (unique within subject)</p>
        <button className="admin-btn-primary" disabled={saving || !topicSubjectId || !topicTitle.trim()}>Create draft topic</button>
      </form>
      <form className="admin-card" onSubmit={(e) => { e.preventDefault(); if (!lessonTopicId || !lessonTitle.trim()) return; void createRecord("learning_lessons", { topic_id: lessonTopicId, title: lessonTitle.trim(), summary: lessonSummary.trim() || null, estimated_duration_mins: Math.min(600, Math.max(1, lessonMinutes)) }); setLessonTitle(""); setLessonSummary(""); setLessonMinutes(5); }}>
        <h2 className="admin-card-title">Create lesson</h2><label className="admin-label">Parent topic</label><select className="admin-input" value={lessonTopicId} onChange={(e) => setLessonTopicId(e.target.value)} required><option value="">Choose topic</option>{topics.map((t) => <option key={t.id} value={t.id}>{subjectNameFor(t.subject_id)} · {t.title}</option>)}</select>
        <label className="admin-label">Lesson title</label><input className="admin-input" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} maxLength={255} required placeholder="e.g. Understanding fractions" />
        <label className="admin-label">Summary</label><textarea className="admin-input" value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} rows={3} />
        <label className="admin-label">Estimated duration (minutes)</label><input className="admin-input" type="number" min={1} max={600} value={lessonMinutes} onChange={(e) => setLessonMinutes(Number(e.target.value) || 5)} />
        <button className="admin-btn-primary" disabled={saving || !lessonTopicId || !lessonTitle.trim()}>Create draft lesson</button>
      </form>
    </section>
    <section className="admin-section admin-card"><h2 className="admin-card-title">Publishing controls</h2><p className="admin-card-text">A published lesson is visible only when its parent topic and subject are also published. Add lesson blocks before publishing lesson content.</p>
      <div className="space-y-6 mt-6"><div><h3 className="font-semibold mb-3">Subjects</h3>{subjects.length === 0 ? <p className="admin-help">No subjects yet.</p> : subjects.map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><strong>{s.name}</strong><p className="admin-help">{s.slug} · {topics.filter((t) => t.subject_id === s.id).length} topics</p></div><button type="button" className={s.is_published ? "admin-btn-light" : "admin-btn-primary"} disabled={saving} onClick={() => void togglePublished("learning_subjects", s.id, s.is_published)}>{s.is_published ? "Unpublish" : "Publish"}</button></div>)}</div>
      <div><h3 className="font-semibold mb-3">Topics</h3>{topics.length === 0 ? <p className="admin-help">No topics yet.</p> : topics.map((t) => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><strong>{t.title}</strong><p className="admin-help">{subjectNameFor(t.subject_id)} · {t.slug} · {lessons.filter((l) => l.topic_id === t.id).length} lessons</p></div><button type="button" className={t.is_published ? "admin-btn-light" : "admin-btn-primary"} disabled={saving} onClick={() => void togglePublished("learning_topics", t.id, t.is_published)}>{t.is_published ? "Unpublish" : "Publish"}</button></div>)}</div>
      <div><h3 className="font-semibold mb-3">Lessons</h3>{lessons.length === 0 ? <p className="admin-help">No lessons yet.</p> : lessons.map((l) => <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><strong>{l.title}</strong><p className="admin-help">{topicNameFor(l.topic_id)} · {l.estimated_duration_mins} min · {l.summary || "No summary"}</p></div><button type="button" className={l.is_published ? "admin-btn-light" : "admin-btn-primary"} disabled={saving} onClick={() => void togglePublished("learning_lessons", l.id, l.is_published)}>{l.is_published ? "Unpublish" : "Publish"}</button></div>)}</div></div>
    </section>
  </div></main>;
}
