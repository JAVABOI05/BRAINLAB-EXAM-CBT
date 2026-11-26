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

async function runCheckpoint2Tests() {
  console.log("================================================================================");
  console.log("  CHECKPOINT 2 DISPOSABLE DATABASE VALIDATION: QUOTA & VOUCHER ENGINE");
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

  // 1. Bootstrap mock Supabase baseline & apply Checkpoint 1
  console.log("[1/6] Bootstrapping Supabase baseline and Checkpoint 1 schema...");
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
  `);

  const cp1Path = path.resolve("supabase/migrations/20261110120000_central_authoritative_entitlement_engine.sql");
  await db.exec(fs.readFileSync(cp1Path, "utf8"));
  assert(true, "Checkpoint 1 schema established");

  // 2. Apply Checkpoint 2 Migration
  console.log("\n[2/6] Applying migration 20261110130000_quota_engine_and_voucher_compatibility.sql...");
  const cp2Path = path.resolve("supabase/migrations/20261110130000_quota_engine_and_voucher_compatibility.sql");
  await db.exec(fs.readFileSync(cp2Path, "utf8"));
  assert(true, "Checkpoint 2 migration applied cleanly");

  // 3. Test WAT Timezone Window Calculation
  console.log("\n[3/6] Testing West Africa Time (Africa/Lagos) quota window calculations...");
  const watDaily: any = await db.query(`select * from public.get_current_wat_quota_window('daily');`);
  const dailyRow = watDaily.rows[0];
  assert(dailyRow.p_start !== null && dailyRow.p_end !== null, "WAT daily quota window returns valid start and end timestamps");
  const dailyDiffHours = (new Date(dailyRow.p_end).getTime() - new Date(dailyRow.p_start).getTime()) / (1000 * 3600);
  assert(dailyDiffHours === 24, "WAT daily quota window spans exactly 24 hours");

  const watMonthly: any = await db.query(`select * from public.get_current_wat_quota_window('monthly');`);
  const monthlyRow = watMonthly.rows[0];
  assert(monthlyRow.p_start !== null && monthlyRow.p_end !== null, "WAT monthly quota window returns valid start and end timestamps");

  // 4. Test Atomic Quota Counter, Idempotency, and Mid-Period Enforcement
  console.log("\n[4/6] Testing atomic quota increments, idempotency, and mid-period allowance rules...");
  const studentUser: any = await db.query(`
    insert into auth.users (email) values ('quota_student@brainlab.ng') returning id;
  `);
  const studentId = studentUser.rows[0].id;

  // Free student gets 50 monthly AI queries by default
  const inc1: any = await db.query(`
    select public.increment_access_quota_counter_internal('${studentId}', 'ai.tutor.queries', 15, 'idem_key_001') as res;
  `);
  const r1 = inc1.rows[0].res;
  assert(r1.ok === true && r1.current_used === 15 && r1.remaining === 35, "Atomic increment charges 15 queries (remaining: 35)");

  // Idempotent retry with same key
  const incRetry: any = await db.query(`
    select public.increment_access_quota_counter_internal('${studentId}', 'ai.tutor.queries', 15, 'idem_key_001') as res;
  `);
  const rRetry = incRetry.rows[0].res;
  assert(rRetry.ok === true && rRetry.is_duplicate === true && rRetry.current_used === 15, "Idempotent retry does not double-charge usage");

  // Second legitimate charge
  const inc2: any = await db.query(`
    select public.increment_access_quota_counter_internal('${studentId}', 'ai.tutor.queries', 30, 'idem_key_002') as res;
  `);
  const r2 = inc2.rows[0].res;
  assert(r2.ok === true && r2.current_used === 45 && r2.remaining === 5, "Second charge increments used to 45 (remaining: 5)");

  // Overspending attempt
  const incOver: any = await db.query(`
    select public.increment_access_quota_counter_internal('${studentId}', 'ai.tutor.queries', 10, 'idem_key_003') as res;
  `);
  const rOver = incOver.rows[0].res;
  assert(rOver.ok === false && rOver.error === "quota_exceeded" && rOver.remaining === 5, "Request exceeding remaining allowance is rejected");

  // Mid-period Allowance Enhancement: add a grant of +100 queries
  const grantRes: any = await db.query(`
    insert into public.student_access_grants (
      student_id, target_feature_key, quota_amount, quota_period, grant_source, status, reason
    ) values (
      '${studentId}', 'ai.tutor.queries', 100, 'monthly', 'scholarship', 'active', 'Bonus grant'
    ) returning id;
  `);
  const grantId = grantRes.rows[0].id;

  // Now the request of 10 should succeed immediately
  const incBonus: any = await db.query(`
    select public.increment_access_quota_counter_internal('${studentId}', 'ai.tutor.queries', 10, 'idem_key_004') as res;
  `);
  const rBonus = incBonus.rows[0].res;
  assert(rBonus.ok === true && rBonus.current_used === 55 && rBonus.remaining === 95, "Mid-period grant addition expands allowance without resetting counter");

  // Mid-period Allowance Expiration: expire the bonus grant
  await db.exec(`
    update public.student_access_grants
    set status = 'expired', expires_at = now() - interval '1 hour'
    where id = '${grantId}';
  `);

  // Effective allowance drops back to 50, but usage is 55. Retained usage must NOT be erased!
  const incPostExpire: any = await db.query(`
    select public.increment_access_quota_counter_internal('${studentId}', 'ai.tutor.queries', 1, 'idem_key_005') as res;
  `);
  const rPostExpire = incPostExpire.rows[0].res;
  assert(rPostExpire.ok === false && rPostExpire.error === "quota_exceeded", "Mid-period grant expiry retains recorded usage and immediately denies further over-quota requests");

  // 5. Test AI Costly Reservation Lifecycle (Reserve, Commit, Release)
  console.log("\n[5/6] Testing reservation lifecycle (reserve, commit, release)...");
  
  // Student B with Plus tier (1,000 monthly AI queries)
  const studentB: any = await db.query(`
    insert into auth.users (email) values ('ai_reservation_student@brainlab.ng') returning id;
  `);
  const studentBId = studentB.rows[0].id;
  await db.exec(`
    insert into public.student_access_grants (
      student_id, target_tier_id, grant_source, status, reason
    ) values (
      '${studentBId}', (select id from public.access_tiers where tier_key = 'plus'), 'admin_manual', 'active', 'Plus tier for AI'
    );
  `);

  // Reserve 25 queries before calling costly AI model
  const resv1: any = await db.query(`
    select public.reserve_access_quota_internal('${studentBId}', 'ai.tutor.queries', 25, 'ai_resv_failed_op') as res;
  `);
  assert(resv1.rows[0].res.ok === true, "AI query quota reservation succeeded");

  // Check reserved_amount in counter table
  const counterCheck1: any = await db.query(`
    select reserved_amount, usage_amount from public.access_usage_counters
    where student_id = '${studentBId}' and feature_key = 'ai.tutor.queries';
  `);
  assert(counterCheck1.rows[0].reserved_amount === 25 && counterCheck1.rows[0].usage_amount === 0, "Counter holds 25 in reserved_amount without billing usage_amount");

  // Simulated AI Provider Failure -> Release reservation
  const releaseRes: any = await db.query(`
    select public.release_access_quota_internal('ai_resv_failed_op') as res;
  `);
  assert(releaseRes.rows[0].res.ok === true && releaseRes.rows[0].res.status === "released", "Failed AI operation releases quota reservation cleanly");

  const counterCheck2: any = await db.query(`
    select reserved_amount, usage_amount from public.access_usage_counters
    where student_id = '${studentBId}' and feature_key = 'ai.tutor.queries';
  `);
  assert(counterCheck2.rows[0].reserved_amount === 0 && counterCheck2.rows[0].usage_amount === 0, "Released reservation restores available allowance without charging student");

  // Successful AI Operation: Reserve then Commit
  await db.query(`
    select public.reserve_access_quota_internal('${studentBId}', 'ai.tutor.queries', 10, 'ai_resv_success_op');
  `);
  const commitRes: any = await db.query(`
    select public.commit_access_quota_internal('ai_resv_success_op') as res;
  `);
  assert(commitRes.rows[0].res.ok === true && commitRes.rows[0].res.status === "committed", "Successful AI operation commits quota reservation");

  const counterCheck3: any = await db.query(`
    select reserved_amount, usage_amount from public.access_usage_counters
    where student_id = '${studentBId}' and feature_key = 'ai.tutor.queries';
  `);
  assert(counterCheck3.rows[0].reserved_amount === 0 && counterCheck3.rows[0].usage_amount === 10, "Committed reservation moves reserved amount to usage amount");

  // 6. Test Voucher & Code Redemption Compatibility
  console.log("\n[6/6] Testing voucher redemption semantics and mock-pass isolation...");
  
  // Create a Single Exam Pass code
  const mockCodeHash = "HASH_MOCK_PASS_001";
  await db.exec(`
    insert into public.access_codes (
      code_hash, code_display, code_purpose, mock_credits, uses_allowed, status
    ) values (
      '${mockCodeHash}', 'MCK-001-TEST', 'single_mock_pass', 1, 1, 'active'
    );
  `);

  // Student C redeems Single Exam Pass
  const studentC: any = await db.query(`
    insert into auth.users (email) values ('voucher_student@brainlab.ng') returning id;
  `);
  const studentCId = studentC.rows[0].id;

  const redeemRes: any = await db.query(`
    select public.redeem_access_code_atomic('${mockCodeHash}', '${studentCId}') as res;
  `);
  const rRedeem = redeemRes.rows[0].res;
  assert(rRedeem.ok === true && rRedeem.code_purpose === "single_mock_pass", "Single exam mock pass redeemed successfully");

  // Verify that student C's effective tier is STILL 'free' (not converted to subscription or Apex!)
  const entC: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentCId}') as res;
  `);
  assert(entC.rows[0].res.effective_tier.tier_key === "free", "CRITICAL: Consumable single exam pass does NOT elevate student to subscription or Apex tier");

  // Attempt duplicate redemption of the exhausted code
  const dupRedeem: any = await db.query(`
    select public.redeem_access_code_atomic('${mockCodeHash}', '${studentCId}') as res;
  `);
  assert(dupRedeem.rows[0].res.ok === false && dupRedeem.rows[0].res.error === "already_exhausted", "Exhausted access code cannot be redeemed a second time");

  // Create and redeem a Subscription Voucher (Plus Tier)
  const subCodeHash = "HASH_SUB_PLUS_001";
  await db.exec(`
    insert into public.access_codes (
      code_hash, code_display, code_purpose, target_tier_id, uses_allowed, status
    ) values (
      '${subCodeHash}', 'PLUS-001-TEST', 'subscription_grant',
      (select id from public.access_tiers where tier_key = 'plus'), 1, 'active'
    );
  `);

  const redeemSubRes: any = await db.query(`
    select public.redeem_access_code_atomic('${subCodeHash}', '${studentCId}') as res;
  `);
  assert(redeemSubRes.rows[0].res.ok === true && redeemSubRes.rows[0].res.code_purpose === "subscription_grant", "Subscription voucher redeemed successfully");

  // Student C now resolves Plus tier!
  const entCUpdated: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentCId}') as res;
  `);
  assert(entCUpdated.rows[0].res.effective_tier.tier_key === "plus", "Student C immediately resolves Plus tier upon redeeming subscription voucher");

  console.log("\n================================================================================");
  console.log(`  CHECKPOINT 2 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("================================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runCheckpoint2Tests().catch((err) => {
  console.error("Checkpoint 2 test execution failed:", err);
  process.exit(1);
});
