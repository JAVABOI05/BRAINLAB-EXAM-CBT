"use client";

import React, { useRef, useState, useEffect } from "react";
import { toast } from "@/app/lib/toast";

interface VideoPreviewEditorProps {
  videoBlob: Blob | null;
  videoUrl: string | null;
  mimeType: string;
  lessonTitle: string;
  subject?: string;
  topic?: string;
  onRetake: () => void;
  onSaveToLibrary?: (metadata: {
    duration: number;
    fileSize: number;
    trimmedStart: number;
    trimmedEnd: number;
  }) => Promise<void>;
  onClose: () => void;
}

export default function VideoPreviewEditor({
  videoBlob,
  videoUrl,
  mimeType,
  lessonTitle,
  subject = "Lesson",
  topic = "General",
  onRetake,
  onSaveToLibrary,
  onClose,
}: VideoPreviewEditorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Trimming State (in seconds)
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [savingToCloud, setSavingToCloud] = useState(false);
  const [cloudSaved, setCloudSaved] = useState(false);

  // Detect genuine file extension (never rename WebM to MP4)
  const fileExt = mimeType.includes("mp4") ? "mp4" : "webm";
  const safeDate = new Date().toISOString().slice(0, 10);
  const safeSubject = (subject || "General").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeTopic = (topic || "Topic").replace(/[^a-zA-Z0-9_-]/g, "_");
  const exportFilename = `BrainLab_${safeSubject}_${safeTopic}_${safeDate}.${fileExt}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const dur = video.duration || 0;
      setDuration(dur);
      setTrimEnd(dur);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (trimEnd > 0 && video.currentTime >= trimEnd) {
        video.pause();
        setIsPlaying(false);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [trimEnd]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (currentTime < trimStart || currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  // Direct Device Download (Local flow works independently of cloud)
  const handleDirectDownload = () => {
    if (!videoUrl) {
      toast.error("No recorded video available to download.");
      return;
    }

    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = exportFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Video downloaded directly to device as "${exportFilename}"!`);
  };

  // Save to BrainLab Cloud Library
  const handleCloudSave = async () => {
    if (!onSaveToLibrary || !videoBlob) return;
    setSavingToCloud(true);
    try {
      await onSaveToLibrary({
        duration,
        fileSize: videoBlob.size,
        trimmedStart: trimStart,
        trimmedEnd: trimEnd,
      });
      setCloudSaved(true);
      toast.success("Saved securely to your BrainLab Teaching & Video Library!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save video to cloud library.");
    } finally {
      setSavingToCloud(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl border border-white/15 bg-[#0B1536] p-5 sm:p-7 shadow-2xl space-y-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white">
                Recorded Video Lesson Preview
              </h2>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                Ready to Export ({fileExt.toUpperCase()})
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {lessonTitle} · {subject} · {videoBlob ? `${(videoBlob.size / (1024 * 1024)).toFixed(1)} MB` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-2 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Video Player Box */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner group">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              onClick={togglePlay}
              className="w-full h-full object-contain cursor-pointer"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-slate-500">
              No video source available
            </div>
          )}

          {/* Center Play Button Overlay */}
          {!isPlaying && videoUrl && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-[#1356E8]/90 hover:bg-[#1356E8] flex items-center justify-center text-2xl text-white shadow-xl transition active:scale-95"
            >
              ▶
            </button>
          )}

          {/* Time Display */}
          <div className="absolute bottom-2 left-3 rounded-lg bg-black/70 px-2 py-1 text-xs font-mono font-bold text-white backdrop-blur">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* ================================================================== */}
        {/* BASIC START / END TRIMMING CONTROLS */}
        {/* ================================================================== */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider uppercase text-blue-300 flex items-center gap-1.5">
              <span>✂️</span>
              <span>Preview Start &amp; End</span>
            </span>
            <span className="text-xs font-mono text-slate-300">
              Segment Duration: {formatTime(Math.max(0, trimEnd - trimStart))}
            </span>
          </div>

          <p className="text-[11px] leading-5 text-amber-200/90">These controls limit playback preview only. The saved/downloaded video remains the complete original recording.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Start Trim */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Start Offset:</span>
                <span className="font-mono text-white font-bold">{formatTime(trimStart)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, trimEnd - 1)}
                step={0.5}
                value={trimStart}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTrimStart(val);
                  handleSeek(val);
                }}
                className="w-full accent-[#1356E8] cursor-pointer"
              />
            </div>

            {/* End Trim */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>End Offset:</span>
                <span className="font-mono text-white font-bold">{formatTime(trimEnd)}</span>
              </div>
              <input
                type="range"
                min={Math.min(duration, trimStart + 1)}
                max={duration || 100}
                step={0.5}
                value={trimEnd}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTrimEnd(val);
                  handleSeek(val);
                }}
                className="w-full accent-[#1356E8] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ACTIONS: DIRECT DOWNLOAD, CLOUD SAVE & RETAKE */}
        {/* ================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Retake Recording */}
          <button
            type="button"
            onClick={onRetake}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-4 py-2.5 text-xs font-bold text-rose-300 transition active:scale-95"
          >
            🔄 Retake Recording
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Direct Device Download (Mandatory for Phones & Desktops) */}
            <button
              type="button"
              onClick={handleDirectDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95"
              title="Download directly to this phone or computer storage without cloud dependency"
            >
              <span>📥</span>
              <span>Download to Device ({fileExt.toUpperCase()})</span>
            </button>

            {/* Save to BrainLab Cloud Library */}
            {onSaveToLibrary && (
              <button
                type="button"
                disabled={savingToCloud || cloudSaved}
                onClick={handleCloudSave}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1356E8] to-blue-600 hover:from-blue-600 hover:to-blue-500 px-5 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                <span>{cloudSaved ? "✓" : savingToCloud ? "⏳" : "☁️"}</span>
                <span>{cloudSaved ? "Saved to Cloud" : savingToCloud ? "Saving..." : "Save to Cloud Library"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
