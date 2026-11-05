export interface StemAdapterCapabilities {
  supportsSnapshot: boolean;
  supportsStudentParameters: boolean;
  requiresWebGl: boolean;
  recordingMetadata: { title: string; category: string };
}

export interface StemSynchronizedEvent<TPayload = unknown> {
  sessionId: string;
  sequenceNumber: number;
  eventId: string; // Idempotency UUID
  idempotencyKey?: string; // Document C interop alias
  actorId: string;
  actorRole: "tutor" | "student" | "system";
  eventType: string; // e.g., "STEM_PARAM_CHANGE", "STEM_SIM_RESET", "STEM_MODE_CHANGE"
  payloadSchemaVersion: number;
  version?: string; // Pinned version
  payload: TPayload;
  timestamp: number;
}

export interface IStemLiveboardAdapter<TState, TEventPayload> {
  readonly capabilities: StemAdapterCapabilities;
  init(initialState: TState, isHost: boolean): void;
  applyEvent(event: StemSynchronizedEvent<TEventPayload>): boolean;
  getSnapshot(): TState;
  serialize(): Record<string, unknown>;
  destroy(): void;
}

// ----------------------------------------------------------------------------
// QUADRATIC GRAPH SIMULATION ADAPTER (Mode A: Tutor Authoritative)
// ----------------------------------------------------------------------------

export interface QuadraticState {
  a: number;
  b: number;
  c: number;
  xRange: [number, number];
  yRange: [number, number];
  mode: "demonstration" | "guided";
  active: boolean;
}

export const DEFAULT_QUADRATIC_STATE: QuadraticState = {
  a: 1,
  b: -2,
  c: -3,
  xRange: [-6, 6],
  yRange: [-8, 8],
  mode: "demonstration",
  active: true,
};

export interface QuadraticTelemetry {
  discriminant: number;
  natureOfRoots: "complex" | "coincident" | "real_distinct";
  roots: { r1: number | null; r2: number | null };
  vertex: { x: number; y: number };
  curvature: "concave_up" | "concave_down";
  yIntercept: number;
}

export function computeQuadraticTelemetry(state: Pick<QuadraticState, "a" | "b" | "c">): QuadraticTelemetry {
  const { a, b, c } = state;
  const safeA = a === 0 ? 0.0001 : a;
  const discriminant = b * b - 4 * safeA * c;
  const vx = -b / (2 * safeA);
  const vy = c - (b * b) / (4 * safeA);

  let natureOfRoots: "complex" | "coincident" | "real_distinct" = "complex";
  let r1: number | null = null;
  let r2: number | null = null;

  if (discriminant > 0.000001) {
    natureOfRoots = "real_distinct";
    const sqrtD = Math.sqrt(discriminant);
    r1 = (-b - sqrtD) / (2 * safeA);
    r2 = (-b + sqrtD) / (2 * safeA);
  } else if (Math.abs(discriminant) <= 0.000001) {
    natureOfRoots = "coincident";
    r1 = vx;
    r2 = vx;
  }

  return {
    discriminant: Number(discriminant.toFixed(4)),
    natureOfRoots,
    roots: {
      r1: r1 !== null ? Number(r1.toFixed(3)) : null,
      r2: r2 !== null ? Number(r2.toFixed(3)) : null,
    },
    vertex: {
      x: Number(vx.toFixed(3)),
      y: Number(vy.toFixed(3)),
    },
    curvature: safeA > 0 ? "concave_up" : "concave_down",
    yIntercept: c,
  };
}

export class QuadraticGraphAdapter implements IStemLiveboardAdapter<QuadraticState, Partial<QuadraticState>> {
  readonly capabilities: StemAdapterCapabilities = {
    supportsSnapshot: true,
    supportsStudentParameters: false,
    requiresWebGl: false,
    recordingMetadata: {
      title: "Quadratic Function & Graph Explorer",
      category: "Mathematics",
    },
  };

  private state: QuadraticState = { ...DEFAULT_QUADRATIC_STATE };
  private sequenceNumber: number = 0;
  private isHost: boolean = false;
  private processedEventIds = new Set<string>();

  init(initialState?: Partial<QuadraticState>, isHost: boolean = false): void {
    this.state = { ...DEFAULT_QUADRATIC_STATE, ...initialState };
    this.isHost = isHost;
    this.sequenceNumber = 0;
    this.processedEventIds.clear();
  }

  getSimulationId(): string {
    return "math-quadratic-explorer";
  }

  getVersion(): string {
    return "1.0.0";
  }

