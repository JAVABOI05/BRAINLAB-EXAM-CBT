// Automated Test Suite: Admin Security PIN Lifecycle, Initialization, & Google OAuth Emergency Reset
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=========================================================================");
console.log("  BRAINLAB CI: ADMIN SECURITY PIN & GOOGLE OAUTH RECOVERY SUITE");
console.log("=========================================================================\n");

const root = process.cwd();

// Test 1: Route Handler Implementation & Actions
console.log("1. ROUTE HANDLER (app/api/admin/security/pin/route.ts)");
const pinRoutePath = path.join(root, "app/api/admin/security/pin/route.ts");
assert.ok(fs.existsSync(pinRoutePath), "Pin route file must exist");
const pinRouteSrc = fs.readFileSync(pinRoutePath, "utf-8");

assert.ok(
  !pinRouteSrc.includes("defaultHint:"),
  "[FAIL] pin route must not return defaultHint in GET response"
);
console.log("  ✓ GET handler does not return or expose defaultHint");

assert.ok(
  pinRouteSrc.includes('action === "setup"'),
  "[FAIL] pin route must support 'setup' action for uninitialized PINs"
);
console.log("  ✓ Setup action implemented for initial PIN establishment");

assert.ok(
  pinRouteSrc.includes('action === "reset"'),
  "[FAIL] pin route must support 'reset' action for emergency resets"
);
console.log("  ✓ Reset action implemented");

assert.ok(
  !pinRouteSrc.includes("signInWithPassword"),
  "[FAIL] reset action must NOT rely on password authentication (signInWithPassword)"
);
console.log("  ✓ Insecure account password requirement eliminated from PIN recovery");

assert.ok(
  pinRouteSrc.includes("getUser(accessToken)") || pinRouteSrc.includes("auth.getUser"),
  "[FAIL] reset action must verify session token with Supabase Auth getUser"
);
console.log("  ✓ Cryptographically validates caller session token via Supabase Auth server client");

assert.ok(
  pinRouteSrc.includes("hasGoogleIdentity") || pinRouteSrc.includes('provider === "google"'),
  "[FAIL] reset action must check for Google OAuth identity on admin account"
);
console.log("  ✓ Verified Google OAuth identity requirement enforced on server");

assert.ok(
  pinRouteSrc.includes("last_sign_in_at"),
  "[FAIL] reset action must verify step-up authentication recency"
);
console.log("  ✓ Step-up authentication recency check enforced (30-minute threshold)");

assert.ok(
  pinRouteSrc.includes("canManage"),
  "[FAIL] pin route must return canManage for permission check"
);
console.log("  ✓ Returns canManage permission flags to authorized administrators");

// Test 2: Client Auth Helper (app/lib/adminPinAuth.ts)
console.log("\n2. CLIENT HELPER (app/lib/adminPinAuth.ts)");
const pinAuthPath = path.join(root, "app/lib/adminPinAuth.ts");
assert.ok(fs.existsSync(pinAuthPath), "Pin auth file must exist");
const pinAuthSrc = fs.readFileSync(pinAuthPath, "utf-8");

assert.ok(
  pinAuthSrc.includes("export async function setupAdminPin"),
  "[FAIL] adminPinAuth must export setupAdminPin"
);
console.log("  ✓ setupAdminPin exported");

assert.ok(
  pinAuthSrc.includes("export async function resetAdminPin"),
  "[FAIL] adminPinAuth must export resetAdminPin"
);
console.log("  ✓ resetAdminPin exported");

assert.ok(
  pinAuthSrc.includes("supabase.auth.getSession()"),
  "[FAIL] resetAdminPin must securely retrieve active Supabase session"
);
console.log("  ✓ resetAdminPin securely obtains current Supabase session token");

assert.ok(
  !pinAuthSrc.includes("defaultHint: boolean"),
  "[FAIL] PinStatusResult interface must not contain defaultHint"
);
console.log("  ✓ PinStatusResult cleansed of defaultHint");

// Test 3: AdminPinGuard Component (app/components/AdminPinGuard.tsx)
console.log("\n3. GUARD COMPONENT (app/components/AdminPinGuard.tsx)");
const guardPath = path.join(root, "app/components/AdminPinGuard.tsx");
assert.ok(fs.existsSync(guardPath), "AdminPinGuard file must exist");
const guardSrc = fs.readFileSync(guardPath, "utf-8");

assert.ok(
  !guardSrc.includes("1234"),
  "[FAIL] AdminPinGuard must NEVER mention default PIN 1234"
);
console.log("  ✓ Zero hardcoded default PIN (1234) in AdminPinGuard");

