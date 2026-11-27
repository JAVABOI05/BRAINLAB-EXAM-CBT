/**
 * Local-only compatibility and transactional regression harness for the CBT
 * access-code RPC draft.
 *
 * Usage: npx tsx scripts/test-cbt-access-code-transaction-pglite.ts
 *
 * This uses only an in-memory PGlite database and synthetic fixtures. It never
 * reads environment variables or connects to Supabase. PGlite is single-session:
 * this harness does NOT prove concurrent-request serialization.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const draftPath = resolve(
  process.cwd(),
  "docs/sql/cbt-access-code-transaction-v1-draft.sql",
);
const migration = await readFile(draftPath, "utf8");
const db = new PGlite();

const fixture = `
  create role anon;
  create role authenticated;
  create role service_role;

  create table public.access_codes (
    id uuid primary key default gen_random_uuid(),
    code text not null unique check (length(trim(code)) > 0),
    subject text,
    is_used boolean default false,
    used_by text,
    used_at timestamptz,
    exam_session_id uuid
  );

  create table public.exam_config (
    config_key text primary key,
    config_value jsonb not null
  );

  create table public.exam_sessions (
    id uuid primary key default gen_random_uuid(),
    candidate_name text,
    phone text,
    subject text,
    access_code text,
    started_at timestamptz default now(),
    status text default 'started'
      check (status in ('started', 'submitted', 'expired', 'cancelled')),
    time_left_seconds integer,
    attempt_token uuid not null default gen_random_uuid(),
    paper_ids bigint[],
    draft_answers jsonb not null default '{}'::jsonb,
    elective text,
    duration_seconds integer,
    deadline_at timestamptz,
    is_master_code boolean not null default false,
    check (time_left_seconds is null or time_left_seconds >= 0)
  );

  insert into public.exam_config(config_key, config_value)
  values ('master_access_code', '"SYNTHETIC-MASTER-ONLY"');

  insert into public.access_codes(code, subject, is_used)
  values ('SYNTHETIC-CODE-001', 'Mathematics', false);
`;

const paperIds = Array.from({ length: 180 }, (_, index) => index + 1);
const attemptToken = "11111111-1111-4111-8111-111111111111";
const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

async function callRpc(overrides: Record<string, unknown> = {}) {
  const args = {
    candidate_name: "Synthetic Candidate",
    phone: "08000000001",
    subject: "English, Mathematics, Physics, Chemistry",
    code: "SYNTHETIC-CODE-001",
    expected_code_subject: "Mathematics",
    paper_ids: paperIds,
    duration_seconds: 7200,
    deadline_at: deadline,
    attempt_token: attemptToken,
    is_master_code: false,
    elective: "Chemistry",
    ...overrides,
  };

  const result = await db.query(
    `select public.create_exam_session_and_consume_code(
      $1::text, $2::text, $3::text, $4::text, $5::text, $6::bigint[],
      $7::integer, $8::timestamptz, $9::uuid, $10::boolean, $11::text
    ) as result`,
    [
      args.candidate_name,
      args.phone,
      args.subject,
      args.code,
      args.expected_code_subject,
      args.paper_ids,
      args.duration_seconds,
      args.deadline_at,
      args.attempt_token,
      args.is_master_code,
      args.elective,
    ],
  );
  return result.rows[0]?.result as { ok: boolean; error?: string; session_id?: string };
}

async function count(table: "access_codes" | "exam_sessions") {
  const result = await db.query<{ count: string }>(
    `select count(*)::text as count from public.${table}`,
  );
  return Number(result.rows[0].count);
}

async function expectFailureWithoutPartialWrite(
  triggerName: string,
  code: string,
  overrideToken: string,
) {
  const beforeSessions = await count("exam_sessions");
  const beforeCode = await db.query(
    "select is_used, exam_session_id from public.access_codes where code = $1",
    [code],
  );
  let rejected = false;
  try {
    await callRpc({ code, expected_code_subject: "Mathematics", attempt_token: overrideToken });
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, `${triggerName} should force the RPC to fail`);
  assert.equal(await count("exam_sessions"), beforeSessions, `${triggerName}: session insert must roll back`);
  const afterCode = await db.query(
    "select is_used, exam_session_id from public.access_codes where code = $1",
    [code],
  );
  assert.deepEqual(afterCode.rows, beforeCode.rows, `${triggerName}: code state must roll back`);
  await db.exec(`drop trigger ${triggerName} on public.${triggerName === "reject_session_insert" ? "exam_sessions" : "access_codes"};`);
}

const checks: string[] = [];
try {
  await db.exec(fixture);
  await db.exec(migration);
  checks.push("draft SQL parses and installs against the synthetic staging-shaped schema");

  await assert.rejects(
    () => db.exec("insert into public.access_codes(code, subject, is_used) values ('synthetic-code-001', 'Mathematics', false)"),
    /duplicate key|unique/i,
  );
  checks.push("normalized expression index blocks case-variant duplicate code issuance");

  const missingCode = await callRpc({
    code: "SYNTHETIC-MISSING",
    attempt_token: "99999999-9999-4999-8999-999999999999",
  });
  assert.equal(missingCode.error, "invalid_code");
  checks.push("missing normal code returns invalid_code without a session");

  const grants = await db.query(
    `select
      has_function_privilege('anon', 'public.create_exam_session_and_consume_code(text,text,text,text,text,bigint[],integer,timestamptz,uuid,boolean,text)', 'EXECUTE') as anon_exec,
      has_function_privilege('authenticated', 'public.create_exam_session_and_consume_code(text,text,text,text,text,bigint[],integer,timestamptz,uuid,boolean,text)', 'EXECUTE') as authenticated_exec,
      has_function_privilege('service_role', 'public.create_exam_session_and_consume_code(text,text,text,text,text,bigint[],integer,timestamptz,uuid,boolean,text)', 'EXECUTE') as service_exec`,
  );
  assert.deepEqual(grants.rows[0], {
    anon_exec: false,
    authenticated_exec: false,
    service_exec: true,
  });
  checks.push("RPC execution grants are restricted to service_role");

  const success = await callRpc();
  assert.equal(success.ok, true);
  assert.ok(success.session_id);
  assert.equal(await count("exam_sessions"), 1);
  const consumed = await db.query(
    "select is_used, used_at is not null as has_used_at, exam_session_id from public.access_codes where code = 'SYNTHETIC-CODE-001'",
  );
  assert.equal(consumed.rows[0].is_used, true);
  assert.equal(consumed.rows[0].has_used_at, true);
  assert.equal(consumed.rows[0].exam_session_id, success.session_id);
  checks.push("normal-code success inserts one session and links code consumption atomically");

  const duplicateUse = await callRpc({ attempt_token: "22222222-2222-4222-8222-222222222222" });
  assert.equal(duplicateUse.ok, false);
  assert.equal(duplicateUse.error, "code_used");
  assert.equal(await count("exam_sessions"), 1);
  checks.push("used code cannot create a second session");

  await db.exec(`
    insert into public.access_codes(code, subject, is_used)
    values ('SYNTHETIC-STALE-SUBJECT', 'Physics', false);
  `);
  const staleSubject = await callRpc({
    code: "SYNTHETIC-STALE-SUBJECT",
    expected_code_subject: "Chemistry",
    attempt_token: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(staleSubject.error, "code_subject_changed");
  const staleRow = await db.query(
    "select is_used from public.access_codes where code = 'SYNTHETIC-STALE-SUBJECT'",
  );
  assert.equal(staleRow.rows[0].is_used, false);
  checks.push("stale code-subject pre-read is rejected without consuming the code");

  const openAttempt = await callRpc({
    code: "",
    expected_code_subject: null,
    phone: "08000000002",
    attempt_token: "44444444-4444-4444-8444-444444444444",
  });
  assert.equal(openAttempt.ok, true);
  const openSession = await db.query(
    "select access_code, is_master_code from public.exam_sessions where id = $1",
    [openAttempt.session_id],
  );
  assert.deepEqual(openSession.rows[0], { access_code: "OPEN-CBT", is_master_code: false });
  checks.push("open access receives empty RPC code and persists OPEN-CBT session label");

  const duplicateOpen = await callRpc({
    code: "",
    expected_code_subject: null,
    phone: "08000000002",
    attempt_token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  });
  assert.equal(duplicateOpen.error, "active_attempt_exists_identity_required");
  checks.push("duplicate OPEN-CBT attempt for the same phone is rejected without token disclosure");

  const masterAttempt = await callRpc({
    code: "SYNTHETIC-MASTER-ONLY",
    expected_code_subject: null,
    is_master_code: true,
    phone: "08000000003",
    attempt_token: "55555555-5555-4555-8555-555555555555",
  });
  assert.equal(masterAttempt.ok, true);
  const masterSession = await db.query(
    "select access_code, is_master_code from public.exam_sessions where id = $1",
    [masterAttempt.session_id],
  );
  assert.deepEqual(masterSession.rows[0], {
    access_code: "SYNTHETIC-MASTER-ONLY",
    is_master_code: true,
  });
  checks.push("master code is verified from synthetic server config and is not consumed as a normal code");

  const spoofedMaster = await callRpc({
    code: "SYNTHETIC-MASTER-ONLY",
    expected_code_subject: null,
    is_master_code: false,
    phone: "08000000005",
    attempt_token: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  });
  assert.equal(spoofedMaster.error, "invalid_access_mode");
  checks.push("configured master code cannot be consumed through normal-code mode");

  const duplicatePaper = [...paperIds];
  duplicatePaper[179] = duplicatePaper[178];
  const invalidPaper = await callRpc({
    code: "",
    phone: "08000000004",
    paper_ids: duplicatePaper,
    attempt_token: "66666666-6666-4666-8666-666666666666",
  });
  assert.equal(invalidPaper.error, "invalid_paper_ids");
  checks.push("duplicate question IDs are rejected");

  await db.exec("insert into public.access_codes(code, subject, is_used) values ('SYNTHETIC-INSERT-FAIL', 'Mathematics', false)");
  await db.exec(`
    create function public.reject_exam_session_insert()
    returns trigger language plpgsql as $$
    begin raise exception 'synthetic insert failure'; end;
    $$;
    create trigger reject_session_insert
    before insert on public.exam_sessions
    for each row execute function public.reject_exam_session_insert();
  `);
  await expectFailureWithoutPartialWrite(
    "reject_session_insert",
    "SYNTHETIC-INSERT-FAIL",
    "77777777-7777-4777-8777-777777777777",
  );
  await db.exec("drop function public.reject_exam_session_insert();");
  checks.push("forced session-insert failure leaves code state unchanged");

  await db.exec("insert into public.access_codes(code, subject, is_used) values ('SYNTHETIC-UPDATE-FAIL', 'Mathematics', false)");
  await db.exec(`
    create function public.reject_access_code_update()
    returns trigger language plpgsql as $$
    begin raise exception 'synthetic update failure'; end;
    $$;
    create trigger reject_access_code_update
    before update on public.access_codes
    for each row execute function public.reject_access_code_update();
  `);
  await expectFailureWithoutPartialWrite(
    "reject_access_code_update",
    "SYNTHETIC-UPDATE-FAIL",
    "88888888-8888-4888-8888-888888888888",
  );
  await db.exec("drop function public.reject_access_code_update();");
  checks.push("forced code-update failure rolls back the newly inserted session");

  console.log("CBT access-code PGlite checks passed:");
  for (const check of checks) console.log(`- ${check}`);
  console.log("LIMITATION: PGlite is single-session; no concurrent-request race test was run.");
} finally {
  await db.close();
}