  // Create an authoritative synchronized event from the host (Tutor)
  createParamChangeEvent(
    sessionId: string,
    actorId: string,
    updates: Partial<QuadraticState>
  ): StemSynchronizedEvent<Partial<QuadraticState>> {
    this.sequenceNumber += 1;
    const eventId = `stem-evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const event: StemSynchronizedEvent<Partial<QuadraticState>> = {
      sessionId,
      sequenceNumber: this.sequenceNumber,
      eventId,
      idempotencyKey: eventId,
      actorId,
      actorRole: this.isHost ? "tutor" : "student",
      eventType: "STEM_PARAM_CHANGE",
      payloadSchemaVersion: 1,
      version: "1.0.0",
      payload: updates,
      timestamp: Date.now(),
    };

    // Apply locally
    this.applyEvent(event);
    return event;
  }

  // Apply synchronized event (from remote or local)
  applyEvent(event: StemSynchronizedEvent<Partial<QuadraticState>>): boolean {
    const key = event?.idempotencyKey || event?.eventId;
    if (!key) return false;

    // Idempotency check: ignore duplicate events
    if (this.processedEventIds.has(key)) {
      return false;
    }

    // Sequence monotonicity check (ignore out-of-order stale events)
    if (event.sequenceNumber < this.sequenceNumber && !this.isHost) {
      return false;
    }

    this.processedEventIds.add(key);
    if (event.sequenceNumber > this.sequenceNumber) {
      this.sequenceNumber = event.sequenceNumber;
    }

    // Update state
    this.state = {
      ...this.state,
      ...event.payload,
    };

    return true;
  }

  getSnapshot(): QuadraticState {
    return { ...this.state };
  }

  getTelemetry(): QuadraticTelemetry {
    return computeQuadraticTelemetry(this.state);
  }

  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  serialize(): Record<string, unknown> {
    const telemetry = this.getTelemetry();
    return {
      state: this.getSnapshot(),
      telemetry,
      equation: `y = ${this.state.a}x^2 + ${this.state.b}x + ${this.state.c}`,
      timestamp: Date.now(),
    };
  }

  // Pure canvas renderer: draws the simulation directly into Liveboard canvas context
  renderToCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: "dark" | "light" = "dark"
  ): void {
    ctx.save();

    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#f8fafc";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
    const axisColor = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.35)";
    const curveColor = "#38bdf8"; // Bright Cyan
    const vertexColor = "#f59e0b"; // Amber
    const rootColor = "#10b981"; // Emerald

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const originX = width / 2;
    const originY = height / 2;
    const scale = 28; // pixels per unit

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    for (let x = originX % scale; x < width; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = originY % scale; y < height; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Coordinate Axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;

    // X Axis
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // Y Axis
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Draw Parabola
    const { a, b, c } = this.state;
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 3;
    ctx.beginPath();

    let started = false;
    for (let px = 0; px <= width; px += 2) {
      const x = (px - originX) / scale;
      const y = a * x * x + b * x + c;
      const py = originY - y * scale;

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    const telemetry = this.getTelemetry();

    // Draw Vertex
    const pvx = originX + telemetry.vertex.x * scale;
    const pvy = originY - telemetry.vertex.y * scale;
    if (pvx >= 0 && pvx <= width && pvy >= 0 && pvy <= height) {
      ctx.fillStyle = vertexColor;
      ctx.beginPath();
      ctx.arc(pvx, pvy, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw Roots
    if (telemetry.natureOfRoots !== "complex") {
      ctx.fillStyle = rootColor;
      if (telemetry.roots.r1 !== null) {
        const pr1x = originX + telemetry.roots.r1 * scale;
        ctx.beginPath();
        ctx.arc(pr1x, originY, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
      if (telemetry.roots.r2 !== null && telemetry.natureOfRoots === "real_distinct") {
        const pr2x = originX + telemetry.roots.r2 * scale;
        ctx.beginPath();
        ctx.arc(pr2x, originY, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  exportSvg(width = 640, height = 480, theme: "dark" | "light" = "dark"): string {
    const bgColor = theme === "dark" ? "#070d1e" : "#ffffff";
    const axisColor = theme === "dark" ? "#475569" : "#cbd5e1";
    const curveColor = "#00F0FF";
    const vertexColor = "#ff5238";
    const rootColor = "#10b981";
    const textColor = theme === "dark" ? "#e2e8f0" : "#1e293b";

    const originX = width / 2;
    const originY = height / 2;
    const scale = Math.min(width / 14, height / 18);

    const telemetry = this.getTelemetry();

    // Generate curve path
    let pathD = "";
    for (let px = 0; px <= width; px += 4) {
      const x = (px - originX) / scale;
      const y = this.state.a * x * x + this.state.b * x + this.state.c;
      const py = originY - y * scale;
      if (px === 0) {
        pathD += `M ${px} ${py}`;
      } else {
        pathD += ` L ${px} ${py}`;
      }
    }

    const pvx = originX + telemetry.vertex.x * scale;
    const pvy = originY - telemetry.vertex.y * scale;

    const r1x = telemetry.roots.r1 !== null ? originX + telemetry.roots.r1 * scale : null;
    const r2x = telemetry.roots.r2 !== null ? originX + telemetry.roots.r2 * scale : null;

    const eqText = `y = ${this.state.a}x² + ${this.state.b}x + ${this.state.c}`;
    const discText = `Δ = ${telemetry.discriminant} (${telemetry.natureOfRoots})`;
    const rootsText =
      telemetry.roots.r1 !== null
        ? telemetry.roots.r2 !== null && telemetry.natureOfRoots === "real_distinct"
          ? `Roots: ${telemetry.roots.r1}, ${telemetry.roots.r2}`
          : `Root: ${telemetry.roots.r1}`
        : "No real roots";
    const vertexText = `Vertex: (${telemetry.vertex.x}, ${telemetry.vertex.y})`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bgColor}" rx="12"/>
  <line x1="0" y1="${originY}" x2="${width}" y2="${originY}" stroke="${axisColor}" stroke-width="1.5"/>
  <line x1="${originX}" y1="0" x2="${originX}" y2="${height}" stroke="${axisColor}" stroke-width="1.5"/>
  <path d="${pathD}" fill="none" stroke="${curveColor}" stroke-width="3"/>
  <circle cx="${pvx}" cy="${pvy}" r="5" fill="${vertexColor}"/>
  ${r1x !== null ? `<circle cx="${r1x}" cy="${originY}" r="5" fill="${rootColor}"/>` : ""}
  ${r2x !== null ? `<circle cx="${r2x}" cy="${originY}" r="5" fill="${rootColor}"/>` : ""}
  <g font-family="monospace, sans-serif" font-size="12" fill="${textColor}">
    <rect x="12" y="12" width="220" height="85" fill="${bgColor}" fill-opacity="0.8" rx="6" stroke="${axisColor}"/>
    <text x="20" y="30" font-weight="bold" fill="${curveColor}">${eqText}</text>
    <text x="20" y="48">${discText}</text>
    <text x="20" y="66">${rootsText}</text>
    <text x="20" y="84">${vertexText}</text>
  </g>
</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  destroy(): void {
    this.processedEventIds.clear();
  }
}

// ----------------------------------------------------------------------------
// 2. PROJECTILE MOTION SIMULATION ADAPTER (Physics - WAEC/GCSE/JAMB)
// ----------------------------------------------------------------------------

export interface ProjectileState {
  v0: number; // m/s (5 to 60)
  angleDeg: number; // deg (10 to 85)
  gravity: number; // m/s^2 (Earth: 9.8, Moon: 1.62, Mars: 3.71)
  h0: number; // launch elevation in meters (0 to 30)
  airResistance: boolean;
  active: boolean;
}

export const DEFAULT_PROJECTILE_STATE: ProjectileState = {
  v0: 25,
  angleDeg: 45,
  gravity: 9.8,
  h0: 0,
  airResistance: false,
  active: true,
};

export interface ProjectileTelemetry {
  v0: number;
  angleDeg: number;
  gravity: number;
  h0: number;
  maxHeight: number;
  timeOfFlight: number;
  totalRange: number;
  apexTime: number;
  vx: number;
  vyInitial: number;
}

export function computeProjectileTelemetry(
  state: Pick<ProjectileState, "v0" | "angleDeg" | "gravity" | "h0">
): ProjectileTelemetry {
  const { v0, angleDeg, gravity, h0 } = state;
  const g = gravity <= 0 ? 9.8 : gravity;
  const rad = (angleDeg * Math.PI) / 180;
  const vx = v0 * Math.cos(rad);
  const vy = v0 * Math.sin(rad);

  const apexTime = vy / g;
  const maxHeight = h0 + (vy * vy) / (2 * g);

  const disc = vy * vy + 2 * g * h0;
  const timeOfFlight = (vy + Math.sqrt(Math.max(0, disc))) / g;
  const totalRange = vx * timeOfFlight;

  return {
    v0,
    angleDeg,
    gravity: g,
    h0,
    maxHeight: Number(maxHeight.toFixed(2)),
    timeOfFlight: Number(timeOfFlight.toFixed(2)),
    totalRange: Number(totalRange.toFixed(2)),
    apexTime: Number(apexTime.toFixed(2)),
    vx: Number(vx.toFixed(2)),
    vyInitial: Number(vy.toFixed(2)),
  };
}

export class ProjectileMotionAdapter
  implements IStemLiveboardAdapter<ProjectileState, Partial<ProjectileState>>
{
  readonly capabilities: StemAdapterCapabilities = {
    supportsSnapshot: true,
    supportsStudentParameters: false,
    requiresWebGl: false,
    recordingMetadata: {
      title: "Projectile Motion Simulator",
      category: "Physics",
    },
  };

  private state: ProjectileState = { ...DEFAULT_PROJECTILE_STATE };
  private sequenceNumber: number = 0;
  private isHost: boolean = false;
  private processedEventIds = new Set<string>();

  getSimulationId(): string {
    return "phys-projectile-simulator";
  }

  getVersion(): string {
    return "1.0.0";
  }

  init(initialState?: Partial<ProjectileState>, isHost: boolean = false): void {
    this.state = { ...DEFAULT_PROJECTILE_STATE, ...initialState };
    this.isHost = isHost;
    this.sequenceNumber = 0;
    this.processedEventIds.clear();
  }

  createParamChangeEvent(
    sessionId: string,
    actorId: string,
    updates: Partial<ProjectileState>
  ): StemSynchronizedEvent<Partial<ProjectileState>> {
    this.sequenceNumber += 1;
    const eventId = `stem-evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const event: StemSynchronizedEvent<Partial<ProjectileState>> = {
      sessionId,
      sequenceNumber: this.sequenceNumber,
      eventId,
      idempotencyKey: eventId,
      actorId,
      actorRole: this.isHost ? "tutor" : "student",
      eventType: "STEM_PARAM_CHANGE",
      payloadSchemaVersion: 1,
      version: "1.0.0",
      payload: updates,
      timestamp: Date.now(),
    };

    this.applyEvent(event);
    return event;
  }

  applyEvent(event: StemSynchronizedEvent<Partial<ProjectileState>>): boolean {
    const key = event?.idempotencyKey || event?.eventId;
    if (!key) return false;
    if (this.processedEventIds.has(key)) return false;
    if (event.sequenceNumber < this.sequenceNumber && !this.isHost) return false;

    this.processedEventIds.add(key);
    if (event.sequenceNumber > this.sequenceNumber) {
      this.sequenceNumber = event.sequenceNumber;
    }

    this.state = { ...this.state, ...event.payload };
    return true;
  }

  getSnapshot(): ProjectileState {
    return { ...this.state };
  }

  getTelemetry(): ProjectileTelemetry {
    return computeProjectileTelemetry(this.state);
  }

  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  serialize(): Record<string, unknown> {
    return {
      state: this.getSnapshot(),
      telemetry: this.getTelemetry(),
      timestamp: Date.now(),
    };
  }

  renderToCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: "dark" | "light" = "dark"
  ): void {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#f8fafc";
    const axisColor = isDark ? "#334155" : "#cbd5e1";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";
    const trajColor = "#38bdf8"; // Light Blue
    const groundColor = isDark ? "#1e293b" : "#e2e8f0";

    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const marginX = 60;
    const marginY = 50;
    const plotWidth = width - marginX * 2;
    const plotHeight = height - marginY * 2;

    const telemetry = this.getTelemetry();
    const maxRangeTarget = Math.max(70, telemetry.totalRange * 1.15);
    const maxHeightTarget = Math.max(30, telemetry.maxHeight * 1.25);

    const scaleX = plotWidth / maxRangeTarget;
    const scaleY = plotHeight / maxHeightTarget;

    const originX = marginX;
    const originY = height - marginY;

    // Ground line
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, originY, width, height - originY);
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // Launch Platform (if h0 > 0)
    if (this.state.h0 > 0) {
      const platformH = this.state.h0 * scaleY;
      ctx.fillStyle = isDark ? "#1e293b" : "#94a3b8";
      ctx.fillRect(originX - 16, originY - platformH, 16, platformH);
      ctx.strokeStyle = axisColor;
      ctx.strokeRect(originX - 16, originY - platformH, 16, platformH);
    }

    // Trajectory Curve
    const g = telemetry.gravity;
    const rad = (telemetry.angleDeg * Math.PI) / 180;
    const vx = telemetry.vx;
    const vy = telemetry.vyInitial;
    const T = telemetry.timeOfFlight;

    ctx.strokeStyle = trajColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();

    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * T;
      const x = vx * t;
      const y = this.state.h0 + vy * t - 0.5 * g * t * t;
      const px = originX + x * scaleX;
      const py = originY - y * scaleY;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Velocity Vector Arrow at Launch
    const vLen = 40;
    const vArrX = originX + Math.cos(rad) * vLen;
    const vArrY = originY - this.state.h0 * scaleY - Math.sin(rad) * vLen;
    ctx.strokeStyle = "#ff5238";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY - this.state.h0 * scaleY);
    ctx.lineTo(vArrX, vArrY);
    ctx.stroke();

    // Apex Dot
    const apexX = originX + vx * telemetry.apexTime * scaleX;
    const apexY = originY - telemetry.maxHeight * scaleY;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(apexX, apexY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Landing Dot
    const landX = originX + telemetry.totalRange * scaleX;
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(landX, originY, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Telemetry Panel Overlay
    ctx.fillStyle = isDark ? "rgba(11, 21, 54, 0.88)" : "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "#e2e8f0";
    ctx.beginPath();
    ctx.roundRect(width - 240, 20, 220, 115, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = trajColor;
    ctx.font = "bold 12px monospace";
    ctx.fillText("PROJECTILE TELEMETRY", width - 225, 40);

    ctx.fillStyle = textColor;
    ctx.font = "11px monospace";
    ctx.fillText(`Max Height: ${telemetry.maxHeight} m`, width - 225, 60);
    ctx.fillText(`Total Range: ${telemetry.totalRange} m`, width - 225, 78);
    ctx.fillText(`Flight Time: ${telemetry.timeOfFlight} s`, width - 225, 96);
    ctx.fillText(`Gravity (g): ${telemetry.gravity} m/s²`, width - 225, 114);

    ctx.restore();
  }

  exportSvg(width = 640, height = 480, theme: "dark" | "light" = "dark"): string {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#ffffff";
    const axisColor = isDark ? "#475569" : "#cbd5e1";
    const trajColor = "#38bdf8";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";

    const marginX = 50;
    const marginY = 50;
    const originX = marginX;
    const originY = height - marginY;
    const plotWidth = width - marginX * 2;
    const plotHeight = height - marginY * 2;

    const telemetry = this.getTelemetry();
    const maxRangeTarget = Math.max(70, telemetry.totalRange * 1.15);
    const maxHeightTarget = Math.max(30, telemetry.maxHeight * 1.25);
    const scaleX = plotWidth / maxRangeTarget;
    const scaleY = plotHeight / maxHeightTarget;

    const g = telemetry.gravity;
    const vx = telemetry.vx;
    const vy = telemetry.vyInitial;
    const T = telemetry.timeOfFlight;

    let pathD = "";
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * T;
      const x = vx * t;
      const y = this.state.h0 + vy * t - 0.5 * g * t * t;
      const px = originX + x * scaleX;
      const py = originY - y * scaleY;
      if (i === 0) pathD += `M ${px} ${py}`;
      else pathD += ` L ${px} ${py}`;
    }

    const apexX = originX + vx * telemetry.apexTime * scaleX;
    const apexY = originY - telemetry.maxHeight * scaleY;
    const landX = originX + telemetry.totalRange * scaleX;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bgColor}" rx="12"/>
  <line x1="0" y1="${originY}" x2="${width}" y2="${originY}" stroke="${axisColor}" stroke-width="2"/>
  <path d="${pathD}" fill="none" stroke="${trajColor}" stroke-width="3" stroke-dasharray="5,4"/>
  <circle cx="${apexX}" cy="${apexY}" r="5" fill="#f59e0b"/>
  <circle cx="${landX}" cy="${originY}" r="6" fill="#10b981"/>
  <g font-family="monospace, sans-serif" font-size="12" fill="${textColor}">
    <rect x="${width - 240}" y="20" width="220" height="110" fill="${bgColor}" fill-opacity="0.8" rx="6" stroke="${axisColor}"/>
    <text x="${width - 225}" y="42" font-weight="bold" fill="${trajColor}">PROJECTILE TELEMETRY</text>
    <text x="${width - 225}" y="62">Max Height: ${telemetry.maxHeight} m</text>
    <text x="${width - 225}" y="80">Range: ${telemetry.totalRange} m</text>
    <text x="${width - 225}" y="98">Flight Time: ${telemetry.timeOfFlight} s</text>
    <text x="${width - 225}" y="116">Gravity: ${telemetry.gravity} m/s²</text>
  </g>
</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  destroy(): void {
    this.processedEventIds.clear();
  }
}

// ----------------------------------------------------------------------------
// 3. OHM'S LAW & DC CIRCUIT LAB ADAPTER (Physics - BL-STEM-002)
// ----------------------------------------------------------------------------

export interface OhmsLawState {
  voltage: number; // Volts (1 to 48)
  resistance: number; // Ohms (1 to 100)
  circuitType: "single" | "series" | "parallel";
  r2: number; // Second resistor in Ohms (1 to 100)
  active: boolean;
}

export const DEFAULT_OHMS_LAW_STATE: OhmsLawState = {
  voltage: 12,
  resistance: 6,
  circuitType: "single",
  r2: 6,
  active: true,
};

export interface OhmsLawTelemetry {
  voltage: number;
  equivalentResistance: number;
  currentAmps: number;
  currentMilliAmps: number;
  powerWatts: number;
  circuitType: "single" | "series" | "parallel";
  bulbBrightnessPct: number;
  thermalStatus: "cool" | "optimal" | "warm" | "overload";
}

export function computeCircuitTelemetry(
  state: Pick<OhmsLawState, "voltage" | "resistance" | "circuitType" | "r2">
): OhmsLawTelemetry {
  const { voltage, resistance, circuitType, r2 } = state;
  const v = Math.max(0.1, voltage);
  const r1 = Math.max(0.1, resistance);
  const safeR2 = Math.max(0.1, r2);

  let req = r1;
  if (circuitType === "series") {
    req = r1 + safeR2;
  } else if (circuitType === "parallel") {
    req = (r1 * safeR2) / (r1 + safeR2);
  }

  const iAmps = v / req;
  const pWatts = v * iAmps;

  let thermalStatus: "cool" | "optimal" | "warm" | "overload" = "optimal";
  if (pWatts < 2) thermalStatus = "cool";
  else if (pWatts > 40) thermalStatus = "overload";
  else if (pWatts > 20) thermalStatus = "warm";

  const bulbBrightnessPct = Math.min(100, Math.max(5, Math.round((pWatts / 24) * 100)));

  return {
    voltage: Number(v.toFixed(2)),
    equivalentResistance: Number(req.toFixed(2)),
    currentAmps: Number(iAmps.toFixed(3)),
    currentMilliAmps: Number((iAmps * 1000).toFixed(1)),
    powerWatts: Number(pWatts.toFixed(2)),
    circuitType,
    bulbBrightnessPct,
    thermalStatus,
  };
}

