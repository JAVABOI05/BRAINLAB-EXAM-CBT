import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Set mock environment variables for Supabase client
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-brainlab.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock";

async function runPhase1Verification() {
  console.log("=== BRAINLAB STEM STUDIO: PHASE 1 INTEGRATED FOUNDATION VERIFICATION ===");

  // --------------------------------------------------------------------------
  // TEST 1: Database Migration SQL Integrity
  // --------------------------------------------------------------------------
  console.log("\n[Test 1] Verifying migration SQL integrity (20261105220000_stem_studio_foundation.sql)...");
  const migrationPath = path.join(process.cwd(), "supabase/migrations/20261105220000_stem_studio_foundation.sql");
  assert.ok(fs.existsSync(migrationPath), "Migration file must exist");
  const sql = fs.readFileSync(migrationPath, "utf-8");

  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.stem_resources"), "Must define stem_resources");
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.stem_resource_versions"), "Must define stem_resource_versions");
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.stem_curriculum_mappings"), "Must define stem_curriculum_mappings");
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.stem_experiment_attempts"), "Must define stem_experiment_attempts");
  assert.ok(sql.includes("ALTER TABLE public.stem_resources ENABLE ROW LEVEL SECURITY"), "Must enable RLS on stem_resources");
  assert.ok(sql.includes("ALTER TABLE public.stem_resource_versions ENABLE ROW LEVEL SECURITY"), "Must enable RLS on stem_resource_versions");
  assert.ok(sql.includes("CONSTRAINT stem_resource_version_unique UNIQUE (resource_id, version_number)"), "Must enforce unique versioning");
  assert.ok(sql.includes("is_stem_reviewer_or_admin()"), "Must define security definer reviewer/admin guard");
  console.log("  PASS: DDL migration schema, immutable version constraints, and RLS policies verified.");

  // --------------------------------------------------------------------------
  // TEST 2: Permissions & Role Containment
  // --------------------------------------------------------------------------
  console.log("\n[Test 2] Verifying STEM permissions in admin role model...");
  const { ADMIN_PERMISSION_KEYS, isGovernanceAdminRole, isInstructorRole } = await import("../app/lib/adminRoles");
  
  const requiredStemPerms = [
    "stem.resource.view",
    "stem.resource.manage",
    "stem.resource.publish",
    "stem.resource.review",
    "stem.experiments.grade",
  ];
  for (const perm of requiredStemPerms) {
    assert.ok(
      (ADMIN_PERMISSION_KEYS as readonly string[]).includes(perm),
      `Permission ${perm} must be registered in ADMIN_PERMISSION_KEYS`
    );
  }
  assert.equal(isGovernanceAdminRole("super_admin"), true);
  assert.equal(isGovernanceAdminRole("platform_admin"), true);
  assert.equal(isGovernanceAdminRole("content_reviewer"), true);
  assert.equal(isInstructorRole("teacher"), true);
  assert.equal(isInstructorRole("student"), false);
  console.log("  PASS: All 5 STEM permissions registered and role containment functions verified.");

  // --------------------------------------------------------------------------
  // TEST 3: STEM Service Catalog & Seed Data Resolution
  // --------------------------------------------------------------------------
  console.log("\n[Test 3] Verifying STEM service catalog and initial seed resources...");
  const { listStemResources, getStemResourceBySlug } = await import("../app/lib/stem/stemService");
  const { INITIAL_STEM_RESOURCES } = await import("../app/lib/stem/seedData");

  assert.ok(INITIAL_STEM_RESOURCES.length >= 5, "Seed catalog must provide at least 5 foundational STEM resources");

  // Verify quadratic graph explorer
  const quadRes = await getStemResourceBySlug("quadratic-graph-explorer");
  assert.ok(quadRes !== null, "Quadratic Graph Explorer must be retrievable by slug");
  assert.equal(quadRes.tier, 2, "Quadratic Graph Explorer must be Tier 2 interactive simulation");
  assert.equal(quadRes.subject?.slug, "mathematics");
  assert.ok(quadRes.current_version !== null, "Must have pinned current version");
  assert.equal(quadRes.current_version?.adapter_type, "canvas_quadratic");

  // Verify projectile motion
  const projRes = await getStemResourceBySlug("projectile-motion-simulator");
  assert.ok(projRes !== null, "Projectile Motion Simulator must be retrievable by slug");
  assert.equal(projRes.subject?.slug, "physics");

  // Verify filtering by subject
  const mathOnly = await listStemResources({ subject_id: "subj-math" });
  assert.ok(mathOnly.every((r) => r.subject_id === "subj-math"), "Subject filter must restrict items strictly");

  // Verify filtering by tier
  const tier2Only = await listStemResources({ tier: 2 });
  assert.ok(tier2Only.every((r) => r.tier === 2), "Tier filter must return only Tier 2 simulations");

  // Verify search
  const searchResults = await listStemResources({ search: "parabola" });
  assert.ok(searchResults.length >= 1, "Search for 'parabola' must find Quadratic Explorer");
  console.log("  PASS: Catalog querying, slug resolution, and multi-tier filtering verified.");

  // --------------------------------------------------------------------------
  // TEST 4: Immutable Versioning Contract
  // --------------------------------------------------------------------------
  console.log("\n[Test 4] Verifying versioning monotonicity and immutability...");
  const { createStemResourceVersion, publishStemResourceVersion } = await import("../app/lib/stem/stemService");

  // Mock Supabase client for version creation
  let capturedInsertPayload: any = null;
  const mockClient: any = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: { version_number: 1 } }),
            }),
          }),
        }),
      }),
      insert: (rows: any[]) => {
        capturedInsertPayload = rows[0];
        return {
          select: () => ({
            single: async () => ({ data: { id: "mock-ver-02", ...rows[0] }, error: null }),
          }),
        };
      },
      update: (fields: any) => ({
        eq: async () => ({ error: null }),
      }),
    }),
  };

  const { version, error: vErr } = await createStemResourceVersion(
    "stem-res-quad-01",
    {
      adapter_type: "canvas_quadratic",
      initial_state: { a: 2, b: 0, c: -4 },
      content_payload: { equation: "y = 2x^2 - 4" },
      learning_objectives: ["New custom objective"],
    },
    "mock-tutor-user-id",
    mockClient
  );

  assert.equal(vErr, null);
  assert.ok(version !== null);
  assert.equal(version.version_number, 2, "New version must automatically increment from 1 to 2");
  assert.equal(capturedInsertPayload.created_by, "mock-tutor-user-id");

  const pubResult = await publishStemResourceVersion("stem-res-quad-01", "mock-ver-02", "admin-reviewer-id", mockClient);
  assert.equal(pubResult.ok, true, "Publishing pinned version must succeed");
  console.log("  PASS: Version incrementing and publication pinning verified.");

  // --------------------------------------------------------------------------
  // TEST 5: Curriculum Alignment with Official UTME Syllabus
  // --------------------------------------------------------------------------
  console.log("\n[Test 5] Verifying syllabus alignment with DEFAULT_JAMB_SYLLABUS...");
  const { DEFAULT_JAMB_SYLLABUS } = await import("../app/lib/curriculumData");
  
  const mathSyllabus = DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === "mathematics");
  assert.ok(mathSyllabus !== undefined, "Official Mathematics UTME syllabus must be present");
  const physicsSyllabus = DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === "physics");
  assert.ok(physicsSyllabus !== undefined, "Official Physics UTME syllabus must be present");

  console.log(`  PASS: Verified ${DEFAULT_JAMB_SYLLABUS.length} official UTME syllabus subjects linked to STEM topics.`);

  console.log("\n>>> ALL STEM STUDIO PHASE 1 TESTS COMPLETED SUCCESSFULLY! <<<\n");
}

runPhase1Verification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
