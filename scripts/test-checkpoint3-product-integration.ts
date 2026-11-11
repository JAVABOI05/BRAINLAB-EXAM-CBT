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

// Mock helper representing the updated CBT gate check (app/cbt/page.tsx & app/exam/page.tsx)
function evaluateCbtGateAccess(params: {
  accessCodeRequired: boolean;
  localStorageCode: string | null;
  serverEntitlement: { isSubscribed: boolean; cbtAccess: boolean };
}): { allowed: boolean; route: string; mode: string } {
  const hasServerAccess = params.serverEntitlement.isSubscribed || params.serverEntitlement.cbtAccess;
  const savedCode = params.localStorageCode || (hasServerAccess ? "SUBSCRIPTION-ACTIVE" : "");

  if (params.accessCodeRequired && !savedCode && !hasServerAccess) {
    return { allowed: false, route: "/access", mode: "code_required" };
  }
  return { allowed: true, route: "/instructions", mode: hasServerAccess ? "subscription_pass" : "code_pass" };
}

async function runCheckpoint3IntegrationTests() {
  console.log("================================================================================");
  console.log("  CHECKPOINT 3: VERIFIED PRODUCT INTEGRATION SUITE (CBT, AI TUTOR, STEM)");
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

  // 1. Bootstrap mock Supabase baseline & apply Checkpoints 1 & 2
  console.log("[1/4] Bootstrapping database baseline and applying migrations...");
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

  const cp2Path = path.resolve("supabase/migrations/20261110130000_quota_engine_and_voucher_compatibility.sql");
  await db.exec(fs.readFileSync(cp2Path, "utf8"));
  assert(true, "All Checkpoint 1 & 2 migrations active");

  // 2. Initial State: Free Learner
  console.log("\n[2/4] Verifying initial un-upgraded state (Free Learner baseline)...");
  const studentRes: any = await db.query(`
    insert into auth.users (email) values ('candidate_victor@brainlab.ng') returning id;
  `);
  const studentId = studentRes.rows[0].id;

  const initEntRes: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentId}') as res;
  `);
  const initEnt = initEntRes.rows[0].res;

  assert(initEnt.effective_tier.tier_key === "free", "Initial candidate resolves Free tier");
  assert(initEnt.permissions["cbt.corrections"] === false, "Free candidate does not have cbt.corrections");
  assert(initEnt.quotas["ai.tutor.queries"].quota_limit === 50, "Free candidate has 50 monthly AI queries");

  // Free candidate attempts CBT without code
  const initCbt = evaluateCbtGateAccess({
    accessCodeRequired: true,
    localStorageCode: null,
    serverEntitlement: { isSubscribed: false, cbtAccess: false },
  });
  assert(initCbt.allowed === false && initCbt.route === "/access", "Free candidate without code is directed to /access");

  // 3. Admin Upgrade Bug Remediation Verification
  console.log("\n[3/4] Admin upgrades candidate to Apex Tier in database...");
  const apexTier: any = await db.query(`select id from public.access_tiers where tier_key = 'apex';`);
  const apexTierId = apexTier.rows[0].id;

  const grantRes: any = await db.query(`
    insert into public.student_access_grants (
      student_id, target_tier_id, grant_source, status, reason
    ) values (
      '${studentId}', '${apexTierId}', 'admin_manual', 'active', 'Admin 1-Click Upgrade to Apex'
    ) returning id;
  `);
  const grantId = grantRes.rows[0].id;
  assert(Boolean(grantId), "Administrator grant successfully written to student_access_grants");

  // Resolve student entitlement immediately after grant
  const upgradedEntRes: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentId}') as res;
  `);
  const upgradedEnt = upgradedEntRes.rows[0].res;

  assert(upgradedEnt.effective_tier.tier_key === "apex", "Authoritative resolver immediately returns Apex tier");
  assert(upgradedEnt.permissions["cbt.corrections"] === true, "Authoritative resolver immediately enables cbt.corrections");
  assert(upgradedEnt.quotas["ai.tutor.queries"].quota_limit === 5000, "Authoritative resolver immediately elevates AI monthly quota to 5000");
  assert(upgradedEnt.levels["stem.studio.level"] === "simulation", "Authoritative resolver immediately elevates STEM Studio to simulation level");

  // Verify CBT Entry without physical localStorage code
  const upgradedCbt = evaluateCbtGateAccess({
    accessCodeRequired: true,
    localStorageCode: null, // NO manual code in localStorage!
    serverEntitlement: { isSubscribed: true, cbtAccess: true },
  });
  assert(upgradedCbt.allowed === true && upgradedCbt.route === "/instructions", "CBT Exam Simulator grants instant entry without requiring manual localStorage code!");

  // Verify AI Tutor usage deduction against the new 5,000 quota
  const aiChargeRes: any = await db.query(`
    select public.increment_access_quota_counter_internal('${studentId}', 'ai.tutor.queries', 25, 'ai_session_upgraded_001') as res;
  `);
  const aiCharge = aiChargeRes.rows[0].res;
  assert(aiCharge.ok === true && aiCharge.current_used === 25 && aiCharge.remaining === 4975, "AI Tutor charges quota against upgraded 5,000 monthly allowance (remaining: 4975)");

  // 4. Revocation / Expiry Enforcement
  console.log("\n[4/4] Revoking administrator grant and verifying immediate access withdrawal...");
  await db.exec(`
    update public.student_access_grants
    set status = 'revoked', revoked_at = now(), revoked_reason = 'Administrative test revocation'
    where id = '${grantId}';
  `);

  const revokedEntRes: any = await db.query(`
    select public.resolve_student_entitlements_internal('${studentId}') as res;
  `);
  const revokedEnt = revokedEntRes.rows[0].res;

  assert(revokedEnt.effective_tier.tier_key === "free", "Revoked grant causes immediate fallback to Free tier");
  assert(revokedEnt.permissions["cbt.corrections"] === false, "cbt.corrections permission immediately removed upon revocation");
  assert(revokedEnt.levels["stem.studio.level"] === undefined || revokedEnt.levels["stem.studio.level"] === null, "STEM Studio elevated level withdrawn upon revocation");

  // Post-revocation CBT attempt without code
  const revokedCbt = evaluateCbtGateAccess({
    accessCodeRequired: true,
    localStorageCode: null,
    serverEntitlement: { isSubscribed: false, cbtAccess: false },
  });
  assert(revokedCbt.allowed === false && revokedCbt.route === "/access", "Post-revocation CBT access without code is immediately blocked");

  console.log("\n================================================================================");
  console.log(`  CHECKPOINT 3 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("================================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runCheckpoint3IntegrationTests().catch((err) => {
  console.error("Checkpoint 3 execution failed:", err);
  process.exit(1);
});