export class OhmsLawCircuitAdapter
  implements IStemLiveboardAdapter<OhmsLawState, Partial<OhmsLawState>>
{
  readonly capabilities: StemAdapterCapabilities = {
    supportsSnapshot: true,
    supportsStudentParameters: false,
    requiresWebGl: false,
    recordingMetadata: {
      title: "Ohm's Law & DC Circuit Lab",
      category: "Physics",
    },
  };

  private state: OhmsLawState = { ...DEFAULT_OHMS_LAW_STATE };
  private sequenceNumber: number = 0;
  private isHost: boolean = false;
  private processedEventIds = new Set<string>();

  getSimulationId(): string {
    return "phys-ohms-law-lab";
  }

  getVersion(): string {
    return "1.0.0";
  }

  init(initialState?: Partial<OhmsLawState>, isHost: boolean = false): void {
    this.state = { ...DEFAULT_OHMS_LAW_STATE, ...initialState };
    this.isHost = isHost;
    this.sequenceNumber = 0;
    this.processedEventIds.clear();
  }

  createParamChangeEvent(
    sessionId: string,
    actorId: string,
    updates: Partial<OhmsLawState>
  ): StemSynchronizedEvent<Partial<OhmsLawState>> {
    this.sequenceNumber += 1;
    const eventId = `stem-evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const event: StemSynchronizedEvent<Partial<OhmsLawState>> = {
      sessionId,
      sequenceNumber: this.sequenceNumber,
      eventId,
      idempotencyKey: eventId,
      actorId,
      actorRole: this.isHost ? "tutor" : "student",
      eventType: "STEM_PARAM_CHANGE",
      payloadSchemaVersion: 1,
      version: "1.0.0",
      payload: updates,
      timestamp: Date.now(),
    };

    this.applyEvent(event);
    return event;
  }

  applyEvent(event: StemSynchronizedEvent<Partial<OhmsLawState>>): boolean {
    const key = event?.idempotencyKey || event?.eventId;
    if (!key) return false;
    if (this.processedEventIds.has(key)) return false;
    if (event.sequenceNumber < this.sequenceNumber && !this.isHost) return false;

    this.processedEventIds.add(key);
    if (event.sequenceNumber > this.sequenceNumber) {
      this.sequenceNumber = event.sequenceNumber;
    }

    this.state = { ...this.state, ...event.payload };
    return true;
  }

  getSnapshot(): OhmsLawState {
    return { ...this.state };
  }

  getTelemetry(): OhmsLawTelemetry {
    return computeCircuitTelemetry(this.state);
  }

  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  serialize(): Record<string, unknown> {
    return {
      state: this.getSnapshot(),
      telemetry: this.getTelemetry(),
      timestamp: Date.now(),
    };
  }

  renderToCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: "dark" | "light" = "dark"
  ): void {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#f8fafc";
    const wireColor = "#38bdf8";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";

    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const telemetry = this.getTelemetry();

    // Circuit Loop Coordinates
    const x1 = 120;
    const y1 = 100;
    const x2 = width - 260;
    const y2 = height - 100;

    // Draw Conductive Wires
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // DC Voltage Battery (Left Branch)
    const batY = (y1 + y2) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(x1 - 10, batY - 30, 20, 60);

    ctx.strokeStyle = "#ff5238";
    ctx.lineWidth = 3;
    // Long plate (+)
    ctx.beginPath();
    ctx.moveTo(x1 - 18, batY - 14);
    ctx.lineTo(x1 + 18, batY - 14);
    ctx.stroke();
    // Short thick plate (-)
    ctx.beginPath();
    ctx.lineWidth = 6;
    ctx.moveTo(x1 - 10, batY + 14);
    ctx.lineTo(x1 + 10, batY + 14);
    ctx.stroke();

    ctx.fillStyle = "#ff5238";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`${telemetry.voltage}V`, x1 - 55, batY + 4);

    // Ammeter (Top Branch)
    const amX = (x1 + x2) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(amX - 25, y1 - 25, 50, 50);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(amX, y1, 20, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("A", amX, y1 + 5);
    ctx.textAlign = "left";

    // Resistors / Load (Right Branch)
    const resY = (y1 + y2) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(x2 - 20, resY - 40, 40, 80);

    // Zig-Zag Resistor Symbol
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x2, resY - 30);
    ctx.lineTo(x2 + 10, resY - 20);
    ctx.lineTo(x2 - 10, resY - 10);
    ctx.lineTo(x2 + 10, resY);
    ctx.lineTo(x2 - 10, resY + 10);
    ctx.lineTo(x2 + 10, resY + 20);
    ctx.lineTo(x2, resY + 30);
    ctx.stroke();

    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 12px monospace";
    ctx.fillText(`R: ${telemetry.equivalentResistance}Ω`, x2 + 18, resY + 4);

    // Telemetry Dashboard
    ctx.fillStyle = isDark ? "rgba(11, 21, 54, 0.92)" : "rgba(255, 255, 255, 0.92)";
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "#e2e8f0";
    ctx.beginPath();
    ctx.roundRect(width - 230, 20, 210, 160, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.fillText("CIRCUIT TELEMETRY", width - 215, 42);

    ctx.fillStyle = textColor;
    ctx.font = "11px monospace";
    ctx.fillText(`Voltage (V):   ${telemetry.voltage} V`, width - 215, 66);
    ctx.fillText(`Resistance (R):${telemetry.equivalentResistance} Ω`, width - 215, 86);
    ctx.fillText(`Current (I):   ${telemetry.currentAmps} A`, width - 215, 106);
    ctx.fillText(`Power (P):     ${telemetry.powerWatts} W`, width - 215, 126);
    ctx.fillText(`Mode:          ${telemetry.circuitType}`, width - 215, 146);
    ctx.fillText(`Thermal:       ${telemetry.thermalStatus}`, width - 215, 166);

    ctx.restore();
  }

  exportSvg(width = 640, height = 480, theme: "dark" | "light" = "dark"): string {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#ffffff";
    const wireColor = "#38bdf8";
    const axisColor = isDark ? "#475569" : "#cbd5e1";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";

    const telemetry = this.getTelemetry();
    const x1 = 100;
    const y1 = 90;
    const x2 = width - 230;
    const y2 = height - 90;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bgColor}" rx="12"/>
  <rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="none" stroke="${wireColor}" stroke-width="4"/>
  <!-- Battery -->
  <line x1="${x1 - 18}" y1="${(y1 + y2) / 2 - 12}" x2="${x1 + 18}" y2="${(y1 + y2) / 2 - 12}" stroke="#ff5238" stroke-width="3"/>
  <line x1="${x1 - 10}" y1="${(y1 + y2) / 2 + 12}" x2="${x1 + 10}" y2="${(y1 + y2) / 2 + 12}" stroke="#ff5238" stroke-width="6"/>
  <text x="${x1 - 50}" y="${(y1 + y2) / 2 + 5}" font-family="monospace" font-size="12" font-weight="bold" fill="#ff5238">${telemetry.voltage}V</text>
  <!-- Ammeter -->
  <circle cx="${(x1 + x2) / 2}" cy="${y1}" r="18" fill="${bgColor}" stroke="#10b981" stroke-width="2"/>
  <text x="${(x1 + x2) / 2 - 5}" y="${y1 + 5}" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">A</text>
  <!-- Resistor -->
  <text x="${x2 + 12}" y="${(y1 + y2) / 2 + 5}" font-family="monospace" font-size="12" font-weight="bold" fill="#f59e0b">${telemetry.equivalentResistance}Ω</text>
  <!-- Telemetry -->
  <g font-family="monospace, sans-serif" font-size="12" fill="${textColor}">
    <rect x="${width - 215}" y="20" width="195" height="150" fill="${bgColor}" fill-opacity="0.85" rx="6" stroke="${axisColor}"/>
    <text x="${width - 200}" y="42" font-weight="bold" fill="${wireColor}">CIRCUIT READOUT</text>
    <text x="${width - 200}" y="66">Voltage: ${telemetry.voltage} V</text>
    <text x="${width - 200}" y="86">Resistance: ${telemetry.equivalentResistance} Ω</text>
    <text x="${width - 200}" y="106">Current: ${telemetry.currentAmps} A</text>
    <text x="${width - 200}" y="126">Power: ${telemetry.powerWatts} W</text>
    <text x="${width - 200}" y="146">I = V / R</text>
  </g>
</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  destroy(): void {
    this.processedEventIds.clear();
  }
}

// ----------------------------------------------------------------------------
// 4. ACID-BASE TITRATION SIMULATOR ADAPTER (Chemistry - BL-STEM-002)
// ----------------------------------------------------------------------------

export interface TitrationState {
  analyte: "HCl" | "CH3COOH";
  titrant: "NaOH";
  analyteVolumeMl: number; // default 25 mL
  analyteMolarity: number; // default 0.1 M
  titrantMolarity: number; // default 0.1 M
  titrantAddedMl: number; // 0 to 50 mL
  indicator: "phenolphthalein" | "methyl_orange" | "bromothymol_blue";
  active: boolean;
}

export const DEFAULT_TITRATION_STATE: TitrationState = {
  analyte: "HCl",
  titrant: "NaOH",
  analyteVolumeMl: 25,
  analyteMolarity: 0.1,
  titrantMolarity: 0.1,
  titrantAddedMl: 0,
  indicator: "phenolphthalein",
  active: true,
};

export interface TitrationTelemetry {
  equivalenceVolumeMl: number;
  currentPh: number;
  indicatorColor: string;
  indicatorName: string;
  solutionColorName: string;
  status: "acidic" | "neutral" | "basic";
}

export function computeTitrationTelemetry(
  state: Pick<
    TitrationState,
    "analyte" | "analyteVolumeMl" | "analyteMolarity" | "titrantMolarity" | "titrantAddedMl" | "indicator"
  >
): TitrationTelemetry {
  const { analyteVolumeMl, analyteMolarity, titrantMolarity, titrantAddedMl, indicator } = state;
  const va = Math.max(1, analyteVolumeMl);
  const ma = Math.max(0.01, analyteMolarity);
  const mb = Math.max(0.01, titrantMolarity);
  const vb = Math.max(0, titrantAddedMl);

  const veq = (ma * va) / mb;

  const totalVolL = (va + vb) / 1000;
  const molesAcid = (ma * va) / 1000;
  const molesBase = (mb * vb) / 1000;

  let currentPh = 7.0;

  if (vb < veq - 0.05) {
    const excessMolesH = molesAcid - molesBase;
    const hConc = excessMolesH / totalVolL;
    currentPh = -Math.log10(Math.max(1e-7, hConc));
  } else if (vb > veq + 0.05) {
    const excessMolesOh = molesBase - molesAcid;
    const ohConc = excessMolesOh / totalVolL;
    const pOh = -Math.log10(Math.max(1e-7, ohConc));
    currentPh = 14 - pOh;
  } else {
    currentPh = 7.0;
  }

  currentPh = Number(Math.min(14, Math.max(0, currentPh)).toFixed(2));

  // Indicator color
  let indicatorColor = "#f1f5f9"; // Colorless
  let solutionColorName = "Colorless";

  if (indicator === "phenolphthalein") {
    if (currentPh >= 8.2) {
      indicatorColor = "#ec4899"; // Vibrant Pink
      solutionColorName = "Vibrant Pink";
    } else {
      indicatorColor = "#f8fafc";
      solutionColorName = "Colorless";
    }
  } else if (indicator === "methyl_orange") {
    if (currentPh < 3.1) {
      indicatorColor = "#ef4444";
      solutionColorName = "Red";
    } else if (currentPh < 4.4) {
      indicatorColor = "#f97316";
      solutionColorName = "Orange";
    } else {
      indicatorColor = "#eab308";
      solutionColorName = "Yellow";
    }
  } else {
    // bromothymol_blue
    if (currentPh < 6.0) {
      indicatorColor = "#eab308";
      solutionColorName = "Yellow";
    } else if (currentPh < 7.6) {
      indicatorColor = "#10b981";
      solutionColorName = "Green";
    } else {
      indicatorColor = "#3b82f6";
      solutionColorName = "Blue";
    }
  }

  let status: "acidic" | "neutral" | "basic" = "neutral";
  if (currentPh < 6.9) status = "acidic";
  else if (currentPh > 7.1) status = "basic";

  return {
    equivalenceVolumeMl: Number(veq.toFixed(2)),
    currentPh,
    indicatorColor,
    indicatorName: indicator,
    solutionColorName,
    status,
  };
}

export class AcidBaseTitrationAdapter
  implements IStemLiveboardAdapter<TitrationState, Partial<TitrationState>>
{
  readonly capabilities: StemAdapterCapabilities = {
    supportsSnapshot: true,
    supportsStudentParameters: false,
    requiresWebGl: false,
    recordingMetadata: {
      title: "Acid-Base Titration Simulator",
      category: "Chemistry",
    },
  };

  private state: TitrationState = { ...DEFAULT_TITRATION_STATE };
  private sequenceNumber: number = 0;
  private isHost: boolean = false;
  private processedEventIds = new Set<string>();

  getSimulationId(): string {
    return "chem-titration-simulator";
  }

  getVersion(): string {
    return "1.0.0";
  }

  init(initialState?: Partial<TitrationState>, isHost: boolean = false): void {
    this.state = { ...DEFAULT_TITRATION_STATE, ...initialState };
    this.isHost = isHost;
    this.sequenceNumber = 0;
    this.processedEventIds.clear();
  }

  createParamChangeEvent(
    sessionId: string,
    actorId: string,
    updates: Partial<TitrationState>
  ): StemSynchronizedEvent<Partial<TitrationState>> {
    this.sequenceNumber += 1;
    const eventId = `stem-evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const event: StemSynchronizedEvent<Partial<TitrationState>> = {
      sessionId,
      sequenceNumber: this.sequenceNumber,
      eventId,
      idempotencyKey: eventId,
      actorId,
      actorRole: this.isHost ? "tutor" : "student",
      eventType: "STEM_PARAM_CHANGE",
      payloadSchemaVersion: 1,
      version: "1.0.0",
      payload: updates,
      timestamp: Date.now(),
    };

    this.applyEvent(event);
    return event;
  }

  applyEvent(event: StemSynchronizedEvent<Partial<TitrationState>>): boolean {
    const key = event?.idempotencyKey || event?.eventId;
    if (!key) return false;
    if (this.processedEventIds.has(key)) return false;
    if (event.sequenceNumber < this.sequenceNumber && !this.isHost) return false;

    this.processedEventIds.add(key);
    if (event.sequenceNumber > this.sequenceNumber) {
      this.sequenceNumber = event.sequenceNumber;
    }

    this.state = { ...this.state, ...event.payload };
    return true;
  }

  getSnapshot(): TitrationState {
    return { ...this.state };
  }

  getTelemetry(): TitrationTelemetry {
    return computeTitrationTelemetry(this.state);
  }

  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  serialize(): Record<string, unknown> {
    return {
      state: this.getSnapshot(),
      telemetry: this.getTelemetry(),
      timestamp: Date.now(),
    };
  }

  renderToCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: "dark" | "light" = "dark"
  ): void {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#f8fafc";
    const axisColor = isDark ? "#334155" : "#cbd5e1";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";

    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const telemetry = this.getTelemetry();

    // Left Side: Erlenmeyer Flask with Liquid
    const flaskX = 140;
    const flaskBottomY = height - 80;
    const flaskTopY = height - 220;

    // Solution Fill
    ctx.fillStyle = telemetry.indicatorColor;
    ctx.beginPath();
    ctx.moveTo(flaskX - 50, flaskBottomY);
    ctx.lineTo(flaskX + 50, flaskBottomY);
    ctx.lineTo(flaskX + 25, flaskBottomY - 60);
    ctx.lineTo(flaskX - 25, flaskBottomY - 60);
    ctx.closePath();
    ctx.fill();

    // Flask Glass Outline
    ctx.strokeStyle = isDark ? "#94a3b8" : "#475569";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(flaskX - 15, flaskTopY);
    ctx.lineTo(flaskX - 15, flaskTopY + 40);
    ctx.lineTo(flaskX - 60, flaskBottomY);
    ctx.lineTo(flaskX + 60, flaskBottomY);
    ctx.lineTo(flaskX + 15, flaskTopY + 40);
    ctx.lineTo(flaskX + 15, flaskTopY);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${telemetry.solutionColorName}`, flaskX, flaskBottomY + 25);
    ctx.textAlign = "left";

    // Right Side: Titration pH Curve Graph
    const graphX = 260;
    const graphY = 60;
    const graphW = width - graphX - 40;
    const graphH = height - 120;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    // Axes
    ctx.beginPath();
    ctx.moveTo(graphX, graphY);
    ctx.lineTo(graphX, graphY + graphH);
    ctx.lineTo(graphX + graphW, graphY + graphH);
    ctx.stroke();

    // pH 7 Neutral Guide Line
    const ph7Y = graphY + graphH / 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#10b981";
    ctx.beginPath();
    ctx.moveTo(graphX, ph7Y);
    ctx.lineTo(graphX + graphW, ph7Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve Path
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();

    const veq = telemetry.equivalenceVolumeMl;
    for (let px = 0; px <= graphW; px += 4) {
      const vb = (px / graphW) * 50;
      let ph = 7;
      if (vb < veq - 0.2) {
        ph = 1 + (vb / veq) * 2;
      } else if (vb > veq + 0.2) {
        ph = 11 + ((vb - veq) / (50 - veq)) * 2;
      } else {
        ph = 7;
      }
      const py = graphY + graphH - (ph / 14) * graphH;
      if (px === 0) ctx.moveTo(graphX + px, py);
      else ctx.lineTo(graphX + px, py);
    }
    ctx.stroke();

    // Current Operating Dot
    const currX = graphX + (Math.min(50, this.state.titrantAddedMl) / 50) * graphW;
    const currY = graphY + graphH - (telemetry.currentPh / 14) * graphH;
    ctx.fillStyle = "#ec4899";
    ctx.beginPath();
    ctx.arc(currX, currY, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Telemetry Badge
    ctx.fillStyle = isDark ? "rgba(11, 21, 54, 0.9)" : "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle = axisColor;
    ctx.beginPath();
    ctx.roundRect(graphX + 15, graphY + 15, 210, 85, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.fillText("TITRATION METRICS", graphX + 25, graphY + 35);
    ctx.fillStyle = textColor;
    ctx.font = "11px monospace";
    ctx.fillText(`Current pH:   ${telemetry.currentPh}`, graphX + 25, graphY + 55);
    ctx.fillText(`Added NaOH:   ${this.state.titrantAddedMl} mL`, graphX + 25, graphY + 72);
    ctx.fillText(`V(equiv):     ${telemetry.equivalenceVolumeMl} mL`, graphX + 25, graphY + 89);

    ctx.restore();
  }

  exportSvg(width = 640, height = 480, theme: "dark" | "light" = "dark"): string {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#ffffff";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";
    const axisColor = isDark ? "#475569" : "#cbd5e1";

    const telemetry = this.getTelemetry();
    const graphX = 220;
    const graphY = 60;
    const graphW = width - graphX - 40;
    const graphH = height - 120;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bgColor}" rx="12"/>
  <!-- Graph Axes -->
  <line x1="${graphX}" y1="${graphY}" x2="${graphX}" y2="${graphY + graphH}" stroke="${axisColor}" stroke-width="2"/>
  <line x1="${graphX}" y1="${graphY + graphH}" x2="${graphX + graphW}" y2="${graphY + graphH}" stroke="${axisColor}" stroke-width="2"/>
  <line x1="${graphX}" y1="${graphY + graphH / 2}" x2="${graphX + graphW}" y2="${graphY + graphH / 2}" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,4"/>
  <!-- Telemetry Box -->
  <g font-family="monospace, sans-serif" font-size="12" fill="${textColor}">
    <rect x="20" y="20" width="180" height="110" fill="${bgColor}" fill-opacity="0.85" rx="6" stroke="${axisColor}"/>
    <text x="30" y="42" font-weight="bold" fill="#38bdf8">TITRATION STATUS</text>
    <text x="30" y="65">pH: ${telemetry.currentPh}</text>
    <text x="30" y="85">Color: ${telemetry.solutionColorName}</text>
    <text x="30" y="105">V(eq): ${telemetry.equivalenceVolumeMl} mL</text>
  </g>
</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  destroy(): void {
    this.processedEventIds.clear();
  }
}

// ----------------------------------------------------------------------------
// 5. GENETICS PUNNETT SQUARE LAB ADAPTER (Biology - BL-STEM-002)
// ----------------------------------------------------------------------------

export interface GeneticsState {
  maternalAlleles: [string, string];
  paternalAlleles: [string, string];
  traitName: string;
  dominantPhenotype: string;
  recessivePhenotype: string;
  active: boolean;
}

export const DEFAULT_GENETICS_STATE: GeneticsState = {
  maternalAlleles: ["B", "b"],
  paternalAlleles: ["B", "b"],
  traitName: "Eye Color",
  dominantPhenotype: "Brown Eyes",
  recessivePhenotype: "Blue Eyes",
  active: true,
};

export interface GeneticsTelemetry {
  offspringGenotypes: [string, string, string, string];
  homozygousDominantCount: number;
  heterozygousCount: number;
  homozygousRecessiveCount: number;
  dominantPhenotypePct: number;
  recessivePhenotypePct: number;
  genotypicRatio: string;
  phenotypicRatio: string;
}

export function computeGeneticsTelemetry(
  state: Pick<GeneticsState, "maternalAlleles" | "paternalAlleles">
): GeneticsTelemetry {
  const [m1, m2] = state.maternalAlleles;
  const [p1, p2] = state.paternalAlleles;

  const normalize = (a: string, b: string) => {
    return a <= b ? `${a}${b}` : `${b}${a}`;
  };

  const g1 = normalize(m1, p1);
  const g2 = normalize(m1, p2);
  const g3 = normalize(m2, p1);
  const g4 = normalize(m2, p2);

  const offspring: [string, string, string, string] = [g1, g2, g3, g4];

  let homDom = 0;
  let het = 0;
  let homRec = 0;

  offspring.forEach((g) => {
    if (g === "BB") homDom++;
    else if (g === "Bb") het++;
    else if (g === "bb") homRec++;
  });

  const domPct = ((homDom + het) / 4) * 100;
  const recPct = (homRec / 4) * 100;

  return {
    offspringGenotypes: offspring,
    homozygousDominantCount: homDom,
    heterozygousCount: het,
    homozygousRecessiveCount: homRec,
    dominantPhenotypePct: domPct,
    recessivePhenotypePct: recPct,
    genotypicRatio: `${homDom} BB : ${het} Bb : ${homRec} bb`,
    phenotypicRatio: `${domPct}% Dominant : ${recPct}% Recessive`,
  };
}

export class GeneticsPunnettAdapter
  implements IStemLiveboardAdapter<GeneticsState, Partial<GeneticsState>>
{
  readonly capabilities: StemAdapterCapabilities = {
    supportsSnapshot: true,
    supportsStudentParameters: false,
    requiresWebGl: false,
    recordingMetadata: {
      title: "Genetics & Punnett Square Lab",
      category: "Biology",
    },
  };

  private state: GeneticsState = { ...DEFAULT_GENETICS_STATE };
  private sequenceNumber: number = 0;
  private isHost: boolean = false;
  private processedEventIds = new Set<string>();

  getSimulationId(): string {
    return "bio-punnett-square-lab";
  }

  getVersion(): string {
    return "1.0.0";
  }

  init(initialState?: Partial<GeneticsState>, isHost: boolean = false): void {
    this.state = { ...DEFAULT_GENETICS_STATE, ...initialState };
    this.isHost = isHost;
    this.sequenceNumber = 0;
    this.processedEventIds.clear();
  }

  createParamChangeEvent(
    sessionId: string,
    actorId: string,
    updates: Partial<GeneticsState>
  ): StemSynchronizedEvent<Partial<GeneticsState>> {
    this.sequenceNumber += 1;
    const eventId = `stem-evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const event: StemSynchronizedEvent<Partial<GeneticsState>> = {
      sessionId,
      sequenceNumber: this.sequenceNumber,
      eventId,
      idempotencyKey: eventId,
      actorId,
      actorRole: this.isHost ? "tutor" : "student",
      eventType: "STEM_PARAM_CHANGE",
      payloadSchemaVersion: 1,
      version: "1.0.0",
      payload: updates,
      timestamp: Date.now(),
    };

    this.applyEvent(event);
    return event;
  }

  applyEvent(event: StemSynchronizedEvent<Partial<GeneticsState>>): boolean {
    const key = event?.idempotencyKey || event?.eventId;
    if (!key) return false;
    if (this.processedEventIds.has(key)) return false;
    if (event.sequenceNumber < this.sequenceNumber && !this.isHost) return false;

    this.processedEventIds.add(key);
    if (event.sequenceNumber > this.sequenceNumber) {
      this.sequenceNumber = event.sequenceNumber;
    }

    this.state = { ...this.state, ...event.payload };
    return true;
  }

  getSnapshot(): GeneticsState {
    return { ...this.state };
  }

  getTelemetry(): GeneticsTelemetry {
    return computeGeneticsTelemetry(this.state);
  }

  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  serialize(): Record<string, unknown> {
    return {
      state: this.getSnapshot(),
      telemetry: this.getTelemetry(),
      timestamp: Date.now(),
    };
  }

  renderToCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: "dark" | "light" = "dark"
  ): void {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#f8fafc";
    const cellBorder = isDark ? "#334155" : "#cbd5e1";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";

    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const telemetry = this.getTelemetry();

    // Punnett Square 2x2 Grid Coordinates
    const gridX = 140;
    const gridY = 100;
    const cellSize = 120;

    // Header Alleles
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText(this.state.paternalAlleles[0], gridX + cellSize * 0.5, gridY - 15);
    ctx.fillText(this.state.paternalAlleles[1], gridX + cellSize * 1.5, gridY - 15);

    ctx.fillStyle = "#ec4899";
    ctx.fillText(this.state.maternalAlleles[0], gridX - 25, gridY + cellSize * 0.5 + 7);
    ctx.fillText(this.state.maternalAlleles[1], gridX - 25, gridY + cellSize * 1.5 + 7);

    // 4 Cells
    const cellData = [
      { r: 0, c: 0, geno: telemetry.offspringGenotypes[0] },
      { r: 0, c: 1, geno: telemetry.offspringGenotypes[1] },
      { r: 1, c: 0, geno: telemetry.offspringGenotypes[2] },
      { r: 1, c: 1, geno: telemetry.offspringGenotypes[3] },
    ];

    cellData.forEach(({ r, c, geno }) => {
      const cx = gridX + c * cellSize;
      const cy = gridY + r * cellSize;

      ctx.fillStyle = isDark ? "rgba(30, 41, 59, 0.7)" : "rgba(241, 245, 249, 0.9)";
      ctx.fillRect(cx, cy, cellSize, cellSize);
      ctx.strokeStyle = cellBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cellSize, cellSize);

      ctx.fillStyle = geno === "bb" ? "#60a5fa" : "#f59e0b";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      ctx.fillText(geno, cx + cellSize / 2, cy + cellSize / 2 + 8);
    });

    ctx.textAlign = "left";

    // Summary Statistics Card
    ctx.fillStyle = isDark ? "rgba(11, 21, 54, 0.92)" : "rgba(255, 255, 255, 0.92)";
    ctx.strokeStyle = cellBorder;
    ctx.beginPath();
    ctx.roundRect(width - 240, 60, 220, 180, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.fillText("INHERITANCE PROBABILITY", width - 225, 85);

    ctx.fillStyle = textColor;
    ctx.font = "11px monospace";
    ctx.fillText(`Trait: ${this.state.traitName}`, width - 225, 110);
    ctx.fillText(`Homozygous Dom (BB): ${telemetry.homozygousDominantCount}`, width - 225, 130);
    ctx.fillText(`Heterozygous (Bb):   ${telemetry.heterozygousCount}`, width - 225, 150);
    ctx.fillText(`Homozygous Rec (bb): ${telemetry.homozygousRecessiveCount}`, width - 225, 170);
    ctx.fillText(`Dominant:   ${telemetry.dominantPhenotypePct}%`, width - 225, 195);
    ctx.fillText(`Recessive:  ${telemetry.recessivePhenotypePct}%`, width - 225, 215);

    ctx.restore();
  }

  exportSvg(width = 640, height = 480, theme: "dark" | "light" = "dark"): string {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#ffffff";
    const cellBorder = isDark ? "#475569" : "#cbd5e1";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";

    const telemetry = this.getTelemetry();
    const gridX = 120;
    const gridY = 90;
    const cellSize = 110;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bgColor}" rx="12"/>
  <!-- Allele Labels -->
  <text x="${gridX + cellSize * 0.5}" y="${gridY - 15}" font-family="monospace" font-size="18" font-weight="bold" fill="#38bdf8" text-anchor="middle">${this.state.paternalAlleles[0]}</text>
  <text x="${gridX + cellSize * 1.5}" y="${gridY - 15}" font-family="monospace" font-size="18" font-weight="bold" fill="#38bdf8" text-anchor="middle">${this.state.paternalAlleles[1]}</text>
  <text x="${gridX - 20}" y="${gridY + cellSize * 0.5 + 6}" font-family="monospace" font-size="18" font-weight="bold" fill="#ec4899" text-anchor="middle">${this.state.maternalAlleles[0]}</text>
  <text x="${gridX - 20}" y="${gridY + cellSize * 1.5 + 6}" font-family="monospace" font-size="18" font-weight="bold" fill="#ec4899" text-anchor="middle">${this.state.maternalAlleles[1]}</text>
  <!-- 4 Cells -->
  <rect x="${gridX}" y="${gridY}" width="${cellSize}" height="${cellSize}" fill="${bgColor}" stroke="${cellBorder}" stroke-width="2"/>
  <text x="${gridX + cellSize / 2}" y="${gridY + cellSize / 2 + 8}" font-family="monospace" font-size="22" font-weight="bold" fill="#f59e0b" text-anchor="middle">${telemetry.offspringGenotypes[0]}</text>
  <rect x="${gridX + cellSize}" y="${gridY}" width="${cellSize}" height="${cellSize}" fill="${bgColor}" stroke="${cellBorder}" stroke-width="2"/>
  <text x="${gridX + cellSize * 1.5}" y="${gridY + cellSize / 2 + 8}" font-family="monospace" font-size="22" font-weight="bold" fill="#f59e0b" text-anchor="middle">${telemetry.offspringGenotypes[1]}</text>
  <rect x="${gridX}" y="${gridY + cellSize}" width="${cellSize}" height="${cellSize}" fill="${bgColor}" stroke="${cellBorder}" stroke-width="2"/>
  <text x="${gridX + cellSize / 2}" y="${gridY + cellSize * 1.5 + 8}" font-family="monospace" font-size="22" font-weight="bold" fill="#f59e0b" text-anchor="middle">${telemetry.offspringGenotypes[2]}</text>
  <rect x="${gridX + cellSize}" y="${gridY + cellSize}" width="${cellSize}" height="${cellSize}" fill="${bgColor}" stroke="${cellBorder}" stroke-width="2"/>
  <text x="${gridX + cellSize * 1.5}" y="${gridY + cellSize * 1.5 + 8}" font-family="monospace" font-size="22" font-weight="bold" fill="#60a5fa" text-anchor="middle">${telemetry.offspringGenotypes[3]}</text>
  <!-- Summary Box -->
  <g font-family="monospace, sans-serif" font-size="12" fill="${textColor}">
    <rect x="${width - 240}" y="40" width="220" height="150" fill="${bgColor}" fill-opacity="0.85" rx="6" stroke="${cellBorder}"/>
    <text x="${width - 225}" y="65" font-weight="bold" fill="#38bdf8">PUNNETT PROBABILITY</text>
    <text x="${width - 225}" y="90">Dominant:  ${telemetry.dominantPhenotypePct}%</text>
    <text x="${width - 225}" y="110">Recessive: ${telemetry.recessivePhenotypePct}%</text>
    <text x="${width - 225}" y="130">${telemetry.genotypicRatio}</text>
  </g>
