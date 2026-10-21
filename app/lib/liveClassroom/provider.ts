import crypto from "crypto";
import type {
  VideoProviderType,
  LiveRoomTokenRequest,
  LiveRoomTokenResponse,
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

  isConfigured(): boolean {
    return Boolean(
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.LIVEKIT_URL
    );
  }

  getMissingConfigRequirements(): string[] {
    const missing: string[] = [];
    if (!process.env.LIVEKIT_API_KEY) missing.push("LIVEKIT_API_KEY");
    if (!process.env.LIVEKIT_API_SECRET) missing.push("LIVEKIT_API_SECRET");
    if (!process.env.LIVEKIT_URL) missing.push("LIVEKIT_URL");
    return missing;
  }

  async generateRoomToken(request: LiveRoomTokenRequest): Promise<LiveRoomTokenResponse> {
    const expiresAt = new Date(
      Date.now() + (request.durationSeconds || 7200) * 1000
    ).toISOString();

    if (!this.isConfigured()) {
      throw new Error(
        `LiveKit is selected but missing configuration: ${this.getMissingConfigRequirements().join(", ")}. Please configure environment variables or use the standard WebRTC provider.`
      );
    }

    // Header & Payload for LiveKit JWT
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      sub: request.userId,
      name: request.userName,
      iss: process.env.LIVEKIT_API_KEY,
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
      .createHmac("sha256", process.env.LIVEKIT_API_SECRET!)
      .update(`${b64Header}.${b64Payload}`)
      .digest("base64url");

    const token = `${b64Header}.${b64Payload}.${signature}`;

    return {
      token,
      provider: "livekit",
      serverUrl: process.env.LIVEKIT_URL,
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

  isConfigured(): boolean {
    return Boolean(
      process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE
    );
  }

  getMissingConfigRequirements(): string[] {
    const missing: string[] = [];
    if (!process.env.AGORA_APP_ID) missing.push("AGORA_APP_ID");
    if (!process.env.AGORA_APP_CERTIFICATE) missing.push("AGORA_APP_CERTIFICATE");
    return missing;
  }

  async generateRoomToken(request: LiveRoomTokenRequest): Promise<LiveRoomTokenResponse> {
    const expiresAt = new Date(
      Date.now() + (request.durationSeconds || 7200) * 1000
    ).toISOString();

    if (!this.isConfigured()) {
      throw new Error(
        `Agora is selected but missing configuration: ${this.getMissingConfigRequirements().join(", ")}. Please configure environment variables or use the standard WebRTC provider.`
      );
    }

    const appId = process.env.AGORA_APP_ID!;
    const appCert = process.env.AGORA_APP_CERTIFICATE!;
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

  isConfigured(): boolean {
    return Boolean(process.env.DAILY_API_KEY && process.env.DAILY_DOMAIN);
  }

  getMissingConfigRequirements(): string[] {
    const missing: string[] = [];
    if (!process.env.DAILY_API_KEY) missing.push("DAILY_API_KEY");
    if (!process.env.DAILY_DOMAIN) missing.push("DAILY_DOMAIN");
    return missing;
  }

  async generateRoomToken(request: LiveRoomTokenRequest): Promise<LiveRoomTokenResponse> {
    const expiresAt = new Date(
      Date.now() + (request.durationSeconds || 7200) * 1000
    ).toISOString();

    if (!this.isConfigured()) {
      throw new Error(
        `Daily.co is selected but missing configuration: ${this.getMissingConfigRequirements().join(", ")}. Please configure environment variables or use the standard WebRTC provider.`
      );
    }

    const token = crypto
      .createHmac("sha256", process.env.DAILY_API_KEY!)
      .update(`${process.env.DAILY_DOMAIN}:${request.roomName}:${request.userId}`)
      .digest("hex");

    return {
      token,
      provider: "daily",
      serverUrl: `https://${process.env.DAILY_DOMAIN}.daily.co/${request.roomName}`,
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
export function getVideoProvider(providerType?: VideoProviderType): IVideoProvider {
  switch (providerType) {
    case "livekit":
      return new LiveKitProvider();
    case "agora":
      return new AgoraProvider();
    case "daily":
      return new DailyProvider();
    case "webrtc":
    default:
      return new StandardWebRTCProvider();
  }
}

export function getAllVideoProvidersStatus() {
  const providers: IVideoProvider[] = [
    new StandardWebRTCProvider(),
    new LiveKitProvider(),
    new AgoraProvider(),
    new DailyProvider(),
  ];

  return providers.map((p) => ({
    name: p.name,
    isConfigured: p.isConfigured(),
    missingConfig: p.getMissingConfigRequirements(),
  }));
}
