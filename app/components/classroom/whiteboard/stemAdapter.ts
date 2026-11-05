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
