-- DESIGN DRAFT ONLY — DO NOT APPLY TO STAGING OR PRODUCTION.
-- Intended for a disposable database after schema/migration reconciliation.
-- This is a staging-shaped first draft; production requires a separately reconciled migration.

create or replace function public.create_exam_session_and_consume_code(
  p_candidate_name text,
  p_phone text,
  p_subject text,
  p_code text,
  p_paper_ids bigint[],
  p_duration_seconds integer,
  p_deadline_at timestamptz,
  p_attempt_token uuid,
  p_is_master_code boolean,
  p_elective text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_name text := nullif(btrim(coalesce(p_candidate_name, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_master_code text;
  v_session_code text;
  v_mode text;
  v_match_count integer := 0;
  v_code_row record;
  v_session_id uuid;
  v_used_by text;
begin
  if v_name is null or v_phone is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_candidate');
  end if;

  if coalesce(cardinality(p_paper_ids), 0) <> 180
     or p_duration_seconds is null
     or p_duration_seconds < 1
     or p_duration_seconds > 86400
     or p_deadline_at is null
     or p_attempt_token is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_session_payload');
  end if;

  select e.config_value #>> '{}'
    into v_master_code
  from public.exam_config e
  where e.config_key = 'master_access_code'
  limit 1;

  v_master_code := upper(btrim(coalesce(v_master_code, '')));

  if coalesce(p_is_master_code, false) then
    if v_code = '' or v_master_code = '' or v_code <> v_master_code then
      return jsonb_build_object('ok', false, 'error', 'invalid_master_code');
    end if;
    v_mode := 'master';
    v_session_code := v_code;
  elsif v_code = '' then
    v_mode := 'open';
    v_session_code := 'OPEN-CBT';
  else
    if v_master_code <> '' and v_code = v_master_code then
      return jsonb_build_object('ok', false, 'error', 'invalid_access_mode');
    end if;
    v_mode := 'normal';
    v_session_code := v_code;
  end if;

  -- Open/master have no consumable normal-code row. Serialize same-identity
  -- launches and refuse duplicate active attempts without returning a token.
  if v_mode in ('open', 'master') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        v_mode || ':' || v_session_code || ':' || lower(v_phone),
        0
      )
    );

    if exists (
      select 1
      from public.exam_sessions s
      where s.phone = v_phone
        and s.access_code = v_session_code
        and s.status = 'started'
    ) then
      return jsonb_build_object(
        'ok', false,
        'error', 'active_attempt_exists_identity_required'
      );
    end if;
  else
    -- Lock every normalized match so legacy whitespace/case variants cannot
    -- cause an arbitrary row to be selected. Raw-code uniqueness is not enough.
    for v_code_row in
      select ac.id, ac.is_used
      from public.access_codes ac
      where upper(btrim(ac.code)) = v_code
      order by ac.id
      for update
    loop
      v_match_count := v_match_count + 1;
    end loop;

    if v_match_count = 0 then
      return jsonb_build_object('ok', false, 'error', 'invalid_code');
    end if;
    if v_match_count > 1 then
      return jsonb_build_object('ok', false, 'error', 'ambiguous_code');
    end if;

    -- Re-read the locked unique match. This avoids relying on an arbitrary
    -- loop-record assignment if normalized duplicates are ever encountered.
    select ac.id, ac.is_used
      into v_code_row
    from public.access_codes ac
    where upper(btrim(ac.code)) = v_code
    order by ac.id
    limit 1;

    if coalesce(v_code_row.is_used, false) then
      return jsonb_build_object('ok', false, 'error', 'code_used');
    end if;

    if exists (
      select 1
      from public.exam_sessions s
      where s.phone = v_phone
        and s.access_code = v_session_code
        and s.status = 'started'
    ) then
      return jsonb_build_object('ok', false, 'error', 'active_attempt_exists');
    end if;
  end if;

  insert into public.exam_sessions (
    candidate_name,
    phone,
    subject,
    access_code,
    status,
    paper_ids,
    time_left_seconds,
    duration_seconds,
    deadline_at,
    attempt_token,
    is_master_code,
    elective
  ) values (
    v_name,
    v_phone,
    p_subject,
    v_session_code,
    'started',
    p_paper_ids,
    p_duration_seconds,
    p_duration_seconds,
    p_deadline_at,
    p_attempt_token,
    (v_mode = 'master'),
    p_elective
  )
  returning id into v_session_id;

  if v_mode = 'normal' then
    v_used_by := v_name || ' (' || v_phone || ')';

    update public.access_codes
    set is_used = true,
        used_by = v_used_by,
        used_at = pg_catalog.now(),
        exam_session_id = v_session_id
    where id = v_code_row.id
      and coalesce(is_used, false) = false;

    if not found then
      raise exception 'access code state changed during session creation';
    end if;

    if not exists (
      select 1
      from public.access_codes ac
      where ac.id = v_code_row.id
        and ac.is_used = true
        and ac.exam_session_id = v_session_id
    ) then
      raise exception 'access code tracking update did not persist';
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session_id
  );
end;
$function$;

revoke all on function public.create_exam_session_and_consume_code(
  text, text, text, text, bigint[], integer, timestamptz, uuid, boolean, text
) from public, anon, authenticated;

grant execute on function public.create_exam_session_and_consume_code(
  text, text, text, text, bigint[], integer, timestamptz, uuid, boolean, text
) to service_role;

-- Required normalized-code uniqueness preflight for a migration (run before
-- creating the RPC; fail closed if legacy variants collide):
--
-- do $preflight$
-- begin
--   if exists (
--     select 1
--     from public.access_codes
--     group by upper(btrim(code))
--     having count(*) > 1
--   ) then
--     raise exception 'Cannot install normalized access-code uniqueness: duplicate normalized codes exist';
--   end if;
-- end;
-- $preflight$;
--
-- create unique index idx_access_codes_normalized_code_unique
--   on public.access_codes (upper(btrim(code)));
--
-- The transaction-level advisory lock serializes consumers of the same
-- normalized code. The unique expression index is still required to prevent
-- concurrent code issuance from introducing a normalized duplicate.
--
-- Review notes before this draft can become a migration:
-- 1. Revisit loop-record assignment/locking implementation and verify with real
--    concurrent tests in a disposable database.
-- 2. Confirm the configured master-code representation and whether blank config
--    values are valid.
-- 3. Confirm the service-role PostgREST call uses the exact argument names/types.
-- 4. Add deployment-aware migration guards only after staging/production baselines
--    are independently reconciled.
-- 5. Do not revoke legacy mark_access_code_used until all callers are inventoried
--    and the new route has been deployed and verified.