</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  destroy(): void {
    this.processedEventIds.clear();
  }
}


// ----------------------------------------------------------------------------
// 6. BOOLEAN LOGIC GATES & DIGITAL CIRCUITS ADAPTER (Engineering & Computer Studies)
// ----------------------------------------------------------------------------

export type LogicGateType = "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR";

export interface LogicGatesState {
  gateType: LogicGateType;
  inputA: 0 | 1;
  inputB: 0 | 1;
  active: boolean;
}

export const DEFAULT_LOGIC_GATES_STATE: LogicGatesState = {
  gateType: "AND",
  inputA: 1,
  inputB: 0,
  active: true,
};

export interface TruthTableRow {
  a: 0 | 1;
  b: 0 | 1;
  q: 0 | 1;
  active: boolean;
}

export interface LogicGatesTelemetry {
  gateType: LogicGateType;
  inputA: 0 | 1;
  inputB: 0 | 1;
  outputQ: 0 | 1;
  booleanExpression: string;
  truthTable: TruthTableRow[];
  statusText: string;
}

export function evaluateGate(gate: LogicGateType, a: 0 | 1, b: 0 | 1): 0 | 1 {
  switch (gate) {
    case "AND":
      return a && b ? 1 : 0;
    case "OR":
      return a || b ? 1 : 0;
    case "NOT":
      return a === 0 ? 1 : 0;
    case "NAND":
      return !(a && b) ? 1 : 0;
    case "NOR":
      return !(a || b) ? 1 : 0;
    case "XOR":
      return a !== b ? 1 : 0;
  }
}

