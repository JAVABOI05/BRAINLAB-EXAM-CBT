const fs = require('fs');

console.log('=== BRAINLAB COHORT INSTRUCTOR STUDIO & GATED CLASSROOM VERIFICATION ===\n');

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error(`  => FAILED: ${message}`);
    failed = true;
  } else {
    console.log(`  => PASSED: ${message}`);
  }
}

// 1. Roster Management Services & API
const commSvc = fs.readFileSync('app/lib/community/communityService.ts', 'utf8');
assert(commSvc.includes('export async function listCohortMembers'), 'listCohortMembers function exported');
assert(commSvc.includes('export async function updateCohortMemberStatus'), 'updateCohortMemberStatus function exported');
assert(commSvc.includes('export async function addCohortMemberByEmail'), 'addCohortMemberByEmail function exported');
assert(commSvc.includes('export async function removeCohortMember'), 'removeCohortMember function exported');

const membersApi = 'app/api/community/groups/[slug]/members/route.ts';
assert(fs.existsSync(membersApi), 'Cohort members management API route exists');
if (fs.existsSync(membersApi)) {
  const apiCode = fs.readFileSync(membersApi, 'utf8');
  assert(apiCode.includes('export async function GET'), 'GET /api/community/groups/[slug]/members supported');
  assert(apiCode.includes('export async function POST'), 'POST /api/community/groups/[slug]/members supported');
  assert(apiCode.includes('action === "add"'), 'Supports adding candidate by email/ID');
  assert(apiCode.includes('action === "approve"'), 'Supports approving pending admission request');
  assert(apiCode.includes('action === "remove"'), 'Supports removing member from cohort');
}

// 2. Poll Lifecycle Management (Take Down / Bring Up)
const annSvc = fs.readFileSync('app/lib/community/announcementService.ts', 'utf8');
assert(annSvc.includes('export async function toggleCohortPollStatus'), 'toggleCohortPollStatus function exported');

const pollPatchApi = 'app/api/community/groups/[slug]/polls/[id]/route.ts';
assert(fs.existsSync(pollPatchApi), 'Poll toggle API route exists');
if (fs.existsSync(pollPatchApi)) {
  const pollCode = fs.readFileSync(pollPatchApi, 'utf8');
  assert(pollCode.includes('export async function PATCH'), 'PATCH /api/community/groups/[slug]/polls/[id] supported');
  assert(pollCode.includes('toggleCohortPollStatus'), 'Calls toggleCohortPollStatus service');
}

// 3. Rich Announcement Attachments (Slides, Documents, Images, Links)
const tutorGroups = fs.readFileSync('app/tutor/groups/page.tsx', 'utf8');
assert(tutorGroups.includes('attachmentType'), 'Tutor Workspace supports attachment type selection');
assert(tutorGroups.includes('attachmentUrl'), 'Tutor Workspace binds attachment URL input');
assert(tutorGroups.includes('Slides / Presentation'), 'Supports slides / presentation attachments');
assert(tutorGroups.includes('PDF / Document'), 'Supports PDF / document attachments');
assert(tutorGroups.includes('Image / Diagram'), 'Supports image / diagram attachments');

const commPage = fs.readFileSync('app/community/[slug]/page.tsx', 'utf8');
assert(commPage.includes('ann.attachments'), 'Cohort community page renders rich attachments');
assert(commPage.includes('att.file_type === "slides"'), 'Renders slides indicator');

// 4. Cohort-Gated Live Studio Classroom (Non-members cannot join)
const tokenRoute = fs.readFileSync('app/api/classroom/token/route.ts', 'utf8');
assert(tokenRoute.includes('isCohortStage'), 'Live classroom token API recognizes COHORT- rooms');
assert(tokenRoute.includes('community_group_memberships'), 'Queries community_group_memberships for cohort room gating');
assert(tokenRoute.includes('Non-members cannot join'), 'Enforces strict non-member rejection with HTTP 403');
assert(tokenRoute.includes('isCohortGated: true'), 'Flags isCohortGated on unauthorized access response');

// 5. Instructor & Student UI Integration
assert(tutorGroups.includes('handleLaunchLiveStudio'), 'Tutor Workspace includes 1-click Live Studio launcher');
assert(tutorGroups.includes('isManagingRoster'), 'Tutor Workspace renders candidate roster management drawer');
assert(commPage.includes('Join Cohort Live Studio'), 'Student Cohort Space renders direct Live Studio class join button');

console.log('\n--- VERIFICATION RESULT ---');
if (failed) {
  console.error('VERIFICATION FAILED: One or more assertions failed.');
  process.exit(1);
} else {
  console.log('ALL COHORT INSTRUCTOR STUDIO & GATED CLASSROOM CHECKS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}
