import crypto from "crypto";
import type {
  VideoProviderType,
  LiveRoomTokenRequest,
  LiveRoomTokenResponse,
  LiveServicesCredentials,
} from "./types";

export interface IVideoProvider {
  name: VideoProviderType;
  isConfigured(): boolean;
  getMissingConfigRequirements(): string[];
  generateRoomToken(request: LiveRoomTokenRequest): Promise<LiveRoomTokenResponse>;
}

// ----------------------------------------------------------------------------
// 1. Built-in Adaptive WebRTC Provider (Zero External Credential Requirement)
// ----------------------------------------------------------------------------
export class StandardWebRTCProvider implements IVideoProvider {
  name: VideoProviderType = "webrtc";

  constructor(protected credentials?: LiveServicesCredentials) {}

  isConfigured(): boolean {
    return true; // Always operational using browser standard WebRTC
  }

  getMissingConfigRequirements(): string[] {
    return [];
  }

  async generateRoomToken(request: LiveRoomTokenRequest): Promise<LiveRoomTokenResponse> {
    const expiresAt = new Date(
      Date.now() + (request.durationSeconds || 7200) * 1000
    ).toISOString();

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "brainlab-webrtc-room-secret";
    const payload = JSON.stringify({
      roomId: request.roomId,
      roomName: request.roomName,
      userId: request.userId,
      userName: request.userName,
      role: request.role,
      permissions: request.permissions,
      iceServers: this.credentials?.webrtc_ice_servers || "default",
      expiresAt,
    });

    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const token = `${Buffer.from(payload).toString("base64")}.${signature}`;

    return {
      token,
      provider: "webrtc",
      roomName: request.roomName,
      expiresAt,
      identity: request.userId,
      permissions: request.permissions,
    };
  }
}

// ----------------------------------------------------------------------------
// 2. LiveKit Provider
// ----------------------------------------------------------------------------
export class LiveKitProvider implements IVideoProvider {
  name: VideoProviderType = "livekit";

  constructor(protected credentials?: LiveServicesCredentials) {}

  private get apiKey(): string {
    return this.credentials?.livekit_api_key?.trim() || process.env.LIVEKIT_API_KEY || "";
  }

  private get apiSecret(): string {
    return this.credentials?.livekit_api_secret?.trim() || process.env.LIVEKIT_API_SECRET || "";
  }

  private get serverUrl(): string {
    return this.credentials?.livekit_url?.trim() || process.env.LIVEKIT_URL || "";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiSecret && this.serverUrl);
  }

  getMissingConfigRequirements(): string[] {
    const missing: string[] = [];
    if (!this.apiKey) missing.push("LIVEKIT_API_KEY");
    if (!this.apiSecret) missing.push("LIVEKIT_API_SECRET");
    if (!this.serverUrl) missing.push("LIVEKIT_URL");
    return missing;
  }

  async generateRoomToken(request: LiveRoomTokenRequest): Promise<LiveRoomTokenResponse> {
    const expiresAt = new Date(
      Date.now() + (request.durationSeconds || 7200) * 1000
    ).toISOString();

    if (!this.isConfigured()) {
      throw new Error(
        `LiveKit is selected but missing configuration: ${this.getMissingConfigRequirements().join(", ")}. Please configure in Super Admin settings or environment variables.`
      );
    }

    // Header & Payload for LiveKit JWT
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      sub: request.userId,
      name: request.userName,
      iss: this.apiKey,
      exp: Math.floor(Date.now() / 1000) + (request.durationSeconds || 7200),
      video: {
        room: request.roomName,
        roomJoin: true,
        canPublish: request.permissions.canPublishAudio || request.permissions.canPublishVideo,
        canPublishData: request.permissions.canChat,
        canSubscribe: true,
        roomAdmin: request.role === "host",
      },
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(`${b64Header}.${b64Payload}`)
      .digest("base64url");

    const token = `${b64Header}.${b64Payload}.${signature}`;

    return {
      token,
      provider: "livekit",
      serverUrl: this.serverUrl,
      roomName: request.roomName,
      expiresAt,
      identity: request.userId,
      permissions: request.permissions,
    };
  }
}

// ----------------------------------------------------------------------------
// 3. Agora Provider
// ----------------------------------------------------------------------------
export class AgoraProvider implements IVideoProvider {
  name: VideoProviderType = "agora";

