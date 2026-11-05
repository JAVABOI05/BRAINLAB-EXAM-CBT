"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  QuadraticGraphAdapter,
  QuadraticState,
  DEFAULT_QUADRATIC_STATE,
  ProjectileMotionAdapter,
  ProjectileState,
  DEFAULT_PROJECTILE_STATE,
  OhmsLawCircuitAdapter,
  OhmsLawState,
  DEFAULT_OHMS_LAW_STATE,
  AcidBaseTitrationAdapter,
  TitrationState,
  DEFAULT_TITRATION_STATE,
  GeneticsPunnettAdapter,
  GeneticsState,
  DEFAULT_GENETICS_STATE,
  LogicGatesAdapter,
  LogicGatesState,
  DEFAULT_LOGIC_GATES_STATE,
  type StemSynchronizedEvent,
} from "./stemAdapter";

export type StemSimType = "quadratic" | "projectile" | "circuit" | "titration" | "genetics" | "logic";

export interface StemLiveboardPresenterProps {
  channel?: any;
  currentUserId?: string;
  isHost?: boolean;
  theme?: "dark" | "light";
  initialSim?: StemSimType;
  onClose?: () => void;
  onSnapshotToBoard?: (svgDataUrl: string) => void;
}

export default function StemLiveboardPresenter({
  channel,
  currentUserId = "user",
  isHost = false,
  theme = "dark",
  initialSim = "quadratic",
  onClose,
  onSnapshotToBoard,
}: StemLiveboardPresenterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeSim, setActiveSim] = useState<StemSimType>(initialSim);

  // Interaction Mode: Mode A (Demonstration / Tutor Only) vs Mode B (Guided / Students Can Manipulate)
  const [interactionMode, setInteractionMode] = useState<"demonstration" | "guided">("demonstration");

  // Active Simulation Adapter References
  const quadAdapterRef = useRef<QuadraticGraphAdapter | null>(null);
  const projAdapterRef = useRef<ProjectileMotionAdapter | null>(null);
  const circuitAdapterRef = useRef<OhmsLawCircuitAdapter | null>(null);
  const titrAdapterRef = useRef<AcidBaseTitrationAdapter | null>(null);
  const genAdapterRef = useRef<GeneticsPunnettAdapter | null>(null);
  const logicAdapterRef = useRef<LogicGatesAdapter | null>(null);

  // Local state for re-rendering
  const [quadState, setQuadState] = useState<QuadraticState>({ ...DEFAULT_QUADRATIC_STATE });
  const [projState, setProjState] = useState<ProjectileState>({ ...DEFAULT_PROJECTILE_STATE });
  const [circuitState, setCircuitState] = useState<OhmsLawState>({ ...DEFAULT_OHMS_LAW_STATE });
  const [titrState, setTitrState] = useState<TitrationState>({ ...DEFAULT_TITRATION_STATE });
  const [genState, setGenState] = useState<GeneticsState>({ ...DEFAULT_GENETICS_STATE });
  const [logicState, setLogicState] = useState<LogicGatesState>({ ...DEFAULT_LOGIC_GATES_STATE });

  const lastBroadcastRef = useRef<number>(0);

  // Initialize all adapters once
  useEffect(() => {
    const quad = new QuadraticGraphAdapter();
    quad.init(DEFAULT_QUADRATIC_STATE, isHost);
    quadAdapterRef.current = quad;

    const proj = new ProjectileMotionAdapter();
    proj.init(DEFAULT_PROJECTILE_STATE, isHost);
    projAdapterRef.current = proj;

    const circ = new OhmsLawCircuitAdapter();
    circ.init(DEFAULT_OHMS_LAW_STATE, isHost);
    circuitAdapterRef.current = circ;

    const titr = new AcidBaseTitrationAdapter();
    titr.init(DEFAULT_TITRATION_STATE, isHost);
    titrAdapterRef.current = titr;

    const gen = new GeneticsPunnettAdapter();
    gen.init(DEFAULT_GENETICS_STATE, isHost);
    genAdapterRef.current = gen;

    const logic = new LogicGatesAdapter();
    logic.init(DEFAULT_LOGIC_GATES_STATE, isHost);
    logicAdapterRef.current = logic;

    return () => {
      quad.destroy();
      proj.destroy();
      circ.destroy();
      titr.destroy();
      gen.destroy();
      logic.destroy();
      quadAdapterRef.current = null;
      projAdapterRef.current = null;
      circuitAdapterRef.current = null;
      titrAdapterRef.current = null;
      genAdapterRef.current = null;
      logicAdapterRef.current = null;
    };
  }, [isHost]);

  // Current active adapter helper
  const getActiveAdapter = useCallback(() => {
    switch (activeSim) {
      case "quadratic":
        return quadAdapterRef.current;
      case "projectile":
        return projAdapterRef.current;
      case "circuit":
        return circuitAdapterRef.current;
      case "titration":
        return titrAdapterRef.current;
      case "genetics":
        return genAdapterRef.current;
      case "logic":
        return logicAdapterRef.current;
    }
  }, [activeSim]);

  // Redraw Canvas whenever active sim or corresponding state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const adapter = getActiveAdapter();
    if (!canvas || !adapter) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    adapter.renderToCanvas(ctx, canvas.width, canvas.height, theme);
  }, [activeSim, quadState, projState, circuitState, titrState, genState, logicState, theme, getActiveAdapter]);

  // Throttled Broadcast of Parameter Updates (20fps = 50ms)
  const canControl = isHost || interactionMode === "guided";

  const broadcastParamChange = useCallback(
    (sim: StemSimType, updates: Record<string, any>) => {
      if (!channel || (!isHost && interactionMode !== "guided")) return;
      const adapter = getActiveAdapter();
      if (!adapter) return;

      const now = Date.now();
      if (now - lastBroadcastRef.current > 50) {
        lastBroadcastRef.current = now;
        const event = (adapter as any).createParamChangeEvent("live-room", currentUserId, updates);
        try {
          channel.send({
            type: "broadcast",
            event: "stem_event",
            payload: {
              ...event,
              sim,
            },
          });
        } catch (err) {
          console.warn("[StemPresenter] Failed to broadcast event:", err);
        }
      }
    },
    [channel, currentUserId, isHost, interactionMode, getActiveAdapter]
  );

  // Switch Simulation (Host Authoritative)
  const handleSwitchSim = (sim: StemSimType) => {
    if (!isHost) return;
    setActiveSim(sim);
    if (channel) {
      try {
        channel.send({
          type: "broadcast",
          event: "stem_sim_switch",
          payload: { sim, senderId: currentUserId },
        });
      } catch {}
    }
  };

  // Toggle Mode A (Tutor Only) vs Mode B (Guided Student Interaction)
  const handleToggleMode = () => {
    if (!isHost) return;
    const nextMode = interactionMode === "demonstration" ? "guided" : "demonstration";
    setInteractionMode(nextMode);
    if (channel) {
      try {
        channel.send({
          type: "broadcast",
          event: "stem_mode_change",
          payload: { mode: nextMode, senderId: currentUserId },
        });
      } catch (err) {
        console.warn("[StemPresenter] Failed to broadcast mode change:", err);
      }
    }
  };

  // Realtime Listeners
  useEffect(() => {
    if (!channel) return;

    const handleRemoteStemEvent = ({ payload }: { payload: any }) => {
      if (!payload || payload.actorId === currentUserId) return;

      const sim = payload.sim as StemSimType;
      if (sim && sim !== activeSim) {
        setActiveSim(sim);
      }

      if (sim === "quadratic" && quadAdapterRef.current) {
        if (quadAdapterRef.current.applyEvent(payload)) {
          setQuadState(quadAdapterRef.current.getSnapshot());
        }
      } else if (sim === "projectile" && projAdapterRef.current) {
        if (projAdapterRef.current.applyEvent(payload)) {
          setProjState(projAdapterRef.current.getSnapshot());
        }
      } else if (sim === "circuit" && circuitAdapterRef.current) {
        if (circuitAdapterRef.current.applyEvent(payload)) {
          setCircuitState(circuitAdapterRef.current.getSnapshot());
        }
      } else if (sim === "titration" && titrAdapterRef.current) {
        if (titrAdapterRef.current.applyEvent(payload)) {
          setTitrState(titrAdapterRef.current.getSnapshot());
        }
      } else if (sim === "genetics" && genAdapterRef.current) {
        if (genAdapterRef.current.applyEvent(payload)) {
          setGenState(genAdapterRef.current.getSnapshot());
        }
      } else if (sim === "logic" && logicAdapterRef.current) {
        if (logicAdapterRef.current.applyEvent(payload)) {
          setLogicState(logicAdapterRef.current.getSnapshot());
        }
      }
    };

    const handleRemoteSimSwitch = ({ payload }: { payload: any }) => {
      if (!payload || payload.senderId === currentUserId) return;
      if (payload.sim) {
        setActiveSim(payload.sim);
      }
    };

    const handleRemoteModeChange = ({ payload }: { payload: any }) => {
      if (!payload || !payload.mode) return;
      setInteractionMode(payload.mode);
    };

    const handleRemoteStemSnapshot = ({ payload }: { payload: any }) => {
      if (!payload || !payload.sim) return;
      setActiveSim(payload.sim);
      if (payload.mode) {
        setInteractionMode(payload.mode);
      }
      if (payload.sim === "quadratic" && quadAdapterRef.current) {
        quadAdapterRef.current.init(payload.snapshot, isHost);
        setQuadState(quadAdapterRef.current.getSnapshot());
      } else if (payload.sim === "projectile" && projAdapterRef.current) {
        projAdapterRef.current.init(payload.snapshot, isHost);
        setProjState(projAdapterRef.current.getSnapshot());
      } else if (payload.sim === "circuit" && circuitAdapterRef.current) {
        circuitAdapterRef.current.init(payload.snapshot, isHost);
        setCircuitState(circuitAdapterRef.current.getSnapshot());
      } else if (payload.sim === "titration" && titrAdapterRef.current) {
        titrAdapterRef.current.init(payload.snapshot, isHost);
        setTitrState(titrAdapterRef.current.getSnapshot());
      } else if (payload.sim === "genetics" && genAdapterRef.current) {
        genAdapterRef.current.init(payload.snapshot, isHost);
        setGenState(genAdapterRef.current.getSnapshot());
      } else if (payload.sim === "logic" && logicAdapterRef.current) {
        logicAdapterRef.current.init(payload.snapshot, isHost);
        setLogicState(logicAdapterRef.current.getSnapshot());
      }
    };

    const handleRemoteStemRequestSync = () => {
      if (isHost) {
        const adapter = getActiveAdapter();
        if (adapter) {
          try {
            channel.send({
              type: "broadcast",
              event: "stem_snapshot",
              payload: {
                sim: activeSim,
                mode: interactionMode,
                snapshot: adapter.getSnapshot(),
                sequenceNumber: (adapter as any).getSequenceNumber?.() || 0,
              },
            });
          } catch {}
        }
      }
    };

    channel.on?.("broadcast", { event: "stem_event" }, handleRemoteStemEvent);
    channel.on?.("broadcast", { event: "stem_sim_switch" }, handleRemoteSimSwitch);
    channel.on?.("broadcast", { event: "stem_mode_change" }, handleRemoteModeChange);
    channel.on?.("broadcast", { event: "stem_snapshot" }, handleRemoteStemSnapshot);
    channel.on?.("broadcast", { event: "stem_request_sync" }, handleRemoteStemRequestSync);

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
      channel.off?.("broadcast", { event: "stem_sim_switch" }, handleRemoteSimSwitch);
      channel.off?.("broadcast", { event: "stem_mode_change" }, handleRemoteModeChange);
      channel.off?.("broadcast", { event: "stem_snapshot" }, handleRemoteStemSnapshot);
      channel.off?.("broadcast", { event: "stem_request_sync" }, handleRemoteStemRequestSync);
    };
  }, [channel, currentUserId, isHost, activeSim, interactionMode, getActiveAdapter]);

  // Export current simulation as Vector SVG for Whiteboard Stamping
  const handleExportSnapshot = () => {
    if (!onSnapshotToBoard) return;
    const adapter = getActiveAdapter();
    if (adapter && typeof (adapter as any).exportSvg === "function") {
      const svg = (adapter as any).exportSvg(720, 480, theme);
      onSnapshotToBoard(svg);
    } else if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      onSnapshotToBoard(dataUrl);
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 overflow-y-auto font-sans">
      {/* Header Bar & Lab Switcher */}
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧪</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white">
                STEM Interactive Simulation Lab
              </h2>
              {interactionMode === "guided" ? (
                <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Mode B (Guided Student Interaction)
                </span>
              ) : (
                <span className="rounded-md bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  Mode A (Tutor Authoritative)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {interactionMode === "guided"
                ? "Students can freely manipulate sliders, test hypotheses, and verify mathematical behaviors."
                : "Live authoring, parameter modeling, and real-time student viewport broadcast."}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Tutor Mode Toggle */}
          {isHost && (
            <button
              type="button"
              onClick={handleToggleMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                interactionMode === "guided"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-blue-600/30 hover:bg-blue-600/50 text-cyan-300 border border-blue-400/30"
              }`}
              title="Toggle student interaction permissions"
            >
              <span>{interactionMode === "guided" ? "🔓 Mode B: Active" : "🔒 Mode A: Locked"}</span>
            </button>
          )}

          {isHost && onSnapshotToBoard && (
            <button
              type="button"
              onClick={handleExportSnapshot}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
              title="Stamp current lab vector diagram onto Whiteboard"
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

      {/* Lab Tabs (Tutor Only can switch; Students follow) */}
      <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center gap-1.5 py-2">
        {(
          [
            { id: "quadratic", label: "📈 Quadratic Parabola", cat: "Math" },
            { id: "projectile", label: "🚀 Projectile Motion", cat: "Physics" },
            { id: "circuit", label: "⚡ Ohm's Law Circuit", cat: "Physics" },
            { id: "titration", label: "🧪 Acid-Base Titration", cat: "Chemistry" },
            { id: "genetics", label: "🧬 Punnett Square", cat: "Biology" },
            { id: "logic", label: "🔲 Logic Gates & Circuits", cat: "Engineering" },
          ] as const
        ).map((sim) => (
          <button
            key={sim.id}
            type="button"
            disabled={!isHost}
            onClick={() => handleSwitchSim(sim.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              activeSim === sim.id
                ? "bg-[#1356E8] text-white shadow-lg shadow-blue-600/30 border border-blue-400/40"
                : isHost
                ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                : "bg-white/5 text-slate-500 opacity-60 cursor-default"
            }`}
          >
            <span>{sim.label}</span>
            <span className="text-[9px] uppercase px-1 rounded bg-black/40 text-slate-400">
              {sim.cat}
            </span>
          </button>
        ))}
      </div>

      {/* Main Canvas Viewport */}
      <div className="w-full max-w-4xl mx-auto flex-1 min-h-[300px] sm:min-h-[380px] relative flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={720}
          height={400}
          className="w-full h-auto max-h-[400px] rounded-2xl border border-white/10 bg-[#070d1e] shadow-2xl object-contain"
        />
      </div>

      {/* Active Control Panel (Available to Host in Mode A, or to All in Mode B) */}
      <div className="w-full max-w-4xl mx-auto pt-3">
        {canControl ? (
          <div className="rounded-2xl border border-white/10 bg-[#0B1536]/90 p-4 space-y-4">
            {!isHost && interactionMode === "guided" && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-[11px] text-emerald-300 flex items-center gap-2">
                <span>✨</span>
                <span>
                  <strong>Mode B Active:</strong> Your tutor enabled guided interaction. Adjust sliders and observe real-time circuit and mathematical changes!
                </span>
              </div>
            )}

            {/* Quadratic Controls */}
            {activeSim === "quadratic" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Quadratic Coefficients: y = ax² + bx + c</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuadState(DEFAULT_QUADRATIC_STATE);
                      broadcastParamChange("quadratic", DEFAULT_QUADRATIC_STATE);
                    }}
                    className="text-cyan-400 hover:underline text-[11px]"
                  >
                    Reset Defaults
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">a (curvature):</span>
                      <span className="text-cyan-300 font-bold">{quadState.a}</span>
                    </div>
                    <input
                      type="range"
                      min={-4}
                      max={4}
                      step={0.5}
                      value={quadState.a}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0.5;
                        setQuadState((p) => ({ ...p, a: val }));
                        broadcastParamChange("quadratic", { a: val });
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">b (linear slope):</span>
                      <span className="text-cyan-300 font-bold">{quadState.b}</span>
                    </div>
                    <input
                      type="range"
                      min={-6}
                      max={6}
                      step={0.5}
                      value={quadState.b}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQuadState((p) => ({ ...p, b: val }));
                        broadcastParamChange("quadratic", { b: val });
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">c (y-intercept):</span>
                      <span className="text-cyan-300 font-bold">{quadState.c}</span>
                    </div>
                    <input
                      type="range"
                      min={-8}
                      max={8}
                      step={0.5}
                      value={quadState.c}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQuadState((p) => ({ ...p, c: val }));
                        broadcastParamChange("quadratic", { c: val });
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Projectile Controls */}
            {activeSim === "projectile" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Projectile Parameters (Kinematics & Gravity)</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">Environment:</span>
                    {(
                      [
                        { label: "Earth (9.8m/s²)", g: 9.8 },
                        { label: "Moon (1.62m/s²)", g: 1.62 },
                        { label: "Mars (3.71m/s²)", g: 3.71 },
                      ] as const
                    ).map((env) => (
                      <button
                        key={env.label}
                        type="button"
                        onClick={() => {
                          setProjState((p) => ({ ...p, gravity: env.g }));
                          broadcastParamChange("projectile", { gravity: env.g });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          projState.gravity === env.g ? "bg-blue-600 text-white" : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {env.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Initial Velocity (v₀):</span>
                      <span className="text-cyan-300 font-bold">{projState.v0} m/s</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={55}
                      step={1}
                      value={projState.v0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProjState((p) => ({ ...p, v0: val }));
                        broadcastParamChange("projectile", { v0: val });
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Launch Angle (θ):</span>
                      <span className="text-cyan-300 font-bold">{projState.angleDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={85}
                      step={1}
                      value={projState.angleDeg}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProjState((p) => ({ ...p, angleDeg: val }));
                        broadcastParamChange("projectile", { angleDeg: val });
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Launch Height (h₀):</span>
                      <span className="text-cyan-300 font-bold">{projState.h0} m</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      step={1}
                      value={projState.h0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProjState((p) => ({ ...p, h0: val }));
                        broadcastParamChange("projectile", { h0: val });
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Circuit Controls */}
            {activeSim === "circuit" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>DC Circuit Parameters: Ohm's Law (V = IR)</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">Circuit Type:</span>
                    {(["single", "series", "parallel"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setCircuitState((p) => ({ ...p, circuitType: t }));
                          broadcastParamChange("circuit", { circuitType: t });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          circuitState.circuitType === t ? "bg-blue-600 text-white" : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">DC Voltage (V):</span>
                      <span className="text-cyan-300 font-bold">{circuitState.voltage} V</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={36}
                      step={1}
                      value={circuitState.voltage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCircuitState((p) => ({ ...p, voltage: val }));
                        broadcastParamChange("circuit", { voltage: val });
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Resistance (R):</span>
                      <span className="text-cyan-300 font-bold">{circuitState.resistance} Ω</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      step={1}
                      value={circuitState.resistance}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCircuitState((p) => ({ ...p, resistance: val }));
                        broadcastParamChange("circuit", { resistance: val });
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Titration Controls */}
            {activeSim === "titration" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Acid-Base Titration: 25 mL 0.1M HCl with 0.1M NaOH</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">Indicator:</span>
                    {(
                      [
                        { id: "phenolphthalein", label: "Phenolphthalein" },
                        { id: "methyl_orange", label: "Methyl Orange" },
                        { id: "bromothymol_blue", label: "Bromothymol Blue" },
                      ] as const
                    ).map((ind) => (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => {
                          setTitrState((p) => ({ ...p, indicator: ind.id }));
                          broadcastParamChange("titration", { indicator: ind.id });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          titrState.indicator === ind.id ? "bg-blue-600 text-white" : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {ind.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Buret Titrant Added (NaOH):</span>
                    <span className="text-cyan-300 font-bold">{titrState.titrantAddedMl} mL (Equiv at 25.0 mL)</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={0.5}
                    value={titrState.titrantAddedMl}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTitrState((p) => ({ ...p, titrantAddedMl: val }));
                      broadcastParamChange("titration", { titrantAddedMl: val });
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(50, titrState.titrantAddedMl + 1);
                        setTitrState((p) => ({ ...p, titrantAddedMl: next }));
                        broadcastParamChange("titration", { titrantAddedMl: next });
                      }}
                      className="px-2 py-1 rounded bg-white/10 text-xs font-mono hover:bg-white/20"
                    >
                      +1 mL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(50, titrState.titrantAddedMl + 5);
                        setTitrState((p) => ({ ...p, titrantAddedMl: next }));
                        broadcastParamChange("titration", { titrantAddedMl: next });
                      }}
                      className="px-2 py-1 rounded bg-white/10 text-xs font-mono hover:bg-white/20"
                    >
                      +5 mL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTitrState((p) => ({ ...p, titrantAddedMl: 0 }));
                        broadcastParamChange("titration", { titrantAddedMl: 0 });
                      }}
                      className="ml-auto text-xs text-rose-400 hover:underline"
                    >
                      Reset to 0 mL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Genetics Controls */}
            {activeSim === "genetics" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Monohybrid Cross: Allele Combinations</span>
                  <span className="text-[11px] text-cyan-300 font-mono">B = Brown, b = Blue</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold mb-1.5">
                      Maternal Genotype (♀):
                    </span>
                    <div className="flex items-center gap-2">
                      {(
                        [
                          { alleles: ["B", "B"] as [string, string], label: "BB (Homozygous Dom)" },
                          { alleles: ["B", "b"] as [string, string], label: "Bb (Heterozygous)" },
                          { alleles: ["b", "b"] as [string, string], label: "bb (Homozygous Rec)" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            setGenState((p) => ({ ...p, maternalAlleles: opt.alleles }));
                            broadcastParamChange("genetics", { maternalAlleles: opt.alleles });
                          }}
                          className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                            genState.maternalAlleles[0] === opt.alleles[0] &&
                            genState.maternalAlleles[1] === opt.alleles[1]
                              ? "bg-pink-600 text-white"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {opt.alleles.join("")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold mb-1.5">
                      Paternal Genotype (♂):
                    </span>
                    <div className="flex items-center gap-2">
                      {(
                        [
                          { alleles: ["B", "B"] as [string, string], label: "BB (Homozygous Dom)" },
                          { alleles: ["B", "b"] as [string, string], label: "Bb (Heterozygous)" },
                          { alleles: ["b", "b"] as [string, string], label: "bb (Homozygous Rec)" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            setGenState((p) => ({ ...p, paternalAlleles: opt.alleles }));
                            broadcastParamChange("genetics", { paternalAlleles: opt.alleles });
                          }}
                          className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                            genState.paternalAlleles[0] === opt.alleles[0] &&
                            genState.paternalAlleles[1] === opt.alleles[1]
                              ? "bg-blue-600 text-white"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {opt.alleles.join("")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Boolean Logic Gates Controls */}
            {activeSim === "logic" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Boolean Logic Gate & Binary Input Signals</span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Output Q = {logicAdapterRef.current?.getTelemetry()?.outputQ ?? 0}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-bold mr-1">Gate:</span>
                  {(["AND", "OR", "NOT", "NAND", "NOR", "XOR"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setLogicState((p) => ({ ...p, gateType: g }));
                        broadcastParamChange("logic", { gateType: g });
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                        logicState.gateType === g
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "bg-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-6 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Input A:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = logicState.inputA === 1 ? 0 : 1;
                        setLogicState((p) => ({ ...p, inputA: next }));
                        broadcastParamChange("logic", { inputA: next });
                      }}
                      className={`w-12 py-1 rounded text-xs font-mono font-bold transition ${
                        logicState.inputA === 1 ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {logicState.inputA === 1 ? "1 (HIGH)" : "0 (LOW)"}
                    </button>
                  </div>
                  {logicState.gateType !== "NOT" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">Input B:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = logicState.inputB === 1 ? 0 : 1;
                          setLogicState((p) => ({ ...p, inputB: next }));
                          broadcastParamChange("logic", { inputB: next });
                        }}
                        className={`w-12 py-1 rounded text-xs font-mono font-bold transition ${
                          logicState.inputB === 1 ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {logicState.inputB === 1 ? "1 (HIGH)" : "0 (LOW)"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-slate-400">
            Viewing authoritative Liveboard STEM presentation. Any adjustments or lab changes made by your instructor reflect here automatically.
          </div>
        )}
      </div>
    </div>
  );
}
