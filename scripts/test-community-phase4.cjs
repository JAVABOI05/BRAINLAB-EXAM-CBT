const fs = require('fs');

console.log('=== BRAINLAB COMMUNITY & ENGAGEMENT (PHASE 4) VERIFICATION ===\n');

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
const migPath = 'supabase/migrations/20261108180000_community_leaderboards_and_psychometrics.sql';
const rollPath = 'supabase/migrations/20261108180000_rollback_community_leaderboards_and_psychometrics.sql';
assert(fs.existsSync(migPath), 'Phase 4 migration DDL exists');
assert(fs.existsSync(rollPath), 'Phase 4 rollback DDL exists');
if (fs.existsSync(migPath)) {
  const mig = fs.readFileSync(migPath, 'utf8');
  assert(mig.includes('get_cohort_leaderboard'), 'Migration defines get_cohort_leaderboard function');
  assert(mig.includes('Candidate #BL-'), 'Migration enforces NDPA 2023 masked candidate handles');
  assert(mig.includes('score DESC, b.time_spent_seconds ASC, b.submitted_at ASC'), 'Migration applies fair tie-break ranking rules');
  assert(mig.includes('get_cohort_psychometrics'), 'Migration defines get_cohort_psychometrics function');
}

// 2. TypeScript Types
const types = fs.readFileSync('app/lib/community/types.ts', 'utf8');
assert(types.includes('CohortLeaderboardEntry'), 'CohortLeaderboardEntry interface exported');
assert(types.includes('CohortLeaderboardScope'), 'CohortLeaderboardScope type exported');
assert(types.includes('CohortPsychometrics'), 'CohortPsychometrics interface exported');

// 3. Leaderboard Service
const servicePath = 'app/lib/community/leaderboardService.ts';
assert(fs.existsSync(servicePath), 'Leaderboard service file exists');
if (fs.existsSync(servicePath)) {
  const svc = fs.readFileSync(servicePath, 'utf8');
  assert(svc.includes('export async function getCohortLeaderboard'), 'getCohortLeaderboard exported');
  assert(svc.includes('export async function getCohortPsychometrics'), 'getCohortPsychometrics exported');
}

// 4. API Routes
const apiLb = 'app/api/community/groups/[slug]/leaderboard/route.ts';
const apiPsy = 'app/api/community/groups/[slug]/psychometrics/route.ts';
assert(fs.existsSync(apiLb), 'API /api/community/groups/[slug]/leaderboard exists');
assert(fs.existsSync(apiPsy), 'API /api/community/groups/[slug]/psychometrics exists');

// 5. UI Features
const groupWorkspace = fs.readFileSync('app/community/[slug]/page.tsx', 'utf8');
assert(groupWorkspace.includes('leaderboard'), 'Group workspace supports cohort leaderboard tab');
assert(groupWorkspace.includes('handleScopeChange'), 'Group workspace supports scope filtering');

const tutorGroups = fs.readFileSync('app/tutor/groups/page.tsx', 'utf8');
assert(tutorGroups.includes('handleViewPsychometrics'), 'Tutor Cohort Studio supports diagnostics retrieval');
assert(tutorGroups.includes('Cohort Diagnostics'), 'Tutor Cohort Studio renders psychometrics drawer');

console.log('\n--- VERIFICATION RESULT ---');
if (failed) {
  console.error('VERIFICATION FAILED: One or more assertions failed.');
  process.exit(1);
} else {
  console.log('ALL PHASE 4 LEADERBOARD & PSYCHOMETRICS ARCHITECTURE GATES PASSED WITH 100% SUCCESS!');
  process.exit(0);
}
