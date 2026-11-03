"use client";

import React, { useEffect, useState } from "react";

interface RecordingCountdownProps {
  seconds?: number;
  onComplete: () => void;
  onCancel: () => void;
}

export default function RecordingCountdown({
  seconds = 3,
  onComplete,
  onCancel,
}: RecordingCountdownProps) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex flex-col items-center justify-center text-center p-8 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-rose-300">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span>Starting Studio Recording</span>
        </div>

        {/* Animated 3-2-1 Display */}
        <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-[#1356E8] bg-[#0B1536] shadow-[0_0_50px_rgba(19,86,232,0.6)]">
          <span className="text-7xl font-black text-white animate-scale">
            {count > 0 ? count : "GO!"}
          </span>
        </div>

        <p className="text-sm font-semibold text-slate-300 max-w-xs">
          Composing whiteboard canvas, microphone, and tutor camera stream...
        </p>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-5 py-2 text-xs font-bold text-slate-200 transition active:scale-95 shadow-sm"
        >
          Cancel Recording
        </button>
      </div>
    </div>
  );
}
