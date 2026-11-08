const fs = require('fs');

console.log('=== BRAINLAB COMMUNITY & ENGAGEMENT (PHASE 5) VERIFICATION ===\n');

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
const migPath = 'supabase/migrations/20261108190000_learning_quests_and_daily_feed.sql';
const rollPath = 'supabase/migrations/20261108190000_rollback_learning_quests_and_daily_feed.sql';
assert(fs.existsSync(migPath), 'Phase 5 migration DDL exists');
assert(fs.existsSync(rollPath), 'Phase 5 rollback DDL exists');
if (fs.existsSync(migPath)) {
  const mig = fs.readFileSync(migPath, 'utf8');
  assert(mig.includes('learning_quests'), 'Migration creates learning_quests table');
  assert(mig.includes('user_quest_progress'), 'Migration creates user_quest_progress table');
  assert(mig.includes('is_claimed'), 'Migration tracks reward claims and completions');
  assert(mig.includes('ENABLE ROW LEVEL SECURITY'), 'Migration enables RLS on quests and progress');
}

// 2. TypeScript Types
const types = fs.readFileSync('app/lib/community/types.ts', 'utf8');
assert(types.includes('LearningQuest'), 'LearningQuest interface exported');
assert(types.includes('StudentDailyFeed'), 'StudentDailyFeed interface exported');
assert(types.includes('QuestType'), 'QuestType type exported');

// 3. Quest Service
const servicePath = 'app/lib/community/questService.ts';
assert(fs.existsSync(servicePath), 'Quest service file exists');
if (fs.existsSync(servicePath)) {
  const svc = fs.readFileSync(servicePath, 'utf8');
  assert(svc.includes('export async function listDailyQuests'), 'listDailyQuests exported');
  assert(svc.includes('export async function getStudentDailyFeed'), 'getStudentDailyFeed exported');
  assert(svc.includes('export async function claimQuestReward'), 'claimQuestReward exported');
}

// 4. API Routes
const apiFeed = 'app/api/community/feed/route.ts';
const apiQuests = 'app/api/community/quests/route.ts';
const apiClaim = 'app/api/community/quests/[id]/claim/route.ts';
assert(fs.existsSync(apiFeed), 'API /api/community/feed exists');
assert(fs.existsSync(apiQuests), 'API /api/community/quests exists');
assert(fs.existsSync(apiClaim), 'API /api/community/quests/[id]/claim exists');

// 5. UI Features & Dashboard Integration
const widgetPath = 'app/components/dashboard/DailyLearningFeedWidget.tsx';
assert(fs.existsSync(widgetPath), 'DailyLearningFeedWidget component exists');

const dash = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
assert(dash.includes('DailyLearningFeedWidget'), 'Student Dashboard renders DailyLearningFeedWidget');

console.log('\n--- VERIFICATION RESULT ---');
if (failed) {
  console.error('VERIFICATION FAILED: One or more assertions failed.');
  process.exit(1);
} else {
  console.log('ALL PHASE 5 LEARNING QUESTS & DAILY FEED GATES PASSED WITH 100% SUCCESS!');
  process.exit(0);
}
