"use client";

import React, { useState } from "react";

interface PhetEmbedPlayerProps {
  embedUrl: string;
  title: string;
  instructions?: string[];
  learningObjectives?: string[];
}

export default function PhetEmbedPlayer({
  embedUrl,
  title,
  instructions,
  learningObjectives,
}: PhetEmbedPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-4">
      {/* Simulation Frame Container */}
      <div
        className={`relative rounded-3xl border border-slate-200 bg-slate-950 overflow-hidden shadow-2xl transition-all duration-300 dark:border-slate-800 ${
          isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen p-4" : "h-[600px] w-full"
        }`}
      >
        {/* Top Control Bar */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <span className="hidden sm:inline-flex rounded-lg bg-slate-900/90 px-3 py-1.5 text-[11px] font-bold text-slate-300 backdrop-blur-md border border-white/10">
            Interactive PhET Engine (HTML5)
          </span>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/90 text-white hover:bg-slate-800 border border-white/10 backdrop-blur-md shadow-md transition active:scale-95"
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand Fullscreen"}
          >
            {isFullscreen ? "✕" : "⛶"}
          </button>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white z-10 space-y-3">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-400 border-t-transparent" />
            <p className="text-xs font-bold text-slate-300 tracking-wide">Launching {title} Simulator…</p>
            <p className="text-[10px] text-slate-500">Connecting PhET interactive virtual laboratory</p>
          </div>
        )}

        {/* Iframe */}
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          onLoad={() => setLoading(false)}
          className="h-full w-full border-0"
        />
      </div>

      {/* Guidelines & Objectives Accordion */}
      {(instructions?.length || learningObjectives?.length) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {learningObjectives && learningObjectives.length > 0 && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-950/60 dark:bg-indigo-950/20">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-2">
                🎯 Core Learning Objectives
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside font-medium">
                {learningObjectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          )}

          {instructions && instructions.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                📋 Virtual Experiment Guidelines
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-decimal list-inside font-medium">
                {instructions.map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
