import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { getLiveClassroomConfig } from "@/app/lib/platformConfig";
import { readLiveConfigServer, writeLiveConfigServer } from "@/app/lib/liveClassroom/serverConfig";
import { getVideoProvider, getAllVideoProvidersStatus } from "@/app/lib/liveClassroom/provider";
import type { VideoProviderType, LiveServicesCredentials } from "@/app/lib/liveClassroom/types";

export const dynamic = "force-dynamic";

async function verifySuperAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { error: "Unauthorized. Please sign in as an administrator.", status: 401, user: null };
  }

  const role = await resolveAdminRole(user.id);

  if (role !== "super_admin" && role !== "platform_admin") {
    return {
      error: "Access denied. Only the Super Administrator can configure external live streaming services.",
      status: 403,
      user: null,
    };
  }

  return { error: null, status: 200, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySuperAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const config = await readLiveConfigServer();
    const creds = config.provider_credentials || {};

    const safeCredentials = {
      livekit_url: creds.livekit_url || "",
      livekit_api_key: creds.livekit_api_key || "",
      has_livekit_secret: Boolean(creds.livekit_api_secret || process.env.LIVEKIT_API_SECRET),
      agora_app_id: creds.agora_app_id || "",
      has_agora_certificate: Boolean(creds.agora_app_certificate || process.env.AGORA_APP_CERTIFICATE),
      daily_domain: creds.daily_domain || "",
      has_daily_api_key: Boolean(creds.daily_api_key || process.env.DAILY_API_KEY),
      webrtc_ice_servers: creds.webrtc_ice_servers || "",
    };

    return NextResponse.json({
      success: true,
      provider: config.provider || "webrtc",
      credentials: safeCredentials,
      statuses: getAllVideoProvidersStatus(creds),
    });
  } catch (err: unknown) {
    console.error("[admin/live-services] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load live service settings." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySuperAdmin(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || "save";
    const currentConfig = await readLiveConfigServer();
    const currentCreds = currentConfig.provider_credentials || {};

    if (action === "test") {
      const targetProvider: VideoProviderType = (body.testProvider || body.provider || currentConfig.provider || "webrtc") as VideoProviderType;
      const incomingCreds: Partial<LiveServicesCredentials> = body.credentials || {};

      // Merge transient credentials with current configured secrets
      const testCreds: LiveServicesCredentials = {
        livekit_url: incomingCreds.livekit_url?.trim() || currentCreds.livekit_url,
        livekit_api_key: incomingCreds.livekit_api_key?.trim() || currentCreds.livekit_api_key,
        livekit_api_secret:
          incomingCreds.livekit_api_secret && incomingCreds.livekit_api_secret !== "••••••••"
            ? incomingCreds.livekit_api_secret.trim()
            : currentCreds.livekit_api_secret,
        agora_app_id: incomingCreds.agora_app_id?.trim() || currentCreds.agora_app_id,
        agora_app_certificate:
          incomingCreds.agora_app_certificate && incomingCreds.agora_app_certificate !== "••••••••"
            ? incomingCreds.agora_app_certificate.trim()
            : currentCreds.agora_app_certificate,
        daily_domain: incomingCreds.daily_domain?.trim() || currentCreds.daily_domain,
        daily_api_key:
          incomingCreds.daily_api_key && incomingCreds.daily_api_key !== "••••••••"
            ? incomingCreds.daily_api_key.trim()
            : currentCreds.daily_api_key,
        webrtc_ice_servers: incomingCreds.webrtc_ice_servers?.trim() || currentCreds.webrtc_ice_servers,
      };

      const providerInstance = getVideoProvider(targetProvider, testCreds);
      if (!providerInstance.isConfigured()) {
        const missing = providerInstance.getMissingConfigRequirements();
        return NextResponse.json(
          {
            success: false,
            error: `Missing required ${targetProvider.toUpperCase()} parameters: ${missing.join(", ")}`,
          },
          { status: 400 }
        );
      }

      // Generate a test room token to verify cryptographic signature validity
      const tokenResult = await providerInstance.generateRoomToken({
        roomId: "admin-live-test",
        roomName: "brainlab_verification_room",
        userId: auth.user.id,
        userName: "SuperAdmin Diagnostic",
        role: "host",
        permissions: {
          isModerator: true,
          canPublishAudio: true,
          canPublishVideo: true,
          canPublishScreen: true,
          canChat: true,
        },
        durationSeconds: 300,
      });

      return NextResponse.json({
        success: true,
        message: `${targetProvider.toUpperCase()} service test succeeded! Valid room token signed.`,
        tokenPreview: tokenResult.token ? `${tokenResult.token.slice(0, 32)}...` : undefined,
        serverUrl: tokenResult.serverUrl,
        expiresAt: tokenResult.expiresAt,
        provider: targetProvider,
      });
    }

    if (action === "save") {
      const incomingProvider = body.provider as VideoProviderType | undefined;
      const incomingCreds: Partial<LiveServicesCredentials> = body.credentials || {};

      // Merge and preserve existing secrets if unchanged/masked
      const updatedCreds: LiveServicesCredentials = {
        livekit_url: incomingCreds.livekit_url !== undefined ? incomingCreds.livekit_url.trim() : (currentCreds.livekit_url || ""),
        livekit_api_key: incomingCreds.livekit_api_key !== undefined ? incomingCreds.livekit_api_key.trim() : (currentCreds.livekit_api_key || ""),
        livekit_api_secret:
          incomingCreds.livekit_api_secret && incomingCreds.livekit_api_secret !== "••••••••"
            ? incomingCreds.livekit_api_secret.trim()
            : currentCreds.livekit_api_secret,
        agora_app_id: incomingCreds.agora_app_id !== undefined ? incomingCreds.agora_app_id.trim() : (currentCreds.agora_app_id || ""),
        agora_app_certificate:
          incomingCreds.agora_app_certificate && incomingCreds.agora_app_certificate !== "••••••••"
            ? incomingCreds.agora_app_certificate.trim()
            : currentCreds.agora_app_certificate,
        daily_domain: incomingCreds.daily_domain !== undefined ? incomingCreds.daily_domain.trim() : (currentCreds.daily_domain || ""),
        daily_api_key:
          incomingCreds.daily_api_key && incomingCreds.daily_api_key !== "••••••••"
            ? incomingCreds.daily_api_key.trim()
            : currentCreds.daily_api_key,
        webrtc_ice_servers: incomingCreds.webrtc_ice_servers !== undefined ? incomingCreds.webrtc_ice_servers.trim() : (currentCreds.webrtc_ice_servers || ""),
      };

      const updatedProvider = incomingProvider || currentConfig.provider || "webrtc";

      await writeLiveConfigServer({
        ...currentConfig,
        provider: updatedProvider,
        provider_credentials: updatedCreds,
      });

      return NextResponse.json({
        success: true,
        message: "Live video & audio service settings updated successfully.",
        provider: updatedProvider,
        statuses: getAllVideoProvidersStatus(updatedCreds),
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    console.error("[admin/live-services] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process live service configuration." },
      { status: 500 }
    );
  }
}
