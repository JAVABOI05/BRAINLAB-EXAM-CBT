"use client";

import React, { useState } from "react";
import Link from "next/link";

interface EndClassSummary {
  classId: string;
  title: string;
  startedAt?: string;
  endedAt: string;
  durationMinutes: number;
  totalAttendees: number;
}

interface EndClassModalProps {
  isOpen: boolean;
  classTitle: string;
  isRecordingActive: boolean;
  onConfirmEnd: (saveRecording: boolean) => Promise<EndClassSummary | null>;
  onClose: () => void;
}

export default function EndClassModal({
  isOpen,
  classTitle,
  isRecordingActive,
  onConfirmEnd,
  onClose,
}: EndClassModalProps) {
  const [saveRecording, setSaveRecording] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<EndClassSummary | null>(null);

  if (!isOpen) return null;

  const handleEnd = async () => {
    setBusy(true);
    try {
      const res = await onConfirmEnd(saveRecording);
      if (res) {
        setSummary(res);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0B1536] p-6 sm:p-8 shadow-2xl space-y-6 text-white">
        {!summary ? (
          <>
            {/* Confirmation Mode */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-2xl">
                🛑
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  End Live Class Session?
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Ending this class will disconnect all participating students, close active polls, and lock attendance records.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs space-y-2 text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>All student attendees will receive a class-ended notification.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Classroom duration and attendance hours will be finalized.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Camera, microphone, and LiveKit tracks will be safely released.</span>
              </div>
            </div>

            {/* Active recording prompt */}
            {isRecordingActive && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Class recording is currently running</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveRecording}
                    onChange={(e) => setSaveRecording(e.target.checked)}
                    className="rounded accent-[#1356E8] h-4 w-4"
                  />
                  <span>Finalize and save recording to my Teaching Library</span>
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Keep Teaching
              </button>
              <button
                type="button"
                onClick={handleEnd}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 px-5 py-2.5 text-xs font-black text-white shadow-lg disabled:opacity-50 transition active:scale-95"
              >
                {busy ? "Ending Class..." : "Yes, End Class Now"}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Class Completion Summary */}
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-3xl">
                🎓
              </div>
              <h2 className="text-xl font-black text-white">
                Class Concluded Successfully
              </h2>
              <p className="text-xs text-slate-300">
                {summary.title} has completed. Attendance and telemetry have been recorded.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <span className="block text-2xl font-black text-blue-400">
                  {summary.durationMinutes} min
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Duration
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <span className="block text-2xl font-black text-emerald-400">
                  {summary.totalAttendees}
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Attendees
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Link
                href="/dashboard"
                className="flex-1 rounded-xl bg-[#1356E8] hover:bg-blue-600 py-3 text-center text-xs font-black text-white shadow-lg transition"
              >
                Return to Dashboard
              </Link>
              <Link
                href="/classroom/library"
                className="flex-1 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 py-3 text-center text-xs font-bold text-slate-200 transition"
              >
                View Teaching Library
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
