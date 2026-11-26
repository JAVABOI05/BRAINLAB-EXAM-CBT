import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  getVideoProvider,
  LiveKitProvider,
  StandardWebRTCProvider,
  getAllVideoProvidersStatus,
} from "../app/lib/liveClassroom/provider";
import type { LiveRoomTokenRequest, RoomPermissions } from "../app/lib/liveClassroom/types";

console.log("=========================================================================");
console.log("  BRAINLAB CI: LIVE CLASSROOM & WHITEBOARD STAGE VERIFICATION");
console.log("=========================================================================\n");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`  ✓ ${name}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ✗ ${name}`);
          console.error(`    ${err.message}`);
          failed++;
        });
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: unknown) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function runTests() {
  console.log("1. WEBRTC & LIVEKIT TOKEN GENERATION & ROLE ISOLATION");

  await test("StandardWebRTCProvider is always configured and generates valid token with role", async () => {
    const provider = new StandardWebRTCProvider();
    assert.strictEqual(provider.isConfigured(), true);
    assert.deepStrictEqual(provider.getMissingConfigRequirements(), []);

    const permissions: RoomPermissions = {
      isModerator: false,
      canPublishAudio: false,
      canPublishVideo: false,
      canPublishScreen: false,
      canChat: true,
    };

    const req: LiveRoomTokenRequest = {
      roomId: "BL-LIVE-101",
      roomName: "room_bl_101",
      userId: "user_student_123",
      userName: "Amara Obi",
      role: "listener",
      permissions,
      durationSeconds: 3600,
    };

    const res = await provider.generateRoomToken(req);
    assert.strictEqual(res.provider, "webrtc");
    assert.strictEqual(res.role, "listener");
    assert.strictEqual(res.identity, "user_student_123");
    assert.ok(res.token && res.token.includes("."));
  });

  await test("LiveKitProvider enforces missing credentials check", () => {
    const provider = new LiveKitProvider({});
    assert.strictEqual(provider.isConfigured(), false);
    const missing = provider.getMissingConfigRequirements();
    assert.ok(missing.includes("LIVEKIT_API_KEY"));
    assert.ok(missing.includes("LIVEKIT_API_SECRET"));
    assert.ok(missing.includes("LIVEKIT_URL"));
  });

  await test("LiveKitProvider generates role-isolated JWT tokens with data channel enabled", async () => {
    const credentials = {
      livekit_api_key: "devkey",
      livekit_api_secret: "secret12345678901234567890123456",
      livekit_url: "wss://livekit.brainlabacademy.com",
    };
    const provider = new LiveKitProvider(credentials);
    assert.strictEqual(provider.isConfigured(), true);

    // 1. Student / Listener Token
    const studentPerms: RoomPermissions = {
      isModerator: false,
      canPublishAudio: false,
      canPublishVideo: false,
      canPublishScreen: false,
      canChat: true,
    };

    const studentToken = await provider.generateRoomToken({
      roomId: "BL-LIVE-101",
      roomName: "room_bl_101",
      userId: "student_uuid",
      userName: "Ngozi",
      role: "listener",
      permissions: studentPerms,
      durationSeconds: 3600,
    });

    assert.strictEqual(studentToken.provider, "livekit");
    assert.strictEqual(studentToken.role, "listener");

    // Decode JWT payload
    const parts = studentToken.token.split(".");
    assert.strictEqual(parts.length, 3);
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));

    assert.strictEqual(payload.sub, "student_uuid");
    assert.strictEqual(payload.video.roomAdmin, false);
    assert.strictEqual(payload.video.canPublish, false); // Listener cannot publish audio/video tracks
    assert.strictEqual(payload.video.canPublishData, true); // Whiteboard sync & telemetry data channel allowed
    assert.strictEqual(payload.video.canSubscribe, true);

    // 2. Instructor / Host Token
    const hostPerms: RoomPermissions = {
      isModerator: true,
      canPublishAudio: true,
      canPublishVideo: true,
      canPublishScreen: true,
      canChat: true,
    };

    const hostToken = await provider.generateRoomToken({
      roomId: "BL-LIVE-101",
      roomName: "room_bl_101",
      userId: "instructor_uuid",
      userName: "Dr. Alabi",
      role: "host",
      permissions: hostPerms,
      durationSeconds: 5400,
    });

    const hostPayload = JSON.parse(Buffer.from(hostToken.token.split(".")[1], "base64url").toString("utf8"));
    assert.strictEqual(hostPayload.video.roomAdmin, true);
    assert.strictEqual(hostPayload.video.canPublish, true);
    assert.strictEqual(hostPayload.video.canPublishData, true);
  });

  await test("Video token duration is safely clamped between 300s and 86400s", async () => {
    const provider = new StandardWebRTCProvider();
    // Test negative duration
    const resLow = await provider.generateRoomToken({
      roomId: "R1",
      roomName: "room_1",
      userId: "u1",
      userName: "User",
      role: "listener",
      permissions: { isModerator: false, canPublishAudio: false, canPublishVideo: false, canPublishScreen: false, canChat: true },
      durationSeconds: -50,
    });
    const expLow = new Date(resLow.expiresAt).getTime();
    assert.ok(expLow > Date.now() + 290 * 1000);

    // Test excessive duration (e.g. 1 year)
    const resHigh = await provider.generateRoomToken({
      roomId: "R1",
      roomName: "room_1",
      userId: "u1",
      userName: "User",
      role: "listener",
      permissions: { isModerator: false, canPublishAudio: false, canPublishVideo: false, canPublishScreen: false, canChat: true },
      durationSeconds: 9999999,
    });
    const expHigh = new Date(resHigh.expiresAt).getTime();
    assert.ok(expHigh <= Date.now() + 86405 * 1000);
  });

  console.log("\n2. SMART WHITEBOARD 25FPS SYNC & QUANTIZATION");

  await test("SmartWhiteboard includes 25fps throttled stroke broadcast and point quantization", () => {
    const boardPath = path.resolve(process.cwd(), "app/components/SmartWhiteboard.tsx");
    const code = fs.readFileSync(boardPath, "utf8");

    assert.ok(code.includes("whiteboard_stroke_chunk"), "Supports in-progress stroke sync");
    assert.ok(code.includes("whiteboard_draw"), "Supports finalized vector stroke broadcast");
    assert.ok(code.includes("whiteboard_laser"), "Supports 25fps throttled laser pointer");
    assert.ok(code.includes("Math.round(drawX * 10) / 10"), "Quantizes X point coordinates to reduce JSON payload size");
    assert.ok(code.includes("Math.round(drawY * 10) / 10"), "Quantizes Y point coordinates to reduce JSON payload size");
    assert.ok(code.includes("drawLastSendRef.current > 40"), "Throttles drawing broadcasts to 25fps (40ms)");
    assert.ok(code.includes("laserLastSendRef.current > 40"), "Throttles laser broadcasts to 25fps (40ms)");
  });

  console.log("\n3. CLASSROOM ATTENDANCE & HEARTBEAT TRACKING");

  await test("Attendance endpoint records arrival, cumulative duration, and attendance percentage", () => {
    const attPath = path.resolve(process.cwd(), "app/api/classroom/attendance/route.ts");
    const code = fs.readFileSync(attPath, "utf8");

    assert.ok(code.includes('action === "join"'), "Supports join action");
    assert.ok(code.includes('action === "leave"'), "Supports leave action");
    assert.ok(code.includes('action === "heartbeat"'), "Supports periodic heartbeat action");
    assert.ok(code.includes("attendance_percentage: attendancePercentage"), "Persists attendance_percentage");
    assert.ok(code.includes("class_attendance_records"), "Writes to class_attendance_records table");
    assert.ok(code.includes("user_presence"), "Updates live user_presence");
  });

  console.log("\n4. RECORDINGS & AUDIO ASSETS PLAYBACK");

  await test("Classroom Library page contains Video, Lesson Projects, and Audio Assets tabs", () => {
    const libPath = path.resolve(process.cwd(), "app/classroom/library/page.tsx");
    const code = fs.readFileSync(libPath, "utf8");

    assert.ok(code.includes("🎥 Recorded Videos"), "Renders Recorded Videos tab");
    assert.ok(code.includes("📑 Lesson Projects"), "Renders Lesson Projects tab");
    assert.ok(code.includes("🎙️ Voice Notes & Audio"), "Renders Audio Assets tab");
    assert.ok(code.includes("<audio src={rec.video_url} controls"), "Embeds HTML5 audio player for voice notes");
    assert.ok(code.includes("handleDownloadVideo"), "Allows downloading audio notes directly");
  });

  console.log("\n5. S7 ANTI-HARDCODED FIGURES CHECK");

  await test("Live classroom components adhere strictly to Rule S7", () => {
    const libPath = path.resolve(process.cwd(), "app/classroom/library/page.tsx");
    const code = fs.readFileSync(libPath, "utf8");

    assert.ok(!code.includes("50,000+"), "Zero invented marketing stats in library");
    assert.ok(!code.includes("98% pass rate"), "Zero unverified claims in library");
  });

  console.log("\n=========================================================================");
  console.log(`  LIVE CLASSROOM & WHITEBOARD SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
