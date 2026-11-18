"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { supabase } from "../../../lib/supabase";

type Lesson = {
  id: string;
  title: string;
  summary: string | null;
  topic_id: string;
  estimated_duration_mins: number;
};
type Block = { id: string; block_type: string; content: Record<string, unknown>; order_index: number };
type Topic = { id: string; title: string; slug: string; subject_id: string };
type Subject = { id: string; name: string; slug: string };
type Option = { id: string; text: string };

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function contentText(content: Record<string, unknown>): string {
  const candidate = content.markdown ?? content.text ?? content.html ?? content.body;
  if (typeof candidate !== "string") return "";
  return candidate.replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function AudioNote({ content }: { content: Record<string, unknown> }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const url = safeHttpUrl(content.url);
  const title = typeof content.title === "string" ? content.title : "Audio note";

  function formatTime(value: number) {
    const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
  }

  if (!url) return <p className="text-sm text-amber-800">This audio item has an invalid or missing media URL.</p>;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <button type="button" aria-label={playing ? "Pause audio" : "Play audio"} onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.paused) void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
          else { audio.pause(); setPlaying(false); }
        }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#012153] text-white shadow-xs transition active:scale-95">
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
        </button>
        <div className="min-w-0 flex-1"><p className="font-extrabold text-slate-950">{title}</p><p className="text-xs text-slate-500">Audio learning note</p></div>
        <label className="text-xs font-bold text-slate-600">Speed
          <select aria-label="Audio playback speed" value={speed} onChange={(event) => { const next = Number(event.target.value); setSpeed(next); if (audioRef.current) audioRef.current.playbackRate = next; }} className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900">
            <option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option>
          </select>
        </label>
      </div>
      <input aria-label="Audio position" type="range" min={0} max={duration || 0} step={1} value={Math.min(current, duration || 0)} onChange={(event) => { const next = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = next; setCurrent(next); }} className="mt-4 w-full accent-blue-900" />
      <div className="flex justify-between text-xs tabular-nums text-slate-500"><span>{formatTime(current)}</span><span>{formatTime(Math.max(0, duration - current))} remaining</span></div>
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
    </div>
  );
}

