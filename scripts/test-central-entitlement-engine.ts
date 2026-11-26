let PGlite: any;
try {
  PGlite = require("@electric-sql/pglite").PGlite;
} catch {
  try {
    PGlite = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/@electric-sql/pglite").PGlite;
  } catch (err: any) {
    console.error("Failed to load @electric-sql/pglite:", err.message);
    process.exit(1);
  }
}
import * as fs from "fs";
import * as path from "path";

async function runTestSuite() {
  console.log("================================================================================");
  console.log("  CHECKPOINT 1 DISPOSABLE DATABASE VALIDATION: CENTRAL ENTITLEMENT ENGINE");
  console.log("================================================================================\n");

  const db = new PGlite();
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ""}`);
      failCount++;
    }
  }

  // 1. Bootstrap mock Supabase baseline
  console.log("[1/5] Bootstrapping Supabase baseline schema in disposable PGlite instance...");
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;

    create schema if not exists auth;

    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text unique,
      raw_user_meta_data jsonb default '{}'::jsonb,
      created_at timestamptz default now()
    );

    create or replace function auth.uid() returns uuid
    language sql stable
    as $$
      select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid;
    $$;

    create table if not exists public.admin_profiles (
      id uuid primary key default gen_random_uuid(),
      user_id uuid unique references auth.users(id) on delete cascade,
      role text not null default 'super_admin',
      created_at timestamptz default now()
    );

    create table if not exists public.access_user_role_assignments (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      role_id uuid,
      revoked_at timestamptz
    );
  `);
  assert(true, "Disposable Supabase baseline initialised");

  // 2. Apply migration 20261110120000_central_authoritative_entitlement_engine.sql
  console.log("\n[2/5] Applying migration 20261110120000_central_authoritative_entitlement_engine.sql...");
  const migrationPath = path.resolve("supabase/migrations/20261110120000_central_authoritative_entitlement_engine.sql");
  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  await db.exec(migrationSql);
  assert(true, "Migration applied cleanly without syntax or DDL errors");

  // 3. Test Constraints & Validation Triggers
  console.log("\n[3/5] Verifying schema constraints, triggers, and immutability...");
  
  // Single-target check constraint on student_access_grants
  let singleTargetViolation = false;
  try {
    await db.exec(`
      insert into public.student_access_grants (
        student_id, target_feature_key, target_tier_id, grant_source
      ) values (
        gen_random_uuid(), 'cbt.corrections', gen_random_uuid(), 'admin_manual'
      );
    `);
  } catch (err: any) {
    if (err.message && err.message.includes("student_access_grants_single_target")) {
      singleTargetViolation = true;
    }
  }
  assert(singleTargetViolation, "CHECK constraint rejects grant with multiple targets (tier + feature)");

  // Trigger validation on access_tier_features: boolean cannot have quota
  let triggerViolation = false;
  try {
    await db.exec(`
      insert into public.access_tier_features (
        tier_id, feature_key, quota_limit
      ) values (
        (select id from public.access_tiers where tier_key = 'free'),
        'cbt.corrections',
        10
      );
    `);
  } catch (err: any) {
    if (err.message && err.message.includes("Boolean feature cbt.corrections must not define a level or quota")) {
      triggerViolation = true;
    }
  }
  assert(triggerViolation, "Validation trigger rejects quota assignment on boolean catalogue feature");

  // Audit log immutability trigger
  let auditMutationBlocked = false;
  const auditRes: any = await db.query(`
    insert into public.access_audit_logs (action, entity_type, entity_id, reason)
    values ('test_action', 'test_entity', 'test_123', 'Testing immutability')
    returning id;
  `);
  const auditId = auditRes.rows[0].id;

  try {
    await db.exec(`update public.access_audit_logs set reason = 'Tampered' where id = '${auditId}';`);
  } catch (err: any) {
    if (err.message && err.message.includes("access_audit_logs is append-only")) {
      auditMutationBlocked = true;
    }
  }
  assert(auditMutationBlocked, "Database guard trigger blocks UPDATE on access_audit_logs");

  let auditDeleteBlocked = false;
  try {
    await db.exec(`delete from public.access_audit_logs where id = '${auditId}';`);
  } catch (err: any) {
    if (err.message && err.message.includes("access_audit_logs is append-only")) {
      auditDeleteBlocked = true;
    }
  }
  assert(auditDeleteBlocked, "Database guard trigger blocks DELETE on access_audit_logs");

  // 4. Test Behavioral Entitlement Scenarios
  console.log("\n[4/5] Executing behavioral entitlement resolution scenarios...");

  // Scenario A: Implicit Free Fallback for new student
  const studentA: any = await db.query(`
    insert into auth.users (email) values ('student_a@brainlab.ng') returning id;
  `);
  const studentAId = studentA.rows[0].id;

  const resA: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentAId}') as res;
  `);
  const entA = resA.rows[0].res;

  assert(entA.effective_tier.tier_key === "free", "Scenario A: New student implicitly receives Free tier");
  assert(entA.quotas["cbt.mock_exams"].quota_limit === 1, "Scenario A: Free tier grants 1 CBT mock exam per day");
  assert(entA.quotas["ai.tutor.queries"].quota_limit === 50, "Scenario A: Free tier grants 50 AI queries per month");
  assert(entA.levels["cbt.calculator"] === "standard", "Scenario A: Free tier grants standard calculator");
  assert(entA.permissions["cbt.corrections"] === false, "Scenario A: Free tier does not include cbt.corrections");

  // Scenario B: Administrator Upgrade to Plus via individual grant
  const plusTier: any = await db.query(`
    select id from public.access_tiers where tier_key = 'plus';
  `);
  const plusTierId = plusTier.rows[0].id;

  await db.exec(`
    insert into public.student_access_grants (
      student_id, target_tier_id, grant_source, status, reason
    ) values (
      '${studentAId}', '${plusTierId}', 'admin_manual', 'active', 'Admin 1-Click Upgrade'
    );
  `);

  const resB: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentAId}') as res;
  `);
  const entB = resB.rows[0].res;

  assert(entB.effective_tier.tier_key === "plus", "Scenario B: Admin upgrade immediately resolves Plus tier");
  assert(entB.permissions["cbt.corrections"] === true, "Scenario B: Plus tier grants step-by-step corrections");
  assert(entB.levels["cbt.calculator"] === "scientific", "Scenario B: Plus tier upgrades calculator to scientific");
  assert(entB.quotas["cbt.mock_exams"].is_unlimited === true, "Scenario B: Plus tier grants unlimited CBT mock exams");
  assert(entB.quotas["ai.tutor.queries"].quota_limit === 1000, "Scenario B: Plus tier grants 1,000 monthly AI queries");

  // Scenario C: Programme Membership & Additive Quota Merging
  const progRes: any = await db.query(`
    insert into public.access_programmes (programme_key, name, associated_tier_id)
    values ('apex_2027', 'BrainLab Apex Cohort 2027', (select id from public.access_tiers where tier_key = 'apex'))
    returning id;
  `);
  const progId = progRes.rows[0].id;

  await db.exec(`
    insert into public.programme_memberships (student_id, programme_id, membership_status, source_ref)
    values ('${studentAId}', '${progId}', 'active', 'COHORT-APEX-01');
  `);

  // Also add an individual grant for +500 extra AI queries
  await db.exec(`
    insert into public.student_access_grants (
      student_id, target_feature_key, quota_amount, quota_period, grant_source, status, reason
    ) values (
      '${studentAId}', 'ai.tutor.queries', 500, 'monthly', 'scholarship', 'active', 'Scholarship quota bonus'
    );
  `);

  const resC: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentAId}') as res;
  `);
  const entC = resC.rows[0].res;

  assert(entC.effective_tier.tier_key === "apex", "Scenario C: Apex tier priority (50) supersedes Plus tier (20)");
  assert(entC.quotas["ai.tutor.queries"].quota_limit === 5500, "Scenario C: Additive quota combines Apex (5000) + Grant (500) = 5500");
  assert(entC.permissions["arena.hosting"] === true, "Scenario C: Apex grants arena host privileges");

  // Scenario D: Highest Active Stepped Level Wins
  // Tier gives 'interactive_3d' (rank 2), add an individual grant for 'simulation' (rank 3)
  await db.exec(`
    insert into public.student_access_grants (
      student_id, target_feature_key, feature_level, grant_source, status, reason
    ) values (
      '${studentAId}', 'stem.studio.level', 'simulation', 'admin_manual', 'active', 'Special laboratory permit'
    );
  `);

  const resD: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentAId}') as res;
  `);
  const entD = resD.rows[0].res;
  assert(entD.levels["stem.studio.level"] === "simulation", "Scenario D: Highest stepped level (simulation > interactive_3d) wins");

  // Scenario E: Read-time Expiration Handling
  const studentE: any = await db.query(`
    insert into auth.users (email) values ('student_expired@brainlab.ng') returning id;
  `);
  const studentEId = studentE.rows[0].id;

  // Add expired Plus grant
  await db.exec(`
    insert into public.student_access_grants (
      student_id, target_tier_id, grant_source, status, starts_at, expires_at, reason
    ) values (
      '${studentEId}', '${plusTierId}', 'admin_manual', 'active',
      now() - interval '2 days', now() - interval '1 hour', 'Expired 30-day grant'
    );
  `);

  const resE: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentEId}') as res;
  `);
  const entE = resE.rows[0].res;
  assert(entE.effective_tier.tier_key === "free", "Scenario E: Expired grant is excluded at read time, falling back to Free");

  // Scenario F: Account Suspension Overrides Everything
  await db.exec(`
    update auth.users
    set raw_user_meta_data = '{"account_status": "suspended"}'::jsonb
    where id = '${studentAId}';
  `);

  const resF: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentAId}') as res;
  `);
  const entF = resF.rows[0].res;
  assert(entF.is_suspended === true, "Scenario F: Account-level suspension flags is_suspended = true");
  assert(Object.keys(entF.permissions).length === 0, "Scenario F: Account suspension strips all active permissions");

  // Restore student A
  await db.exec(`
    update auth.users
    set raw_user_meta_data = '{"account_status": "active"}'::jsonb
    where id = '${studentAId}';
  `);

  // 5. Test Resolver Entry Points & Security Definer Trust Boundaries
  console.log("\n[5/5] Testing resolver entry points and authentication boundaries...");

  // resolve_my_entitlements() with authenticated context
  await db.exec(`set request.jwt.claims = '{"sub": "${studentAId}"}';`);
  const myEntRes: any = await db.query(`
    select public.resolve_my_entitlements() as res;
  `);
  assert(myEntRes.rows[0].res.student_id === studentAId, "resolve_my_entitlements() safely resolves authenticated caller");

  // resolve_my_entitlements() with no authentication context
  await db.exec(`set request.jwt.claims = '{}';`);
  let unauthBlocked = false;
  try {
    await db.exec(`select public.resolve_my_entitlements();`);
  } catch (err: any) {
    if (err.message && err.message.includes("Authentication required")) {
      unauthBlocked = true;
    }
  }
  assert(unauthBlocked, "resolve_my_entitlements() rejects unauthenticated calls");

  // resolve_student_entitlements_for_admin() with admin caller
  const adminUser: any = await db.query(`
    insert into auth.users (email) values ('admin@brainlab.ng') returning id;
  `);
  const adminId = adminUser.rows[0].id;
  await db.exec(`
    insert into public.admin_profiles (user_id, role) values ('${adminId}', 'super_admin');
  `);

  await db.exec(`set request.jwt.claims = '{"sub": "${adminId}"}';`);
  const adminInspectRes: any = await db.query(`
    select public.resolve_student_entitlements_for_admin('${studentAId}') as res;
  `);
  assert(adminInspectRes.rows[0].res.student_id === studentAId, "Admin resolver allows authorised administrator inspection");

  // Verify that an audit record was written for the admin inspection
  const auditResCount: any = await db.query(`
    select count(*) as count from public.access_audit_logs
    where actor_id = '${adminId}' and target_student_id = '${studentAId}';
  `);
  assert(parseInt(auditResCount.rows[0].count, 10) >= 1, "Admin resolver automatically appends audit log record");

  // Non-admin caller attempting admin resolver
  await db.exec(`set request.jwt.claims = '{"sub": "${studentEId}"}';`);
  let nonAdminBlocked = false;
  try {
    await db.exec(`select public.resolve_student_entitlements_for_admin('${studentAId}');`);
  } catch (err: any) {
    if (err.message && err.message.includes("Unauthorized: caller lacks administrative access permissions")) {
      nonAdminBlocked = true;
    }
  }
  assert(nonAdminBlocked, "Admin resolver strictly denies unauthorized non-admin users");

  console.log("\n================================================================================");
  console.log(`  TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("================================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution aborted with unhandled error:", err);
  process.exit(1);
});
