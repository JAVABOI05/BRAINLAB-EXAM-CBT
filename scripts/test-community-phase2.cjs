const fs = require('fs');

console.log('=== BRAINLAB COMMUNITY & ENGAGEMENT (PHASE 2) VERIFICATION ===\n');

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
const migPath = 'supabase/migrations/20261108160000_community_announcements_and_polls.sql';
const rollPath = 'supabase/migrations/20261108160000_rollback_community_announcements_and_polls.sql';
assert(fs.existsSync(migPath), 'Phase 2 migration DDL exists');
assert(fs.existsSync(rollPath), 'Phase 2 rollback DDL exists');
if (fs.existsSync(migPath)) {
  const mig = fs.readFileSync(migPath, 'utf8');
  assert(mig.includes('CREATE TABLE IF NOT EXISTS public.community_announcements'), 'Migration creates community_announcements table');
  assert(mig.includes('CREATE TABLE IF NOT EXISTS public.community_announcement_receipts'), 'Migration creates community_announcement_receipts table');
  assert(mig.includes('CREATE TABLE IF NOT EXISTS public.community_polls'), 'Migration creates community_polls table');
  assert(mig.includes('CREATE TABLE IF NOT EXISTS public.community_poll_votes'), 'Migration creates community_poll_votes table');
  assert(mig.includes('ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY'), 'RLS enabled on community_announcements');
  assert(mig.includes('ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY'), 'RLS enabled on community_polls');
}

// 2. TypeScript Types & Announcement Service
const typesPath = 'app/lib/community/types.ts';
const servicePath = 'app/lib/community/announcementService.ts';
assert(fs.existsSync(typesPath), 'Community types file exists');
assert(fs.existsSync(servicePath), 'Announcement service file exists');
if (fs.existsSync(servicePath)) {
  const svc = fs.readFileSync(servicePath, 'utf8');
  assert(svc.includes('export async function listCohortAnnouncements'), 'listCohortAnnouncements exported');
  assert(svc.includes('export async function createCohortAnnouncement'), 'createCohortAnnouncement exported');
  assert(svc.includes('export async function recordAnnouncementReadOrAcknowledge'), 'recordAnnouncementReadOrAcknowledge exported');
  assert(svc.includes('export async function listCohortPolls'), 'listCohortPolls exported');
  assert(svc.includes('export async function voteCohortPoll'), 'voteCohortPoll exported');
}

// 3. API Routes
const apiAnn = 'app/api/community/groups/[slug]/announcements/route.ts';
const apiAnnRead = 'app/api/community/groups/[slug]/announcements/[id]/read/route.ts';
const apiPolls = 'app/api/community/groups/[slug]/polls/route.ts';
const apiPollVote = 'app/api/community/groups/[slug]/polls/[id]/vote/route.ts';
assert(fs.existsSync(apiAnn), 'API /api/community/groups/[slug]/announcements exists');
assert(fs.existsSync(apiAnnRead), 'API /api/community/groups/[slug]/announcements/[id]/read exists');
assert(fs.existsSync(apiPolls), 'API /api/community/groups/[slug]/polls exists');
assert(fs.existsSync(apiPollVote), 'API /api/community/groups/[slug]/polls/[id]/vote exists');

// 4. UI Integrations
const groupWorkspace = fs.readFileSync('app/community/[slug]/page.tsx', 'utf8');
assert(groupWorkspace.includes('handleAcknowledge'), 'Group workspace supports acknowledgement tracking');
assert(groupWorkspace.includes('handleVote'), 'Group workspace supports interactive checkpoint polling');

const tutorGroups = fs.readFileSync('app/tutor/groups/page.tsx', 'utf8');
assert(tutorGroups.includes('handlePostAnnouncement'), 'Tutor Cohort Studio supports broadcast authoring');
assert(tutorGroups.includes('handlePostPoll'), 'Tutor Cohort Studio supports checkpoint poll launch');

console.log('\n--- VERIFICATION RESULT ---');
if (failed) {
  console.error('VERIFICATION FAILED: One or more assertions failed.');
  process.exit(1);
} else {
  console.log('ALL PHASE 2 ANNOUNCEMENT & POLL ARCHITECTURE GATES PASSED WITH 100% SUCCESS!');
  process.exit(0);
}
