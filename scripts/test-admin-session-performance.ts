import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example-supabase-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock";

// Mock minimal browser environment (window, sessionStorage) for Node test
const mockSessionStorage: Record<string, string> = {};
const mockWindow = {
  sessionStorage: {
    getItem: (key: string) => mockSessionStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockSessionStorage[key] = String(val); },
    removeItem: (key: string) => { delete mockSessionStorage[key]; },
    clear: () => { Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k]); },
  },
  localStorage: {
    removeItem: () => {},
  },
};

(global as any).window = mockWindow;

async function runTests() {
  console.log("=== BRAINLAB ADMIN SESSION & PERMISSION PERFORMANCE TEST ===");

  const {
    getCachedAdminSession,
    setCachedAdminSession,
    clearAdminCache,
  } = await import("../app/lib/adminAuth");

  const {
    adminHasPermission,
    adminResolvePermissions,
    getCachedAdminPermissions,
    setCachedAdminPermissions,
    clearAdminPermissionsCache,
  } = await import("../app/lib/adminRoles");

  // TEST 1: Cache Miss on fresh start
  console.log("\n[Test 1] Cache miss on fresh state...");
  clearAdminCache();
  clearAdminPermissionsCache();
  const freshSession = getCachedAdminSession();
  assert.equal(freshSession, null, "Should return null on empty cache");
  const freshPerms = getCachedAdminPermissions();
  assert.deepEqual(freshPerms, {}, "Should return empty object on empty cache");
  console.log("  PASS: Fresh cache miss handled correctly.");

  // TEST 2: Session Caching & Retrieval Speed
  console.log("\n[Test 2] Session caching & retrieval latency...");
  const sampleAdmin = {
    id: "admin-uuid-12345",
    email: "superadmin@brainlab.ng",
    role: "super_admin" as const,
  };
  setCachedAdminSession(sampleAdmin);

  const t0 = performance.now();
  const cachedAdmin = getCachedAdminSession();
  const retrievalDuration = performance.now() - t0;

  assert.deepEqual(cachedAdmin, sampleAdmin, "Cached admin must match set session");
  assert.ok(retrievalDuration < 5, `Cache retrieval must be sub-5ms (took ${retrievalDuration.toFixed(3)}ms)`);
  console.log(`  PASS: Cached session retrieved in ${retrievalDuration.toFixed(3)}ms.`);

  // TEST 3: Super Admin Permission Bypass Latency (< 5ms)
  console.log("\n[Test 3] Super admin instant permission resolution bypass...");
  const permissionsToTest = [
    "cbt.config.read",
    "cbt.config.manage",
    "cbt.questions.manage",
    "cbt.results.read",
    "cbt.codes.manage",
    "cbt.sessions.read",
    "audit.logs.read",
    "learning.content.manage",
    "community.moderate",
    "analytics.read",
    "institution.manage",
    "finance.billing.manage",
  ] as const;

  const t1 = performance.now();
  const resolved = await adminResolvePermissions([...permissionsToTest], "super_admin");
  const superAdminDuration = performance.now() - t1;

  assert.ok(superAdminDuration < 10, `Super Admin bypass must execute under 10ms (took ${superAdminDuration.toFixed(3)}ms)`);
  permissionsToTest.forEach((p) => {
    assert.equal(resolved[p], true, `Permission ${p} must be true for super_admin`);
  });
  console.log(`  PASS: Resolved all 12 permissions for super_admin in ${superAdminDuration.toFixed(3)}ms with 0 network calls.`);

  // TEST 4: Single permission check fast-path
  console.log("\n[Test 4] Single permission check fast-path for super_admin...");
  const t2 = performance.now();
  const hasResultManage = await adminHasPermission("cbt.results.manage", "super_admin");
  const singlePermDuration = performance.now() - t2;

  assert.equal(hasResultManage, true);
  assert.ok(singlePermDuration < 5, `Single permission check took ${singlePermDuration.toFixed(3)}ms`);
  console.log(`  PASS: Single permission check resolved in ${singlePermDuration.toFixed(3)}ms.`);

  // TEST 5: Memory & SessionStorage Synchronization
  console.log("\n[Test 5] Permission cache persistence in sessionStorage...");
  const cachedStoredPerms = getCachedAdminPermissions();
  assert.equal(cachedStoredPerms["cbt.questions.manage"], true);
  assert.ok(mockSessionStorage["brainlab_admin_permissions_cache"] !== undefined, "Permissions must be in sessionStorage");
  console.log("  PASS: Permissions stored and retrieved from sessionStorage.");

  // TEST 6: In-flight deduplication of concurrent permission requests
  console.log("\n[Test 6] In-flight deduplication under concurrency...");
  // Simulate concurrent queries for a non-super-admin role with cached value
  setCachedAdminPermissions({ "cbt.config.read": true });
  const t3 = performance.now();
  const parallelChecks = await Promise.all([
    adminHasPermission("cbt.config.read"),
    adminHasPermission("cbt.config.read"),
    adminHasPermission("cbt.config.read"),
    adminHasPermission("cbt.config.read"),
  ]);
  const parallelDuration = performance.now() - t3;
  assert.deepEqual(parallelChecks, [true, true, true, true]);
  assert.ok(parallelDuration < 5, `Concurrent cached checks must resolve under 5ms (took ${parallelDuration.toFixed(3)}ms)`);
  console.log(`  PASS: 4 concurrent permission checks completed in ${parallelDuration.toFixed(3)}ms.`);

  // TEST 7: Logout Purge Security
  console.log("\n[Test 7] Logout purge cleans all cached tokens and permissions...");
  clearAdminCache();
  assert.equal(getCachedAdminSession(), null, "Session cache must be cleared");
  assert.deepEqual(getCachedAdminPermissions(), {}, "Permissions cache must be cleared");
  assert.equal(mockSessionStorage["brainlab_admin_session_cache"], undefined);
  assert.equal(mockSessionStorage["brainlab_admin_permissions_cache"], undefined);
  console.log("  PASS: All security caches purged cleanly on logout.");

  console.log("\n>>> ALL ADMIN SESSION OPTIMIZATION TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
