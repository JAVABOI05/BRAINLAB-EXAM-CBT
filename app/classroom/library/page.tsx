"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "@/app/lib/toast";

interface VideoRecording {
  id: string;
  title: string;
  subject?: string;
  topic?: string;
  duration_seconds: number;
  file_size_bytes: number;
  video_url: string;
  storage_path?: string;
  recording_source: string;
  resolution?: string;
  created_at: string;
  is_visible_to_students?: boolean;
}

interface LessonProject {
  id: string;
  title: string;
  subject?: string;
  status: string;
  pages?: unknown[];
  attachments?: unknown[];
  updated_at: string;
}

export default function TeachingVideoLibraryPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "projects" | "resources">("videos");

  const [recordings, setRecordings] = useState<VideoRecording[]>([]);
  const [projects, setProjects] = useState<LessonProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Video Preview Modal
  const [previewVideo, setPreviewVideo] = useState<VideoRecording | null>(null);

  const authHeaders = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadData = useCallback(async (authToken: string) => {
    setLoading(true);
    try {
      // 1. Load Recordings
      const recRes = await fetch("/api/classroom/recordings", {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      const recData = await recRes.json();
      if (recData.recordings) setRecordings(recData.recordings);

      // 2. Load Studio Lessons
      const lesRes = await fetch("/api/classroom/studio", {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      const lesData = await lesRes.json();
      if (lesData.lessons) setProjects(lesData.lessons);
    } catch (err: unknown) {
      toast.error("Failed to load library resources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/account?redirect=/classroom/library");
        return;
      }
      if (!alive) return;
      setToken(session.access_token);
      setUser(session.user);
      await loadData(session.access_token);
    })();
    return () => {
      alive = false;
    };
  }, [router, loadData]);

  // Direct download handler
  const handleDownloadVideo = (v: VideoRecording) => {
    const a = document.createElement("a");
    a.href = v.video_url;
    const safeTitle = (v.title || "video").replace(/[^a-zA-Z0-9_-]/g, "_");
    a.download = `${safeTitle}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded "${v.title}" directly to your device!`);
  };

  // Delete recording
  const handleDeleteRecording = async (id: string, title: string) => {
    if (!window.confirm(`Delete recording "${title}" permanently?`)) return;
    try {
      const { error } = await supabase.from("class_recordings").delete().eq("id", id);
      if (error) throw error;
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      toast.success("Recording deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete recording.");
    }
  };

  // Filtered recordings
  const filteredRecordings = recordings.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.subject && r.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filtered projects
  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.subject && p.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Audio assets & voice notes
  const audioRecordings = recordings.filter(
    (r) =>
      r.recording_source === "voice_note" ||
      r.recording_source === "audio_asset" ||
      r.resolution === "audio" ||
      r.video_url?.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i)
  );

  const filteredAudios = audioRecordings.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.subject && a.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };

  return (
    <main className="min-h-screen bg-[#070d1e] text-white flex flex-col selection:bg-blue-500">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B1536]/95 px-4 sm:px-8 py-3.5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/classroom/studio"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-300 hover:bg-white/10 transition"
              title="Back to Studio"
            >
              ←
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  Teaching &amp; Video Library
                </h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                  Cloud Archive
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Reusable lesson projects, recorded studio lessons, whiteboard archives, and handouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/classroom/studio"
              className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg transition active:scale-95"
            >
              ＋ New Video Lesson
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-8 flex-1 flex flex-col space-y-6">
        {/* Navigation Tabs & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 bg-[#0B1536] p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("videos")}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === "videos"
                  ? "bg-[#1356E8] text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🎥 Recorded Videos ({recordings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("projects")}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === "projects"
                  ? "bg-[#1356E8] text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📑 Lesson Projects ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("resources")}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === "resources"
                  ? "bg-[#1356E8] text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🎙️ Voice Notes & Audio ({audioRecordings.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or subject..."
              className="w-full rounded-xl border border-white/10 bg-[#0B1536] px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tab 1: Recorded Videos */}
        {activeTab === "videos" && (
          <div>
            {loading ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                Loading recorded video lessons...
              </div>
            ) : filteredRecordings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center space-y-3">
                <span className="text-4xl">🎬</span>
                <h3 className="text-base font-black text-white">No Recorded Videos Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Open the Video Lesson Studio to record lessons with your camera, whiteboard, and voice without going live.
                </p>
                <Link
                  href="/classroom/studio"
                  className="inline-block mt-2 rounded-xl bg-[#1356E8] px-4 py-2 text-xs font-black text-white"
                >
                  Record Your First Lesson
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRecordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="group rounded-2xl border border-white/10 bg-[#0B1536]/80 p-4 shadow-xl hover:border-blue-500/40 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Thumbnail Placeholder with Play Overlay */}
                      <div
                        onClick={() => setPreviewVideo(rec)}
                        className="relative aspect-video w-full rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center cursor-pointer group-hover:border-blue-500/30 transition overflow-hidden"
                      >
                        <span className="h-12 w-12 rounded-full bg-[#1356E8]/80 group-hover:bg-[#1356E8] flex items-center justify-center text-xl text-white shadow-lg transition">
                          ▶
                        </span>
                        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white">
                          {formatDuration(rec.duration_seconds)}
                        </span>
                        <span className="absolute top-2 left-2 rounded-full bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-[9px] font-black uppercase text-blue-300">
                          {rec.recording_source === "lesson_studio" ? "Studio Video" : "Live Recording"}
                        </span>
                      </div>

                      <div className="mt-3">
                        <h3 className="text-sm font-black text-white line-clamp-1">{rec.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {rec.subject || "General"} {rec.topic ? `· ${rec.topic}` : ""}
                        </p>
                        <span className="block text-[10px] text-slate-500 mt-1 font-mono">
                          {new Date(rec.created_at).toLocaleDateString()} ·{" "}
                          {(rec.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => handleDownloadVideo(rec)}
                        className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300 transition"
                        title="Download to Phone / Desktop"
                      >
                        <span>📥</span>
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecording(rec.id, rec.title)}
                        className="font-bold text-rose-400 hover:text-rose-300 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Lesson Projects */}
        {activeTab === "projects" && (
          <div>
            {filteredProjects.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-slate-400 text-sm">
                No saved lesson projects found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-white/10 bg-[#0B1536]/80 p-5 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                          {p.status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-white mt-2.5 line-clamp-1">{p.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">{p.subject || "General Academic"}</p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-300">
                        <span>📑 {Array.isArray(p.pages) ? p.pages.length : 1} Page(s)</span>
                        {Array.isArray(p.attachments) && p.attachments.length > 0 && (
                          <span>📎 {p.attachments.length} Attachments</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                      <Link
                        href={`/classroom/studio?id=${encodeURIComponent(p.id)}`}
                        className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-3.5 py-1.5 text-xs font-black text-white shadow-md transition"
                      >
                        Reopen in Studio
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Tab 3: Voice Notes & Audio */}
        {activeTab === "resources" && (
          <div>
            {filteredAudios.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center space-y-3">
                <span className="text-4xl">🎙️</span>
                <h3 className="text-base font-black text-white">No Audio Notes Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Recorded explanations, formula audio notes, and tutor voice comments will appear here.
                </p>
                <Link
                  href="/classroom/studio"
                  className="inline-block mt-2 rounded-xl bg-[#1356E8] px-4 py-2 text-xs font-black text-white"
                >
                  Record Lesson in Studio
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAudios.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-2xl border border-white/10 bg-[#0B1536]/80 p-5 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Audio Note
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDuration(rec.duration_seconds)}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-white mt-2.5 line-clamp-1">{rec.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {rec.subject || "General Academic"} {rec.topic ? `· ${rec.topic}` : ""}
                      </p>
                      <div className="mt-4 rounded-xl bg-black/40 p-2 border border-white/5">
                        <audio src={rec.video_url} controls className="w-full h-8" preload="none" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => handleDownloadVideo(rec)}
                        className="font-bold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        📥 Download Audio
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecording(rec.id, rec.title)}
                        className="font-bold text-rose-400 hover:text-rose-300 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-3xl border border-white/15 bg-[#0B1536] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-white">{previewVideo.title}</h3>
                <span className="text-xs text-slate-400">
                  {previewVideo.subject} · {formatDuration(previewVideo.duration_seconds)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
              <video src={previewVideo.video_url} controls autoPlay className="w-full h-full" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadVideo(previewVideo)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-md"
              >
                📥 Download to Device
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
