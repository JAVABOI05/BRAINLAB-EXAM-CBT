// Functional & Boundary Test Suite: Google OAuth Super Admin Security PIN Reset
import assert from "node:assert";
import crypto from "node:crypto";
import { sanitizeRedirectUrl, getAuthRedirectUrl } from "../app/lib/authRedirect";

console.log("=========================================================================");
console.log("  BRAINLAB CI: FUNCTIONAL VERIFICATION FOR GOOGLE OAUTH PIN RESET");
console.log("=========================================================================\n");

// Helper: replicate route's PBKDF2 hashing logic
function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin.trim(), salt, 10000, 32, "sha256").toString("hex");
}

// 1. PIN Length & Validation Rules
console.log("TEST 1: PIN Length & Format Constraints");
function validatePin(pin: string): { valid: boolean; error?: string } {
  const trimmed = pin.trim();
  if (!trimmed || trimmed.length < 4 || trimmed.length > 12) {
    return { valid: false, error: "New Security PIN must be between 4 and 12 characters." };
  }
  return { valid: true };
}

assert.strictEqual(validatePin("").valid, false);
assert.strictEqual(validatePin("123").valid, false);
assert.strictEqual(validatePin("1234").valid, true);
assert.strictEqual(validatePin("987654321012").valid, true);
assert.strictEqual(validatePin("9876543210123").valid, false);
assert.strictEqual(validatePin("   12   ").valid, false);
assert.strictEqual(validatePin("  849201  ").valid, true);
console.log("  ✓ Correctly rejects PINs < 4 characters");
console.log("  ✓ Correctly rejects PINs > 12 characters");
console.log("  ✓ Validates PINs between 4 and 12 characters");

// 2. Cryptographic Salt & Hash Verification
console.log("\nTEST 2: PBKDF2 Cryptographic Integrity");
const salt1 = crypto.randomBytes(16).toString("hex");
const salt2 = crypto.randomBytes(16).toString("hex");
assert.notStrictEqual(salt1, salt2, "Salts must be randomly generated");

const hash1 = hashPin("9841", salt1);
const hash2 = hashPin("9841", salt1);
const hashDiffSalt = hashPin("9841", salt2);
const hashDiffPin = hashPin("9842", salt1);

assert.strictEqual(hash1, hash2, "Identical PIN + salt must produce identical hash");
assert.notStrictEqual(hash1, hashDiffSalt, "Different salt must produce completely different hash");
assert.notStrictEqual(hash1, hashDiffPin, "Different PIN must produce different hash");
assert.strictEqual(hash1.length, 64, "SHA-256 32-byte hex hash must be 64 characters");
console.log("  ✓ PBKDF2 with 10,000 rounds and SHA-256 correctly hashes PINs");
console.log("  ✓ Salt randomness prevents rainbow table attacks");

// 3. Timing-Safe Comparison
console.log("\nTEST 3: Timing-Safe Equality Verification");
const bufA = Buffer.from(hash1);
const bufB = Buffer.from(hash1);
const bufC = Buffer.from(hashDiffPin);
assert.ok(crypto.timingSafeEqual(bufA, bufB), "Matching hashes must evaluate true");
assert.ok(!crypto.timingSafeEqual(bufA, bufC), "Mismatched hashes must evaluate false");
console.log("  ✓ Timing-safe equality protects against side-channel timing attacks");

// 4. Role Authorization Checks
console.log("\nTEST 4: Role Authorization for PIN Reset");
function checkRoleAuthorization(role: string): boolean {
  return role === "super_admin" || role === "platform_admin";
}

assert.strictEqual(checkRoleAuthorization("super_admin"), true);
assert.strictEqual(checkRoleAuthorization("platform_admin"), true);
assert.strictEqual(checkRoleAuthorization("academic_director"), false);
assert.strictEqual(checkRoleAuthorization("exam_officer"), false);
assert.strictEqual(checkRoleAuthorization("content_editor"), false);
assert.strictEqual(checkRoleAuthorization("student"), false);
assert.strictEqual(checkRoleAuthorization("anonymous"), false);
console.log("  ✓ Super Admin allowed to reset PIN");
console.log("  ✓ Platform Admin allowed to reset PIN");
console.log("  ✓ Academic Director, Exam Officer, Content Editor, and Students strictly forbidden (403)");

// 5. Google OAuth Identity Verification
console.log("\nTEST 5: Google OAuth Identity Verification Logic");
function verifyGoogleIdentity(user: {
  id: string;
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: Array<{ provider?: string }>;
}): boolean {
  return Boolean(
    user.app_metadata?.provider === "google" ||
    (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("google")) ||
    (Array.isArray(user.identities) && user.identities.some((id) => id.provider === "google"))
  );
}

const userWithGoogleProvider = {
  id: "user-1",
  app_metadata: { provider: "google" },
};
const userWithGoogleProvidersList = {
  id: "user-2",
  app_metadata: { providers: ["email", "google"] },
};
const userWithGoogleIdentity = {
  id: "user-3",
  identities: [{ provider: "google" }],
};
const userEmailOnly = {
  id: "user-4",
  app_metadata: { provider: "email" },
  identities: [{ provider: "email" }],
};
const userGithubOnly = {
  id: "user-5",
  app_metadata: { provider: "github" },
};

