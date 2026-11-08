const fs = require('fs');

console.log('=== BRAINLAB COMMUNITY & ENGAGEMENT (PHASE 3) VERIFICATION ===\n');

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
const migPath = 'supabase/migrations/20261108170000_group_assessment_schedules.sql';
const rollPath = 'supabase/migrations/20261108170000_rollback_group_assessment_schedules.sql';
assert(fs.existsSync(migPath), 'Phase 3 migration DDL exists');
assert(fs.existsSync(rollPath), 'Phase 3 rollback DDL exists');
if (fs.existsSync(migPath)) {
  const mig = fs.readFileSync(migPath, 'utf8');
  assert(mig.includes('CREATE TABLE IF NOT EXISTS public.group_assessment_schedules'), 'Migration creates group_assessment_schedules table');
  assert(mig.includes('CREATE TABLE IF NOT EXISTS public.group_assessment_attempts'), 'Migration creates group_assessment_attempts table');
  assert(mig.includes('ALTER TABLE public.group_assessment_schedules ENABLE ROW LEVEL SECURITY'), 'RLS enabled on group_assessment_schedules');
  assert(mig.includes('ALTER TABLE public.group_assessment_attempts ENABLE ROW LEVEL SECURITY'), 'RLS enabled on group_assessment_attempts');
  assert(mig.includes('frozen_eligible_member_ids'), 'Migration supports frozen member eligibility roster');
  assert(mig.includes('frozen_question_ids'), 'Migration supports frozen question snapshots');
}

// 2. TypeScript Types & Assessment Service
const types = fs.readFileSync('app/lib/community/types.ts', 'utf8');
assert(types.includes('GroupAssessmentSchedule'), 'GroupAssessmentSchedule interface exported');
assert(types.includes('GroupAssessmentAttempt'), 'GroupAssessmentAttempt interface exported');
assert(types.includes('CreateAssessmentScheduleParams'), 'CreateAssessmentScheduleParams interface exported');

const servicePath = 'app/lib/community/assessmentService.ts';
assert(fs.existsSync(servicePath), 'Assessment service file exists');
if (fs.existsSync(servicePath)) {
  const svc = fs.readFileSync(servicePath, 'utf8');
  assert(svc.includes('export async function listCohortAssessments'), 'listCohortAssessments exported');
  assert(svc.includes('export async function createCohortAssessment'), 'createCohortAssessment exported');
  assert(svc.includes('export async function getAssessmentById'), 'getAssessmentById exported');
  assert(svc.includes('export async function recordCohortAttempt'), 'recordCohortAttempt exported');
}

// 3. API Routes
const apiAssess = 'app/api/community/groups/[slug]/assessments/route.ts';
const apiStart = 'app/api/community/groups/[slug]/assessments/[id]/start/route.ts';
const apiAttempt = 'app/api/community/groups/[slug]/assessments/[id]/attempt/route.ts';
assert(fs.existsSync(apiAssess), 'API /api/community/groups/[slug]/assessments exists');
assert(fs.existsSync(apiStart), 'API /api/community/groups/[slug]/assessments/[id]/start exists');
assert(fs.existsSync(apiAttempt), 'API /api/community/groups/[slug]/assessments/[id]/attempt exists');

// 4. Group Workspace & CBT Invariants
const groupWorkspace = fs.readFileSync('app/community/[slug]/page.tsx', 'utf8');
assert(groupWorkspace.includes('assessments'), 'Group workspace supports cohort assessments tab');
assert(groupWorkspace.includes('/cbt?cohort='), 'Group workspace connects to CBT exam engine');

const tutorGroups = fs.readFileSync('app/tutor/groups/page.tsx', 'utf8');
assert(tutorGroups.includes('handleScheduleAssessment'), 'Tutor Cohort Studio supports assessment scheduling');
assert(tutorGroups.includes('Freeze Current Cohort Eligibility Roster'), 'Tutor Cohort Studio supports roster freezing');

const cbtPortal = fs.readFileSync('app/cbt/page.tsx', 'utf8');
assert(cbtPortal.includes('cohort_assessment_id'), 'CBT engine links attempt to cohort assessment');

console.log('\n--- VERIFICATION RESULT ---');
if (failed) {
  console.error('VERIFICATION FAILED: One or more assertions failed.');
  process.exit(1);
} else {
  console.log('ALL PHASE 3 ASSESSMENT ORCHESTRATION ARCHITECTURE GATES PASSED WITH 100% SUCCESS!');
  process.exit(0);
}
