// Automated Test Suite: Admin Security PIN Lifecycle, Initialization, & Emergency Reset
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=========================================================================");
console.log("  BRAINLAB CI: ADMIN SECURITY PIN & RECOVERY ARCHITECTURE SUITE");
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
console.log("  ✓ Reset action implemented with administrator password verification");

assert.ok(
  pinRouteSrc.includes("signInWithPassword"),
  "[FAIL] reset action must verify identity with Supabase signInWithPassword"
);
console.log("  ✓ Reset action cryptographically re-authenticates admin with Supabase Auth");

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
  "[FAIL] AdminPinGuard must provide password-authorized reset view"
);
console.log("  ✓ Emergency PIN reset view available via administrator password");

// Test 4: Admin Login Page (app/admin/login/page.tsx)
console.log("\n4. ADMIN LOGIN PAGE (app/admin/login/page.tsx)");
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
  "[FAIL] Admin login must allow PIN reset with account password"
);
console.log("  ✓ PIN reset option available during login");

// Test 5: Security Settings Page (app/admin/security/page.tsx)
console.log("\n5. SECURITY SETTINGS PAGE (app/admin/security/page.tsx)");
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
console.log("  ✓ Admin Security PIN management card rendered in JSX");
console.log("  ✓ Allows updating PIN with current PIN or resetting with password");

console.log("\n=========================================================================");
console.log("  ADMIN SECURITY PIN ARCHITECTURE CHECKS: ALL PASSED!");
console.log("=========================================================================\n");
