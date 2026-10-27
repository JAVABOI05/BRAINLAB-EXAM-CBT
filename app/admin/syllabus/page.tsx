"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { DEFAULT_JAMB_SYLLABUS, type SyllabusSubject, type SyllabusTopic } from "../../lib/curriculumData";
import AdminRouteWorkspace from "../AdminRouteWorkspace";

export default function AdminSyllabusPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
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
  const [bulkParsedCount, setBulkParsedCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) {
        router.replace("/admin/login");
        return;
      }
      setAdmin(session);
      setLoading(false);
    }
    void init();
    return () => {
      active = false;
    };
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
    if (!confirm("Are you sure you want to remove this topic from the curriculum?")) return;

    setSubjects((prev) =>
      prev.map((s) => {
        if (s.slug !== activeSubject.slug) return s;
        return {
          ...s,
          topics: s.topics.filter((t) => t.id !== topicId),
        };
      })
    );
    setStatusMessage("Topic removed from curriculum.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Bulk import parser: parses sections like
  // Topic: Name
  // Subtopics: a, b, c
  // Objectives: x, y
  // ---
  const handleParseAndImportBulk = () => {
    if (!bulkText.trim()) return;

    const blocks = bulkText.split(/---+/).map((b) => b.trim()).filter(Boolean);
    const parsedTopics: SyllabusTopic[] = [];

    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      let title = "";
      let desc = "";
      const subtopics: string[] = [];
      const objectives: string[] = [];

      for (const line of lines) {
        if (/^topic:\s*/i.test(line)) {
          title = line.replace(/^topic:\s*/i, "").trim();
        } else if (/^subtopics:\s*/i.test(line)) {
          const raw = line.replace(/^subtopics:\s*/i, "");
          raw.split(/[,;]/).forEach((st) => {
            const clean = st.trim();
            if (clean) subtopics.push(clean);
          });
        } else if (/^objectives:\s*/i.test(line)) {
          const raw = line.replace(/^objectives:\s*/i, "");
          raw.split(/[,;]/).forEach((ob) => {
            const clean = ob.trim();
            if (clean) objectives.push(clean);
          });
        } else if (/^desc:\s*/i.test(line) || /^description:\s*/i.test(line)) {
          desc = line.replace(/^(desc|description):\s*/i, "").trim();
        } else if (title && !desc) {
          desc = line;
        }
      }

      if (title) {
        parsedTopics.push({
          id: `imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: desc || `Detailed curriculum module on ${title}.`,
          order_index: parsedTopics.length + 1,
          subtopics: subtopics.length > 0 ? subtopics : ["Introduction and definitions", "Core principles", "Solved examples"],
          learning_objectives: objectives.length > 0 ? objectives : [`Understand key principles of ${title}`, `Solve examination questions on this topic`],
        });
      }
    }

    if (parsedTopics.length === 0) {
      alert("No valid topics could be parsed. Please verify the format (e.g. Topic: ..., Subtopics: ...).");
      return;
    }

    setSubjects((prev) =>
      prev.map((s) => {
        if (s.slug !== activeSubject.slug) return s;
        return {
          ...s,
          topics: [...s.topics, ...parsedTopics],
        };
      })
    );

    setShowBulkModal(false);
    setBulkText("");
    setStatusMessage(`Successfully imported ${parsedTopics.length} new topics into ${activeSubject.name}!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white font-bold text-sm">
        Authenticating curriculum workspace…
      </div>
    );
  }

  return (
    <AdminRouteWorkspace>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-900 dark:text-cyan-400">
              Curriculum &amp; Syllabus Manager
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
              Syllabus &amp; Curriculum Studio
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage official exam syllabuses, subtopic units, learning targets, and link topics directly to Live Masterclasses and the Learning Hub.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/syllabus"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <span>Preview Candidate View</span>
              <span aria-hidden="true">↗</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 px-3.5 py-2 text-xs font-bold text-blue-900 dark:text-cyan-300 hover:bg-blue-100 transition"
            >
              <span>Bulk Import Syllabus</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddTopic}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#012153] hover:bg-blue-900 px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95"
            >
              <span>+ Add Topic</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
            {statusMessage}
          </div>
        )}

        {/* Subject Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {subjects.map((subj) => (
            <button
              key={subj.slug}
              type="button"
              onClick={() => {
                setSelectedSubjectSlug(subj.slug);
                setIsEditingTopic(false);
              }}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition ${
                selectedSubjectSlug === subj.slug
                  ? "bg-[#012153] text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{subj.name}</span>
              <span className="ml-2 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px]">
                {subj.topics.length}
              </span>
            </button>
          ))}
        </div>

        {/* Active Subject Curriculum Overview */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {activeSubject.category} Track
              </span>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">
                {activeSubject.name} Curriculum Modules
              </h2>
            </div>

            <div className="text-xs text-slate-500">
              Total Topics in Syllabus: <strong className="text-slate-900 dark:text-white">{activeSubject.topics.length}</strong>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {activeSubject.syllabus_overview}
          </p>
        </div>

        {/* Topic Editor / Creation Form */}
        {isEditingTopic && (
          <form
            onSubmit={handleSaveTopic}
            className="rounded-3xl border-2 border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-900 pb-3">
              <h3 className="text-sm font-black text-blue-950 dark:text-cyan-300">
                {topicIdToEdit ? "Edit Curriculum Topic" : "Add New Topic to Curriculum"}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingTopic(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Topic Title *
                </label>
                <input
                  type="text"
                  required
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. Wave Optics & Interference"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Topic Description / Summary
                </label>
                <input
                  type="text"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  placeholder="e.g. Young's double slit experiment, diffraction gratings, and optical formulas"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Subtopics / Content Units (One per line or comma-separated)
                </label>
                <textarea
                  rows={4}
                  value={topicSubtopicsRaw}
                  onChange={(e) => setTopicSubtopicsRaw(e.target.value)}
                  placeholder="Wave equation (v = fλ)&#10;Reflection and Refraction&#10;Interference patterns"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Specific Learning Objectives (One per line)
                </label>
                <textarea
                  rows={4}
                  value={topicObjectivesRaw}
                  onChange={(e) => setTopicObjectivesRaw(e.target.value)}
                  placeholder="State the conditions for constructive interference&#10;Calculate fringe separation using formula"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingTopic(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-black text-white shadow-sm"
              >
                {topicIdToEdit ? "Update Topic" : "Save to Curriculum"}
              </button>
            </div>
          </form>
        )}

        {/* Topics List Table / Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Curriculum Topics ({activeSubject.topics.length})
            </h3>
            <span className="text-xs text-slate-400">Synced to Candidate Syllabus &amp; Live Studio</span>
          </div>

          <div className="grid gap-3">
            {activeSubject.topics.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:border-blue-300 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40 text-xs font-black text-blue-900 dark:text-cyan-300 shrink-0">
                      {t.order_index}
                    </span>
                    <h4 className="text-sm font-black text-slate-950 dark:text-white">
                      {t.title}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t.description}
                  </p>

                  {/* Subtopics chips */}
                  {t.subtopics.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400">Subtopics:</span>
                      {t.subtopics.map((st, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Objectives summary */}
                  {t.learning_objectives.length > 0 && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                      <span>✓ {t.learning_objectives.length} Learning Objectives defined</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => handleOpenEditTopic(t)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTopic(t.id)}
                    className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bulk Import Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-cyan-300">
                  Bulk Import Syllabus Topics: {activeSubject.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Paste syllabus text separated by <code>---</code>. You can paste directly from official JAMB curriculum documents or typed outlines.
              </p>

              <div className="rounded-xl bg-slate-950 p-3 text-[11px] font-mono text-slate-400 space-y-0.5">
                <p className="text-slate-300 font-bold">Supported Format Example:</p>
                <p>Topic: Wave Motion &amp; Sound</p>
                <p>Subtopics: Transverse waves, Longitudinal waves, Resonance, Echoes</p>
                <p>Objectives: Calculate wave speed, Describe musical notes</p>
                <p>---</p>
                <p>Topic: Thermal Expansivity</p>
                <p>Subtopics: Linear, Superficial and Cubical expansivity</p>
              </div>

              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Topic: ...&#10;Subtopics: ...&#10;Objectives: ...&#10;---&#10;Topic: ..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParseAndImportBulk}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 px-5 py-2 text-xs font-black text-slate-950 shadow-md"
                >
                  Parse &amp; Import Into Curriculum →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRouteWorkspace>
  );
}
