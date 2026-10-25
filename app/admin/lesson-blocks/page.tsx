"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";

type Lesson = { id: string; title: string; topic_id: string };
type Topic = { id: string; title: string; subject_id: string };
type Subject = { id: string; name: string };
type Block = { id: string; lesson_id: string; block_type: string; content: Record<string, unknown>; order_index: number };

export default function LessonBlocksAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [lessonId, setLessonId] = useState("");
  const [blockType, setBlockType] = useState("text");
  const [contentText, setContentText] = useState('{"text":"Write lesson content here"}');
  const [editingBlockId, setEditingBlockId] = useState("");
  const [editingBlockType, setEditingBlockType] = useState("text");
  const [editingContentText, setEditingContentText] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [l,t,s] = await Promise.all([
      supabase.from("learning_lessons").select("id,title,topic_id").order("title"),
      supabase.from("learning_topics").select("id,title,subject_id").order("title"),
      supabase.from("learning_subjects").select("id,name").order("name"),
    ]);
    if (l.error || t.error || s.error) { setError("Unable to load lessons. Verify Learning Hub access."); return; }
    const nextLessons = (l.data ?? []) as Lesson[];
    setLessons(nextLessons); setTopics((t.data ?? []) as Topic[]); setSubjects((s.data ?? []) as Subject[]);
    setLessonId((current) => current || nextLessons[0]?.id || "");
  }, []);

  const fetchBlocks = useCallback(async (id: string): Promise<Block[]> => {
    if (!id) return [];
    const { data, error: blockError } = await supabase.from("learning_lesson_blocks")
      .select("id,lesson_id,block_type,content,order_index").eq("lesson_id", id).order("order_index");
    if (blockError) throw blockError;
    return (data ?? []) as Block[];
  }, []);

  const loadBlocks = useCallback(async (id: string) => {
    try {
      setBlocks(await fetchBlocks(id));
    } catch {
      setError("Could not load lesson blocks.");
      setBlocks([]);
    }
  }, [fetchBlocks]);

  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) { router.replace("/account"); return; }
      setAdmin(session);
      const allowed = await adminHasPermission("learning.content.manage");
      if (!active) return;
      if (!allowed || !["super_admin","platform_admin","ai_learning_admin"].includes(session.role)) {
        setError("Only Super Admin, Platform Admin, or AI & Learning Admin can manage global lesson blocks.");
        setLoading(false); return;
      }
      await load();
      if (active) setLoading(false);
    }
    void init().catch(() => { if (active) { setError("Could not verify administrator access."); setLoading(false); } });
    return () => { active = false; };
  }, [router, load]);

  useEffect(() => {
    let active = true;
    async function refreshBlocks() {
      try {
        const nextBlocks = await fetchBlocks(lessonId);
        if (active) setBlocks(nextBlocks);
      } catch {
        if (active) {
          setError("Could not load lesson blocks.");
          setBlocks([]);
        }
      }
    }
    void refreshBlocks();
    return () => { active = false; };
  }, [lessonId, fetchBlocks]);

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
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Content must be a JSON object.");
      parsed = value as Record<string, unknown>;
    } catch (e) { setError(e instanceof Error ? e.message : "Enter valid JSON."); return; }
    const mediaUrl = typeof parsed.url === "string" ? parsed.url : typeof parsed.src === "string" ? parsed.src : "";
    if (["image","voice_note","short_video","long_video"].includes(blockType) && !/^https:\/\//i.test(mediaUrl)) {
      setError("Media blocks need an HTTPS url or src field in the JSON content."); return;
    }
    setSaving(true); setError(""); setMessage("");
    const { error: insertError } = await supabase.from("learning_lesson_blocks").insert({
      lesson_id: lessonId, block_type: blockType, content: parsed, order_index: blocks.length,
    });
    if (insertError) setError(insertError.message);
    else { setMessage("Lesson block added."); await loadBlocks(lessonId); }
    setSaving(false);
  }

  function beginEdit(block: Block) {
    setEditingBlockId(block.id);
    setEditingBlockType(block.block_type);
    setEditingContentText(JSON.stringify(block.content, null, 2));
    setError(""); setMessage("");
  }

  async function saveBlockEdit(block: Block) {
    let parsed: Record<string, unknown>;
    try {
      const value: unknown = JSON.parse(editingContentText);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Content must be a JSON object.");
      parsed = value as Record<string, unknown>;
    } catch (e) { setError(e instanceof Error ? e.message : "Enter valid JSON."); return; }
    const mediaUrl = typeof parsed.url === "string" ? parsed.url : typeof parsed.src === "string" ? parsed.src : "";
    if (["image","voice_note","short_video","long_video"].includes(editingBlockType) && !/^https:\/\//i.test(mediaUrl)) {
      setError("Media blocks need an HTTPS url or src field in the JSON content."); return;
    }
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from("learning_lesson_blocks")
      .update({ block_type: editingBlockType, content: parsed }).eq("id", block.id);
    if (updateError) setError(updateError.message);
    else { setMessage("Lesson block updated."); setEditingBlockId(""); await loadBlocks(lessonId); }
    setSaving(false);
  }

  async function moveBlock(block: Block, index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    const target = blocks[targetIndex];
    if (!target || saving) return;
    setSaving(true); setError(""); setMessage("");
    const first = await supabase.from("learning_lesson_blocks").update({ order_index: target.order_index }).eq("id", block.id);
    const second = first.error ? null : await supabase.from("learning_lesson_blocks").update({ order_index: block.order_index }).eq("id", target.id);
    if (first.error || second?.error) setError(first.error?.message || second?.error?.message || "Could not reorder blocks.");
    else { setMessage("Lesson content order updated."); await loadBlocks(lessonId); }
    setSaving(false);
  }

  async function removeBlock(block: Block) {
    if (!window.confirm("Delete this lesson block?")) return;
    setSaving(true); setError("");
    const { error: deleteError } = await supabase.from("learning_lesson_blocks").delete().eq("id", block.id);
    if (deleteError) setError(deleteError.message);
    else { setMessage("Lesson block deleted."); await loadBlocks(lessonId); }
    setSaving(false);
  }

  if (loading) return <main className="admin-page"><div className="admin-container"><section className="admin-card">Loading lesson blocks…</section></div></main>;
  return <main className="admin-page"><div className="admin-container">
    <section className="admin-hero"><div className="admin-hero-top"><div><div className="admin-badge">BrainLab Academy · Content administration</div><h1 className="admin-title">Lesson Block Editor</h1><p className="admin-subtitle">Build lesson bodies from text, images, audio, video, and inline practice. Content is stored as structured JSON and protected by database permissions.</p>{admin && <div className="admin-user-chip">{admin.email} · {admin.role.replaceAll("_"," ")}</div>}</div><div className="admin-actions"><button className="admin-btn-light" onClick={() => router.push("/admin/content")}>Content manager</button><button className="admin-btn-light" onClick={() => router.push("/admin/dashboard")}>Dashboard</button></div></div></section>
    {error && <div className="admin-message" role="alert">{error}</div>}{message && <div className="admin-message" role="status">{message}</div>}
    <section className="admin-section admin-grid-2">
      <form className="admin-card" onSubmit={addBlock}><h2 className="admin-card-title">Add a block</h2><label className="admin-label">Lesson</label><select className="admin-input" value={lessonId} onChange={(e) => setLessonId(e.target.value)} required><option value="">Choose lesson</option>{lessons.map((l) => <option key={l.id} value={l.id}>{lessonLabel(l)}</option>)}</select>
      <label className="admin-label">Block type</label><select className="admin-input" value={blockType} onChange={(e) => setBlockType(e.target.value)}>{["text","image","voice_note","short_video","long_video","inline_mcq"].map((x) => <option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select>
      <label className="admin-label">Block content JSON</label><textarea className="admin-input font-mono text-sm" rows={9} value={contentText} onChange={(e) => setContentText(e.target.value)} required />
      <p className="admin-help">Text example: {"{ \"text\": \"Explanation...\" }"} · Media example: {"{ \"url\": \"https://...\", \"alt\": \"Diagram description\" }"}</p>
      <button className="admin-btn-primary" disabled={saving || !lessonId}>{saving ? "Saving…" : "Add lesson block"}</button></form>
      <div className="admin-card"><h2 className="admin-card-title">Lesson content order</h2>{blocks.length === 0 ? <p className="admin-help">No blocks yet. Add content before publishing this lesson.</p> : blocks.map((b,index) => <article key={b.id} className="border-b py-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{index + 1}. {b.block_type.replaceAll("_"," ")}</strong><div className="flex flex-wrap gap-2"><button type="button" className="admin-btn-light" disabled={saving||index===0} onClick={() => void moveBlock(b,index,-1)}>Move up</button><button type="button" className="admin-btn-light" disabled={saving||index===blocks.length-1} onClick={() => void moveBlock(b,index,1)}>Move down</button><button type="button" className="admin-btn-light" disabled={saving} onClick={() => beginEdit(b)}>Edit</button><button type="button" className="admin-btn-light" disabled={saving} onClick={() => void removeBlock(b)}>Delete</button></div></div>{editingBlockId===b.id ? <div className="mt-3 space-y-3"><label className="admin-label">Block type</label><select className="admin-input" value={editingBlockType} onChange={(e)=>setEditingBlockType(e.target.value)}>{["text","image","voice_note","short_video","long_video","inline_mcq"].map((x)=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select><label className="admin-label">Block content JSON</label><textarea className="admin-input font-mono text-sm" rows={8} value={editingContentText} onChange={(e)=>setEditingContentText(e.target.value)}/><div className="flex gap-2"><button type="button" className="admin-btn-primary" disabled={saving} onClick={()=>void saveBlockEdit(b)}>{saving?"Saving…":"Save changes"}</button><button type="button" className="admin-btn-light" onClick={()=>setEditingBlockId("")}>Cancel</button></div></div> : <pre className="mt-2 overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(b.content,null,2)}</pre>}</article>)}</div>
    </section>
  </div></main>;
}
