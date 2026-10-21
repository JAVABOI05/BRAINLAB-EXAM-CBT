"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Recording = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration_seconds: number;
  processing_status: string;
  is_downloadable: boolean;
  transcript_text?: string;
  views_count: number;
  created_at: string;
  live_classes?: {
    title: string;
    scheduled_start_at: string;
  };
  courses?: {
    title: string;
    slug: string;
  };
};

export default function ClassRecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRecording, setActiveRecording] = useState<Recording | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/recordings");
        const json = await res.json();
        if (active && json.success) {
          setRecordings(json.recordings);
          if (json.recordings.length > 0) {
            setActiveRecording(json.recordings[0]);
          }
        }
      } catch (err) {
        console.warn("Could not load recordings:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const filtered = recordings.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
  });

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
            Post-Class Learning & Revision
          </span>
          <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">
            Class Recordings Library
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Replay live classroom lectures, review tutor demonstrations, and study lecture transcripts.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          ← My Learning
        </Link>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="mt-4 font-semibold">Loading class recordings…</p>
        </div>
      ) : recordings.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="text-4xl">🎬</span>
          <h3 className="mt-3 text-lg font-bold text-slate-900">No recordings available yet</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            When your tutors complete interactive live classes, authorized lesson replays and notes will be published here.
          </p>
          <div className="mt-5">
            <Link
              href="/calendar"
              className="inline-flex rounded-xl bg-[#012153] px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-900"
            >
              Check Class Timetable
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main Video Stage */}
          <div className="lg:col-span-2 space-y-4">
            {activeRecording ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-950 overflow-hidden shadow-lg">
                <div className="relative aspect-video bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={activeRecording.video_url}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Player Toolbar */}
                <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                  <div>
                    <h2 className="text-base font-bold truncate max-w-md">{activeRecording.title}</h2>
                    <span className="text-xs text-slate-400">
                      Duration: {formatDuration(activeRecording.duration_seconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold">Speed:</span>
                    {[1, 1.25, 1.5, 2].map((sp) => (
                      <button
                        key={sp}
                        onClick={() => changeSpeed(sp)}
                        className={`rounded-lg px-2.5 py-1 font-bold transition ${
                          playbackSpeed === sp
                            ? "bg-blue-600 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {sp}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transcript / Notes Tab */}
                {activeRecording.transcript_text && (
                  <div className="p-5 bg-slate-900 border-t border-slate-800 text-xs">
                    <h3 className="font-bold text-blue-400 uppercase tracking-wider mb-2">
                      Lecture Transcript & Highlights
                    </h3>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      {activeRecording.transcript_text}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Sidebar / Playlist */}
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <input
                type="text"
                placeholder="Search lectures…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-2">
              {filtered.map((rec) => {
                const isSelected = rec.id === activeRecording?.id;
                return (
                  <button
                    key={rec.id}
                    onClick={() => setActiveRecording(rec)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#012153] text-white text-sm font-bold">
                      ▶
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-950 truncate">{rec.title}</h4>
                      <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">{rec.description}</p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>⏱ {formatDuration(rec.duration_seconds)}</span>
                        <span>•</span>
                        <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
