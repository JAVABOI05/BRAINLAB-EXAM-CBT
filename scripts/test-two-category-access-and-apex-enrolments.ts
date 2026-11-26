import * as fs from "fs";
import * as path from "path";

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

async function runTestSuite() {
  console.log("================================================================================");
  console.log("  BRAINLAB CI: TWO-CATEGORY ACCESS & APEX COHORT ENROLMENT ENGINE");
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

  // 1. Bootstrap mock Supabase auth & legacy tables
  console.log("[1/6] Bootstrapping Supabase baseline schema in disposable PGlite instance...");
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
    END $$;

    CREATE SCHEMA IF NOT EXISTS auth;

    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE,
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

    CREATE TABLE IF NOT EXISTS public.user_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id),
      plan_id text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      current_period_start timestamptz DEFAULT now(),
      current_period_end timestamptz DEFAULT (now() + interval '30 days'),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `);

  // Seed test users:
  // User 1: Regular free student
  // User 2: Active paid subscriber (to test Decision 5.6 automatic migration)
  // User 3: Admin user
  const u1Res = await db.query(`INSERT INTO auth.users (email) VALUES ('free-student@example.com') RETURNING id`);
  const freeStudentId = u1Res.rows[0].id;

  const u2Res = await db.query(`INSERT INTO auth.users (email) VALUES ('active-paid@example.com') RETURNING id`);
  const paidStudentId = u2Res.rows[0].id;

  const u3Res = await db.query(`INSERT INTO auth.users (email) VALUES ('admin@example.com') RETURNING id`);
  const adminId = u3Res.rows[0].id;
  await db.query(`INSERT INTO public.admin_profiles (user_id, role) VALUES ('${adminId}', 'super_admin')`);

  // Seed legacy active subscription for User 2
  await db.query(`
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, current_period_end)
    VALUES ('${paidStudentId}', 'pro', 'active', now() + interval '25 days');
  `);

  assert(true, "Disposable test database initialized with users & legacy subscription");

  // 2. Execute Migration DDL
  console.log("\n[2/6] Executing Migration: 20261111100000_two_category_access_and_apex_cohort_enrolments.sql...");
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20261111100000_two_category_access_and_apex_cohort_enrolments.sql"
  );
  assert(fs.existsSync(migrationPath), "Migration SQL file exists on disk");

  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  await db.exec(migrationSql);
  assert(true, "Migration SQL executed successfully without syntax or execution errors");

  // 3. Verify Table Architecture & RLS
  console.log("\n[3/6] Verifying Table Architecture, RLS & Initial Programmes...");
  const tables = [
    "cohort_programmes",
    "cohorts",
    "apex_enrolments",
    "cohort_curriculum_assignments",
    "cohort_assessments",
    "cohort_attendance",
    "cohort_tutor_reports",
  ];

  for (const tbl of tables) {
    const res = await db.query(`
      SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = '${tbl}'
    `);
    assert(res.rows.length === 1, `Table public.${tbl} exists in database`);
    assert(res.rows[0]?.rowsecurity === true, `Table public.${tbl} has RLS enabled`);
  }

  // Check programmes seeded
  const progRes = await db.query(`SELECT programme_key, examination_target FROM public.cohort_programmes ORDER BY programme_key`);
  assert(progRes.rows.some((r: any) => r.programme_key === "utme_2027_accelerator" && r.examination_target === "UTME"), "UTME 2027 Accelerated programme seeded (Priority 1)");
  assert(progRes.rows.some((r: any) => r.programme_key === "post_utme_2027_screening" && r.examination_target === "Post-UTME"), "Post-UTME Screening programme seeded (Priority 2)");

  // 4. Verify Decision 5.6 Legacy Paid Subscriber Migration
  console.log("\n[4/6] Verifying Decision 5.6: Automatic Migration of Active Paid Subscribers...");
  const migrEnrolRes = await db.query(`
    SELECT * FROM public.apex_enrolments WHERE student_id = '${paidStudentId}'
  `);
  assert(migrEnrolRes.rows.length === 1, "Active paid subscriber automatically enrolled into Apex Cohort");
  assert(migrEnrolRes.rows[0].status === "active", "Migrated enrolment is active");
  assert(migrEnrolRes.rows[0].notes.includes("Directive Decision 5.6"), "Enrolment audit note documents Decision 5.6 migration");

  // 5. Behavioral Testing of Derived Access Categories
  console.log("\n[5/6] Testing Authoritative Derived Access Resolver: resolve_effective_access_category()...");

  // Case A: Free student with no enrolment -> 'public'
  const freeRes = await db.query(`SELECT public.resolve_effective_access_category('${freeStudentId}') as category`);
  assert(freeRes.rows[0].category === "public", "Registered learner with zero enrolment resolves to 'public' category (₦0)");

  // Case B: Migrated paid student with active enrolment -> 'apex_cohort'
  const paidRes = await db.query(`SELECT public.resolve_effective_access_category('${paidStudentId}') as category`);
  assert(paidRes.rows[0].category === "apex_cohort", "Student with active enrolment resolves to 'apex_cohort' category");

  // Case C: Enrolment expiration test -> reverts to 'public' automatically
  const u4Res = await db.query(`INSERT INTO auth.users (email) VALUES ('expired-enrolment@example.com') RETURNING id`);
  const expiredStudentId = u4Res.rows[0].id;
  const cohortRes = await db.query(`SELECT id, programme_id FROM public.cohorts LIMIT 1`);
  const cohortId = cohortRes.rows[0].id;
  const progId = cohortRes.rows[0].programme_id;

  // Insert an expired enrolment (ended yesterday)
  await db.query(`
    INSERT INTO public.apex_enrolments (student_id, cohort_id, programme_id, starts_at, ends_at, status)
    VALUES ('${expiredStudentId}', '${cohortId}', '${progId}', now() - interval '30 days', now() - interval '1 day', 'active');
  `);

  const expiredRes = await db.query(`SELECT public.resolve_effective_access_category('${expiredStudentId}') as category`);
  assert(expiredRes.rows[0].category === "public", "Expired enrolment automatically reverts to 'public' with ZERO manual intervention");

  // Case D: Admin universal access -> 'apex_cohort'
  const adminAccessRes = await db.query(`SELECT public.resolve_effective_access_category('${adminId}') as category`);
  assert(adminAccessRes.rows[0].category === "apex_cohort", "Administrator automatically possesses 'apex_cohort' universal access");

  // Case E: Payment linking
  const u5Res = await db.query(`INSERT INTO auth.users (email) VALUES ('new-paystack-buyer@example.com') RETURNING id`);
  const newBuyerId = u5Res.rows[0].id;
  await db.query(`
    INSERT INTO public.apex_enrolments (student_id, cohort_id, programme_id, starts_at, ends_at, status, payment_reference)
    VALUES ('${newBuyerId}', '${cohortId}', '${progId}', now(), now() + interval '90 days', 'active', 'PAY-TEST-REF-998877');
  `);
  const buyerAccessRes = await db.query(`SELECT public.resolve_effective_access_category('${newBuyerId}') as category`);
  assert(buyerAccessRes.rows[0].category === "apex_cohort", "New enrolment activated via payment reference resolves to 'apex_cohort'");

  // 6. Test Rollback Cleanliness
  console.log("\n[6/6] Verifying Rollback SQL...");
  const rollbackPath = path.join(
    process.cwd(),
    "supabase/migrations/20261111100000_rollback_two_category_access_and_apex_cohort_enrolments.sql"
  );
  assert(fs.existsSync(rollbackPath), "Rollback SQL file exists on disk");
  const rollbackSql = fs.readFileSync(rollbackPath, "utf8");
  await db.exec(rollbackSql);

  const checkDropped = await db.query(`
    SELECT count(*)::int as count FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
      'cohort_programmes', 'cohorts', 'apex_enrolments', 'cohort_curriculum_assignments', 'cohort_assessments', 'cohort_attendance', 'cohort_tutor_reports'
    )
  `);
  assert(checkDropped.rows[0].count === 0, "All 7 cohort and enrolment tables dropped cleanly on rollback");

  const funcDropped = await db.query(`
    SELECT count(*)::int as count FROM pg_proc WHERE proname IN ('resolve_effective_access_category', 'resolve_my_access_category')
  `);
  assert(funcDropped.rows[0].count === 0, "Derived access functions dropped cleanly on rollback");

  console.log("\n================================================================================");
  console.log(`  TWO-CATEGORY ACCESS TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("================================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

void runTestSuite();
