"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";

type ContentBlock = {
  id: string;
  lesson_id: string;
  block_type: string;
  content: Record<string, any>;
  order_index: number;
};

type LessonItem = {
  id: string;
  title: string;
};

export default function TutorLessonBlocksPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // New Block Form
  const [blockType, setBlockType] = useState<"text" | "formula" | "code" | "callout" | "quick_check">("text");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockBody, setBlockBody] = useState("");

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?redirect=/tutor/lesson-blocks");
          return;
        }

        const admin = await getAdminSession();
        if (admin) {
          setCurrentUser(admin);
          setIsSuperAdmin(admin.role === "super_admin" || admin.role === "platform_admin");
        }

        const { data: lessonRows } = await supabase
          .from("learning_lessons")
          .select("id,title")
          .order("title", { ascending: true })
          .limit(100);

        if (active && lessonRows && lessonRows.length > 0) {
          setLessons(lessonRows);
          setSelectedLessonId(lessonRows[0].id);
          void loadBlocksForLesson(lessonRows[0].id);
        }
      } catch {}
      finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => { active = false; };
  }, [router]);

  async function loadBlocksForLesson(lessonId: string) {
    if (!lessonId) return;
    try {
      const { data } = await supabase
        .from("learning_content_blocks")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });

      setBlocks((data as ContentBlock[]) || []);
    } catch {}
  }

  async function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLessonId || !blockBody.trim()) return;
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        lesson_id: selectedLessonId,
        block_type: blockType,
        order_index: blocks.length + 1,
        content: {
          title: blockTitle.trim() || undefined,
          text: blockBody.trim(),
        },
      };

      const { data, error } = await supabase.from("learning_content_blocks").insert([payload]).select().single();
      if (error) throw error;

      setMessage("Block inserted into lesson!");
      setBlockTitle("");
      setBlockBody("");
      void loadBlocksForLesson(selectedLessonId);
    } catch (e: any) {
      setMessage(`Failed to add block: ${e?.message || "Database error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBlock(blockId: string) {
    try {
      await supabase.from("learning_content_blocks").delete().eq("id", blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      setMessage("Block removed.");
    } catch {}
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-indigo-200/60 pb-6 dark:border-indigo-950/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-black uppercase text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
              Pedagogy Engine
            </span>
            {isSuperAdmin && (
              <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-black uppercase text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                👑 Super Admin Access
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Lesson Content Blocks
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Build interactive modules by stacking scientific formulas, worked examples, KaTeX proofs, and conceptual callouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedLessonId && (
            <Link
              href={`/tutor/lessons/${selectedLessonId}/builder`}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
            >
              Open Full Studio Builder →
            </Link>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs font-bold text-indigo-800 dark:text-indigo-300">
          {message}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lesson Selector */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Target Lesson ({lessons.length})
          </h3>
          <select
            value={selectedLessonId}
            onChange={(e) => {
              setSelectedLessonId(e.target.value);
              void loadBlocksForLesson(e.target.value);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>

          {/* New Block Creator Form */}
          <form onSubmit={handleAddBlock} className="border-t border-slate-100 pt-4 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Add Content Block</h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Block Type</label>
              <select
                value={blockType}
                onChange={(e) => setBlockType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="text">📖 Core Theory &amp; Narrative</option>
                <option value="formula">📐 KaTeX Scientific Formula</option>
                <option value="callout">💡 Key Exam Tip &amp; Warning</option>
                <option value="quick_check">❓ Conceptual Knowledge Check</option>
                <option value="code">💻 Code / Worked Solution</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Block Header / Title (Optional)</label>
              <input
                type="text"
                value={blockTitle}
                onChange={(e) => setBlockTitle(e.target.value)}
                placeholder="e.g. Henderson-Hasselbalch Equation"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Content Body / LaTeX</label>
              <textarea
                rows={5}
                required
                value={blockBody}
                onChange={(e) => setBlockBody(e.target.value)}
                placeholder="Content text or mathematical formulation…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-indigo-600 p-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              {saving ? "Inserting…" : "Append Block to Lesson"}
            </button>
          </form>
        </div>

        {/* Existing Blocks Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Blocks in Sequence ({blocks.length})
            </h3>
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
              No blocks in this lesson yet. Append a theory or formula block using the form on the left.
            </div>
          ) : (
            blocks.map((b, idx) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Step {idx + 1}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400 capitalize">
                      {b.block_type.replace(/_/g, " ")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDeleteBlock(b.id)}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                  >
                    Delete Block
                  </button>
                </div>

                {b.content?.title && (
                  <h4 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-white">
                    {b.content.title}
                  </h4>
                )}

                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {b.content?.text || JSON.stringify(b.content)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
