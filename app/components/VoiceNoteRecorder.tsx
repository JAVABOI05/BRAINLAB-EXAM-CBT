"use client";

import React, { useState, useRef, useEffect } from "react";

interface VoiceNoteRecorderProps {
  onAudioReady: (audioBlob: Blob, durationSeconds: number) => Promise<void> | void;
  onCancel?: () => void;
  maxDurationSeconds?: number;
}

export default function VoiceNoteRecorder({
  onAudioReady,
  onCancel,
  maxDurationSeconds = 300,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setErrorMessage(null);
    chunksRef.current = [];
    setAudioUrl(null);
    setRecordedBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDurationSeconds - 1) {
            stopRecording();
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Microphone access was denied. Please allow microphone permissions in your browser settings to record voice notes."
          : "Unable to start microphone recording. Check your audio device."
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const handleDiscard = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordedBlob(null);
    setIsRecording(false);
    setDuration(0);
    if (onCancel) onCancel();
  };

  const handleConfirmSend = async () => {
    if (!recordedBlob) return;
    setIsSubmitting(true);
    try {
      await onAudioReady(recordedBlob, duration);
      handleDiscard();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload audio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm w-full max-w-md">
      {errorMessage && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          ⚠️ {errorMessage}
        </div>
      )}

      {!isRecording && !audioUrl && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="flex h-3 w-3 rounded-full bg-blue-600" />
            <span>Ready to record voice note (max {Math.floor(maxDurationSeconds / 60)}m)</span>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
            >
              🎙️ Start Recording
            </button>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold text-rose-600">Recording: {formatSeconds(duration)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-rose-700"
            >
              ⏹ Stop
            </button>
          </div>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Audio Preview ({formatSeconds(duration)})</span>
            <button
              type="button"
              onClick={handleDiscard}
              className="text-slate-400 hover:text-rose-600 transition"
            >
              Discard & Re-record
            </button>
          </div>

          <audio src={audioUrl} controls className="w-full h-10" />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleConfirmSend}
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Uploading…" : "Send Voice Note"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
