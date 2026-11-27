-- REVIEW DRAFT ONLY. Run against an isolated Supabase clone after applying
-- the reviewed migration draft. This file tests the private validator only;
-- full RPC atomicity/concurrency tests require isolated Auth + assessment fixtures.

begin;
select plan(12);

select ok(
  private.is_valid_candidate_identity_config(null),
  'NULL identity config preserves legacy behaviour'
);

select ok(
  private.is_valid_candidate_identity_config(
    '{"version":1,"fields":{"full_name":"required","candidate_number":"optional","email":"hidden"}}'::jsonb
  ),
  'accepts a valid version 1 policy'
);

select ok(
  not private.is_valid_candidate_identity_config('{"version":2,"fields":{"full_name":"required"}}'::jsonb),
  'rejects unsupported policy versions'
);

select ok(
  not private.is_valid_candidate_identity_config('{"version":1,"fields":{"unknown":"required"}}'::jsonb),
  'rejects unknown identity fields'
);

select ok(
  not private.is_valid_candidate_identity_config('{"version":1,"fields":{"full_name":"mandatory"}}'::jsonb),
  'rejects unknown field modes'
);

select ok(
  not private.is_valid_candidate_identity_config('{"version":1,"fields":{"full_name":"hidden"}}'::jsonb),
  'requires at least one visible identity field'
);

select is(
  private.normalize_candidate_identity(
    '{"version":1,"fields":{"full_name":"required","email":"optional"}}'::jsonb,
    '{"full_name":"  Ada   Lovelace ","email":" ADA@EXAMPLE.COM "}'::jsonb
  )->>'full_name',
  'Ada Lovelace',
  'normalizes full name whitespace'
);

select is(
  private.normalize_candidate_identity(
    '{"version":1,"fields":{"full_name":"required","email":"optional"}}'::jsonb,
    '{"full_name":"Ada Lovelace","email":" ADA@EXAMPLE.COM "}'::jsonb
  )->>'email',
  'ada@example.com',
  'normalizes email case and whitespace'
);

select is(
  private.normalize_candidate_identity(
    '{"version":1,"fields":{"full_name":"required","candidate_number":"optional"}}'::jsonb,
    '{"full_name":"Ada Lovelace","candidate_number":"   "}'::jsonb
  )->>'candidate_number',
  null,
  'converts blank optional values to JSON null'
);

select throws_ok(
  $$select private.normalize_candidate_identity(
    '{"version":1,"fields":{"full_name":"required","phone":"hidden"}}'::jsonb,
    '{"full_name":"Ada Lovelace","phone":"+2348012345678"}'::jsonb
  )$$,
  'P0001',
  'candidate_identity_hidden_field',
  'rejects values for hidden fields'
);

select throws_ok(
  $$select private.normalize_candidate_identity(
    '{"version":1,"fields":{"full_name":"required"}}'::jsonb,
    '{}'::jsonb
  )$$,
  'P0001',
  'candidate_identity_required_field_missing',
  'rejects missing required fields'
);

select throws_ok(
  $$select private.normalize_candidate_identity(
    '{"version":1,"fields":{"full_name":"required"}}'::jsonb,
    '{"full_name":"Ada","unexpected":"value"}'::jsonb
  )$$,
  'P0001',
  'candidate_identity_fields_invalid',
  'rejects unknown submitted fields'
);

select * from finish();
rollback;
