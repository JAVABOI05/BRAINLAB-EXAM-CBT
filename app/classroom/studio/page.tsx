"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { SmartWhiteboard, type WhiteboardPage } from "@/app/components/SmartWhiteboard";

type Lesson = { id: string; title: string; subject: string | null; description: string | null; status: "draft" | "ready" | "archived"; updated_at: string; pages?: unknown[]; active_page_index?: number };
type PageData = WhiteboardPage & { backgroundMode?: string };

export default function ClassroomStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id");
  const [token, setToken] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(requestedId);
  const [title, setTitle] = useState("Untitled lesson");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "ready">("draft");
  const [pages, setPages] = useState<PageData[]>([{ id: "page-1", title: "Page 1", aspectRatio: "16 / 9", backgroundMode: "blackboard", elements: [] }]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading your classroom studio…");
  const [showStudioBoard, setShowStudioBoard] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBoardPagesChange = useCallback((nextPages: WhiteboardPage[], nextIndex: number) => { setPages(nextPages as PageData[]); setActivePageIndex(nextIndex); }, []);

  const authHeaders = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);

  const loadLessons = useCallback(async (authToken: string) => {
    const response = await fetch("/api/classroom/studio", { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load saved lessons.");
    setLessons(data.lessons || []);
  }, []);

  const loadOne = useCallback(async (id: string, authToken: string) => {
    const response = await fetch(`/api/classroom/studio?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to open lesson.");
    const lesson = data.lesson as Lesson;
    setLessonId(lesson.id); setTitle(lesson.title); setSubject(lesson.subject || ""); setDescription(lesson.description || "");
    setStatus(lesson.status === "ready" ? "ready" : "draft");
    setPages(Array.isArray(lesson.pages) && lesson.pages.length ? lesson.pages as PageData[] : [{ id: "page-1", title: "Page 1", aspectRatio: "16 / 9", backgroundMode: "blackboard", elements: [] }]);
    setActivePageIndex(Math.min(lesson.active_page_index || 0, Math.max(0, (lesson.pages as unknown[] | undefined)?.length || 1) - 1));
    setShowStudioBoard(true);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) { router.replace("/account?redirect=/classroom/studio"); return; }
      if (!alive) return;
      setToken(session.access_token);
      try {
        await loadLessons(session.access_token);
        if (requestedId) await loadOne(requestedId, session.access_token);
        else setMessage("Create a lesson or continue one of your saved drafts.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load Classroom Studio."); }
      finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, [router, requestedId, loadLessons, loadOne]);

  const saveLesson = useCallback(async (nextStatus: "draft" | "ready" = status) => {
    if (!token) return;
    setSaving(true); setMessage("Saving to your BrainLab account…");
    try {
      const response = await fetch("/api/classroom/studio", { method: "POST", headers: authHeaders(), body: JSON.stringify({ id: lessonId, title, subject, description, status: nextStatus, pages, active_page_index: activePageIndex }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed.");
      const lesson = data.lesson as Lesson;
      setLessonId(lesson.id); setStatus(nextStatus);
      setLessons((previous) => [lesson, ...previous.filter((item) => item.id !== lesson.id)]);
      setMessage(`Saved to your account at ${new Date(lesson.updated_at).toLocaleTimeString()}.`);
      if (typeof window !== "undefined") localStorage.setItem(`brainlab-classroom-studio:${lesson.id}`, JSON.stringify({ title, subject, description, status: nextStatus, pages, activePageIndex }));
      return lesson.id;
    } catch (error) {
      // Offline recovery fallback. Keep the complete draft on this device until the next successful save.
      try { localStorage.setItem(`brainlab-classroom-studio:pending:${lessonId || "new"}`, JSON.stringify({ title, subject, description, status: nextStatus, pages, activePageIndex })); } catch {}
      setMessage(`${error instanceof Error ? error.message : "Cloud save failed."} Your current draft was kept locally where browser storage is available; retry when connected.`);
      return null;
    } finally { setSaving(false); }
  }, [token, authHeaders, lessonId, title, subject, description, status, pages, activePageIndex]);

  useEffect(() => {
    if (!showStudioBoard || !lessonId || !token) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveLesson(status); }, 1800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [showStudioBoard, lessonId, token, title, subject, description, pages, activePageIndex, status, saveLesson]);

  const createLesson = () => {
    setLessonId(null); setTitle("Untitled lesson"); setSubject(""); setDescription(""); setStatus("draft");
    setPages([{ id: `page-${Date.now()}`, title: "Page 1", aspectRatio: "16 / 9", backgroundMode: "blackboard", elements: [] }]);
    setActivePageIndex(0); setShowStudioBoard(true); setMessage("New lesson ready. Add your notes, then save as draft or prepare it to teach.");
  };

  const startLive = async () => {
    const id = await saveLesson("ready");
    if (!id) return;
    try {
      const response = await fetch("/api/classroom/studio/live", { method: "POST", headers: authHeaders(), body: JSON.stringify({ lessonId: id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start the live class.");
      router.push(data.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start the live class. Your lesson is saved."); }
  };

  if (busy) return <main className="min-h-screen bg-slate-950 p-8 text-white">{message}</main>;

  return <main className="min-h-screen bg-slate-950 text-white">
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#071127]/95 px-4 py-3 backdrop-blur sm:px-8">
      <div><Link href="/dashboard" className="text-xs font-bold text-blue-300">← Dashboard</Link><h1 className="mt-1 text-xl font-black sm:text-2xl">BrainLab Classroom Studio</h1><p className="text-xs text-slate-400">Prepare, save, and reuse lessons before you go live.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => void saveLesson("draft")} disabled={saving || !showStudioBoard} className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold disabled:opacity-40">Save Draft</button><button onClick={() => void saveLesson("ready")} disabled={saving || !showStudioBoard} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500 disabled:opacity-40">Save & Prepare</button><button onClick={() => void startLive()} disabled={saving || !showStudioBoard} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black hover:bg-rose-500 disabled:opacity-40">Go Live</button></div>
    </header>
    <div className="mx-auto grid max-w-[1600px] gap-5 p-4 sm:p-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <button onClick={createLesson} className="w-full rounded-2xl bg-[#1356E8] p-4 text-left font-black shadow-lg">＋ Create a class / lesson <span className="mt-1 block text-xs font-medium text-blue-100">Start fresh without replacing other classes</span></button>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><h2 className="mb-3 font-bold">My saved lessons</h2>{lessons.length === 0 ? <p className="text-sm text-slate-400">Your saved drafts will appear here.</p> : <div className="space-y-2">{lessons.map((lesson) => <button key={lesson.id} onClick={() => { setBusy(true); void loadOne(lesson.id, token).then(() => setMessage("Lesson loaded. Changes autosave as you work.")).catch((error) => setMessage(error.message)).finally(() => setBusy(false)); }} className={`w-full rounded-xl border p-3 text-left ${lessonId === lesson.id ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-slate-900"}`}><span className="block truncate text-sm font-bold">{lesson.title}</span><span className="mt-1 block text-xs text-slate-400">{lesson.subject || "General"} · {lesson.status} · {new Date(lesson.updated_at).toLocaleDateString()}</span></button>)}</div>}</section>
        <div className="rounded-xl border border-blue-400/20 bg-blue-950/30 p-3 text-xs leading-5 text-blue-100">Your lesson is separate from its live session. Save your pages first. A lost connection should not remove the last successful cloud save; local recovery is used when cloud saving is unavailable.</div>
      </aside>
      <section className="min-w-0 space-y-4">
        {!showStudioBoard ? <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8"><h2 className="text-2xl font-black">Prepare before students arrive</h2><p className="mt-2 max-w-xl text-slate-400">Create a lesson, write notes on the board, set each page's layout, and save it as a draft. You can return later or prepare it for a live session.</p><button onClick={createLesson} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold">Create your first lesson</button></div> : <>
          <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-slate-300">Class / lesson title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-base text-white outline-none focus:border-blue-500" /></label><label className="text-xs font-bold text-slate-300">Subject (optional)<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} placeholder="e.g. Mathematics" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-base text-white outline-none focus:border-blue-500" /></label><label className="text-xs font-bold text-slate-300 md:col-span-2">Lesson notes / description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={2000} placeholder="What will learners cover?" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-blue-500" /></label></div>
          <div className="overflow-hidden rounded-3xl border border-[#1356E8]/40 bg-[#0B1536] shadow-2xl"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3"><div><h2 className="font-black">Lesson whiteboard</h2><p className="text-xs text-slate-400">Full-size board tools · per-page layout · autosave</p></div><span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-blue-200">{pages.length} page(s)</span></div><div className="min-h-[560px]"><SmartWhiteboard key={lessonId || "new-lesson"} classId={lessonId || "new-lesson"} isHost={true} currentUserId="studio-tutor" currentUserName="Tutor" showWatermark={true} initialPages={pages} initialActivePageIndex={activePageIndex} onPagesChange={onBoardPagesChange} /></div><div className="border-t border-white/10 p-3 text-xs text-slate-400">The board's pages and drawings autosave to the lesson when the whiteboard state is available to the studio.</div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm text-slate-300">{message}</p><span className={`rounded-full px-3 py-1 text-xs font-bold ${saving ? "bg-amber-500/15 text-amber-200" : "bg-emerald-500/15 text-emerald-200"}`}>{saving ? "Saving…" : "Cloud save status"}</span></div>
        </>}
      </section>
    </div>
  </main>;
}