export function computeLogicGatesTelemetry(
  state: Pick<LogicGatesState, "gateType" | "inputA" | "inputB">
): LogicGatesTelemetry {
  const { gateType, inputA, inputB } = state;
  const outputQ = evaluateGate(gateType, inputA, inputB);

  let booleanExpression = "Q = A · B";
  if (gateType === "OR") booleanExpression = "Q = A + B";
  else if (gateType === "NOT") booleanExpression = "Q = ¬A (A')";
  else if (gateType === "NAND") booleanExpression = "Q = ¬(A · B)";
  else if (gateType === "NOR") booleanExpression = "Q = ¬(A + B)";
  else if (gateType === "XOR") booleanExpression = "Q = A ⊕ B";

  const inputs: Array<[0 | 1, 0 | 1]> = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ];

  const truthTable: TruthTableRow[] = inputs.map(([a, b]) => ({
    a,
    b,
    q: evaluateGate(gateType, a, b),
    active: a === inputA && (gateType === "NOT" || b === inputB),
  }));

  return {
    gateType,
    inputA,
    inputB,
    outputQ,
    booleanExpression,
    truthTable,
    statusText: outputQ === 1 ? "HIGH (Logic 1 / 5V)" : "LOW (Logic 0 / 0V)",
  };
}

export class LogicGatesAdapter
  implements IStemLiveboardAdapter<LogicGatesState, Partial<LogicGatesState>>
{
  readonly capabilities: StemAdapterCapabilities = {
    supportsSnapshot: true,
    supportsStudentParameters: false,
    requiresWebGl: false,
    recordingMetadata: {
      title: "Boolean Logic Gates & Digital Circuits",
      category: "Engineering & Computer Studies",
    },
  };

  private state: LogicGatesState = { ...DEFAULT_LOGIC_GATES_STATE };
  private sequenceNumber: number = 0;
  private isHost: boolean = false;
  private processedEventIds = new Set<string>();

  getSimulationId(): string {
    return "eng-logic-gates-bench";
  }

  getVersion(): string {
    return "1.0.0";
  }

  init(initialState?: Partial<LogicGatesState>, isHost: boolean = false): void {
    this.state = { ...DEFAULT_LOGIC_GATES_STATE, ...initialState };
    this.isHost = isHost;
    this.sequenceNumber = 0;
    this.processedEventIds.clear();
  }

  createParamChangeEvent(
    sessionId: string,
    actorId: string,
    updates: Partial<LogicGatesState>
  ): StemSynchronizedEvent<Partial<LogicGatesState>> {
    this.sequenceNumber += 1;
    const eventId = `stem-evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const event: StemSynchronizedEvent<Partial<LogicGatesState>> = {
      sessionId,
      sequenceNumber: this.sequenceNumber,
      eventId,
      idempotencyKey: eventId,
      actorId,
      actorRole: this.isHost ? "tutor" : "student",
      eventType: "STEM_PARAM_CHANGE",
      payloadSchemaVersion: 1,
      version: "1.0.0",
      payload: updates,
      timestamp: Date.now(),
    };

    this.applyEvent(event);
    return event;
  }

  applyEvent(event: StemSynchronizedEvent<Partial<LogicGatesState>>): boolean {
    const key = event?.idempotencyKey || event?.eventId;
    if (!key) return false;
    if (this.processedEventIds.has(key)) return false;
    if (event.sequenceNumber < this.sequenceNumber && !this.isHost) return false;

    this.processedEventIds.add(key);
    if (event.sequenceNumber > this.sequenceNumber) {
      this.sequenceNumber = event.sequenceNumber;
    }

    this.state = { ...this.state, ...event.payload };
    return true;
  }

  getSnapshot(): LogicGatesState {
    return { ...this.state };
  }

  getTelemetry(): LogicGatesTelemetry {
    return computeLogicGatesTelemetry(this.state);
  }

  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  serialize(): Record<string, unknown> {
    return {
      state: this.getSnapshot(),
      telemetry: this.getTelemetry(),
      timestamp: Date.now(),
    };
  }

  renderToCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: "dark" | "light" = "dark"
  ): void {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#f8fafc";
    const wireHigh = "#10b981";
    const wireLow = isDark ? "#334155" : "#94a3b8";
    const gateBorder = isDark ? "#38bdf8" : "#0284c7";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";

    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const telemetry = this.getTelemetry();

    const gateX = 220;
    const gateY = height / 2;

    const wireAColor = this.state.inputA === 1 ? wireHigh : wireLow;
    const wireBColor = this.state.inputB === 1 ? wireHigh : wireLow;
    const outColor = telemetry.outputQ === 1 ? wireHigh : wireLow;

    // Input A line
    const inAy = gateY - 25;
    ctx.strokeStyle = wireAColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(80, inAy);
    ctx.lineTo(gateX, inAy);
    ctx.stroke();

    ctx.fillStyle = this.state.inputA === 1 ? "#10b981" : "#475569";
    ctx.beginPath();
    ctx.roundRect(40, inAy - 14, 35, 28, 6);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${this.state.inputA}`, 57, inAy + 5);

    // Input B line
    if (this.state.gateType !== "NOT") {
      const inBy = gateY + 25;
      ctx.strokeStyle = wireBColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, inBy);
      ctx.lineTo(gateX, inBy);
      ctx.stroke();

      ctx.fillStyle = this.state.inputB === 1 ? "#10b981" : "#475569";
      ctx.beginPath();
      ctx.roundRect(40, inBy - 14, 35, 28, 6);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${this.state.inputB}`, 57, inBy + 5);
    }

    // Gate symbol
    ctx.strokeStyle = gateBorder;
    ctx.fillStyle = isDark ? "#0B1536" : "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();

    if (this.state.gateType === "AND" || this.state.gateType === "NAND") {
      ctx.moveTo(gateX, gateY - 45);
      ctx.lineTo(gateX + 50, gateY - 45);
      ctx.arc(gateX + 50, gateY, 45, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(gateX, gateY + 45);
      ctx.closePath();
    } else if (this.state.gateType === "OR" || this.state.gateType === "NOR" || this.state.gateType === "XOR") {
      ctx.moveTo(gateX, gateY - 45);
      ctx.quadraticCurveTo(gateX + 40, gateY - 40, gateX + 90, gateY);
      ctx.quadraticCurveTo(gateX + 40, gateY + 40, gateX, gateY + 45);
      ctx.quadraticCurveTo(gateX + 25, gateY, gateX, gateY - 45);
      ctx.closePath();
    } else {
      ctx.moveTo(gateX, gateY - 40);
      ctx.lineTo(gateX + 70, gateY);
      ctx.lineTo(gateX, gateY + 40);
      ctx.closePath();
    }

    ctx.fill();
    ctx.stroke();

    let outStartX = gateX + 95;
    if (this.state.gateType === "NAND" || this.state.gateType === "NOR") {
      outStartX = gateX + 105;
      ctx.beginPath();
      ctx.arc(gateX + 97, gateY, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (this.state.gateType === "NOT") {
      outStartX = gateX + 82;
      ctx.beginPath();
      ctx.arc(gateX + 76, gateY, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = gateBorder;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(this.state.gateType, gateX + 35, gateY + 5);

    // Output Wire
    ctx.strokeStyle = outColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(outStartX, gateY);
    ctx.lineTo(gateX + 180, gateY);
    ctx.stroke();

    // Output LED
    const ledX = gateX + 200;
    ctx.fillStyle = telemetry.outputQ === 1 ? "#10b981" : "#475569";
    ctx.beginPath();
    ctx.arc(ledX, gateY, 18, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = telemetry.outputQ === 1 ? "#34d399" : "#64748b";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Q=${telemetry.outputQ}`, ledX, gateY + 5);

    // Truth Table Card
    const ttX = width - 240;
    const ttY = 50;
    ctx.fillStyle = isDark ? "rgba(11, 21, 54, 0.92)" : "rgba(255, 255, 255, 0.95)";
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "#e2e8f0";
    ctx.beginPath();
    ctx.roundRect(ttX, ttY, 210, 210, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`TRUTH TABLE: ${this.state.gateType}`, ttX + 15, ttY + 25);
    ctx.font = "11px monospace";
    ctx.fillStyle = textColor;
    ctx.fillText(telemetry.booleanExpression, ttX + 15, ttY + 45);

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
    ctx.fillText(" A   B  |  Q ", ttX + 25, ttY + 70);

    telemetry.truthTable.forEach((row, i) => {
      const rowY = ttY + 95 + i * 24;
      if (row.active) {
        ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
        ctx.fillRect(ttX + 10, rowY - 14, 190, 20);
        ctx.strokeStyle = "#10b981";
        ctx.strokeRect(ttX + 10, rowY - 14, 190, 20);
      }
      ctx.fillStyle = row.active ? "#34d399" : textColor;
      ctx.fillText(` ${row.a}   ${row.b}  |  ${row.q} ${row.active ? " ◄ Active" : ""}`, ttX + 25, rowY);
    });

    ctx.restore();
  }

  exportSvg(width = 640, height = 480, theme: "dark" | "light" = "dark"): string {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#070d1e" : "#ffffff";
    const wireHigh = "#10b981";
    const wireLow = isDark ? "#475569" : "#cbd5e1";
    const textColor = isDark ? "#e2e8f0" : "#1e293b";
    const gateBorder = "#38bdf8";

    const telemetry = this.getTelemetry();
    const gateX = 180;
    const gateY = height / 2;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bgColor}" rx="12"/>
  <line x1="60" y1="${gateY - 25}" x2="${gateX}" y2="${gateY - 25}" stroke="${this.state.inputA === 1 ? wireHigh : wireLow}" stroke-width="4"/>
  <text x="45" y="${gateY - 20}" font-family="monospace" font-size="14" font-weight="bold" fill="${this.state.inputA === 1 ? wireHigh : textColor}">A=${this.state.inputA}</text>
  <line x1="60" y1="${gateY + 25}" x2="${gateX}" y2="${gateY + 25}" stroke="${this.state.inputB === 1 ? wireHigh : wireLow}" stroke-width="4"/>
  <text x="45" y="${gateY + 30}" font-family="monospace" font-size="14" font-weight="bold" fill="${this.state.inputB === 1 ? wireHigh : textColor}">B=${this.state.inputB}</text>
  <rect x="${gateX}" y="${gateY - 45}" width="80" height="90" rx="10" fill="${bgColor}" stroke="${gateBorder}" stroke-width="3"/>
  <text x="${gateX + 40}" y="${gateY + 5}" font-family="monospace" font-size="16" font-weight="bold" fill="${gateBorder}" text-anchor="middle">${this.state.gateType}</text>
  <line x1="${gateX + 80}" y1="${gateY}" x2="${gateX + 160}" y2="${gateY}" stroke="${telemetry.outputQ === 1 ? wireHigh : wireLow}" stroke-width="4"/>
  <circle cx="${gateX + 180}" cy="${gateY}" r="18" fill="${telemetry.outputQ === 1 ? wireHigh : wireLow}"/>
  <text x="${gateX + 180}" y="${gateY + 5}" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">Q=${telemetry.outputQ}</text>
  <g font-family="monospace, sans-serif" font-size="12" fill="${textColor}">
    <rect x="${width - 230}" y="40" width="210" height="180" fill="${bgColor}" fill-opacity="0.85" rx="6" stroke="${gateBorder}"/>
    <text x="${width - 215}" y="65" font-weight="bold" fill="${gateBorder}">${this.state.gateType} TRUTH TABLE</text>
    <text x="${width - 215}" y="88">${telemetry.booleanExpression}</text>
    <text x="${width - 215}" y="112">A  B | Q</text>
    <text x="${width - 215}" y="132">0  0 | ${evaluateGate(this.state.gateType, 0, 0)}</text>
    <text x="${width - 215}" y="152">0  1 | ${evaluateGate(this.state.gateType, 0, 1)}</text>
    <text x="${width - 215}" y="172">1  0 | ${evaluateGate(this.state.gateType, 1, 0)}</text>
    <text x="${width - 215}" y="192">1  1 | ${evaluateGate(this.state.gateType, 1, 1)}</text>
  </g>
</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  destroy(): void {
    this.processedEventIds.clear();
  }
}
