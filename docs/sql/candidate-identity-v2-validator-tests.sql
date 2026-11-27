-- REVIEW DRAFT ONLY. Run against an isolated Supabase clone after applying
-- the reviewed migration draft. Uses plain PostgreSQL DO assertions; pgTAP is
-- not installed in the current staging project.
--
-- This tests the private policy/value validator only. Full RPC atomicity,
-- RLS and concurrency tests require isolated Auth + assessment fixtures.

begin;

do $candidate_identity_tests$
declare
  v_value jsonb;
begin
  if not learning_private.is_valid_candidate_identity_config(null) then
    raise exception 'FAIL: NULL policy must preserve legacy behaviour';
  end if;

  if not learning_private.is_valid_candidate_identity_config(
    '{"version":1,"fields":{"full_name":"required","candidate_number":"optional","email":"hidden"}}'::jsonb
  ) then
    raise exception 'FAIL: valid v1 policy rejected';
  end if;

  if learning_private.is_valid_candidate_identity_config(
    '{"version":2,"fields":{"full_name":"required"}}'::jsonb
  ) then
    raise exception 'FAIL: unsupported policy version accepted';
  end if;

  if learning_private.is_valid_candidate_identity_config(
    '{"version":"1","fields":{"full_name":"required"}}'::jsonb
  ) then
    raise exception 'FAIL: string-valued policy version accepted';
  end if;

  if learning_private.is_valid_candidate_identity_config(
    '{"version":1,"fields":{"unknown":"required"}}'::jsonb
  ) then
    raise exception 'FAIL: unknown field accepted';
  end if;

  if learning_private.is_valid_candidate_identity_config(
    '{"version":1,"fields":{"full_name":"mandatory"}}'::jsonb
  ) then
    raise exception 'FAIL: unknown field mode accepted';
  end if;

  if learning_private.is_valid_candidate_identity_config(
    '{"version":1,"fields":{"full_name":"hidden"}}'::jsonb
  ) then
    raise exception 'FAIL: policy with no visible field accepted';
  end if;

  if learning_private.is_valid_candidate_identity_config(
    jsonb_build_object('version', 1, 'fields', jsonb_build_object('full_name', repeat('x', 2050)))
  ) then
    raise exception 'FAIL: oversized policy accepted';
  end if;

  v_value := learning_private.normalize_candidate_identity(
    '{"version":1,"fields":{"full_name":"required","email":"optional"}}'::jsonb,
    '{"full_name":"  Ada   Lovelace ","email":" ADA@EXAMPLE.COM "}'::jsonb
  );
  if v_value->>'full_name' is distinct from 'Ada Lovelace' then
    raise exception 'FAIL: full name whitespace normalization';
  end if;
  if v_value->>'email' is distinct from 'ada@example.com' then
    raise exception 'FAIL: email normalization';
  end if;

  v_value := learning_private.normalize_candidate_identity(
    '{"version":1,"fields":{"full_name":"required","candidate_number":"optional"}}'::jsonb,
    '{"full_name":"Ada Lovelace","candidate_number":"   "}'::jsonb
  );
  if v_value->'candidate_number' is distinct from 'null'::jsonb then
    raise exception 'FAIL: blank optional value must normalize to JSON null';
  end if;

  -- Expected error: a hidden field must not be submitted.
  begin
    perform learning_private.normalize_candidate_identity(
      '{"version":1,"fields":{"full_name":"required","phone":"hidden"}}'::jsonb,
      '{"full_name":"Ada Lovelace","phone":"+2348012345678"}'::jsonb
    );
    raise exception using errcode='ZX001', message='FAIL: hidden field accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'candidate_identity_hidden_field' then raise; end if;
  end;

  -- Expected error: required values must be supplied.
  begin
    perform learning_private.normalize_candidate_identity(
      '{"version":1,"fields":{"full_name":"required"}}'::jsonb,
      '{}'::jsonb
    );
    raise exception using errcode='ZX001', message='FAIL: missing required field accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'candidate_identity_required_field_missing' then raise; end if;
  end;

  -- Expected error: unknown submitted keys must be rejected.
  begin
    perform learning_private.normalize_candidate_identity(
      '{"version":1,"fields":{"full_name":"required"}}'::jsonb,
      '{"full_name":"Ada Lovelace","unexpected":"value"}'::jsonb
    );
    raise exception using errcode='ZX001', message='FAIL: unknown submitted key accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'candidate_identity_fields_invalid' then raise; end if;
  end;

  -- Expected error: oversized submitted identity payload must be rejected.
  begin
    perform learning_private.normalize_candidate_identity(
      '{"version":1,"fields":{"full_name":"required"}}'::jsonb,
      jsonb_build_object('full_name', repeat('A', 4100))
    );
    raise exception using errcode='ZX001', message='FAIL: oversized identity accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'candidate_identity_fields_invalid' then raise; end if;
  end;
end;
$candidate_identity_tests$;

rollback;
