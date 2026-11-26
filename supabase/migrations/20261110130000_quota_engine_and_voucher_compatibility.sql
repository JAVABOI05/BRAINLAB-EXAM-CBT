-- Central Authoritative Entitlement Engine
-- Checkpoint 2: Quota Engine, Usage Counters, Events, WAT Period Resets, and Voucher Compatibility
begin;

-- ============================================================================
-- 1. WAT TIMEZONE QUOTA WINDOW CALCULATION HELPER
-- ============================================================================
create or replace function public.get_current_wat_quota_window(
  p_period text,
  out p_start timestamptz,
  out p_end timestamptz
)
language plpgsql
immutable
as $$
declare
  v_now_wat timestamp;
begin
  -- Convert current UTC time into West Africa Time (Africa/Lagos)
  v_now_wat := timezone('Africa/Lagos', clock_timestamp());

  if p_period = 'daily' then
    p_start := timezone('Africa/Lagos', date_trunc('day', v_now_wat));
    p_end := timezone('Africa/Lagos', date_trunc('day', v_now_wat) + interval '1 day');
  elsif p_period = 'monthly' then
    p_start := timezone('Africa/Lagos', date_trunc('month', v_now_wat));
    p_end := timezone('Africa/Lagos', date_trunc('month', v_now_wat) + interval '1 month');
  elsif p_period = 'yearly' then
    p_start := timezone('Africa/Lagos', date_trunc('year', v_now_wat));
    p_end := timezone('Africa/Lagos', date_trunc('year', v_now_wat) + interval '1 year');
  elsif p_period = 'lifetime' then
    p_start := '1970-01-01 00:00:00+00'::timestamptz;
    p_end := '2999-12-31 23:59:59+00'::timestamptz;
  else
    raise exception 'Unsupported quota period: %', p_period;
  end if;
end;
$$;

