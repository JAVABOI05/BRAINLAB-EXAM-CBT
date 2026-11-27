-- REVIEW DRAFT ONLY — NOT A DEPLOYABLE MIGRATION.
-- Generate the final migration with the Supabase CLI, test on an isolated clone,
-- then review grants/advisors before any staging application.
--
-- Architecture: preserve the current start implementation under an internal
-- name; expose compatibility and v2 wrappers. Each wrapper takes a
-- transaction-scoped advisory lock keyed by assessment + authenticated user.
-- This protects the per-user max-attempt count without serializing every
-- candidate starting the same assessment. The v2 wrapper inserts identity
-- after the original start call; any failure rolls back the attempt too.
-- Any failure rolls back the attempt and the question-exposure trigger effects
-- because the nested function call shares the caller's transaction.

begin;

create schema if not exists learning_private authorization postgres;
revoke all on schema learning_private from public, anon, authenticated, service_role;
grant usage on schema learning_private to authenticated, service_role;

create or replace function learning_private.is_valid_candidate_identity_config(p_config jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_field record;
  v_has_visible boolean := false;
begin
  if p_config is null then
    return true;
  end if;

  if octet_length(p_config::text) > 2048
     or jsonb_typeof(p_config) <> 'object'
     or (p_config - array['version', 'fields']) <> '{}'::jsonb
     or jsonb_typeof(p_config->'version') <> 'number'
     or p_config->'version' <> '1'::jsonb
     or jsonb_typeof(p_config->'fields') <> 'object'
     or (p_config->'fields' - array['full_name', 'candidate_number', 'phone', 'email']) <> '{}'::jsonb then
    return false;
  end if;

  for v_field in
    select key, value from jsonb_each(p_config->'fields')
  loop
    if jsonb_typeof(v_field.value) <> 'string'
       or (v_field.value #>> '{}') not in ('hidden', 'optional', 'required') then
      return false;
    end if;

    if (v_field.value #>> '{}') <> 'hidden' then
      v_has_visible := true;
    end if;
  end loop;

  return v_has_visible;
exception when others then
  return false;
end;
$$;

-- This helper returns only a boolean; no identity payload is exposed.
revoke all on function learning_private.is_valid_candidate_identity_config(jsonb)
  from public, anon;
grant execute on function learning_private.is_valid_candidate_identity_config(jsonb) to authenticated, service_role;

alter table public.learning_assessments
  add column if not exists candidate_identity_config jsonb;

alter table public.learning_assessments
  drop constraint if exists learning_assessments_candidate_identity_config_check;

alter table public.learning_assessments
  add constraint learning_assessments_candidate_identity_config_check
  check (learning_private.is_valid_candidate_identity_config(candidate_identity_config));

create table if not exists public.learning_assessment_candidate_identities (
  attempt_id uuid primary key
    references public.learning_practice_attempts(id) on delete cascade,
  full_name text,
  candidate_number text,
  phone text,
  email text,
  display_label text not null,
  created_at timestamptz not null default now(),
  constraint learning_assessment_candidate_identities_full_name_length
    check (full_name is null or char_length(full_name) between 2 and 100),
  constraint learning_assessment_candidate_identities_candidate_number_length
    check (candidate_number is null or char_length(candidate_number) between 1 and 40),
  constraint learning_assessment_candidate_identities_phone_format
    check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  constraint learning_assessment_candidate_identities_email_length
    check (email is null or char_length(email) <= 254),
  constraint learning_assessment_candidate_identities_display_label_length
    check (char_length(display_label) between 1 and 120)
);

alter table public.learning_assessment_candidate_identities enable row level security;

-- No direct client or service-role reads/writes. Trusted SECURITY DEFINER
-- wrappers owned by the database owner perform inserts; admin reporting gets
-- a separately permission-checked RPC in a later slice.
revoke all on table public.learning_assessment_candidate_identities
  from public, anon, authenticated, service_role;

create or replace function learning_private.normalize_candidate_identity(
  p_config jsonb,
  p_identity jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_field record;
  v_raw jsonb;
  v_value text;
  v_mode text;
  v_normalized jsonb := '{}'::jsonb;
begin
  if p_config is null then
    if p_identity is not null and p_identity <> '{}'::jsonb then
      raise exception using errcode = 'P0001', message = 'candidate_identity_not_configured';
    end if;
    return '{}'::jsonb;
  end if;

  if not learning_private.is_valid_candidate_identity_config(p_config) then
    raise exception using errcode = 'P0001', message = 'candidate_identity_policy_invalid';
  end if;

  if p_identity is null then
    p_identity := '{}'::jsonb;
  end if;

  if octet_length(p_identity::text) > 4096
     or jsonb_typeof(p_identity) <> 'object'
     or (p_identity - array['full_name', 'candidate_number', 'phone', 'email']) <> '{}'::jsonb then
    raise exception using errcode = 'P0001', message = 'candidate_identity_fields_invalid';
  end if;

  for v_field in select key, value from jsonb_each(p_config->'fields')
  loop
    v_mode := v_field.value #>> '{}';

    if v_mode = 'hidden' then
      if p_identity ? v_field.key then
        raise exception using errcode = 'P0001', message = 'candidate_identity_hidden_field';
      end if;
      continue;
    end if;

    v_raw := p_identity->v_field.key;
    if v_raw is null or v_raw = 'null'::jsonb then
      v_value := null;
    elsif jsonb_typeof(v_raw) <> 'string' then
      raise exception using errcode = 'P0001', message = 'candidate_identity_value_invalid';
    else
      v_value := trim(regexp_replace(v_raw #>> '{}', '\s+', ' ', 'g'));
      if v_value = '' then
        v_value := null;
      end if;
    end if;

    if v_field.key = 'full_name' and v_value is not null then
      if char_length(v_value) not between 2 and 100 or v_value !~ '[[:alpha:]]' then
        raise exception using errcode = 'P0001', message = 'candidate_identity_full_name_invalid';
      end if;
    elsif v_field.key = 'candidate_number' and v_value is not null then
      if char_length(v_value) > 40 or v_value !~ '^[A-Za-z0-9][A-Za-z0-9/_-]*$' then
        raise exception using errcode = 'P0001', message = 'candidate_identity_number_invalid';
      end if;
    elsif v_field.key = 'email' and v_value is not null then
      v_value := lower(v_value);
      if char_length(v_value) > 254 or v_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' then
        raise exception using errcode = 'P0001', message = 'candidate_identity_email_invalid';
      end if;
    elsif v_field.key = 'phone' and v_value is not null then
      if char_length(v_value) > 16 or v_value !~ '^\+[1-9][0-9]{6,14}$' then
        raise exception using errcode = 'P0001', message = 'candidate_identity_phone_invalid';
      end if;
    end if;

    if v_mode = 'required' and v_value is null then
      raise exception using errcode = 'P0001', message = 'candidate_identity_required_field_missing';
    end if;

    v_normalized := v_normalized || jsonb_build_object(v_field.key, v_value);
  end loop;

  return v_normalized;
end;
$$;

revoke all on function learning_private.normalize_candidate_identity(jsonb, jsonb)
  from public, anon, authenticated, service_role;

-- Rename, do not reconstruct, the audited live RPC. Its original question
-- selection, code checks, snapshots, response shape and exposure trigger stay
-- intact. Existing database dependencies remain attached to the same function
-- OID; API callers use the compatibility wrapper recreated below.
alter function public.start_organisation_assessment(uuid, text)
  rename to _start_organisation_assessment_internal;

revoke all on function public._start_organisation_assessment_internal(uuid, text)
  from public, anon, authenticated, service_role;

create or replace function public.start_organisation_assessment(
  p_assessment_id uuid,
  p_access_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_config jsonb;
  v_user uuid := auth.uid();
begin
  -- The legacy implementation counts attempts for auth.uid(). Lock only this
  -- candidate + assessment pair; a hash collision can only add serialization.
  if v_user is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('learning-assessment-start:' || p_assessment_id::text || ':' || v_user::text, 0)
    );
  end if;

  select candidate_identity_config into v_config
  from public.learning_assessments
  where id = p_assessment_id;

  if not found then
    return public._start_organisation_assessment_internal(p_assessment_id, p_access_code);
  end if;

  if v_config is not null then
    return public._err(
      'candidate_identity_required',
      'Complete the candidate details before starting this assessment.'
    );
  end if;

  return public._start_organisation_assessment_internal(p_assessment_id, p_access_code);
end;
$$;

create or replace function public.start_organisation_assessment_v2(
  p_assessment_id uuid,
  p_access_code text default null,
  p_candidate_identity jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_config jsonb;
  v_identity jsonb;
  v_result jsonb;
  v_attempt_id uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return public._err('authentication_required', 'Sign in to start this assessment.');
  end if;

  -- Protect this user's attempt counter without blocking other candidates.
  perform pg_advisory_xact_lock(
    hashtextextended('learning-assessment-start:' || p_assessment_id::text || ':' || v_user::text, 0)
  );

  select candidate_identity_config into v_config
  from public.learning_assessments
  where id = p_assessment_id;

  if not found then
    return public._start_organisation_assessment_internal(p_assessment_id, p_access_code);
  end if;

  v_identity := learning_private.normalize_candidate_identity(v_config, p_candidate_identity);

  -- The original implementation creates the attempt and fires the exposure
  -- trigger. Any exception in the identity insert below rolls all of it back.
  v_result := public._start_organisation_assessment_internal(p_assessment_id, p_access_code);

  if coalesce((v_result->>'ok')::boolean, false) is not true then
    return v_result;
  end if;

  if v_config is not null then
    v_attempt_id := (v_result->>'attempt_id')::uuid;

    insert into public.learning_assessment_candidate_identities (
      attempt_id,
      full_name,
      candidate_number,
      phone,
      email,
      display_label
    )
    values (
      v_attempt_id,
      v_identity->>'full_name',
      v_identity->>'candidate_number',
      v_identity->>'phone',
      v_identity->>'email',
      left(
        coalesce(
          nullif(v_identity->>'full_name', ''),
          'Candidate'
        ),
        120
      )
    );
  end if;

  -- Deliberately return the original candidate-facing result unchanged.
  return v_result;
end;
$$;

revoke all on function public.start_organisation_assessment(uuid, text) from public, anon;
grant execute on function public.start_organisation_assessment(uuid, text) to authenticated, service_role;

revoke all on function public.start_organisation_assessment_v2(uuid, text, jsonb) from public, anon;
grant execute on function public.start_organisation_assessment_v2(uuid, text, jsonb) to authenticated, service_role;

commit;