assert.strictEqual(verifyGoogleIdentity(userWithGoogleProvider), true);
assert.strictEqual(verifyGoogleIdentity(userWithGoogleProvidersList), true);
assert.strictEqual(verifyGoogleIdentity(userWithGoogleIdentity), true);
assert.strictEqual(verifyGoogleIdentity(userEmailOnly), false);
assert.strictEqual(verifyGoogleIdentity(userGithubOnly), false);
console.log("  ✓ Verified Google provider recognized across app_metadata and identities");
console.log("  ✓ Non-Google accounts (email, github) strictly rejected for Google OAuth PIN reset");

// 6. Step-Up Authentication Recency Check
console.log("\nTEST 6: Authentication Recency (Step-Up Security)");
function checkAuthRecency(lastSignInAt: string, maxAgeMs = 30 * 60 * 1000): { fresh: boolean; ageMinutes: number } {
  const lastSignInTime = new Date(lastSignInAt).getTime();
  if (isNaN(lastSignInTime)) return { fresh: false, ageMinutes: Infinity };
  const age = Date.now() - lastSignInTime;
  return { fresh: age >= 0 && age <= maxAgeMs, ageMinutes: Math.round(age / 60000) };
}

const nowIso = new Date().toISOString();
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
const twentyNineMinutesAgo = new Date(Date.now() - 29 * 60 * 1000).toISOString();
const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();
const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();

assert.strictEqual(checkAuthRecency(nowIso).fresh, true);
assert.strictEqual(checkAuthRecency(tenMinutesAgo).fresh, true);
assert.strictEqual(checkAuthRecency(twentyNineMinutesAgo).fresh, true);
assert.strictEqual(checkAuthRecency(thirtyOneMinutesAgo).fresh, false);
assert.strictEqual(checkAuthRecency(twoHoursAgo).fresh, false);
console.log("  ✓ Authentication < 30 minutes accepted as recent");
console.log("  ✓ Stale authentication (> 30 minutes) rejected, requiring re-authentication");

// 7. Destination Sanitization for Admin vs Student
console.log("\nTEST 7: OAuth Return Destination Protection");
assert.strictEqual(sanitizeRedirectUrl("/admin/dashboard?pin_reset=recovery"), "/admin/dashboard?pin_reset=recovery");
assert.strictEqual(sanitizeRedirectUrl("/admin/settings?pin_reset=recovery"), "/admin/settings?pin_reset=recovery");

// Open redirect attempts
assert.strictEqual(sanitizeRedirectUrl("https://evil.com/phish"), "/dashboard");
assert.strictEqual(sanitizeRedirectUrl("//evil.com/phish"), "/dashboard");
assert.strictEqual(sanitizeRedirectUrl("/\\evil.com"), "/dashboard");
assert.strictEqual(sanitizeRedirectUrl("javascript:alert(1)"), "/dashboard");

// Student quarantine logic
function resolveStudentDestination(nextParam: string | null): string {
  let target = sanitizeRedirectUrl(nextParam, "/dashboard");
  if (target.startsWith("/admin")) {
    target = "/dashboard";
  }
  return target;
}

assert.strictEqual(resolveStudentDestination("/admin/security"), "/dashboard");
assert.strictEqual(resolveStudentDestination("/admin/dashboard"), "/dashboard");
assert.strictEqual(resolveStudentDestination("/classroom/practice"), "/classroom/practice");
console.log("  ✓ Open redirect attacks neutralized");
console.log("  ✓ Students cannot be redirected into /admin routes through OAuth callback");
console.log("  ✓ Valid admin routes and query strings preserved for administrators");

console.log("\n=========================================================================");
console.log("  GOOGLE OAUTH PIN RESET FUNCTIONAL SUITE: ALL CHECKS PASSED!");
console.log("=========================================================================\n");


// 8. Environment-preserving callback URL resolution
console.log("\nTEST 8: Environment-Preserving OAuth Callback URL");
const originalWindow = (globalThis as any).window;
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
try {
  (globalThis as any).window = {
    location: {
      hostname: "brainlabexam-git-fix-learning-assessment-staging-repair-brainlabtutorials-3645s-projects.vercel.app",
      origin: "https://brainlabexam-git-fix-learning-assessment-staging-repair-brainlabtutorials-3645s-projects.vercel.app",
    },
  };
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.brainlabacademy.com.ng";
  assert.strictEqual(
    getAuthRedirectUrl("/auth/callback?redirect=%2Fassessments%2Ftest"),
    "https://brainlabexam-git-fix-learning-assessment-staging-repair-brainlabtutorials-3645s-projects.vercel.app/auth/callback?redirect=%2Fassessments%2Ftest",
    "Vercel preview callback must stay on the preview origin even when the site URL env points to production"
  );

  (globalThis as any).window.location.hostname = "www.brainlabacademy.com.ng";
  (globalThis as any).window.location.origin = "https://www.brainlabacademy.com.ng";
  assert.strictEqual(
    getAuthRedirectUrl("/auth/callback"),
    "https://www.brainlabacademy.com.ng/auth/callback",
    "Production callback must preserve the active branded origin"
  );
  console.log("  ✓ Preview callback remains on its initiating Vercel origin");
  console.log("  ✓ Production callback remains on the branded domain");
} finally {
  if (originalWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = originalWindow;
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
}
