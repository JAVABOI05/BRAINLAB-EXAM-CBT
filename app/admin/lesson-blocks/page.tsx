"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";

type Lesson = { id: string; title: string; topic_id: string };
type Topic = { id: string; title: string; subject_id: string };
type Subject = { id: string; name: string };
type Block = {
  id: string;
  lesson_id: string;
  block_type: string;
  content: Record<string, unknown>;
  order_index: number;
};

function LessonBlocksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLessonId = searchParams.get("lessonId") || "";

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [blockType, setBlockType] = useState("text");
  const [contentText, setContentText] = useState('{"text":"Write lesson content here"}');
  const [editingBlockId, setEditingBlockId] = useState("");
  const [editingBlockType, setEditingBlockType] = useState("text");
  const [editingContentText, setEditingContentText] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getAuthHeader = async (): Promise<Record<string, string>> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
    } catch {
      return {};
    }
  };

  const load = useCallback(async () => {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/admin/content", {
        headers: { credentials: "omit", ...authHeader },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Unable to load lessons. Verify Learning Hub access.");
        return;
      }
      const nextLessons = (data.lessons ?? []) as Lesson[];
      setLessons(nextLessons);
      setTopics((data.topics ?? []) as Topic[]);
      setSubjects((data.subjects ?? []) as Subject[]);

      setLessonId((current) => {
        if (current) return current;
        if (initialLessonId && nextLessons.some((l) => l.id === initialLessonId)) {
          return initialLessonId;
        }
        return nextLessons[0]?.id || "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error loading lessons.");
    }
  }, [initialLessonId]);

  const loadBlocks = useCallback(async (id: string) => {
    if (!id) {
      setBlocks([]);
      return;
    }
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`/api/admin/content?lesson_id=${encodeURIComponent(id)}`, {
        headers: { credentials: "omit", ...authHeader },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load lesson blocks.");
        setBlocks([]);
        return;
      }
      setBlocks((data.blocks ?? []) as Block[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading blocks.");
    }
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
      const allowed = await adminHasPermission("learning.content.manage");
      if (!active) return;
      if (!allowed || !["super_admin", "platform_admin", "ai_learning_admin"].includes(session.role)) {
        setError("Only Super Admin, Platform Admin, or AI & Learning Admin can manage global lesson blocks.");
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

  useEffect(() => {
    if (lessonId) {
      void loadBlocks(lessonId);
    }
  }, [lessonId, loadBlocks]);

  const lessonLabel = (lesson: Lesson) => {
    const topic = topics.find((x) => x.id === lesson.topic_id);
    const subject = topic ? subjects.find((x) => x.id === topic.subject_id) : null;
    return [subject?.name, topic?.title, lesson.title].filter(Boolean).join(" · ");
  };

  async function addBlock(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!lessonId) return;

    let parsed: Record<string, unknown>;
    try {
      const value: unknown = JSON.parse(contentText);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Content must be a JSON object.");
      }
      parsed = value as Record<string, unknown>;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enter valid JSON.");
      return;
    }

    const mediaUrl = typeof parsed.url === "string" ? parsed.url : typeof parsed.src === "string" ? parsed.src : "";
    if (["image", "voice_note", "short_video", "long_video"].includes(blockType) && !/^https:\/\//i.test(mediaUrl)) {
      setError("Media blocks need an HTTPS url or src field in the JSON content.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          type: "block",
          lesson_id: lessonId,
          block_type: blockType,
          content: parsed,
          order_index: blocks.length,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not add block.");
      }

      setMessage("Lesson block added successfully.");
      await loadBlocks(lessonId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving block.");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(block: Block) {
    setEditingBlockId(block.id);
    setEditingBlockType(block.block_type);
    setEditingContentText(JSON.stringify(block.content, null, 2));
    setError("");
    setMessage("");
  }

  async function saveBlockEdit(block: Block) {
    let parsed: Record<string, unknown>;
    try {
      const value: unknown = JSON.parse(editingContentText);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Content must be a JSON object.");
      }
      parsed = value as Record<string, unknown>;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enter valid JSON.");
      return;
    }

    const mediaUrl = typeof parsed.url === "string" ? parsed.url : typeof parsed.src === "string" ? parsed.src : "";
    if (["image", "voice_note", "short_video", "long_video"].includes(editingBlockType) && !/^https:\/\//i.test(mediaUrl)) {
      setError("Media blocks need an HTTPS url or src field in the JSON content.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          type: "block",
          id: block.id,
          updates: {
            block_type: editingBlockType,
            content: parsed,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not update block.");
      }

      setMessage("Lesson block updated.");
      setEditingBlockId("");
      await loadBlocks(lessonId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating block.");
    } finally {
      setSaving(false);
    }
  }

  async function moveBlock(block: Block, index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    const target = blocks[targetIndex];
    if (!target || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const authHeader = await getAuthHeader();
      await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          type: "block",
          id: block.id,
          updates: { order_index: target.order_index },
        }),
      });

      await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          type: "block",
          id: target.id,
          updates: { order_index: block.order_index },
        }),
      });

      setMessage("Lesson content order updated.");
      await loadBlocks(lessonId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder blocks.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(block: Block) {
    if (!window.confirm("Delete this lesson block?")) return;
    setSaving(true);
    setError("");

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`/api/admin/content?type=block&id=${encodeURIComponent(block.id)}`, {
        method: "DELETE",
        headers: { ...authHeader },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not delete block.");
      }
      setMessage("Lesson block deleted.");
      await loadBlocks(lessonId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete block.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card">Loading lesson blocks…</section>
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
              <div className="admin-badge">BrainLab Academy · Content administration</div>
              <h1 className="admin-title">Lesson Block Editor</h1>
              <p className="admin-subtitle">
                Build lesson bodies from text, images, audio, video, and inline practice. Content is stored as structured JSON and protected by database permissions.
              </p>
              {admin && (
                <div className="admin-user-chip">
                  {admin.email} · {admin.role.replaceAll("_", " ")}
                </div>
              )}
            </div>
            <div className="admin-actions">
              <button className="admin-btn-light" onClick={() => router.push("/admin/content")}>
                Content manager
              </button>
              <button className="admin-btn-light" onClick={() => router.push("/admin/dashboard")}>
                Dashboard
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="admin-message" role="alert" style={{ backgroundColor: "#fee2e2", color: "#991b1b", borderColor: "#f87171" }}>
            {error}
          </div>
        )}
        {message && (
          <div className="admin-message" role="status" style={{ backgroundColor: "#ecfdf5", color: "#065f46", borderColor: "#34d399" }}>
            {message}
          </div>
        )}

        <section className="admin-section admin-grid-2">
          <form className="admin-card" onSubmit={addBlock}>
            <h2 className="admin-card-title">Add a block</h2>
            <label className="admin-label">Lesson</label>
            <select
              className="admin-input"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              required
            >
              <option value="">Choose lesson</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {lessonLabel(l)}
                </option>
              ))}
            </select>
            <label className="admin-label">Block type</label>
            <select
              className="admin-input"
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
            >
              {["text", "image", "voice_note", "short_video", "long_video", "inline_mcq"].map((x) => (
                <option key={x} value={x}>
                  {x.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <label className="admin-label">Block content JSON</label>
            <textarea
              className="admin-input font-mono text-sm"
              rows={9}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              required
            />
            <p className="admin-help">
              Text example: {`{ "text": "Explanation..." }`} · Media example: {`{ "url": "https://...", "alt": "Diagram description" }`}
            </p>
            <button className="admin-btn-primary" disabled={saving || !lessonId}>
              {saving ? "Saving…" : "Add lesson block"}
            </button>
          </form>

          <div className="admin-card">
            <h2 className="admin-card-title">Lesson content order</h2>
            {blocks.length === 0 ? (
              <p className="admin-help">No blocks yet. Add content before publishing this lesson.</p>
            ) : (
              blocks.map((b, index) => (
                <article key={b.id} className="border-b py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>
                      {index + 1}. {b.block_type.replaceAll("_", " ")}
                    </strong>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-btn-light"
                        disabled={saving || index === 0}
                        onClick={() => void moveBlock(b, index, -1)}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        className="admin-btn-light"
                        disabled={saving || index === blocks.length - 1}
                        onClick={() => void moveBlock(b, index, 1)}
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        className="admin-btn-light"
                        disabled={saving}
                        onClick={() => beginEdit(b)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn-light text-red-600 hover:bg-red-50"
                        disabled={saving}
                        onClick={() => void removeBlock(b)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {editingBlockId === b.id ? (
                    <div className="mt-3 space-y-3">
                      <label className="admin-label">Block type</label>
                      <select
                        className="admin-input"
                        value={editingBlockType}
                        onChange={(e) => setEditingBlockType(e.target.value)}
                      >
                        {["text", "image", "voice_note", "short_video", "long_video", "inline_mcq"].map((x) => (
                          <option key={x} value={x}>
                            {x.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                      <label className="admin-label">Block content JSON</label>
                      <textarea
                        className="admin-input font-mono text-sm"
                        rows={8}
                        value={editingContentText}
                        onChange={(e) => setEditingContentText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="admin-btn-primary"
                          disabled={saving}
                          onClick={() => void saveBlockEdit(b)}
                        >
                          {saving ? "Saving…" : "Save changes"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-light"
                          onClick={() => setEditingBlockId("")}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <pre className="mt-2 overflow-auto rounded bg-slate-50 p-3 text-xs">
                      {JSON.stringify(b.content, null, 2)}
                    </pre>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LessonBlocksAdminPage() {
  return (
    <Suspense
      fallback={
        <main className="admin-page">
          <div className="admin-container">
            <section className="admin-card">Loading lesson blocks…</section>
          </div>
        </main>
      }
    >
      <LessonBlocksContent />
    </Suspense>
  );
}