function InlineCheckpoint({ content }: { content: Record<string, unknown> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const question = typeof content.question === "string" ? content.question : "Check your understanding";
  const options = Array.isArray(content.options) ? content.options as Option[] : [];
  const correctId = typeof content.correct_option_id === "string" ? content.correct_option_id : "";
  const explanation = typeof content.explanation === "string" ? content.explanation : "";

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6" aria-label="Formative knowledge check">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-800">Quick checkpoint · Practice only</p>
      <h3 className="mt-2 text-lg font-extrabold text-slate-950">{question}</h3>
      <div className="mt-4 space-y-2">
        {options.map((option) => {
          const isCorrect = Boolean(selected) && option.id === correctId;
          const isWrongPick = selected === option.id && selected !== correctId;
          const style = isCorrect ? "border-emerald-600 bg-emerald-50 text-emerald-950" : isWrongPick ? "border-rose-600 bg-rose-50 text-rose-950" : "border-slate-200 bg-white text-slate-800 hover:border-blue-400";
          return <button key={option.id} type="button" disabled={selected !== null} onClick={() => setSelected(option.id)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border p-3 text-left font-semibold transition disabled:cursor-default ${style}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-black">{option.id.toUpperCase()}</span><span>{option.text}</span>{isCorrect && <span className="ml-auto text-sm font-extrabold">Correct</span>}{isWrongPick && <span className="ml-auto text-sm font-extrabold">Not quite</span>}</button>;
        })}
      </div>
      {selected !== null && <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4" aria-live="polite"><p className="font-extrabold text-slate-950">{selected === correctId ? "Well done — that is correct." : "Not quite. Review the highlighted correct answer."}</p>{explanation && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{explanation}</p>}<button type="button" onClick={() => setSelected(null)} className="mt-3 text-sm font-bold text-blue-800 underline underline-offset-4">Try again</button></div>}
      <p className="mt-3 text-xs leading-5 text-slate-500">This checkpoint is for learning feedback and does not affect a topic-test score.</p>
    </section>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const content = block.content ?? {};
  if (block.block_type === "text") {
    const text = contentText(content);
    return (
      <section className="prose max-w-none rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 sm:p-7 overflow-x-auto break-words [overflow-wrap:anywhere]">
        <div className="whitespace-pre-wrap leading-8 font-sans">{text || "This text block is empty."}</div>
      </section>
    );
  }
  if (block.block_type === "image") {
    const url = safeHttpUrl(content.url);
    const caption = typeof content.caption === "string" ? content.caption : "";
    return <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">{url ? <img src={url} alt={caption || "Lesson illustration"} loading="lazy" className="mx-auto max-h-[34rem] w-auto max-w-full rounded-xl object-contain" /> : <p className="p-4 text-sm text-amber-800">This image has an invalid or missing URL.</p>}{caption && <figcaption className="px-2 pt-3 text-center text-sm text-slate-600">{caption}</figcaption>}</figure>;
  }
  if (block.block_type === "voice_note") return <AudioNote content={content} />;
  if (block.block_type === "short_video") {
    const url = safeHttpUrl(content.url);
    const [unused] = [false];
    void unused;
    return <section className="mx-auto w-full max-w-sm"><div className="overflow-hidden rounded-3xl border border-slate-200 bg-black" style={{ aspectRatio: "9 / 16" }}>{url ? <video src={url} controls playsInline loop={content.auto_loop === true} className="h-full w-full object-contain" preload="metadata" /> : <p className="p-4 text-sm text-white">This video has an invalid or missing URL.</p>}</div><p className="mt-2 text-xs text-slate-500">Short video · Use the player controls to play or pause.</p></section>;
  }
  if (block.block_type === "long_video") {
    const url = safeHttpUrl(content.url);
    const provider = typeof content.provider === "string" ? content.provider : "direct";
    if (!url) return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">This video has an invalid or missing URL.</p>;
    let embedUrl: string | null = null;
    if (provider === "youtube") {
      try {
        const parsed = new URL(url);
        const id = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v");
        if (id && /^[a-zA-Z0-9_-]{6,20}$/.test(id)) embedUrl = `https://www.youtube-nocookie.com/embed/${id}`;
      } catch { embedUrl = null; }
    } else if (provider === "vimeo") {
      try {
        const parsed = new URL(url);
        const id = parsed.pathname.split("/").filter(Boolean).pop();
        if (parsed.hostname.endsWith("vimeo.com") && id && /^\d+$/.test(id)) embedUrl = `https://player.vimeo.com/video/${id}`;
      } catch { embedUrl = null; }
    }
    return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-black">{embedUrl ? <div className="aspect-video"><iframe src={embedUrl} title="Lesson video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen className="h-full w-full" referrerPolicy="strict-origin-when-cross-origin" /></div> : provider === "direct" || provider === "mux" ? <video src={url} controls playsInline preload="metadata" className="aspect-video max-h-[36rem] w-full" /> : <p className="p-4 text-sm text-white">This video provider or URL is not supported.</p>}</section>;
  }
  if (block.block_type === "inline_mcq") return <InlineCheckpoint content={content} />;
  return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This lesson block type is not supported yet.</p>;
}

export default function LessonViewerPage() {
  const params = useParams<{ subjectSlug: string; lessonId: string }>();
  const subjectSlug = decodeURIComponent(params.subjectSlug);
  const lessonId = params.lessonId;
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progressStatus, setProgressStatus] = useState<"signed_out" | "in_progress" | "completed">("signed_out");
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const subscribeToBookmarks = useCallback((callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    window.addEventListener("learning-bookmarks-changed", callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener("learning-bookmarks-changed", callback);
    };
  }, []);
  const getBookmarkSnapshot = useCallback(() => {
    try {
      const stored = localStorage.getItem("learning_bookmarked_lessons");
      const bookmarks: unknown = stored ? JSON.parse(stored) : [];
      return Array.isArray(bookmarks) && bookmarks.includes(lessonId);
    } catch {
      return false;
    }
  }, [lessonId]);
  const isBookmarked = useSyncExternalStore(subscribeToBookmarks, getBookmarkSnapshot, () => false);

  function toggleBookmark() {
    try {
      const stored = localStorage.getItem("learning_bookmarked_lessons");
      let bookmarks: string[] = [];
      if (stored) {
        bookmarks = JSON.parse(stored);
        if (!Array.isArray(bookmarks)) bookmarks = [];
      }
      if (bookmarks.includes(lessonId)) {
        bookmarks = bookmarks.filter((id) => id !== lessonId);
      } else {
        bookmarks.push(lessonId);
      }
      localStorage.setItem("learning_bookmarked_lessons", JSON.stringify(bookmarks));
      window.dispatchEvent(new Event("learning-bookmarks-changed"));
    } catch {}
  }

  useEffect(() => {
    let active = true;
    async function loadLesson() {
      setLoading(true);
      setError("");
      const { data: lessonData, error: lessonError } = await supabase
        .from("learning_lessons")
        .select("id,title,summary,topic_id,estimated_duration_mins")
        .eq("id", lessonId)
        .eq("is_published", true)
        .maybeSingle();
      if (!active) return;
      if (lessonError || !lessonData) {
        setError("This lesson is unavailable or has not been published.");
        setLoading(false);
        return;
      }
      const { data: topicData, error: topicError } = await supabase
        .from("learning_topics")
        .select("id,title,slug,subject_id")
        .eq("id", lessonData.topic_id)
        .eq("is_published", true)
        .maybeSingle();
      if (!active) return;
      if (topicError || !topicData) {
        setError("The topic for this lesson is not available.");
        setLoading(false);
        return;
      }
      const { data: subjectData, error: subjectError } = await supabase
        .from("learning_subjects")
        .select("id,name,slug")
        .eq("id", topicData.subject_id)
        .eq("slug", subjectSlug)
        .eq("is_published", true)
        .maybeSingle();
      if (!active) return;
      if (subjectError || !subjectData) {
        setError("This lesson does not belong to the selected subject.");
        setLoading(false);
        return;
      }
      const { data: blockData, error: blockError } = await supabase
        .from("learning_lesson_blocks")
        .select("id,block_type,content,order_index")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });
      if (!active) return;
      if (blockError) {
        setError("We could not load the lesson content.");
        setLoading(false);
        return;
      }
      setSubject(subjectData as Subject);
      setTopic(topicData as Topic);
      setLesson(lessonData as Lesson);
      setBlocks((blockData ?? []) as Block[]);
      const { data: sessionData } = await supabase.auth.getSession();
      const studentId = sessionData.session?.user.id;
      if (studentId) {
        const { data: progressRow, error: progressError } = await supabase
          .from("learning_lesson_progress")
          .select("status")
          .eq("student_id", studentId)
          .eq("lesson_id", lessonId)
          .maybeSingle();
        if (!active) return;
        if (!progressError && progressRow?.status === "completed") {
          setProgressStatus("completed");
        } else {
          setProgressStatus("in_progress");
          const { error: saveProgressError } = await supabase.from("learning_lesson_progress").upsert({
            student_id: studentId,
            lesson_id: lessonId,
            status: "in_progress",
            last_block_id: (blockData ?? []).length ? blockData![0].id : null,
          }, { onConflict: "student_id,lesson_id" });
          if (saveProgressError) setProgressMessage("Your lesson is open, but progress could not sync yet.");
        }
      } else {
        setProgressStatus("signed_out");
      }
      if (!active) return;
      setLoading(false);
    }
    void loadLesson();
    return () => { active = false; };
  }, [lessonId, subjectSlug]);

  const durationLabel = useMemo(() => lesson ? `${lesson.estimated_duration_mins} min read` : "", [lesson]);

  async function markLessonComplete() {
    if (!lesson || progressStatus === "signed_out" || progressSaving) return;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const studentId = sessionData.session?.user.id;
    if (sessionError || !studentId) {
      setProgressMessage("Sign in to save lesson progress.");
      setProgressStatus("signed_out");
      return;
    }
    setProgressSaving(true);
    setProgressMessage("");
    const { error: saveError } = await supabase.from("learning_lesson_progress").upsert({
      student_id: studentId,
      lesson_id: lesson.id,
      status: "completed",
      completed_at: new Date().toISOString(),
      last_block_id: blocks.length ? blocks[blocks.length - 1].id : null,
    }, { onConflict: "student_id,lesson_id" });
    if (saveError) setProgressMessage("We could not save completion yet. Check your connection and try again.");
    else {
      setProgressStatus("completed");
      setProgressMessage("Lesson marked complete. Your subject progress has been updated.");
    }
    setProgressSaving(false);
  }

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/learn" className="text-blue-800 underline underline-offset-4">Learning Hub</Link>
          <span aria-hidden="true">/</span>
          {subject && <Link href={`/learn/${subject.slug}`} className="text-blue-800 underline underline-offset-4">{subject.name}</Link>}
          {topic && <><span aria-hidden="true">/</span><span>{topic.title}</span></>}
        </div>
        <button
          type="button"
          onClick={toggleBookmark}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            isBookmarked
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this lesson"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
          <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
        </button>
      </div>

      {loading && <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">Loading lesson…</p>}
      {!loading && error && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert">
          <h1 className="text-xl font-extrabold">Lesson unavailable</h1>
          <p className="mt-2">{error}</p>
          <Link href="/learn" className="mt-4 inline-block font-bold underline underline-offset-4">Return to Learning Hub</Link>
        </div>
      )}

      {!loading && !error && lesson && subject && topic && (
        <>
          <header className="mt-6 rounded-3xl bg-[#061a3a] p-7 text-white sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-200">
                Lesson · {durationLabel}
              </p>
              {progressStatus === "completed" && (
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-300 border border-emerald-400/30">
                  Completed ✓
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{lesson.title}</h1>
            {lesson.summary && <p className="mt-4 max-w-3xl leading-7 text-blue-100">{lesson.summary}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/20 px-3 py-1.5 text-sm">{topic.title}</span>
              <span className="rounded-full border border-white/20 px-3 py-1.5 text-sm">{blocks.length} learning {blocks.length === 1 ? "block" : "blocks"}</span>
            </div>
          </header>

          {blocks.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7">
              <h2 className="text-lg font-extrabold text-slate-950">Lesson content is being prepared</h2>
              <p className="mt-2 leading-7 text-slate-600">This lesson has been published without any content blocks. Please return later or choose another lesson.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              {blocks.map((block, index) => (
                <div key={block.id} className="space-y-2">
                  <p className="px-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">Part {index + 1}</p>
                  <BlockRenderer block={block} />
                </div>
              ))}
            </div>
          )}

          <footer className="mt-10 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-xl text-sm leading-6 text-slate-500">Take your time. Use checkpoints to test understanding, not just recall.</p>
              <div className="flex flex-wrap gap-3">
                {progressStatus === "signed_out" ? (
                  <Link href="/account" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800">
                    Sign in to track progress
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={progressSaving || blocks.length === 0 || progressStatus === "completed"}
                    onClick={() => void markLessonComplete()}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {progressStatus === "completed" ? "Lesson completed ✓" : progressSaving ? "Saving progress…" : "Mark lesson complete"}
                  </button>
                )}
                <Link href={`/learn/${subject.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white transition hover:bg-[#093278]">
                  Back to topics
                </Link>
              </div>
            </div>
            {progressMessage && <p role="status" className="mt-3 text-sm font-medium text-slate-700">{progressMessage}</p>}
          </footer>
        </>
      )}
    </main>
  );
}
