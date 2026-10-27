import {
  getVideoProvider,
  getAllVideoProvidersStatus,
  LiveKitProvider,
  AgoraProvider,
  DailyProvider,
  StandardWebRTCProvider,
} from "../app/lib/liveClassroom/provider";
import type { LiveServicesCredentials, LiveRoomTokenRequest } from "../app/lib/liveClassroom/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

async function runTests() {
  console.log("=== BRAINLAB LIVE SERVICES SUITE ===");

  const sampleRequest: LiveRoomTokenRequest = {
    roomId: "test-room-101",
    roomName: "live_jamb_physics",
    userId: "usr_student_42",
    userName: "Emeka Chidi",
    role: "speaker",
    permissions: {
      canPublishAudio: true,
      canPublishVideo: false,
      canPublishScreen: false,
      canChat: true,
      isModerator: false,
    },
    durationSeconds: 3600,
  };

  // Test 1: WebRTC Provider (Built-in)
  console.log("\n1. Built-in Adaptive WebRTC Provider:");
  const webrtc = new StandardWebRTCProvider();
  assert(webrtc.isConfigured() === true, "WebRTC is always operational");
  assert(webrtc.getMissingConfigRequirements().length === 0, "WebRTC has no missing requirements");
  const webrtcToken = await webrtc.generateRoomToken(sampleRequest);
  assert(webrtcToken.provider === "webrtc", "WebRTC token has provider: webrtc");
  assert(webrtcToken.token.includes("."), "WebRTC token is dual-part signed payload");
  assert(webrtcToken.identity === "usr_student_42", "WebRTC token preserves user identity");

  // Test 2: LiveKit Provider with missing credentials
  console.log("\n2. LiveKit Provider configuration validation:");
  const livekitEmpty = new LiveKitProvider({});
  assert(livekitEmpty.isConfigured() === false, "LiveKit reports unconfigured when keys are missing");
  const missingLk = livekitEmpty.getMissingConfigRequirements();
  assert(missingLk.includes("LIVEKIT_API_KEY"), "Detects missing LIVEKIT_API_KEY");
  assert(missingLk.includes("LIVEKIT_API_SECRET"), "Detects missing LIVEKIT_API_SECRET");
  assert(missingLk.includes("LIVEKIT_URL"), "Detects missing LIVEKIT_URL");

  // Test 3: LiveKit Provider with valid superadmin credentials
  console.log("\n3. LiveKit token generation with Superadmin credentials:");
  const lkCreds: LiveServicesCredentials = {
    livekit_url: "wss://brainlab-live.cloud.livekit.io",
    livekit_api_key: "LK_API_TEST_KEY_999",
    livekit_api_secret: "LK_SECRET_VERY_SECURE_TOKEN_555",
  };
  const livekit = new LiveKitProvider(lkCreds);
  assert(livekit.isConfigured() === true, "LiveKit isConfigured() returns true with credentials");
  assert(livekit.getMissingConfigRequirements().length === 0, "No missing requirements with credentials");
  const lkToken = await livekit.generateRoomToken(sampleRequest);
  assert(lkToken.provider === "livekit", "LiveKit token provider matches");
  assert(lkToken.serverUrl === "wss://brainlab-live.cloud.livekit.io", "LiveKit token has configured serverUrl");
  assert(lkToken.token.split(".").length === 3, "LiveKit token is a valid 3-part JWT structure");

  // Test 4: Agora Provider with missing credentials
  console.log("\n4. Agora Provider configuration validation:");
  const agoraEmpty = new AgoraProvider({});
  assert(agoraEmpty.isConfigured() === false, "Agora reports unconfigured when App ID/Cert are missing");
  const missingAgora = agoraEmpty.getMissingConfigRequirements();
  assert(missingAgora.includes("AGORA_APP_ID"), "Detects missing AGORA_APP_ID");
  assert(missingAgora.includes("AGORA_APP_CERTIFICATE"), "Detects missing AGORA_APP_CERTIFICATE");

  // Test 5: Agora Provider with valid superadmin credentials
  console.log("\n5. Agora token generation with Superadmin credentials:");
  const agoraCreds: LiveServicesCredentials = {
    agora_app_id: "agora_test_app_id_12345",
    agora_app_certificate: "agora_test_certificate_abcdef",
  };
  const agora = new AgoraProvider(agoraCreds);
  assert(agora.isConfigured() === true, "Agora isConfigured() returns true with credentials");
  const agoraToken = await agora.generateRoomToken(sampleRequest);
  assert(agoraToken.provider === "agora", "Agora token provider is agora");
  assert(typeof agoraToken.token === "string" && agoraToken.token.length === 64, "Agora token is 256-bit hex digest");
  assert(agoraToken.serverUrl?.includes("agora_test_app_id_12345") === true, "Agora serverUrl includes App ID");

  // Test 6: Daily.co Provider
  console.log("\n6. Daily.co Provider configuration & token generation:");
  const dailyCreds: LiveServicesCredentials = {
    daily_domain: "brainlab-stage",
    daily_api_key: "daily_secret_api_key_4444",
  };
  const daily = new DailyProvider(dailyCreds);
  assert(daily.isConfigured() === true, "Daily isConfigured() returns true with credentials");
  const dailyToken = await daily.generateRoomToken(sampleRequest);
  assert(dailyToken.provider === "daily", "Daily token provider is daily");
  assert(dailyToken.serverUrl === "https://brainlab-stage.daily.co/live_jamb_physics", "Daily room serverUrl matches domain");

  // Test 7: Provider Factory & getAllVideoProvidersStatus
  console.log("\n7. Provider Factory & Status Inspection:");
  const factoryLk = getVideoProvider("livekit", lkCreds);
  assert(factoryLk.name === "livekit", "Factory returns LiveKit provider");
  assert(factoryLk.isConfigured() === true, "Factory LiveKit is configured with credentials");

  const combinedCreds: LiveServicesCredentials = {
    ...lkCreds,
    ...agoraCreds,
    ...dailyCreds,
  };
  const allStatuses = getAllVideoProvidersStatus(combinedCreds);
  assert(allStatuses.length === 4, "Returns status for all 4 providers");
  assert(allStatuses.every((s) => s.isConfigured === true), "All providers report configured when credentials provided");

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