-- ============================================================================
-- 2. USAGE COUNTERS & USAGE EVENTS
-- ============================================================================
create table if not exists public.access_usage_counters (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null references public.feature_catalog(feature_key) on delete cascade,
  quota_period text not null check (quota_period in ('daily', 'monthly', 'yearly', 'lifetime')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  usage_amount integer not null default 0 check (usage_amount >= 0),
  reserved_amount integer not null default 0 check (reserved_amount >= 0),
  last_updated_at timestamptz not null default now(),
  unique (student_id, feature_key, quota_period, period_start)
);

create table if not exists public.access_usage_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  counter_id uuid not null references public.access_usage_counters(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null references public.feature_catalog(feature_key) on delete cascade,
  event_type text not null check (event_type in ('charge', 'reserve', 'commit', 'release', 'refund')),
  amount integer not null check (amount >= 0),
  status text not null default 'completed' check (status in ('pending', 'completed', 'released', 'refunded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_counters_lookup
  on public.access_usage_counters(student_id, feature_key, quota_period, period_start, period_end);

create index if not exists idx_usage_events_idempotency
  on public.access_usage_events(idempotency_key);

-- ============================================================================
-- 3. VOUCHER & REDEMPTION ARCHITECTURE
-- ============================================================================
create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_display text not null default '****-****',
  code_purpose text not null check (
    code_purpose in ('single_mock_pass', 'bundle_mock_pass', 'subscription_grant', 'feature_grant')
  ),
  target_tier_id uuid references public.access_tiers(id) on delete restrict,
  target_feature_key text references public.feature_catalog(feature_key) on delete restrict,
  feature_level text,
  quota_amount integer check (quota_amount is null or quota_amount > 0),
  mock_credits integer not null default 0 check (mock_credits >= 0),
  uses_allowed integer not null default 1 check (uses_allowed > 0),
  uses_consumed integer not null default 0 check (uses_consumed <= uses_allowed),
  status text not null default 'active' check (status in ('active', 'exhausted', 'revoked', 'expired')),
  validity_days integer not null default 30 check (validity_days >= 1),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_codes_purpose_guard check (
    (code_purpose = 'single_mock_pass' and target_tier_id is null) or
    (code_purpose = 'bundle_mock_pass' and target_tier_id is null) or
    (code_purpose = 'subscription_grant' and target_tier_id is not null) or
    (code_purpose = 'feature_grant' and target_feature_key is not null)
  )
);

create table if not exists public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  resulting_grant_id uuid references public.student_access_grants(id) on delete set null,
  mock_credits_granted integer not null default 0,
  redeemed_at timestamptz not null default now()
);

-- ============================================================================
-- 4. ATOMIC QUOTA INCREMENT & IDEMPOTENCY ENGINE
-- ============================================================================
create or replace function public.increment_access_quota_counter_internal(
  p_user_id uuid,
  p_feature_key text,
  p_amount integer,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_catalog record;
  v_entitlements jsonb;
  v_quota_info jsonb;
  v_is_unlimited boolean;
  v_limit integer;
  v_period text;
  v_start timestamptz;
  v_end timestamptz;
  v_counter record;
  v_existing_event record;
  v_new_used integer;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated', 'message', 'User ID is required');
  end if;

  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount', 'message', 'Amount must be greater than zero');
  end if;

  if p_idempotency_key is null or trim(p_idempotency_key) = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_idempotency_key', 'message', 'Idempotency key is required');
  end if;

  -- 1. Check idempotency: if event exists, return safe duplicate response
  select * into v_existing_event
  from public.access_usage_events
  where idempotency_key = p_idempotency_key;

  if found then
    select * into v_counter from public.access_usage_counters where id = v_existing_event.counter_id;
    return jsonb_build_object(
      'ok', true,
      'is_duplicate', true,
      'feature_key', p_feature_key,
      'amount_charged', v_existing_event.amount,
      'current_used', v_counter.usage_amount,
      'period_start', v_counter.period_start,
      'period_end', v_counter.period_end
    );
  end if;

  -- 2. Verify feature catalogue metadata
  select * into v_catalog from public.feature_catalog where feature_key = p_feature_key and is_active = true;
  if not found or v_catalog.entitlement_type != 'quota' then
    return jsonb_build_object('ok', false, 'error', 'non_quota_feature', 'message', 'Feature is not quota-controlled');
  end if;

  v_period := v_catalog.quota_period;

  -- 3. Calculate WAT quota period window
  select p_start, p_end into v_start, v_end from public.get_current_wat_quota_window(v_period);

  -- 4. Authoritatively resolve student's effective entitlement
  v_entitlements := public.resolve_student_entitlements_internal(p_user_id);
  if (v_entitlements->>'is_suspended')::boolean = true then
    return jsonb_build_object('ok', false, 'error', 'account_suspended', 'message', 'Account is suspended');
  end if;

  v_quota_info := v_entitlements->'quotas'->p_feature_key;
  v_is_unlimited := coalesce((v_quota_info->>'is_unlimited')::boolean, false);
  v_limit := (v_quota_info->>'quota_limit')::integer;

  -- 5. Lock or initialize counter row atomically
  insert into public.access_usage_counters (
    student_id, feature_key, quota_period, period_start, period_end, usage_amount, reserved_amount, last_updated_at
  ) values (
    p_user_id, p_feature_key, v_period, v_start, v_end, 0, 0, clock_timestamp()
  )
  on conflict (student_id, feature_key, quota_period, period_start)
  do nothing;

  select * into v_counter
  from public.access_usage_counters
  where student_id = p_user_id
    and feature_key = p_feature_key
    and quota_period = v_period
    and period_start = v_start
  for update;

  -- 6. Enforce Quota Boundary (Mid-period allowance enforcement)
  if not v_is_unlimited then
    if v_limit is null or v_limit <= 0 or (v_counter.usage_amount + v_counter.reserved_amount + p_amount > v_limit) then
      return jsonb_build_object(
        'ok', false,
        'error', 'quota_exceeded',
        'feature_key', p_feature_key,
        'limit', coalesce(v_limit, 0),
        'used', v_counter.usage_amount,
        'reserved', v_counter.reserved_amount,
        'remaining', greatest(0, coalesce(v_limit, 0) - v_counter.usage_amount - v_counter.reserved_amount),
        'requested', p_amount,
        'reset_at', v_end
      );
    end if;
  end if;

  -- 7. Apply usage increment
  v_new_used := v_counter.usage_amount + p_amount;
  update public.access_usage_counters
  set usage_amount = v_new_used,
      last_updated_at = clock_timestamp()
  where id = v_counter.id;

  -- 8. Record atomic usage event with idempotency key
  insert into public.access_usage_events (
    idempotency_key, counter_id, student_id, feature_key, event_type, amount, status, metadata
  ) values (
    p_idempotency_key, v_counter.id, p_user_id, p_feature_key, 'charge', p_amount, 'completed', p_metadata
  );

  return jsonb_build_object(
    'ok', true,
    'is_duplicate', false,
    'feature_key', p_feature_key,
    'amount_charged', p_amount,
    'current_used', v_new_used,
    'is_unlimited', v_is_unlimited,
    'limit', v_limit,
    'remaining', case when v_is_unlimited then null else greatest(0, v_limit - v_new_used) end,
    'period_end', v_end
  );
end;
$$;

-- Student-facing wrapper: derives student identity strictly from auth.uid()
create or replace function public.increment_my_access_quota_counter(
  p_feature_key text,
  p_amount integer,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required: session is unauthenticated.';
  end if;

  return public.increment_access_quota_counter_internal(v_uid, p_feature_key, p_amount, p_idempotency_key, p_metadata);
end;
$$;

-- ============================================================================
-- 5. AI RESERVATION LIFECYCLE (RESERVE, COMMIT, RELEASE)
-- ============================================================================
create or replace function public.reserve_access_quota_internal(
  p_user_id uuid,
  p_feature_key text,
  p_amount integer,
  p_reservation_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_catalog record;
  v_entitlements jsonb;
  v_quota_info jsonb;
  v_is_unlimited boolean;
  v_limit integer;
  v_period text;
  v_start timestamptz;
  v_end timestamptz;
  v_counter record;
begin
  if p_amount <= 0 or p_reservation_key is null or trim(p_reservation_key) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_parameters');
  end if;

  select * into v_catalog from public.feature_catalog where feature_key = p_feature_key and is_active = true;
  v_period := v_catalog.quota_period;
  select p_start, p_end into v_start, v_end from public.get_current_wat_quota_window(v_period);

  v_entitlements := public.resolve_student_entitlements_internal(p_user_id);
  v_quota_info := v_entitlements->'quotas'->p_feature_key;
  v_is_unlimited := coalesce((v_quota_info->>'is_unlimited')::boolean, false);
  v_limit := (v_quota_info->>'quota_limit')::integer;

  insert into public.access_usage_counters (
    student_id, feature_key, quota_period, period_start, period_end, usage_amount, reserved_amount
  ) values (
    p_user_id, p_feature_key, v_period, v_start, v_end, 0, 0
  ) on conflict (student_id, feature_key, quota_period, period_start) do nothing;

  select * into v_counter
  from public.access_usage_counters
  where student_id = p_user_id and feature_key = p_feature_key and quota_period = v_period and period_start = v_start
  for update;

  if not v_is_unlimited and (v_counter.usage_amount + v_counter.reserved_amount + p_amount > coalesce(v_limit, 0)) then
    return jsonb_build_object('ok', false, 'error', 'quota_exceeded', 'remaining', greatest(0, coalesce(v_limit, 0) - v_counter.usage_amount - v_counter.reserved_amount));
  end if;

  update public.access_usage_counters
  set reserved_amount = reserved_amount + p_amount,
      last_updated_at = clock_timestamp()
  where id = v_counter.id;

  insert into public.access_usage_events (
    idempotency_key, counter_id, student_id, feature_key, event_type, amount, status, metadata
  ) values (
    p_reservation_key, v_counter.id, p_user_id, p_feature_key, 'reserve', p_amount, 'pending', p_metadata
  );

  return jsonb_build_object('ok', true, 'reservation_key', p_reservation_key, 'reserved_amount', p_amount);
end;
$$;

create or replace function public.commit_access_quota_internal(
  p_reservation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_event record;
  v_counter record;
begin
  select * into v_event
  from public.access_usage_events
  where idempotency_key = p_reservation_key and event_type = 'reserve' and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'reservation_not_found');
  end if;

  select * into v_counter from public.access_usage_counters where id = v_event.counter_id for update;

  update public.access_usage_counters
  set reserved_amount = greatest(0, reserved_amount - v_event.amount),
      usage_amount = usage_amount + v_event.amount,
      last_updated_at = clock_timestamp()
  where id = v_counter.id;

  update public.access_usage_events
  set status = 'completed'
  where id = v_event.id;

  return jsonb_build_object('ok', true, 'status', 'committed', 'amount', v_event.amount);
end;
$$;

create or replace function public.release_access_quota_internal(
  p_reservation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_event record;
  v_counter record;
begin
  select * into v_event
  from public.access_usage_events
  where idempotency_key = p_reservation_key and event_type = 'reserve' and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'reservation_not_found');
  end if;

  select * into v_counter from public.access_usage_counters where id = v_event.counter_id for update;

  update public.access_usage_counters
  set reserved_amount = greatest(0, reserved_amount - v_event.amount),
      last_updated_at = clock_timestamp()
  where id = v_counter.id;

  update public.access_usage_events
  set status = 'released'
  where id = v_event.id;

  return jsonb_build_object('ok', true, 'status', 'released', 'refunded_amount', v_event.amount);
end;
$$;

-- ============================================================================
-- 6. ATOMIC VOUCHER REDEMPTION RPC
-- ============================================================================
create or replace function public.redeem_access_code_atomic(
  p_code_hash text,
  p_student_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid;
  v_code record;
  v_grant_id uuid := null;
  v_now timestamptz := clock_timestamp();
  v_expiry timestamptz;
begin
  v_uid := coalesce(p_student_id, auth.uid());
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated', 'message', 'Student must be authenticated to redeem a code.');
  end if;

  if p_code_hash is null or trim(p_code_hash) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_code', 'message', 'Code hash is required.');
  end if;

  -- Lock the code row atomically
  select * into v_code
  from public.access_codes
  where code_hash = p_code_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Access code does not exist.');
  end if;

  if v_code.status != 'active' or v_code.uses_consumed >= v_code.uses_allowed then
    return jsonb_build_object('ok', false, 'error', 'already_exhausted', 'message', 'This code has already reached its maximum redemptions.');
  end if;

  if v_code.expires_at is not null and v_code.expires_at <= v_now then
    update public.access_codes set status = 'expired' where id = v_code.id;
    return jsonb_build_object('ok', false, 'error', 'code_expired', 'message', 'This access code has expired.');
  end if;

  v_expiry := v_now + (v_code.validity_days || ' days')::interval;

  -- Enforce voucher semantics:
  -- Single exam passes MUST NOT create subscriptions or Apex memberships!
  if v_code.code_purpose = 'single_mock_pass' or v_code.code_purpose = 'bundle_mock_pass' then
    -- Grant a specific CBT mock quota or credit, not a subscription tier
    insert into public.student_access_grants (
      student_id, target_feature_key, quota_amount, quota_period, grant_source, starts_at, expires_at, reason
    ) values (
      v_uid, 'cbt.mock_exams', greatest(1, v_code.mock_credits), 'daily', 'voucher_redemption', v_now, v_expiry, 'Redeemed Exam Pass Voucher'
    ) returning id into v_grant_id;

  elsif v_code.code_purpose = 'subscription_grant' then
    -- Grant the targeted subscription tier (e.g. Plus, Pro, Apex)
    insert into public.student_access_grants (
      student_id, target_tier_id, grant_source, starts_at, expires_at, reason
    ) values (
      v_uid, v_code.target_tier_id, 'voucher_redemption', v_now, v_expiry, 'Redeemed Subscription Voucher'
    ) returning id into v_grant_id;

  elsif v_code.code_purpose = 'feature_grant' then
    insert into public.student_access_grants (
      student_id, target_feature_key, feature_level, quota_amount, grant_source, starts_at, expires_at, reason
    ) values (
      v_uid, v_code.target_feature_key, v_code.feature_level, v_code.quota_amount, 'voucher_redemption', v_now, v_expiry, 'Redeemed Feature Voucher'
    ) returning id into v_grant_id;
  end if;

  -- Increment consumed redemptions and update status
  update public.access_codes
  set uses_consumed = uses_consumed + 1,
      status = case when uses_consumed + 1 >= uses_allowed then 'exhausted' else 'active' end,
      updated_at = v_now
  where id = v_code.id;

  -- Record redemption history
  insert into public.access_code_redemptions (
    code_id, student_id, purpose, resulting_grant_id, mock_credits_granted, redeemed_at
  ) values (
    v_code.id, v_uid, v_code.code_purpose, v_grant_id, v_code.mock_credits, v_now
  );

  -- Log audit record
  insert into public.access_audit_logs (
    actor_id, target_student_id, action, entity_type, entity_id, reason
  ) values (
    v_uid, v_uid, 'redeemed_access_code', 'access_codes', v_code.id::text, 'Student redeemed ' || v_code.code_purpose
  );

  return jsonb_build_object(
    'ok', true,
    'code_purpose', v_code.code_purpose,
    'grant_id', v_grant_id,
    'mock_credits', v_code.mock_credits,
    'expires_at', v_expiry
  );
end;
$$;

-- ============================================================================
-- 7. RLS & PRIVILEGES
-- ============================================================================
alter table public.access_usage_counters enable row level security;
alter table public.access_usage_events enable row level security;
alter table public.access_codes enable row level security;
alter table public.access_code_redemptions enable row level security;

-- Default-deny policies
drop policy if exists usage_counters_student_read on public.access_usage_counters;
create policy usage_counters_student_read on public.access_usage_counters
  for select to authenticated using (auth.uid() = student_id);

drop policy if exists usage_events_student_read on public.access_usage_events;
create policy usage_events_student_read on public.access_usage_events
  for select to authenticated using (auth.uid() = student_id);

drop policy if exists code_redemptions_student_read on public.access_code_redemptions;
create policy code_redemptions_student_read on public.access_code_redemptions
  for select to authenticated using (auth.uid() = student_id);

-- Restrict internal functions
revoke all on function public.increment_access_quota_counter_internal(uuid, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.increment_access_quota_counter_internal(uuid, text, integer, text, jsonb) to service_role;

revoke all on function public.reserve_access_quota_internal(uuid, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_access_quota_internal(uuid, text, integer, text, jsonb) to service_role;

revoke all on function public.commit_access_quota_internal(text) from public, anon, authenticated;
grant execute on function public.commit_access_quota_internal(text) to service_role;

revoke all on function public.release_access_quota_internal(text) from public, anon, authenticated;
grant execute on function public.release_access_quota_internal(text) to service_role;

-- Grant student functions
grant execute on function public.increment_my_access_quota_counter(text, integer, text, jsonb) to authenticated;
grant execute on function public.redeem_access_code_atomic(text, uuid) to authenticated;

commit;
