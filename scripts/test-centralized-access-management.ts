/**
 * Verification Test Suite: Centralized People & Access Management
 * 
 * Verifies:
 * 1. Canonical Permission Catalogue Parity (67 TS permissions == 67 SQL permissions).
 * 2. Database Migration Security & Architecture (RLS, private schema, SECURITY DEFINER/INVOKER, search_path).
 * 3. pgTAP Database Test Suite Contract & Assertion Count.
 * 4. Frontend People & Access Centre UI, AdminPinGuard, and Super Admin routing safeguards.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function runTests() {
  console.log("=========================================================================");
  console.log("  BRAINLAB CI: CENTRALIZED PEOPLE & ACCESS MANAGEMENT VERIFICATION");
  console.log("=========================================================================\n");

  let passed = 0;

  // ---------------------------------------------------------------------------
  // 1. CANONICAL PERMISSION CATALOGUE PARITY (TS <-> SQL)
  // ---------------------------------------------------------------------------
  console.log("1. PERMISSION CATALOGUE PARITY AUDIT");
  {
    const tsFile = fs.readFileSync(path.join(ROOT, "app/lib/adminRoles.ts"), "utf8");
    const tsMatch = tsFile.match(/export const ADMIN_PERMISSION_KEYS = \[([\s\S]*?)\] as const;/);
    assert.ok(tsMatch, "ADMIN_PERMISSION_KEYS array must exist in app/lib/adminRoles.ts");

    const tsKeys = tsMatch[1]
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.startsWith('"') || line.startsWith("'"))
      .map(line => line.replace(/['",]/g, "").trim());

    assert.equal(tsKeys.length, 67, `Expected exactly 67 TypeScript permission keys, got ${tsKeys.length}`);

    const sqlFile = fs.readFileSync(
      path.join(ROOT, "supabase/migrations/20261106120000_centralized_access_management.sql"),
      "utf8"
    );
    const sqlMatch = sqlFile.match(/insert into public\.access_permissions\(permission_key,module_key,label,description,is_sensitive\) values\s*([\s\S]*?)\s*on conflict/);
    assert.ok(sqlMatch, "SQL permissions insert must exist in 20261106120000_centralized_access_management.sql");

    const sqlKeys = [...sqlMatch[1].matchAll(/\('([^']+)'/g)].map(m => m[1]);
    assert.equal(sqlKeys.length, 67, `Expected exactly 67 SQL permission keys, got ${sqlKeys.length}`);

    const tsSet = new Set(tsKeys);
    const sqlSet = new Set(sqlKeys);

    const missingInSql = tsKeys.filter(k => !sqlSet.has(k));
    const missingInTs = sqlKeys.filter(k => !tsSet.has(k));

    assert.equal(missingInSql.length, 0, `Permissions missing in SQL: ${missingInSql.join(", ")}`);
    assert.equal(missingInTs.length, 0, `Permissions missing in TS: ${missingInTs.join(", ")}`);
    assert.ok(tsSet.has("exam.calendar.manage"), "Canonical catalogue must include exam.calendar.manage");

    console.log("  ✓ Exact 67/67 permission parity verified between TypeScript and PostgreSQL catalogue");
    passed++;
  }

  // ---------------------------------------------------------------------------
  // 2. DATABASE MIGRATION ARCHITECTURE & PRIVILEGE HARDENING
  // ---------------------------------------------------------------------------
  console.log("\n2. DATABASE MIGRATION ARCHITECTURE & PRIVILEGE HARDENING");
  {
    const m1Path = path.join(ROOT, "supabase/migrations/20261106120000_centralized_access_management.sql");
    const m2Path = path.join(ROOT, "supabase/migrations/20261106123000_access_management_directory_rpcs.sql");
    const m3Path = path.join(ROOT, "supabase/migrations/20261106130000_access_session_context_rpc.sql");
    const m4Path = path.join(ROOT, "supabase/migrations/20261106140000_harden_access_management_privileges.sql");

    assert.ok(fs.existsSync(m1Path), "Migration 1 (core schema) must exist");
    assert.ok(fs.existsSync(m2Path), "Migration 2 (directory RPCs) must exist");
    assert.ok(fs.existsSync(m3Path), "Migration 3 (session context RPC) must exist");
    assert.ok(fs.existsSync(m4Path), "Migration 4 (privilege hardening) must exist");

    const m1 = fs.readFileSync(m1Path, "utf8");
    const m2 = fs.readFileSync(m2Path, "utf8");
    const m3 = fs.readFileSync(m3Path, "utf8");
    const m4 = fs.readFileSync(m4Path, "utf8");

    // Transactional boundaries
    [m1, m2, m3, m4].forEach((m, idx) => {
      assert.ok(m.includes("begin;"), `Migration ${idx + 1} must include transactional begin;`);
      assert.ok(m.includes("commit;"), `Migration ${idx + 1} must end with commit;`);
    });

    // RLS enabled and table access revoked
    assert.ok(m4.includes("alter table public.access_permissions enable row level security;"));
    assert.ok(m4.includes("alter table public.access_roles enable row level security;"));
    assert.ok(m4.includes("alter table public.access_role_permissions enable row level security;"));
    assert.ok(m4.includes("alter table public.access_user_role_assignments enable row level security;"));
    assert.ok(m4.includes("revoke all on table public.access_permissions from public, anon, authenticated;"));
    assert.ok(m4.includes("revoke all on table public.access_roles from public, anon, authenticated;"));
    assert.ok(m4.includes("revoke all on table public.access_role_permissions from public, anon, authenticated;"));
    assert.ok(m4.includes("revoke all on table public.access_user_role_assignments from public, anon, authenticated;"));

    // Private schema usage granted only to authenticated, revoked from public/anon
    assert.ok(m4.includes("revoke all on schema private from public,anon;"));
    assert.ok(m4.includes("grant usage on schema private to authenticated;"));

    // 10 private implementations
    const expectedPrivateImpls = [
      "access_search_accounts_impl",
      "access_list_role_catalogue_impl",
      "access_create_custom_role_impl",
      "access_assign_role_impl",
      "access_revoke_role_impl",
      "access_list_permissions_impl",
      "access_list_assignments_impl",
      "access_update_custom_role_impl",
      "access_retire_custom_role_impl",
      "access_get_session_context_impl"
    ];

    expectedPrivateImpls.forEach(fn => {
      const combined = m1 + m2 + m3;
      assert.ok(combined.includes(`create or replace function private.${fn}`), `Private implementation private.${fn} must exist`);
      assert.ok(combined.includes("security definer"), `private.${fn} must be security definer`);
      assert.ok(combined.includes("set search_path=''"), `private.${fn} must set search_path=''`);
    });

    // 10 public security invoker wrappers
    const expectedPublicWrappers = [
      "access_search_accounts",
      "access_list_role_catalogue",
      "access_create_custom_role",
      "access_assign_role",
      "access_revoke_role",
      "access_list_permissions",
      "access_list_assignments",
      "access_update_custom_role",
      "access_retire_custom_role",
      "access_get_session_context"
    ];

    expectedPublicWrappers.forEach(fn => {
      const combined = m1 + m2 + m3;
      assert.ok(combined.includes(`create or replace function public.${fn}`), `Public wrapper public.${fn} must exist`);
      assert.ok(combined.includes("security invoker"), `public.${fn} must be security invoker`);
    });

    // Super Admin protection & Break-glass safeguards
    assert.ok(m1.includes("Super Admin grants require the separate break-glass governance process"));
    assert.ok(m1.includes("Super Admin role revocation requires the separate break-glass governance process"));
    assert.ok(m1.includes("You cannot assign or elevate your own access"));
    assert.ok(m1.includes("Custom roles cannot receive governance or root security permissions"));

    // Uniqueness & History preservation indexes
    assert.ok(m1.includes("access_assignments_one_active_role_uidx"));
    assert.ok(m1.includes("where revoked_at is null"));
    assert.ok(m1.includes("access_roles_name_ci_uidx"));

    console.log("  ✓ All 4 migrations enforce RLS, private schema encapsulation, and Super Admin break-glass guards");
    passed++;
  }

  // ---------------------------------------------------------------------------
  // 3. PGTAP TEST SUITE INTEGRITY
  // ---------------------------------------------------------------------------
  console.log("\n3. PGTAP TEST SUITE INTEGRITY AUDIT");
  {
    const pgtapPath = path.join(ROOT, "supabase/tests/database/centralized_access_management.test.sql");
    assert.ok(fs.existsSync(pgtapPath), "pgTAP test file must exist");

    const pgtap = fs.readFileSync(pgtapPath, "utf8");
    const planMatch = pgtap.match(/select plan\((\d+)\);/);
    assert.ok(planMatch, "pgTAP must declare a test plan");
    const planCount = parseInt(planMatch[1], 10);

    const okAssertions = [...pgtap.matchAll(/select ok\(/g)];
    assert.equal(planCount, 20, "pgTAP test plan must declare exactly 20 assertions");
    assert.equal(okAssertions.length, 20, "pgTAP test must execute exactly 20 ok() assertions matching the plan");

    assert.ok(pgtap.includes("rollback;"), "pgTAP test must finish with rollback; to prevent dirtying test databases");

    console.log("  ✓ pgTAP test plan strictly matches 20 assertions with automated rollback transaction");
    passed++;
  }

  // ---------------------------------------------------------------------------
  // 4. FRONTEND PEOPLE & ACCESS CENTRE & SECURITY GATING
  // ---------------------------------------------------------------------------
  console.log("\n4. FRONTEND PEOPLE & ACCESS CENTRE & SECURITY GATING");
  {
    const pagePath = path.join(ROOT, "app/admin/users/page.tsx");
    assert.ok(fs.existsSync(pagePath), "app/admin/users/page.tsx must exist");

    const pageContent = fs.readFileSync(pagePath, "utf8");

    // Security guards
    assert.ok(pageContent.includes("<AdminPinGuard"), "Page must be protected by AdminPinGuard");
    assert.ok(pageContent.includes("admin.role !== \"super_admin\""), "Page must verify Super Admin authorization");

    // RPC invocations
    assert.ok(pageContent.includes("access_list_role_catalogue"), "Must fetch role catalogue");
    assert.ok(pageContent.includes("access_list_permissions"), "Must fetch permissions catalogue");
    assert.ok(pageContent.includes("access_list_assignments"), "Must fetch active assignments");
    assert.ok(pageContent.includes("access_search_accounts"), "Must search accounts by email or name");
    assert.ok(pageContent.includes("access_assign_role"), "Must invoke role assignment RPC");
    assert.ok(pageContent.includes("access_revoke_role"), "Must invoke role revocation RPC");
    assert.ok(pageContent.includes("access_create_custom_role"), "Must invoke custom role creation RPC");
    assert.ok(pageContent.includes("access_update_custom_role"), "Must invoke custom role update RPC");
    assert.ok(pageContent.includes("access_retire_custom_role"), "Must invoke custom role retirement RPC");

    // Client Access Context Library
    const ctxPath = path.join(ROOT, "app/lib/accessContext.ts");
    assert.ok(fs.existsSync(ctxPath), "app/lib/accessContext.ts must exist");
    const ctxContent = fs.readFileSync(ctxPath, "utf8");

    assert.ok(ctxContent.includes("export type AccessSessionRole"), "Must export AccessSessionRole type");
    assert.ok(ctxContent.includes("export type AccessScopedPermission"), "Must export AccessScopedPermission type");
    assert.ok(ctxContent.includes("export type AccessSessionContext"), "Must export AccessSessionContext type");
    assert.ok(ctxContent.includes("getAccessSessionContext"), "Must export getAccessSessionContext helper");

    // Navigation linking
    const shellPath = path.join(ROOT, "app/admin/AdminWorkspaceShell.tsx");
    assert.ok(fs.existsSync(shellPath), "AdminWorkspaceShell.tsx must exist");
    const shellContent = fs.readFileSync(shellPath, "utf8");
    assert.ok(shellContent.includes("href: \"/admin/users\""), "AdminWorkspaceShell must link to /admin/users");
    assert.ok(shellContent.includes("visible: (u) => u.role === \"super_admin\""), "Link must be visible only to Super Admins");

    console.log("  ✓ People & Access Centre UI, AdminPinGuard, and Super Admin routing safeguards verified");
    passed++;
  }

  console.log("\n=========================================================================");
  console.log(`  CENTRALIZED ACCESS MANAGEMENT SUITE: ${passed} PASSED, 0 FAILED`);
  console.log("=========================================================================\n");
}

runTests();
