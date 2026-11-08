const fs = require('fs');
const path = require('path');

console.log('=== BRAINLAB COMMUNITY & ENGAGEMENT (PHASE 1) VERIFICATION ===\n');

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error(`  => FAILED: ${message}`);
    failed = true;
  } else {
    console.log(`  => PASSED: ${message}`);
  }
}

// 1. Migration DDL & Rollback
const migPath = 'supabase/migrations/20261108140000_community_groups_foundation.sql';
const rollPath = 'supabase/migrations/20261108140000_rollback_community_groups_foundation.sql';
assert(fs.existsSync(migPath), 'Phase 1 migration DDL exists');
assert(fs.existsSync(rollPath), 'Phase 1 rollback DDL exists');
if (fs.existsSync(migPath)) {
  const mig = fs.readFileSync(migPath, 'utf8');
  assert(mig.includes('CREATE TABLE IF NOT EXISTS public.community_groups'), 'Migration creates community_groups table');
  assert(mig.includes('CREATE TABLE IF NOT EXISTS public.community_group_memberships'), 'Migration creates community_group_memberships table');
  assert(mig.includes('CREATE TABLE IF NOT EXISTS public.community_group_invitations'), 'Migration creates community_group_invitations table');
  assert(mig.includes('ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY'), 'RLS enabled on community_groups');
  assert(mig.includes('ALTER TABLE public.community_group_memberships ENABLE ROW LEVEL SECURITY'), 'RLS enabled on memberships');
}

// 2. TypeScript Types & Service
const typesPath = 'app/lib/community/types.ts';
const servicePath = 'app/lib/community/communityService.ts';
assert(fs.existsSync(typesPath), 'Community types file exists');
assert(fs.existsSync(servicePath), 'Community service file exists');
if (fs.existsSync(servicePath)) {
  const svc = fs.readFileSync(servicePath, 'utf8');
  assert(svc.includes('export async function listCommunityGroups'), 'listCommunityGroups exported');
  assert(svc.includes('export async function getGroupBySlug'), 'getGroupBySlug exported');
  assert(svc.includes('export async function joinCommunityGroup'), 'joinCommunityGroup exported');
  assert(svc.includes('export async function createCommunityGroup'), 'createCommunityGroup exported');
}

// 3. API Routes
const apiGroups = 'app/api/community/groups/route.ts';
const apiGroupSlug = 'app/api/community/groups/[slug]/route.ts';
const apiGroupJoin = 'app/api/community/groups/[slug]/join/route.ts';
assert(fs.existsSync(apiGroups), 'API /api/community/groups exists');
assert(fs.existsSync(apiGroupSlug), 'API /api/community/groups/[slug] exists');
assert(fs.existsSync(apiGroupJoin), 'API /api/community/groups/[slug]/join exists');

// 4. UI Pages
const pageDiscovery = 'app/community/page.tsx';
const pageWorkspace = 'app/community/[slug]/page.tsx';
const pageTutorGroups = 'app/tutor/groups/page.tsx';
assert(fs.existsSync(pageDiscovery), 'Community discovery page exists');
assert(fs.existsSync(pageWorkspace), 'Group workspace page exists');
assert(fs.existsSync(pageTutorGroups), 'Tutor groups management page exists');

// 5. Navigation Links
const studentShell = fs.readFileSync('app/dashboard/StudentPortalShell.tsx', 'utf8');
const tutorShell = fs.readFileSync('app/tutor/InstructorPortalShell.tsx', 'utf8');
assert(studentShell.includes('/community'), 'StudentPortalShell includes /community navigation');
assert(tutorShell.includes('/tutor/groups'), 'InstructorPortalShell includes /tutor/groups navigation');

console.log('\n--- VERIFICATION RESULT ---');
if (failed) {
  console.error('VERIFICATION FAILED: One or more assertions failed.');
  process.exit(1);
} else {
  console.log('ALL PHASE 1 ARCHITECTURE & CODE GATES PASSED WITH 100% SUCCESS!');
  process.exit(0);
}
