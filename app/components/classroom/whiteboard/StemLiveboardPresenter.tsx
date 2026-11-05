"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  QuadraticGraphAdapter,
  QuadraticState,
  DEFAULT_QUADRATIC_STATE,
  computeQuadraticTelemetry,
  type StemSynchronizedEvent,
} from "./stemAdapter";

interface StemLiveboardPresenterProps {
  channel?: any;
  currentUserId?: string;
  isHost?: boolean;
  theme?: "dark" | "light";
  onClose?: () => void;
  onSnapshotToBoard?: (svgDataUrl: string) => void;
}

export default function StemLiveboardPresenter({
  channel,
  currentUserId = "user",
  isHost = false,
  theme = "dark",
  onClose,
  onSnapshotToBoard,
}: StemLiveboardPresenterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const adapterRef = useRef<QuadraticGraphAdapter | null>(null);

  const [state, setState] = useState<QuadraticState>({ ...DEFAULT_QUADRATIC_STATE });
  const lastBroadcastRef = useRef<number>(0);
  const pendingUpdatesRef = useRef<Partial<QuadraticState>>({});

  // Initialize Adapter
  useEffect(() => {
    const adapter = new QuadraticGraphAdapter();
    adapter.init(DEFAULT_QUADRATIC_STATE, isHost);
    adapterRef.current = adapter;

    return () => {
      adapter.destroy();
      adapterRef.current = null;
    };
  }, [isHost]);

  // Redraw Canvas whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const adapter = adapterRef.current;
    if (!canvas || !adapter) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    adapter.renderToCanvas(ctx, canvas.width, canvas.height, theme);
  }, [state, theme]);

  // Host: Broadcast throttled parameter change event (Max 20fps = 50ms interval)
  const broadcastParamChange = useCallback(
    (updates: Partial<QuadraticState>) => {
      const adapter = adapterRef.current;
      if (!adapter || !isHost || !channel) return;

      Object.assign(pendingUpdatesRef.current, updates);
      const now = Date.now();

      if (now - lastBroadcastRef.current > 50) {
        lastBroadcastRef.current = now;
        const currentBatch = { ...pendingUpdatesRef.current };
        pendingUpdatesRef.current = {};

        const event = adapter.createParamChangeEvent("live-room", currentUserId, currentBatch);
        try {
          channel.send({
            type: "broadcast",
            event: "stem_event",
            payload: event,
          });
        } catch (err) {
          console.warn("[StemPresenter] Failed to broadcast event:", err);
        }
      }
    },
    [channel, currentUserId, isHost]
  );

  // Parameter Adjustment Handlers (Host Only)
  const handleParamA = (val: number) => {
    const nextA = val === 0 ? 0.25 : val;
    setState((prev) => ({ ...prev, a: nextA }));
    broadcastParamChange({ a: nextA });
  };

  const handleParamB = (val: number) => {
    setState((prev) => ({ ...prev, b: val }));
    broadcastParamChange({ b: val });
  };

  const handleParamC = (val: number) => {
    setState((prev) => ({ ...prev, c: val }));
    broadcastParamChange({ c: val });
  };

  // Realtime Listeners
  useEffect(() => {
    if (!channel) return;

    const handleRemoteStemEvent = ({ payload }: { payload: StemSynchronizedEvent<Partial<QuadraticState>> }) => {
      if (!payload || payload.actorId === currentUserId) return;
      const adapter = adapterRef.current;
      if (!adapter) return;

      const applied = adapter.applyEvent(payload);
      if (applied) {
        setState(adapter.getSnapshot());
      }
    };

    const handleRemoteStemSnapshot = ({ payload }: { payload: { snapshot: QuadraticState; sequenceNumber: number } }) => {
      if (!payload || !payload.snapshot) return;
      const adapter = adapterRef.current;
      if (!adapter) return;

      adapter.init(payload.snapshot, isHost);
      setState(adapter.getSnapshot());
    };

    const handleRemoteStemRequestSync = () => {
      // If we are host, respond with latest snapshot
      if (isHost && adapterRef.current) {
        try {
          channel.send({
            type: "broadcast",
            event: "stem_snapshot",
            payload: {
              snapshot: adapterRef.current.getSnapshot(),
              sequenceNumber: adapterRef.current.getSequenceNumber(),
            },
          });
        } catch {}
      }
    };

    channel.on?.("broadcast", { event: "stem_event" }, handleRemoteStemEvent);
    channel.on?.("broadcast", { event: "stem_snapshot" }, handleRemoteStemSnapshot);
    channel.on?.("broadcast", { event: "stem_request_sync" }, handleRemoteStemRequestSync);

    // If client is not host, request immediate hydration from tutor
    if (!isHost) {
      try {
        channel.send({
          type: "broadcast",
          event: "stem_request_sync",
          payload: { senderId: currentUserId },
        });
      } catch {}
    }

    return () => {
      channel.off?.("broadcast", { event: "stem_event" }, handleRemoteStemEvent);
      channel.off?.("broadcast", { event: "stem_snapshot" }, handleRemoteStemSnapshot);
      channel.off?.("broadcast", { event: "stem_request_sync" }, handleRemoteStemRequestSync);
    };
  }, [channel, currentUserId, isHost]);

  // Export current graph snapshot to Whiteboard as an image element
  const handleExportSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSnapshotToBoard) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSnapshotToBoard(dataUrl);
  };

  const telemetry = computeQuadraticTelemetry(state);

  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto">
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📐</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white">
                Quadratic Function &amp; Graph Explorer
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                Mode A · {isHost ? "Authoritative Host" : "Student View"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isHost
                ? "Adjusting parameters broadcasts real-time mathematical curve sync to all students."
                : "Tutor is presenting quadratic parabola curvature, roots and discriminant telemetry."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isHost && onSnapshotToBoard && (
            <button
              type="button"
              onClick={handleExportSnapshot}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
              title="Stamp current curve snapshot onto Whiteboard for annotation"
            >
              <span>📷</span>
              <span>Stamp on Board</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-bold transition"
            >
              Close Lab
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas & Live Math Telemetry */}
      <div className="my-auto w-full max-w-3xl flex flex-col items-center space-y-3">
        <div className="relative rounded-2xl border border-white/15 bg-[#070d1e] overflow-hidden shadow-2xl flex flex-col items-center w-full">
          <canvas
            ref={canvasRef}
            width={720}
            height={380}
            className="w-full max-h-[380px] object-contain"
          />

          {/* Equation Badge Overlay */}
          <div className="absolute top-3 left-3 rounded-xl border border-white/15 bg-black/70 backdrop-blur px-3 py-1.5 font-mono text-xs sm:text-sm text-cyan-300 shadow">
            y = {state.a === 1 ? "" : state.a === -1 ? "-" : `${state.a}`}x²{" "}
            {state.b >= 0 ? `+ ${state.b}` : `- ${Math.abs(state.b)}`}x{" "}
            {state.c >= 0 ? `+ ${state.c}` : `- ${Math.abs(state.c)}`}
          </div>

          {/* Roots Telemetry Badge Overlay */}
          <div className="absolute top-3 right-3 rounded-xl border border-white/15 bg-black/70 backdrop-blur px-3 py-1 text-[11px] font-mono text-white shadow flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry.natureOfRoots === "complex" ? "bg-rose-400" : "bg-emerald-400"
              }`}
            />
            <span>
              {telemetry.natureOfRoots === "complex"
                ? "Complex Roots (Δ < 0)"
                : telemetry.natureOfRoots === "coincident"
                ? `Coincident: x = ${telemetry.roots.r1}`
                : `x₁ = ${telemetry.roots.r1}, x₂ = ${telemetry.roots.r2}`}
            </span>
          </div>
        </div>

        {/* Live Mathematical Telemetry Row */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-[#0B1536] border border-white/10 text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-400">Discriminant (Δ)</span>
            <span className="font-mono text-sm font-black text-cyan-300">{telemetry.discriminant}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0B1536] border border-white/10 text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-400">Vertex (Xv, Yv)</span>
            <span className="font-mono text-xs font-black text-white">
              ({telemetry.vertex.x}, {telemetry.vertex.y})
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0B1536] border border-white/10 text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-400">Curvature</span>
            <span className="font-mono text-xs font-black text-amber-400 capitalize">
              {telemetry.curvature.replace("_", " ")}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0B1536] border border-white/10 text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-400">Y-Intercept</span>
            <span className="font-mono text-sm font-black text-emerald-400">(0, {telemetry.yIntercept})</span>
          </div>
        </div>
      </div>

      {/* Tutor Authoritative Control Panel (Host Only) */}
      {isHost ? (
        <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0B1536] p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Authoritative Parameter Controls (Tutor)</span>
            <button
              type="button"
              onClick={() => {
                setState({ ...DEFAULT_QUADRATIC_STATE });
                broadcastParamChange(DEFAULT_QUADRATIC_STATE);
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 transition"
            >
              Reset to Standard (x² - 2x - 3)
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">a (curvature):</span>
                <span className="text-cyan-300 font-bold">{state.a}</span>
              </div>
              <input
                type="range"
                min={-3}
                max={3}
                step={0.25}
                value={state.a}
                onChange={(e) => handleParamA(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">b (linear shift):</span>
                <span className="text-cyan-300 font-bold">{state.b}</span>
              </div>
              <input
                type="range"
                min={-6}
                max={6}
                step={0.5}
                value={state.b}
                onChange={(e) => handleParamB(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">c (intercept):</span>
                <span className="text-cyan-300 font-bold">{state.c}</span>
              </div>
              <input
                type="range"
                min={-6}
                max={6}
                step={0.5}
                value={state.c}
                onChange={(e) => handleParamC(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-3xl rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-slate-400">
          Viewing authoritative Liveboard STEM presentation. Any adjustments made by your instructor reflect here automatically.
        </div>
      )}
    </div>
  );
}
