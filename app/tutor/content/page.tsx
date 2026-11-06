"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";

type Subject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  order_index: number;
};

type Topic = {
  id: string;
  subject_id: string;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  order_index: number;
};

type Lesson = {
  id: string;
  topic_id: string;
  title: string;
  summary: string | null;
  is_published: boolean;
  order_index: number;
  estimated_duration_mins: number;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function TutorContentPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Create subject inputs
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDesc, setNewSubjectDesc] = useState("");

  // Create topic inputs
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");

  // Create lesson inputs
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState(25);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subjRes, topicRes, lessonRes] = await Promise.all([
        supabase.from("learning_subjects").select("*").order("order_index", { ascending: true }),
        supabase.from("learning_topics").select("*").order("order_index", { ascending: true }),
        supabase.from("learning_lessons").select("*").order("order_index", { ascending: true }),
      ]);

      if (subjRes.data) {
        setSubjects(subjRes.data);
        if (subjRes.data.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(subjRes.data[0].id);
        }
      }
      if (topicRes.data) setTopics(topicRes.data);
      if (lessonRes.data) setLessons(lessonRes.data);
    } catch {
      setError("Failed to load curriculum content.");
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?redirect=/tutor/content");
          return;
        }

        const admin = await getAdminSession();
        if (admin) {
          setCurrentUser(admin);
          setIsSuperAdmin(admin.role === "super_admin" || admin.role === "platform_admin");
        }
        await loadData();
      } catch {}
    }
    void init();
    return () => { active = false; };
  }, [router, loadData]);

  // Create subject
  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const slug = slugify(newSubjectName);
      const { data, error: err } = await supabase.from("learning_subjects").insert([
        {
          name: newSubjectName.trim(),
          slug,
          description: newSubjectDesc.trim() || null,
          is_published: true,
          order_index: subjects.length + 1,
        },
      ]).select().single();

      if (err) throw err;
      setMessage(`Subject "${newSubjectName}" created successfully!`);
      setNewSubjectName("");
      setNewSubjectDesc("");
      setSelectedSubjectId(data.id);
      void loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to create subject.");
    } finally {
      setSaving(false);
    }
  }

  // Create topic
  async function handleCreateTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubjectId || !newTopicTitle.trim()) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const slug = slugify(newTopicTitle);
      const subjectTopics = topics.filter((t) => t.subject_id === selectedSubjectId);
      const { data, error: err } = await supabase.from("learning_topics").insert([
        {
          subject_id: selectedSubjectId,
          title: newTopicTitle.trim(),
          slug,
          description: newTopicDesc.trim() || null,
          is_published: true,
          order_index: subjectTopics.length + 1,
        },
      ]).select().single();

      if (err) throw err;
      setMessage(`Topic "${newTopicTitle}" created!`);
      setNewTopicTitle("");
      setNewTopicDesc("");
      setSelectedTopicId(data.id);
      void loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to create topic.");
    } finally {
      setSaving(false);
    }
  }

  // Create lesson
  async function handleCreateLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTopicId || !newLessonTitle.trim()) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const topicLessons = lessons.filter((l) => l.topic_id === selectedTopicId);
      const { data, error: err } = await supabase.from("learning_lessons").insert([
        {
          topic_id: selectedTopicId,
          title: newLessonTitle.trim(),
          summary: null,
          is_published: true,
          estimated_duration_mins: Number(newLessonDuration) || 25,
          order_index: topicLessons.length + 1,
        },
      ]).select().single();

      if (err) throw err;
      setMessage(`Lesson "${newLessonTitle}" added!`);
      setNewLessonTitle("");
      void loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to add lesson.");
    } finally {
      setSaving(false);
    }
  }

  // Filtered lists
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const activeTopics = topics.filter((t) => t.subject_id === selectedSubjectId);
  const currentTopic = activeTopics.find((t) => t.id === selectedTopicId) || activeTopics[0];
  const activeLessons = lessons.filter((l) => l.topic_id === (currentTopic?.id ?? ""));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-indigo-200/60 pb-6 dark:border-indigo-950/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-black uppercase text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
              Content Architecture
            </span>
            {isSuperAdmin && (
              <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-black uppercase text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                👑 Super Admin Access
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Lessons &amp; Content Hierarchy
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Structure your course material: Subjects → Topics → Interactive Lessons and Assessments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/classroom/studio"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            🎬 Launch Lesson Studio
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-800 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* 3-Column Hierarchy Explorer */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Subjects */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
              1. Subjects ({subjects.length})
            </h2>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto">
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSubjectId(s.id);
                  const firstT = topics.find((t) => t.subject_id === s.id);
                  if (firstT) setSelectedTopicId(firstT.id);
                }}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                  s.id === selectedSubjectId
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="truncate">{s.name}</span>
                <span className="text-[10px] opacity-75">{s.is_published ? "●" : "○"}</span>
              </button>
            ))}
          </div>

          {/* New Subject Form */}
          <form onSubmit={handleCreateSubject} className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-2">
            <input
              type="text"
              required
              placeholder="New subject name…"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950"
            >
              + Create Subject
            </button>
          </form>
        </div>

        {/* Column 2: Topics in Selected Subject */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
              2. Topics ({activeTopics.length})
            </h2>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-[120px]">
              {currentSubject?.name}
            </span>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto">
            {activeTopics.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No topics in this subject yet.</p>
            ) : (
              activeTopics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTopicId(t.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                    t.id === (currentTopic?.id ?? "")
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] opacity-75">{t.is_published ? "●" : "○"}</span>
                </button>
              ))
            )}
          </div>

          {/* New Topic Form */}
          {selectedSubjectId && (
            <form onSubmit={handleCreateTopic} className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-2">
              <input
                type="text"
                required
                placeholder="New topic title…"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950"
              >
                + Add Topic to Subject
              </button>
            </form>
          )}
        </div>

        {/* Column 3: Lessons in Selected Topic */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
              3. Lessons ({activeLessons.length})
            </h2>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-[120px]">
              {currentTopic?.title}
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activeLessons.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No lessons created in this topic.</p>
            ) : (
              activeLessons.map((l) => (
                <div
                  key={l.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950 flex items-center justify-between gap-2"
                >
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white truncate max-w-[150px]">
                      {l.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">⏱️ {l.estimated_duration_mins} mins</span>
                  </div>

                  <Link
                    href={`/tutor/lessons/${l.id}/builder`}
                    className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                  >
                    Builder →
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* New Lesson Form */}
          {currentTopic && (
            <form onSubmit={handleCreateLesson} className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-2">
              <input
                type="text"
                required
                placeholder="New lesson title…"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                + Add Lesson to Topic
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