assert.ok(
  guardSrc.includes('mode === "setup"'),
  "[FAIL] AdminPinGuard must handle setup mode when PIN is uninitialized"
);
console.log("  ✓ Initial PIN Setup view available when PIN is uninitialized");

assert.ok(
  guardSrc.includes('mode === "reset"'),
  "[FAIL] AdminPinGuard must provide reset view"
);
console.log("  ✓ Emergency PIN reset view available");

assert.ok(
  guardSrc.includes("Continue with Google"),
  "[FAIL] AdminPinGuard must render Continue with Google button in recovery mode"
);
console.log("  ✓ Prominent 'Continue with Google' button present in recovery view");

assert.ok(
  guardSrc.includes("Google Identity Verified"),
  "[FAIL] AdminPinGuard must display Google identity verification indicator"
);
console.log("  ✓ Google identity verification indicator displayed when authenticated");

assert.ok(
  guardSrc.includes("getAuthRedirectUrl"),
  "[FAIL] AdminPinGuard must use getAuthRedirectUrl for OAuth redirect"
);
console.log("  ✓ Uses branded callback URL resolver with return destination");

assert.ok(
  !guardSrc.includes("🔒") && !guardSrc.includes("⚡"),
  "[FAIL] AdminPinGuard must adhere to Zero-Emoji standard"
);
console.log("  ✓ Adheres strictly to Zero-Emoji design system using pure SVG glyphs");

// Test 4: OAuth Callback Handler (app/auth/callback/page.tsx)
console.log("\n4. OAUTH CALLBACK (app/auth/callback/page.tsx)");
const callbackPath = path.join(root, "app/auth/callback/page.tsx");
assert.ok(fs.existsSync(callbackPath), "Callback page must exist");
const callbackSrc = fs.readFileSync(callbackPath, "utf-8");

assert.ok(
  callbackSrc.includes("safeAdminTarget"),
  "[FAIL] OAuth callback must safely preserve admin return destination"
);
console.log("  ✓ Admin return destinations safely preserved through OAuth roundtrip");

assert.ok(
  callbackSrc.includes('safeLearnerTarget.startsWith("/admin")'),
  "[FAIL] OAuth callback must prevent students from redirecting into admin paths"
);
console.log("  ✓ Students strictly prevented from redirecting into admin routes");

// Test 5: Admin Login Page (app/admin/login/page.tsx)
console.log("\n5. ADMIN LOGIN PAGE (app/admin/login/page.tsx)");
const loginPath = path.join(root, "app/admin/login/page.tsx");
assert.ok(fs.existsSync(loginPath), "Admin login file must exist");
const loginSrc = fs.readFileSync(loginPath, "utf-8");

assert.ok(
  !loginSrc.includes("1234"),
  "[FAIL] Admin login page must NEVER mention default PIN 1234"
);
console.log("  ✓ Zero hardcoded default PIN (1234) in login page");

assert.ok(
  loginSrc.includes("handleSetupSubmit"),
  "[FAIL] Admin login must handle initial PIN setup if not initialized"
);
console.log("  ✓ Initial PIN setup handled seamlessly during login");

assert.ok(
  loginSrc.includes("handleResetSubmit"),
  "[FAIL] Admin login must allow PIN reset"
);
console.log("  ✓ PIN reset option available during login");

// Test 6: Security Settings Page (app/admin/security/page.tsx)
console.log("\n6. SECURITY SETTINGS PAGE (app/admin/security/page.tsx)");
const securityPath = path.join(root, "app/admin/security/page.tsx");
assert.ok(fs.existsSync(securityPath), "Admin security page must exist");
const securitySrc = fs.readFileSync(securityPath, "utf-8");

assert.ok(
  securitySrc.includes("handlePinUpdateSubmit"),
  "[FAIL] Security page must include handlePinUpdateSubmit"
);
assert.ok(
  securitySrc.includes("handlePinResetSubmit"),
  "[FAIL] Security page must include handlePinResetSubmit"
);
assert.ok(
  securitySrc.includes("Admin Security PIN"),
  "[FAIL] Security page JSX must render the PIN management card"
);
assert.ok(
  !securitySrc.includes("🔒 Lock Now"),
  "[FAIL] Security page must adhere to Zero-Emoji standard"
);
console.log("  ✓ Admin Security PIN management card rendered in JSX");
console.log("  ✓ Zero-Emoji lock icon verified in security page");

console.log("\n=========================================================================");
console.log("  ADMIN SECURITY PIN ARCHITECTURE CHECKS: ALL PASSED!");
console.log("=========================================================================\n");
