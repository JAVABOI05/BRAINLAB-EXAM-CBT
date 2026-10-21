"use client";

import React, { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  src: string;
  title?: string;
  durationSeconds?: number;
  transcript?: string;
  allowDownload?: boolean;
}

export default function AudioPlayer({
  src,
  title,
  durationSeconds = 0,
  transcript,
  allowDownload = true,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((err) => console.warn("Audio playback interrupted:", err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    setPlaybackRate(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 shadow-sm w-full max-w-lg">
      <audio ref={audioRef} src={src} preload="metadata" />

      {title && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-800 truncate">🎙️ {title}</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Voice Note
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#012153] text-white shadow hover:bg-blue-900 transition focus-visible:outline-2"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        {/* Progress Scrubber Bar */}
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#012153]"
            aria-label="Seek audio"
          />
          <div className="flex justify-between text-[11px] font-semibold text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Speed Pill */}
        <button
          type="button"
          onClick={cycleSpeed}
          title="Change playback speed"
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shrink-0"
        >
          {playbackRate}x
        </button>

        {/* Transcript Toggle */}
        {transcript && (
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shrink-0"
            title="Show Transcript"
          >
            📝
          </button>
        )}
      </div>

      {showTranscript && transcript && (
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs leading-relaxed text-slate-800">
          <p className="font-bold text-blue-950 mb-1">Transcript:</p>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}