  constructor(protected credentials?: LiveServicesCredentials) {}

  private get appId(): string {
    return this.credentials?.agora_app_id?.trim() || process.env.AGORA_APP_ID || "";
  }

  private get appCert(): string {
    return this.credentials?.agora_app_certificate?.trim() || process.env.AGORA_APP_CERTIFICATE || "";
  }

  isConfigured(): boolean {
    return Boolean(this.appId && this.appCert);
  }

  getMissingConfigRequirements(): string[] {
    const missing: string[] = [];
    if (!this.appId) missing.push("AGORA_APP_ID");
    if (!this.appCert) missing.push("AGORA_APP_CERTIFICATE");
    return missing;
  }

  async generateRoomToken(request: LiveRoomTokenRequest): Promise<LiveRoomTokenResponse> {
    const expiresAt = new Date(
      Date.now() + (request.durationSeconds || 7200) * 1000
    ).toISOString();

    if (!this.isConfigured()) {
      throw new Error(
        `Agora is selected but missing configuration: ${this.getMissingConfigRequirements().join(", ")}. Please configure in Super Admin settings or environment variables.`
      );
    }

    const appId = this.appId;
    const appCert = this.appCert;
    const token = crypto
      .createHmac("sha256", appCert)
      .update(`${appId}:${request.roomName}:${request.userId}:${expiresAt}`)
      .digest("hex");

    return {
      token,
      provider: "agora",
      serverUrl: `https://web.agora.io/${appId}`,
      roomName: request.roomName,
      expiresAt,
      identity: request.userId,
      permissions: request.permissions,
    };
  }
}

// ----------------------------------------------------------------------------
// 4. Daily.co Provider
// ----------------------------------------------------------------------------
export class DailyProvider implements IVideoProvider {
  name: VideoProviderType = "daily";

  constructor(protected credentials?: LiveServicesCredentials) {}

  private get apiKey(): string {
    return this.credentials?.daily_api_key?.trim() || process.env.DAILY_API_KEY || "";
  }

  private get domain(): string {
    return this.credentials?.daily_domain?.trim() || process.env.DAILY_DOMAIN || "";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.domain);
  }

  getMissingConfigRequirements(): string[] {
    const missing: string[] = [];
    if (!this.apiKey) missing.push("DAILY_API_KEY");
    if (!this.domain) missing.push("DAILY_DOMAIN");
    return missing;
  }

  async generateRoomToken(request: LiveRoomTokenRequest): Promise<LiveRoomTokenResponse> {
    const expiresAt = new Date(
      Date.now() + (request.durationSeconds || 7200) * 1000
    ).toISOString();

    if (!this.isConfigured()) {
      throw new Error(
        `Daily.co is selected but missing configuration: ${this.getMissingConfigRequirements().join(", ")}. Please configure in Super Admin settings or environment variables.`
      );
    }

    const token = crypto
      .createHmac("sha256", this.apiKey)
      .update(`${this.domain}:${request.roomName}:${request.userId}`)
      .digest("hex");

    return {
      token,
      provider: "daily",
      serverUrl: `https://${this.domain}.daily.co/${request.roomName}`,
      roomName: request.roomName,
      expiresAt,
      identity: request.userId,
      permissions: request.permissions,
    };
  }
}

// ----------------------------------------------------------------------------
// Provider Factory & Inspection
// ----------------------------------------------------------------------------
export function getVideoProvider(
  providerType?: VideoProviderType,
  credentials?: LiveServicesCredentials
): IVideoProvider {
  switch (providerType) {
    case "livekit":
      return new LiveKitProvider(credentials);
    case "agora":
      return new AgoraProvider(credentials);
    case "daily":
      return new DailyProvider(credentials);
    case "webrtc":
    default:
      return new StandardWebRTCProvider(credentials);
  }
}

export function getAllVideoProvidersStatus(credentials?: LiveServicesCredentials) {
  const providers: IVideoProvider[] = [
    new StandardWebRTCProvider(credentials),
    new LiveKitProvider(credentials),
    new AgoraProvider(credentials),
    new DailyProvider(credentials),
  ];

  return providers.map((p) => ({
    name: p.name,
    isConfigured: p.isConfigured(),
    missingConfig: p.getMissingConfigRequirements(),
  }));
}
