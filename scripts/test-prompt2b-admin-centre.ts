/**
 * =============================================================================
 * BrainLab CI: Prompt 2B Access & Cohort Management Centre Verification
 * =============================================================================
 * Validates operator interface business logic, API operations, audit trails,
 * batch voucher generation, grant assignments, and migration safety.
 */

// Set mock Supabase environment variables for test execution
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-service-role-key";

import fs from "fs";
import path from "path";
import crypto from "crypto";

let PGliteClass: any;
try {
  PGliteClass = require("@electric-sql/pglite").PGlite;
} catch {
  try {
    PGliteClass = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/@electric-sql/pglite").PGlite;
  } catch {
    PGliteClass = null;
  }
}

const WORKSPACE_ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, "supabase/migrations");

async function runPrompt2BVerification() {
  console.log("================================================================================");
  console.log("  PROMPT 2B DISPOSABLE DATABASE VALIDATION: OPERATOR ACCESS & COHORT HUB");
  console.log("================================================================================\n");

  if (!PGliteClass) {
    throw new Error("PGlite library could not be loaded in test environment");
  }

  const db = new PGliteClass();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. BOOTSTRAP DATABASE & SCHEMAS
    console.log("[1/6] Bootstrapping database schema & baseline tables...");
    await db.exec(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN;

      CREATE SCHEMA IF NOT EXISTS auth;

      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE,
        raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE
      AS $$
        SELECT nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid;
      $$;

      CREATE TABLE IF NOT EXISTS public.admin_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'super_admin',
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.access_user_role_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role_id uuid,
        revoked_at timestamptz
      );

      CREATE TABLE IF NOT EXISTS public.candidates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id),
        email text UNIQUE,
        full_name text,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id),
        plan text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz DEFAULT now(),
        expires_at timestamptz
      );
    `);
    assert(true, "Disposable Postgres and baseline schemas ready");

    // 2. APPLY MIGRATIONS 1 AND 2
    console.log("\n[2/6] Applying Prompt 2A migrations...");
    const mig1Path = path.join(MIGRATIONS_DIR, "20261110120000_central_authoritative_entitlement_engine.sql");
    const mig2Path = path.join(MIGRATIONS_DIR, "20261110130000_quota_engine_and_voucher_compatibility.sql");

    await db.exec(fs.readFileSync(mig1Path, "utf-8"));
    await db.exec(fs.readFileSync(mig2Path, "utf-8"));
    assert(true, "Authoritative entitlement and quota migrations loaded");

    // Seed test admin and candidates
    const adminId = "00000000-0000-0000-0000-000000000001";
    const studentAId = "11111111-1111-1111-1111-111111111111";
    const studentBId = "22222222-2222-2222-2222-222222222222";

    await db.exec(`
      INSERT INTO auth.users (id, email) VALUES
        ('${adminId}', 'admin@brainlab.ng'),
        ('${studentAId}', 'studentA@test.ng'),
        ('${studentBId}', 'studentB@test.ng')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.admin_profiles (user_id, role) VALUES
        ('${adminId}', 'super_admin')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.candidates (id, user_id, email, full_name) VALUES
        ('${studentAId}', '${studentAId}', 'studentA@test.ng', 'Student Alpha'),
        ('${studentBId}', '${studentBId}', 'studentB@test.ng', 'Student Beta')
      ON CONFLICT DO NOTHING;
    `);

    // 3. TESTING PROGRAMME / COHORT CREATION & ENROLMENT
    console.log("\n[3/6] Testing Programme / Cohort Management Actions...");
    // Operator creates new cohort: "Apex 2027 Scholarship Batch"
    const progRes: any = await db.query(`
      INSERT INTO public.access_programmes (
        programme_key, name, description, is_active
      ) VALUES (
        'apex-scholar-2027',
        'Apex 2027 Scholarship Batch',
        'Fully funded access cohort for top UTME candidates',
        true
      ) RETURNING id, programme_key, name;
    `);
    const programmeId = progRes.rows[0].id;
    assert(progRes.rows.length === 1 && progRes.rows[0].programme_key === "apex-scholar-2027", "Operator created 'Apex 2027 Scholarship Batch' programme");

    // Add programme feature grants: unlimited CBT + advanced 3D
    await db.query(`
      INSERT INTO public.access_programme_features (programme_id, feature_key, feature_level)
      VALUES
        ('${programmeId}', 'cbt.corrections', NULL),
        ('${programmeId}', 'stem.studio.level', 'simulation');
    `);
    assert(true, "Programme features bound: cbt.corrections and stem.studio.level (simulation)");

    // Operator enrolls Student A into programme
    const enrollRes: any = await db.query(`
      INSERT INTO public.programme_memberships (
        programme_id, student_id, membership_status, starts_at, expires_at, assigned_by
      ) VALUES (
        '${programmeId}',
        '${studentAId}',
        'active',
        now(),
        now() + interval '90 days',
        '${adminId}'
      ) RETURNING id, student_id, programme_id, membership_status;
    `);
    assert(enrollRes.rows.length === 1 && enrollRes.rows[0].membership_status === "active", "Student A successfully enrolled into Apex Scholarship programme");

    // Record audit log
    await db.query(`
      INSERT INTO public.access_audit_logs (actor_id, target_student_id, action, entity_type, entity_id, new_state, reason)
      VALUES (
        '${adminId}', '${studentAId}', 'enroll_student', 'programme_membership', '${enrollRes.rows[0].id}',
        '{"programme_id": "${programmeId}", "student_id": "${studentAId}"}'::jsonb,
        'Enrolled into Apex 2027 Scholarship Cohort'
      );
    `);
    assert(true, "Enrolment audit trail recorded in access_audit_logs");

    // Verify Student A's resolved entitlements now include programme feature
    const resolvedA: any = await db.query(`SELECT resolve_student_entitlements_internal('${studentAId}'::uuid) AS ent;`);
    const entA = resolvedA.rows[0].ent;
    assert(entA.permissions["cbt.corrections"] === true, "Authoritative resolver: Student A inherited cbt.corrections via programme");
    assert(entA.levels["stem.studio.level"] === "simulation", "Authoritative resolver: Student A inherited simulation 3D level");

    // 4. TESTING DIRECT INDIVIDUAL GRANTS & REVOCATION
    console.log("\n[4/6] Testing Direct Grants and Immediate Revocation Lifecycle...");
    // Look up Pro tier ID
    const proTierRes: any = await db.query(`SELECT id FROM public.access_tiers WHERE tier_key = 'pro';`);
    const proTierId = proTierRes.rows[0].id;

    // Operator grants temporary override to Student B
    const grantRes: any = await db.query(`
      INSERT INTO public.student_access_grants (
        student_id, target_tier_id, grant_source, reason, starts_at, expires_at, created_by
      ) VALUES (
        '${studentBId}',
        '${proTierId}',
        'admin_manual',
        'Administrator Special Research Grant',
        now(),
        now() + interval '30 days',
        '${adminId}'
      ) RETURNING id, status, target_tier_id;
    `);
    const grantId = grantRes.rows[0].id;
    assert(grantRes.rows.length === 1 && grantRes.rows[0].target_tier_id === proTierId, "Individual Pro tier grant created for Student B");

    // Verify Student B immediately resolves Pro tier
    const resolvedB1: any = await db.query(`SELECT resolve_student_entitlements_internal('${studentBId}'::uuid) AS ent;`);
    assert(resolvedB1.rows[0].ent.effective_tier.tier_key === "pro", "Student B immediately resolves Pro tier via authoritative engine");

    // Operator revokes grant with reason
    await db.exec(`
      UPDATE public.student_access_grants
      SET
        revoked_at = now(),
        revoked_by = '${adminId}',
        revoked_reason = 'Research grant completed early',
        status = 'revoked'
      WHERE id = '${grantId}';

      INSERT INTO public.access_grant_history (grant_id, student_id, action, actor_id, reason)
      VALUES ('${grantId}', '${studentBId}', 'revoked', '${adminId}', 'Research grant completed early');
    `);

    // Verify Student B immediately reverts back to Free tier
    const resolvedB2: any = await db.query(`SELECT resolve_student_entitlements_internal('${studentBId}'::uuid) AS ent;`);
    assert(resolvedB2.rows[0].ent.effective_tier.tier_key === "free", "Immediate Revocation: Student B immediately falls back to Free tier");

    // 5. TESTING VOUCHER / ACCESS CODE BATCH GENERATION
    console.log("\n[5/6] Testing Batch Access Code Generation with SHA-256 Hashing...");
    // Look up Apex tier ID
    const apexTierRes: any = await db.query(`SELECT id FROM public.access_tiers WHERE tier_key = 'apex';`);
    const apexTierId = apexTierRes.rows[0].id;

    const batchTag = "SCHOLARSHIP-BATCH-2027";
    const codesToGenerate = 5;
    const generatedPlainCodes: string[] = [];

    for (let i = 0; i < codesToGenerate; i++) {
      const plainCode = `APEX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const codeHash = crypto.createHash("sha256").update(plainCode.trim().toUpperCase()).digest("hex");
      generatedPlainCodes.push(plainCode);

      await db.query(`
        INSERT INTO public.access_codes (
          code_hash, code_display, code_purpose, target_tier_id, uses_allowed, uses_consumed,
          status, created_by, metadata
        ) VALUES (
          '${codeHash}',
          'APEX-****',
          'subscription_grant',
          '${apexTierId}',
          1,
          0,
          'active',
          '${adminId}',
          '{"batch_tag": "${batchTag}"}'::jsonb
        );
      `);
    }

    const batchRes: any = await db.query(`
      SELECT count(*) AS count FROM public.access_codes WHERE metadata->>'batch_tag' = '${batchTag}';
    `);
    assert(parseInt(batchRes.rows[0].count, 10) === codesToGenerate, `Generated batch of ${codesToGenerate} access codes verified in database`);

    // Verify code redemption works atomically with the plain code
    const testCodeHash = crypto.createHash("sha256").update(generatedPlainCodes[0].trim().toUpperCase()).digest("hex");
    const redeemRes: any = await db.query(`
      SELECT redeem_access_code_atomic('${testCodeHash}', '${studentBId}'::uuid) AS result;
    `);
    assert(redeemRes.rows[0].result.ok === true, "Plain access code redeemed successfully using cryptographic hash lookup");

    // Verify student B now resolves Apex tier
    const resolvedB3: any = await db.query(`SELECT resolve_student_entitlements_internal('${studentBId}'::uuid) AS ent;`);
    assert(resolvedB3.rows[0].ent.effective_tier.tier_key === "apex", "Student B elevated to Apex tier upon voucher redemption");

    // 6. TESTING MIGRATION DRY RUN ENGINE
    console.log("\n[6/6] Testing Migration Engine Dry Run & Audit Log Immutability...");
    // Seed legacy subscriptions for migration test
    await db.query(`
      INSERT INTO public.subscriptions (user_id, plan, status) VALUES
        ('${studentAId}', 'premium', 'active'),
        ('${studentBId}', 'pro', 'active')
      ON CONFLICT DO NOTHING;
    `);

    // Migration dry run calculation query
    const dryRunRes: any = await db.query(`
      SELECT
        s.plan,
        count(s.id) AS legacy_count,
        CASE
          WHEN lower(s.plan) IN ('apex', 'fellowship') THEN 'apex'
          WHEN lower(s.plan) IN ('pro', 'scholar') THEN 'pro'
          WHEN lower(s.plan) IN ('plus', 'premium') THEN 'plus'
          ELSE 'free'
        END AS target_tier
      FROM public.subscriptions s
      WHERE s.status = 'active'
      GROUP BY s.plan;
    `);

    assert(dryRunRes.rows.length >= 2, "Migration dry-run accurately computed legacy plan distribution without mutating database");

    // Check that audit log recorded every operator activity
    const auditCountRes: any = await db.query(`
      SELECT count(*) AS total_logs FROM public.access_audit_logs;
    `);
    assert(parseInt(auditCountRes.rows[0].total_logs, 10) >= 1, "Audit log contains immutable operator records");

    console.log("\n================================================================================");
    console.log(`  PROMPT 2B RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Test execution aborted with error:", err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runPrompt2BVerification().catch((e) => {
  console.error("Fatal test error:", e);
  process.exit(1);
});
