"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Recording = {
  id: string;
  title: string;
  description?: string | null;
  duration_seconds: number;
  created_at: string;
  is_visible_to_students: boolean;
  processing_status: string;
  canManage?: boolean;
  canDownload?: boolean;
  live_classes?: { title?: string; scheduled_start_at?: string };
};

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
}

export default function TutorRecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again to manage class recordings.");
      const response = await fetch("/api/recordings", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Could not load recordings.");
      setRecordings((data.recordings || []).filter((item: Recording) => item.canManage));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not load recordings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRecordings(); }, [loadRecordings]);

  async function toggleVisibility(recording: Recording) {
    setBusyId(recording.id);
    setFeedback("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again to change recording visibility.");
      const response = await fetch("/api/recordings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recording_id: recording.id,
          is_visible_to_students: !recording.is_visible_to_students,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Could not update visibility.");
      setRecordings((current) => current.map((item) =>
        item.id === recording.id ? { ...item, is_visible_to_students: !recording.is_visible_to_students } : item
      ));
      setFeedback(recording.is_visible_to_students
        ? "Recording hidden from students."
        : "Recording published to the student portal.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not update visibility.");
    } finally {
      setBusyId(null);
    }
  }

  async function downloadRecording(recording: Recording) {
    setBusyId(recording.id);
    setFeedback("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again to download this recording.");
      const response = await fetch(`/api/recordings/${recording.id}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.url) throw new Error(data.error || "Could not prepare the download.");
      window.location.assign(data.url);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not download recording.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto min-h-[75vh] max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-800">Tutor tools</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Class recordings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Keep replays private until you are ready. Publish a recording for students, or hide it again at any time.
            Only the assigned tutor can download the original recording.
          </p>
        </div>
        <Link href="/learn" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          Back to Learning Hub
        </Link>
      </header>

      {feedback && <p role="status" className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{feedback}</p>}

      {loading ? (
        <div className="mt-8 space-y-3" aria-label="Loading recordings">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : recordings.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">🎬</div>
          <h2 className="mt-4 text-lg font-black text-slate-950">Your recordings will appear here</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Record a scheduled class from its live classroom. New recordings stay hidden from students until you publish them.
          </p>
        </section>
      ) : (
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">Your class library</h2>
            <span className="text-xs font-semibold text-slate-500">{recordings.length} {recordings.length === 1 ? "recording" : "recordings"}</span>
          </div>
          {recordings.map((recording) => (
            <article key={recording.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${recording.is_visible_to_students ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                      {recording.is_visible_to_students ? "Visible to students" : "Private draft"}
                    </span>
                    <span className="text-xs text-slate-500">{formatDuration(recording.duration_seconds)}</span>
                  </div>
                  <h3 className="mt-2 truncate text-base font-extrabold text-slate-950">{recording.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {recording.live_classes?.title || "Live classroom"} · {new Date(recording.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleVisibility(recording)}
                    disabled={busyId === recording.id || recording.processing_status !== "ready"}
                    className={`min-h-10 rounded-xl px-3.5 py-2 text-xs font-extrabold transition disabled:opacity-50 ${recording.is_visible_to_students ? "border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                  >
                    {busyId === recording.id ? "Saving…" : recording.is_visible_to_students ? "Hide from students" : "Publish to students"}
                  </button>
                  {recording.canDownload && (
                    <button type="button" onClick={() => void downloadRecording(recording)} disabled={busyId === recording.id} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      {busyId === recording.id ? "Preparing…" : "Download original"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
