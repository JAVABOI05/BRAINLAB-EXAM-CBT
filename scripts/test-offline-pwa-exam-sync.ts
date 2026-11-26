process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key";

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// Mock window and localStorage for Node test runner BEFORE importing offlineSync
const storageMap = new Map<string, string>();
const mockLocalStorage: Storage = {
  getItem: (k: string) => storageMap.get(k) || null,
  setItem: (k: string, v: string) => { storageMap.set(k, String(v)); },
  removeItem: (k: string) => { storageMap.delete(k); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] || null,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = {
  localStorage: mockLocalStorage,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).CustomEvent = class {
  detail: unknown;
  constructor(public type: string, init?: { detail?: unknown }) {
    this.detail = init?.detail;
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */

console.log("=========================================================================");
console.log("  BRAINLAB CI: OFFLINE PWA EXAM SYNC & RECOVERY VERIFICATION");
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
  const {
    queueExamSubmission,
    getQueuedSubmission,
    clearQueuedSubmission,
    queueProgress,
    getQueuedProgress,
    clearQueuedProgress,
    hasPendingOfflineData,
    saveExamLocalSnapshot,
    getExamLocalSnapshot,
    clearExamLocalSnapshot,
    getBackoffDelayMs,
  } = await import("../app/lib/offlineSync");

  console.log("1. PWA SERVICE WORKER CACHING & OFFLINE RESILIENCE");

  await test("Service worker is updated to v1.4 and precaches essential shell and offline fallback", () => {
    const swPath = path.resolve(process.cwd(), "public/sw.js");
    const code = fs.readFileSync(swPath, "utf8");

    assert.ok(code.includes("brainlab-pwa-v1.4"), "Cache name upgraded to brainlab-pwa-v1.4");
    assert.ok(code.includes("/offline.html"), "Precache assets contain /offline.html");
    assert.ok(code.includes("/manifest.json"), "Precache assets contain /manifest.json");
    assert.ok(code.includes("woff2"), "Static asset caching covers woff2 fonts");
    assert.ok(code.includes("url.pathname.startsWith(\"/api/\")"), "Excludes API routes from stale cache");
    assert.ok(code.includes("url.hostname.includes(\"supabase.co\")"), "Excludes Supabase calls from stale cache");
  });

  console.log("\n2. DURABLE OFFLINE SUBMISSION QUEUE");

  await test("Queuing exam submission assigns idempotency key, sets retryCount=0, and persists", () => {
    mockLocalStorage.clear();

    assert.strictEqual(hasPendingOfflineData(), false);

    queueExamSubmission({
      sessionId: "session_mock_101",
      token: "jwt_token_abc",
      answers: { "q-1": "B", "q-2": "C" },
      autoSubmitted: false,
      flagged: { "q-2": true },
    });

    assert.strictEqual(hasPendingOfflineData(), true);

    const queued = getQueuedSubmission();
    assert.ok(queued !== null);
    assert.strictEqual(queued?.sessionId, "session_mock_101");
    assert.strictEqual(queued?.answers["q-1"], "B");
    assert.strictEqual(queued?.retryCount, 0);
    assert.ok(queued?.idempotencyKey?.startsWith("session_mock_101_"));
    assert.ok((queued?.queuedAt ?? 0) > 0);

    clearQueuedSubmission();
    assert.strictEqual(getQueuedSubmission(), null);
    assert.strictEqual(hasPendingOfflineData(), false);
  });

  console.log("\n3. PROGRESS QUEUE OPERATION");

  await test("Queuing intermediate answers persists and clears cleanly", () => {
    mockLocalStorage.clear();

    queueProgress("session_prog_1", "tok_xyz", { "q-1": "A" });
    assert.strictEqual(hasPendingOfflineData(), true);

    const prog = getQueuedProgress();
    assert.ok(prog !== null);
    assert.strictEqual(prog?.sessionId, "session_prog_1");
    assert.strictEqual(prog?.answers["q-1"], "A");

    clearQueuedProgress();
    assert.strictEqual(getQueuedProgress(), null);
    assert.strictEqual(hasPendingOfflineData(), false);
  });

  console.log("\n4. OFFLINE EXAM SNAPSHOT LOCAL RECOVERY");

  await test("Active exam snapshot safely saves, retrieves, and clears for device recovery", () => {
    mockLocalStorage.clear();

    const mockSnapshot = {
      examTitle: "UTME 2026 Mathematics Practice",
      durationSeconds: 3600,
      questions: [
        { id: 1, text: "Solve for x in 2x + 6 = 14", options: { A: "2", B: "4", C: "6", D: "8" } },
      ],
    };

    saveExamLocalSnapshot("session_snap_99", mockSnapshot);

    const recovered = getExamLocalSnapshot<typeof mockSnapshot>("session_snap_99");
    assert.ok(recovered !== null);
    assert.strictEqual(recovered?.examTitle, "UTME 2026 Mathematics Practice");
    assert.strictEqual(recovered?.questions.length, 1);
    assert.strictEqual(recovered?.questions[0].id, 1);

    clearExamLocalSnapshot("session_snap_99");
    assert.strictEqual(getExamLocalSnapshot("session_snap_99"), null);
  });

  console.log("\n5. EXPONENTIAL BACKOFF TIMING");

  await test("getBackoffDelayMs computes exponential delay with jitter and maximum cap", () => {
    const delay0 = getBackoffDelayMs(0);
    assert.ok(delay0 >= 1000 && delay0 <= 1600, `Expected 1000-1600, got ${delay0}`);

    const delay1 = getBackoffDelayMs(1);
    assert.ok(delay1 >= 2000 && delay1 <= 2600, `Expected 2000-2600, got ${delay1}`);

    const delay2 = getBackoffDelayMs(2);
    assert.ok(delay2 >= 4000 && delay2 <= 4600, `Expected 4000-4600, got ${delay2}`);

    const delayMax = getBackoffDelayMs(10);
    assert.ok(delayMax <= 30600, `Expected <= 30600, got ${delayMax}`);
  });

  console.log("\n6. OFFLINE SYNC MANAGER UI INTEGRITY & S7 AUDIT");

  await test("OfflineSyncManager contains accessible ARIA attributes and zero hardcoded figures", () => {
    const uiPath = path.resolve(process.cwd(), "app/components/OfflineSyncManager.tsx");
    const code = fs.readFileSync(uiPath, "utf8");

    assert.ok(code.includes('aria-live="polite"'), "Contains polite aria-live banner");
    assert.ok(code.includes("syncQueuedExam"), "Triggers syncQueuedExam on reconnection");
    assert.ok(code.includes("Offline Mode Active"), "Displays clear offline mode heading");
    assert.ok(!code.includes("50,000+"), "Zero invented marketing stats in sync manager");
  });

  console.log("\n=========================================================================");
  console.log(`  OFFLINE PWA EXAM SYNC SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
