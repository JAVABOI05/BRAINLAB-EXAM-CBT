"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { DEFAULT_JAMB_SYLLABUS, type SyllabusSubject, type SyllabusTopic } from "../../lib/curriculumData";

export default function TutorSyllabusPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SyllabusSubject[]>(DEFAULT_JAMB_SYLLABUS);
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState<string>("use-of-english");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states for adding / editing a single topic
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicIdToEdit, setTopicIdToEdit] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicSubtopicsRaw, setTopicSubtopicsRaw] = useState("");
  const [topicObjectivesRaw, setTopicObjectivesRaw] = useState("");

  // Bulk import states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState("");

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?redirect=/tutor/syllabus");
          return;
        }

        const admin = await getAdminSession();
        if (admin) {
          setCurrentUser(admin);
          setIsSuperAdmin(admin.role === "super_admin" || admin.role === "platform_admin");
        }
      } catch {
        // session check
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => { active = false; };
  }, [router]);

  const activeSubject = subjects.find((s) => s.slug === selectedSubjectSlug) || subjects[0];

  const handleOpenAddTopic = () => {
    setIsEditingTopic(true);
    setTopicIdToEdit(null);
    setTopicTitle("");
    setTopicDescription("");
    setTopicSubtopicsRaw("");
    setTopicObjectivesRaw("");
  };

  const handleOpenEditTopic = (topic: SyllabusTopic) => {
    setIsEditingTopic(true);
    setTopicIdToEdit(topic.id);
    setTopicTitle(topic.title);
    setTopicDescription(topic.description);
    setTopicSubtopicsRaw(topic.subtopics.join("\n"));
    setTopicObjectivesRaw(topic.learning_objectives.join("\n"));
  };

  const handleSaveTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;

    const subtopics = topicSubtopicsRaw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const learning_objectives = topicObjectivesRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    setSubjects((prevSubjects) => {
      return prevSubjects.map((subj) => {
        if (subj.slug !== activeSubject.slug) return subj;

        if (topicIdToEdit) {
          // Edit existing topic
          const updatedTopics = subj.topics.map((t) =>
            t.id === topicIdToEdit
              ? {
                  ...t,
                  title: topicTitle.trim(),
                  description: topicDescription.trim(),
                  subtopics,
                  learning_objectives,
                }
              : t
          );
          return { ...subj, topics: updatedTopics };
        } else {
          // Add new topic
          const newTopic: SyllabusTopic = {
            id: `top-${Date.now()}`,
            title: topicTitle.trim(),
            slug: topicTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            description: topicDescription.trim(),
            order_index: subj.topics.length + 1,
            subtopics,
            learning_objectives,
          };
          return { ...subj, topics: [...subj.topics, newTopic] };
        }
      });
    });

    setIsEditingTopic(false);
    setStatusMessage(`Successfully saved topic: ${topicTitle.trim()}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteTopic = (topicId: string) => {
    if (!window.confirm("Are you sure you want to remove this topic from syllabus?")) return;
    setSubjects((prev) =>
      prev.map((s) =>
        s.slug === activeSubject.slug
          ? { ...s, topics: s.topics.filter((t) => t.id !== topicId) }
          : s
      )
    );
    setStatusMessage("Topic removed.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-indigo-200/60 pb-6 dark:border-indigo-950/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-black uppercase text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
              Curriculum Architecture
            </span>
            {isSuperAdmin && (
              <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-black uppercase text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                👑 Super Admin Access
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Curriculum &amp; Syllabus Manager
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Define official Nigerian secondary &amp; JAMB syllabus standards, subtopics, and verifiable learning objectives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddTopic}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            ➕ Add Topic
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          {statusMessage}
        </div>
      )}

      {/* Main Layout: Subjects Sidebar + Topics Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Subject Navigation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-1">
          <h2 className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
            Subjects ({subjects.length})
          </h2>
          {subjects.map((subj) => {
            const isSelected = subj.slug === activeSubject.slug;
            return (
              <button
                key={subj.id}
                type="button"
                onClick={() => {
                  setSelectedSubjectSlug(subj.slug);
                  setIsEditingTopic(false);
                }}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                  isSelected
                    ? "bg-indigo-500/15 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="truncate">{subj.name}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {subj.topics.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Topics & Objectives Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Subject Card */}
          <div className="rounded-2xl border border-indigo-200/50 bg-gradient-to-r from-indigo-50/50 via-white to-white p-6 dark:border-indigo-900/50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Active Syllabus</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{activeSubject.name}</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{activeSubject.description}</p>
              </div>
              <span className="rounded-xl bg-indigo-100 px-3 py-1.5 text-xs font-black text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {activeSubject.topics.length} Topics Configured
              </span>
            </div>
          </div>

          {/* Add / Edit Form Modal */}
          {isEditingTopic && (
            <form
              onSubmit={handleSaveTopic}
              className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-md dark:border-indigo-900 dark:bg-slate-900 space-y-4"
            >
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {topicIdToEdit ? `Edit Topic: ${topicTitle}` : "Add New Syllabus Topic"}
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Topic Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. Chemical Bonding, Simultaneous Linear Equations"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Scope &amp; Description
                </label>
                <textarea
                  rows={2}
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  placeholder="Brief summary of topic scope…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subtopics (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={topicSubtopicsRaw}
                    onChange={(e) => setTopicSubtopicsRaw(e.target.value)}
                    placeholder="Ionic bonding&#10;Covalent bonding&#10;Metallic bonding"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Learning Objectives (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={topicObjectivesRaw}
                    onChange={(e) => setTopicObjectivesRaw(e.target.value)}
                    placeholder="Candidates should be able to:&#10;1. Distinguish electrovalent and covalent compounds&#10;2. Predict bonding shapes"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTopic(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  Save Topic
                </button>
              </div>
            </form>
          )}

          {/* Topics List */}
          <div className="space-y-4">
            {activeSubject.topics.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs font-bold text-slate-500 dark:border-slate-800">
                No syllabus topics added yet for this subject.
              </div>
            ) : (
              activeSubject.topics.map((top, idx) => (
                <div
                  key={top.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          Topic {idx + 1}
                        </span>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{top.title}</h4>
                      </div>
                      {top.description && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{top.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditTopic(top)}
                        className="rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(top.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
                    {/* Subtopics */}
                    <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-950">
                      <h5 className="font-black text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                        Subtopics ({top.subtopics.length})
                      </h5>
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
                        {top.subtopics.map((st, sIdx) => (
                          <li key={sIdx}>{st}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Objectives */}
                    <div className="rounded-xl bg-emerald-50/50 p-3.5 dark:bg-emerald-950/20">
                      <h5 className="font-black text-[10px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2">
                        Learning Objectives ({top.learning_objectives.length})
                      </h5>
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
                        {top.learning_objectives.map((obj, oIdx) => (
                          <li key={oIdx}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
