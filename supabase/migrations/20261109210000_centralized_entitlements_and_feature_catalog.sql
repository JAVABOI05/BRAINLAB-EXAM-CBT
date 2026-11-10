-- =============================================================================
-- Migration: 20261109210000_centralized_entitlements_and_feature_catalog.sql
-- Description: Centralized Entitlement Engine, Feature Catalogue, Quota Engine,
--              Hashed Access Codes, and Authoritative Student Resolver.
-- Compliance: NDPA 2023, BrainLab Safety Rules S1-S12, Prompt 2A Rules B1-K.
-- Decisions Applied:
--   D1: Preserve legacy verified subscription expiry.
--   D2: Implicit Free fallback when no active paid/programme tier exists.
--   D3: Boolean feature merge: Union of active tier and individual grants with suspensions.
--   D4: Feature-level merge: Highest active level wins.
--   D5: Quota merge: Tier limit plus separately tracked grant allowance.
--   D6: Migrated-student communication: Flagged for post-verification dispatch.
--   D7: Production execution: Disposable database verification; manual runbook execution.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FEATURE CATALOGUE
-- -----------------------------------------------------------------------------
create table if not exists public.feature_catalog (
  feature_key text primary key,
  name text not null,
  description text not null,
  feature_type text not null check (feature_type in ('boolean', 'quota', 'level')),
  supported_levels text[] default null,
  default_quota integer default null,
  quota_period text default 'monthly' check (quota_period in ('daily', 'monthly', 'total')),
  status text not null default 'active' check (status in ('active', 'deprecated', 'disabled')),
  validation_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. ACCESS TIERS & TIER FEATURES
-- -----------------------------------------------------------------------------
create table if not exists public.access_tiers (
  id uuid primary key default gen_random_uuid(),
  tier_key text unique not null,
  name text not null,
  description text not null default '',
  rank integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_tier_features (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid not null references public.access_tiers(id) on delete cascade,
  feature_key text not null references public.feature_catalog(feature_key) on delete cascade,
  is_enabled boolean not null default true,
  feature_level text default null,
  quota_limit integer default null,
  created_at timestamptz not null default now(),
  unique (tier_id, feature_key)
);

create index if not exists idx_tier_features_feature_key on public.access_tier_features(feature_key);

-- -----------------------------------------------------------------------------
-- 3. ACADEMIC PROGRAMMES & COHORT MEMBERSHIPS
-- -----------------------------------------------------------------------------
create table if not exists public.access_programmes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  tier_id uuid references public.access_tiers(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.programme_memberships (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.access_programmes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier_id uuid references public.access_tiers(id) on delete set null,
  joined_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  suspended_at timestamptz default null,
  created_at timestamptz not null default now(),
  unique (programme_id, user_id)
);

create index if not exists idx_programme_memberships_user on public.programme_memberships(user_id, is_active)
  where suspended_at is null;

-- -----------------------------------------------------------------------------
-- 4. INDIVIDUAL STUDENT ACCESS GRANTS & AUDIT TRAIL
-- -----------------------------------------------------------------------------
create table if not exists public.student_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null references public.feature_catalog(feature_key) on delete cascade,
  is_enabled boolean not null default true,
  feature_level text default null,
  quota_allowance integer default null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz default null,
  revoked_by uuid references auth.users(id) on delete set null,
  is_suspended boolean not null default false,
  notes text default null,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_grants_user on public.student_access_grants(user_id, feature_key)
  where revoked_at is null and not is_suspended;

create table if not exists public.access_grant_history (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid references public.student_access_grants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('granted', 'suspended', 'unsuspended', 'revoked', 'expired')),
  performed_by uuid references auth.users(id) on delete set null,
  reason text default null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5. ATOMIC USAGE & QUOTA COUNTERS
-- -----------------------------------------------------------------------------
create table if not exists public.access_usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null references public.feature_catalog(feature_key) on delete cascade,
  period_type text not null check (period_type in ('daily', 'monthly', 'total')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  current_usage integer not null default 0 check (current_usage >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature_key, period_type, period_start)
);

create index if not exists idx_usage_counters_lookup
  on public.access_usage_counters(user_id, feature_key, period_type, period_start, period_end);

-- -----------------------------------------------------------------------------
-- 6. HASHED ACCESS CODES & VOUCHER ENGINE
-- -----------------------------------------------------------------------------
create table if not exists public.access_hashed_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null,
  code_prefix text not null,
  grants_tier_id uuid references public.access_tiers(id) on delete set null,
  grants_programme_id uuid references public.access_programmes(id) on delete set null,
  validity_days integer not null default 30,
  feature_grants jsonb default null,
  is_redeemed boolean not null default false,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz default null,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz default null,
  created_at timestamptz not null default now()
);

create index if not exists idx_access_hashed_codes_hash on public.access_hashed_codes(code_hash);

-- -----------------------------------------------------------------------------
-- 7. MIGRATION BATCHES & AUDIT LOGS
-- -----------------------------------------------------------------------------
create table if not exists public.access_migration_batches (
  id uuid primary key default gen_random_uuid(),
  batch_name text not null,
  idempotency_key text unique not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'dry_run')),
  total_items integer not null default 0,
  processed_items integer not null default 0,
  success_items integer not null default 0,
  failed_items integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz default null
);

create table if not exists public.access_migration_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.access_migration_batches(id) on delete cascade,
  legacy_source text not null check (legacy_source in ('user_subscriptions', 'learning_entitlements', 'access_codes')),
  source_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'success', 'skipped', 'failed')),
  outcome jsonb default '{}'::jsonb,
  error_message text default null,
  processed_at timestamptz default null,
  unique (batch_id, legacy_source, source_id)
);

create table if not exists public.access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- APPEND-ONLY TRIGGER ON access_audit_logs
create or replace function public.trg_guard_access_audit_logs_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'access_audit_logs is append-only: updates and deletes are strictly prohibited.'
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_access_audit_logs_append_only on public.access_audit_logs;
create trigger trg_access_audit_logs_append_only
before update or delete on public.access_audit_logs
for each row execute function public.trg_guard_access_audit_logs_append_only();

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
alter table public.feature_catalog enable row level security;
alter table public.access_tiers enable row level security;
alter table public.access_tier_features enable row level security;
alter table public.access_programmes enable row level security;
alter table public.programme_memberships enable row level security;
alter table public.student_access_grants enable row level security;
alter table public.access_grant_history enable row level security;
alter table public.access_usage_counters enable row level security;
alter table public.access_hashed_codes enable row level security;
alter table public.access_migration_batches enable row level security;
alter table public.access_migration_items enable row level security;
alter table public.access_audit_logs enable row level security;

-- Read policies for public catalogue & tiers
drop policy if exists "feature_catalog_read_all" on public.feature_catalog;
create policy "feature_catalog_read_all" on public.feature_catalog
  for select to authenticated, anon using (status in ('active', 'deprecated'));

drop policy if exists "access_tiers_read_all" on public.access_tiers;
create policy "access_tiers_read_all" on public.access_tiers
  for select to authenticated, anon using (is_active = true);

drop policy if exists "access_tier_features_read_all" on public.access_tier_features;
create policy "access_tier_features_read_all" on public.access_tier_features
  for select to authenticated, anon using (true);

-- User-scoped read policies
drop policy if exists "memberships_read_own" on public.programme_memberships;
create policy "memberships_read_own" on public.programme_memberships
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "grants_read_own" on public.student_access_grants;
create policy "grants_read_own" on public.student_access_grants
  for select to authenticated using (user_id = auth.uid() and revoked_at is null);

drop policy if exists "counters_read_own" on public.access_usage_counters;
create policy "counters_read_own" on public.access_usage_counters
  for select to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 9. SEED CANONICAL FEATURE CATALOGUE & TIERS
-- -----------------------------------------------------------------------------
insert into public.feature_catalog(feature_key, name, description, feature_type, supported_levels, default_quota, quota_period) values
('cbt.practice', 'CBT Practice Engine', 'Standard CBT mock test and assessment practice', 'boolean', null, null, 'daily'),
('cbt.unlimited', 'Unlimited CBT Tests', 'Unlimited daily CBT mock test attempts', 'boolean', null, null, 'daily'),
('cbt.daily_limit', 'CBT Daily Mock Quota', 'Number of CBT tests allowed per day', 'quota', null, 1, 'daily'),
('cbt.corrections', 'Question Corrections', 'Step-by-step solutions, explanations, and review notes', 'boolean', null, null, 'monthly'),
('ai.hints', 'AI Study Hints', 'AI question hints and study assistant queries', 'quota', null, 50, 'monthly'),
('ai.voice', 'AI Voice Tutor', 'Audio read-aloud and interactive voice explanations', 'boolean', null, null, 'monthly'),
('classroom.live', 'Live Classroom Stages', 'Live interactive masterclasses and virtual audio classrooms', 'boolean', null, null, 'monthly'),
('competitions.arena', 'Competition Arena', '1v1 challenge arena, team duels, and school tournaments', 'boolean', null, null, 'monthly'),
('analytics.advanced', 'Advanced Psychometrics', 'Diagnostic mastery tracking and weakness prediction', 'boolean', null, null, 'monthly'),
('certificates.verify', 'Verified Certificates', 'Tamper-proof verifiable graduation and exam certificates', 'boolean', null, null, 'monthly'),
('stem.studio', 'STEM Studio Virtual Labs', 'Interactive scientific simulations and practical lab reports', 'level', array['none','discover','explore','practise','advanced','complete']::text[], 0, 'monthly'),
('calculator.type', 'Exam Calculator Engine', 'Allowed examination calculator tier', 'level', array['none','standard','scientific']::text[], null, 'monthly'),
('offline.sync', 'Offline Practice PWA', 'Offline encrypted question caching and background sync', 'boolean', null, null, 'monthly'),
('vip.support', 'Priority Support', 'Dedicated tutor helpline and priority support resolution', 'boolean', null, null, 'monthly')
on conflict (feature_key) do update set
  name = excluded.name,
  description = excluded.description,
  feature_type = excluded.feature_type,
  supported_levels = excluded.supported_levels,
  default_quota = excluded.default_quota,
  quota_period = excluded.quota_period;

-- Seed Tiers: Free (0), Premium (10), Plus (20), Pro (30), Apex (40)
insert into public.access_tiers(tier_key, name, description, rank, is_active, is_system) values
('free', 'Free Learner', 'Essential CBT exam preparation and basic practice.', 0, true, true),
('premium', 'Premium Study', 'Full question bank and detailed question corrections.', 10, true, true),
('plus', 'BrainLab Plus', 'Extended AI tutoring quota, live audio classrooms, and competitions.', 20, true, true),
('pro', 'BrainLab Pro', 'Universal masterclasses, STEM virtual labs, and unlimited exams.', 30, true, true),
('apex', 'BrainLab Apex', 'Full institutional cohort suite with complete STEM Studio and universal access.', 40, true, true)
on conflict (tier_key) do update set
  name = excluded.name,
  description = excluded.description,
  rank = excluded.rank,
  is_active = excluded.is_active;

-- Seed Tier Features
-- 1. Free Tier
with free_tier as (select id from public.access_tiers where tier_key = 'free')
insert into public.access_tier_features(tier_id, feature_key, is_enabled, feature_level, quota_limit)
select free_tier.id, v.f_key, v.is_en, v.lvl, v.q_lim
from free_tier, (values
  ('cbt.practice', true, null, null),
  ('cbt.unlimited', false, null, null),
  ('cbt.daily_limit', true, null, 1),
  ('cbt.corrections', false, null, null),
  ('ai.hints', true, null, 50),
  ('ai.voice', false, null, null),
  ('classroom.live', false, null, null),
  ('competitions.arena', false, null, null),
  ('analytics.advanced', false, null, null),
  ('certificates.verify', false, null, null),
  ('stem.studio', false, 'none', 0),
  ('calculator.type', true, 'scientific', null),
  ('offline.sync', false, null, null),
  ('vip.support', false, null, null)
) as v(f_key, is_en, lvl, q_lim)
on conflict (tier_id, feature_key) do update set
  is_enabled = excluded.is_enabled,
  feature_level = excluded.feature_level,
  quota_limit = excluded.quota_limit;

-- 2. Premium Tier
with prem_tier as (select id from public.access_tiers where tier_key = 'premium')
insert into public.access_tier_features(tier_id, feature_key, is_enabled, feature_level, quota_limit)
select prem_tier.id, v.f_key, v.is_en, v.lvl, v.q_lim
from prem_tier, (values
  ('cbt.practice', true, null, null),
  ('cbt.unlimited', false, null, null),
  ('cbt.daily_limit', true, null, 5),
  ('cbt.corrections', true, null, null),
  ('ai.hints', true, null, 250),
  ('ai.voice', false, null, null),
  ('classroom.live', false, null, null),
  ('competitions.arena', false, null, null),
  ('analytics.advanced', false, null, null),
  ('certificates.verify', false, null, null),
  ('stem.studio', false, 'none', 0),
  ('calculator.type', true, 'scientific', null),
  ('offline.sync', true, null, null),
  ('vip.support', false, null, null)
) as v(f_key, is_en, lvl, q_lim)
on conflict (tier_id, feature_key) do update set
  is_enabled = excluded.is_enabled,
  feature_level = excluded.feature_level,
  quota_limit = excluded.quota_limit;

-- 3. Plus Tier
with plus_tier as (select id from public.access_tiers where tier_key = 'plus')
insert into public.access_tier_features(tier_id, feature_key, is_enabled, feature_level, quota_limit)
select plus_tier.id, v.f_key, v.is_en, v.lvl, v.q_lim
from plus_tier, (values
  ('cbt.practice', true, null, null),
  ('cbt.unlimited', true, null, 0),
  ('cbt.daily_limit', true, null, 999999),
  ('cbt.corrections', true, null, null),
  ('ai.hints', true, null, 1000),
  ('ai.voice', true, null, null),
  ('classroom.live', true, null, null),
  ('competitions.arena', true, null, null),
  ('analytics.advanced', true, null, null),
  ('certificates.verify', false, null, null),
  ('stem.studio', true, 'explore', 10),
  ('calculator.type', true, 'scientific', null),
  ('offline.sync', true, null, null),
  ('vip.support', false, null, null)
) as v(f_key, is_en, lvl, q_lim)
on conflict (tier_id, feature_key) do update set
  is_enabled = excluded.is_enabled,
  feature_level = excluded.feature_level,
  quota_limit = excluded.quota_limit;

-- 4. Pro Tier
with pro_tier as (select id from public.access_tiers where tier_key = 'pro')
insert into public.access_tier_features(tier_id, feature_key, is_enabled, feature_level, quota_limit)
select pro_tier.id, v.f_key, v.is_en, v.lvl, v.q_lim
from pro_tier, (values
  ('cbt.practice', true, null, null),
  ('cbt.unlimited', true, null, 0),
  ('cbt.daily_limit', true, null, 999999),
  ('cbt.corrections', true, null, null),
  ('ai.hints', true, null, 999999),
  ('ai.voice', true, null, null),
  ('classroom.live', true, null, null),
  ('competitions.arena', true, null, null),
  ('analytics.advanced', true, null, null),
  ('certificates.verify', true, null, null),
  ('stem.studio', true, 'advanced', 50),
  ('calculator.type', true, 'scientific', null),
  ('offline.sync', true, null, null),
  ('vip.support', true, null, null)
) as v(f_key, is_en, lvl, q_lim)
on conflict (tier_id, feature_key) do update set
  is_enabled = excluded.is_enabled,
  feature_level = excluded.feature_level,
  quota_limit = excluded.quota_limit;

-- 5. Apex Tier
with apex_tier as (select id from public.access_tiers where tier_key = 'apex')
insert into public.access_tier_features(tier_id, feature_key, is_enabled, feature_level, quota_limit)
select apex_tier.id, v.f_key, v.is_en, v.lvl, v.q_lim
from apex_tier, (values
  ('cbt.practice', true, null, null),
  ('cbt.unlimited', true, null, 0),
  ('cbt.daily_limit', true, null, 999999),
  ('cbt.corrections', true, null, null),
  ('ai.hints', true, null, 999999),
  ('ai.voice', true, null, null),
  ('classroom.live', true, null, null),
  ('competitions.arena', true, null, null),
  ('analytics.advanced', true, null, null),
  ('certificates.verify', true, null, null),
  ('stem.studio', true, 'complete', 999999),
  ('calculator.type', true, 'scientific', null),
  ('offline.sync', true, null, null),
  ('vip.support', true, null, null)
) as v(f_key, is_en, lvl, q_lim)
on conflict (tier_id, feature_key) do update set
  is_enabled = excluded.is_enabled,
  feature_level = excluded.feature_level,
  quota_limit = excluded.quota_limit;

-- -----------------------------------------------------------------------------
-- 10. CENTRAL ENTITLEMENT RESOLVER RPC
-- -----------------------------------------------------------------------------
create or replace function public.resolve_student_entitlements(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now() at time zone 'utc';
  v_effective_tier_id uuid;
  v_effective_tier_key text := 'free';
  v_effective_tier_name text := 'Free Learner';
  v_effective_rank integer := 0;
  v_effective_expiry timestamptz := null;
  v_is_subscribed boolean := false;
  
  v_features jsonb := '{}'::jsonb;
  v_feat record;
  v_grant record;
  v_tier_feat record;
  
  -- Admin bypass detection
  v_is_admin boolean := false;
begin
  if p_user_id is null then
    p_user_id := auth.uid();
  end if;

  if p_user_id is null then
    -- Anonymous / Unauthenticated: return baseline Free Learner
    select id into v_effective_tier_id from public.access_tiers where tier_key = 'free';
    for v_feat in select feature_key, name, feature_type, quota_period from public.feature_catalog loop
      select is_enabled, feature_level, quota_limit into v_tier_feat
      from public.access_tier_features where tier_id = v_effective_tier_id and feature_key = v_feat.feature_key;
      
      v_features := jsonb_set(
        v_features,
        array[v_feat.feature_key],
        jsonb_build_object(
          'enabled', coalesce(v_tier_feat.is_enabled, false),
          'type', v_feat.feature_type,
          'level', v_tier_feat.feature_level,
          'quota_limit', coalesce(v_tier_feat.quota_limit, 0),
          'remaining', coalesce(v_tier_feat.quota_limit, 0)
        )
      );
    end loop;

    return jsonb_build_object(
      'user_id', null,
      'tier_key', 'free',
      'tier_name', 'Free Learner',
      'is_subscribed', false,
      'expires_at', null,
      'features', v_features
    );
  end if;

  -- 1. Check Administrator Universal VIP status
  if exists (
    select 1 from public.admin_profiles where user_id = p_user_id
    union
    select 1 from public.access_user_role_assignments a
    join public.access_roles r on r.id = a.role_id
    where a.user_id = p_user_id and a.revoked_at is null
  ) then
    v_is_admin := true;
  end if;

  if v_is_admin then
    select id, tier_key, name into v_effective_tier_id, v_effective_tier_key, v_effective_tier_name
    from public.access_tiers where tier_key = 'apex';

    for v_feat in select feature_key, name, feature_type, quota_period from public.feature_catalog loop
      v_features := jsonb_set(
        v_features,
        array[v_feat.feature_key],
        jsonb_build_object(
          'enabled', true,
          'type', v_feat.feature_type,
          'level', case when v_feat.feature_type = 'level' then 'complete' else null end,
          'quota_limit', 999999,
          'remaining', 999999
        )
      );
    end loop;

    return jsonb_build_object(
      'user_id', p_user_id,
      'tier_key', 'apex',
      'tier_name', 'Super Admin (Universal VIP)',
      'is_subscribed', true,
      'expires_at', null,
      'features', v_features
    );
  end if;

  -- 2. Inspect active programme memberships (Apex or cohort memberships)
  select pm.tier_id, t.tier_key, t.name, t.rank, pm.expires_at
  into v_effective_tier_id, v_effective_tier_key, v_effective_tier_name, v_effective_rank, v_effective_expiry
  from public.programme_memberships pm
  join public.access_tiers t on t.id = pm.tier_id
  where pm.user_id = p_user_id
    and pm.is_active = true
    and pm.suspended_at is null
    and (pm.expires_at is null or pm.expires_at > v_now)
  order by t.rank desc, pm.expires_at desc nulls first
  limit 1;

  -- 3. Inspect active user_subscriptions (Legacy / Paid tiers)
  declare
    v_sub_tier_id uuid;
    v_sub_tier_key text;
    v_sub_tier_name text;
    v_sub_rank integer;
    v_sub_expiry timestamptz;
  begin
    select t.id, t.tier_key, t.name, t.rank, s.current_period_end
    into v_sub_tier_id, v_sub_tier_key, v_sub_tier_name, v_sub_rank, v_sub_expiry
    from public.user_subscriptions s
    join public.access_tiers t on lower(t.tier_key) = lower(s.plan_id)
    where s.user_id = p_user_id
      and s.status = 'active'
      and s.current_period_end > v_now
    order by t.rank desc, s.current_period_end desc
    limit 1;

    if v_sub_rank is not null and v_sub_rank > coalesce(v_effective_rank, 0) then
      v_effective_tier_id := v_sub_tier_id;
      v_effective_tier_key := v_sub_tier_key;
      v_effective_tier_name := v_sub_tier_name;
      v_effective_rank := v_sub_rank;
      v_effective_expiry := v_sub_expiry;
    end if;
  end;

  -- 4. Check learning_entitlements fallback
  declare
    v_lent_tier_id uuid;
    v_lent_tier_key text;
    v_lent_tier_name text;
    v_lent_rank integer;
    v_lent_expiry timestamptz;
  begin
    select t.id, t.tier_key, t.name, t.rank, le.expires_at
    into v_lent_tier_id, v_lent_tier_key, v_lent_tier_name, v_lent_rank, v_lent_expiry
    from public.learning_entitlements le
    join public.access_tiers t on lower(t.tier_key) = lower(le.membership_type)
    where le.user_id = p_user_id
      and le.status = 'active'
      and le.revoked_at is null
      and (le.permanent = true or le.expires_at > v_now)
    order by t.rank desc
    limit 1;

    if v_lent_rank is not null and v_lent_rank > coalesce(v_effective_rank, 0) then
      v_effective_tier_id := v_lent_tier_id;
      v_effective_tier_key := v_lent_tier_key;
      v_effective_tier_name := v_lent_tier_name;
      v_effective_rank := v_lent_rank;
      v_effective_expiry := v_lent_expiry;
    end if;
  end;

  -- 5. Fallback to Implicit Free Tier (Decision D2)
  if v_effective_tier_id is null then
    select id, tier_key, name, rank into v_effective_tier_id, v_effective_tier_key, v_effective_tier_name, v_effective_rank
    from public.access_tiers where tier_key = 'free';
    v_is_subscribed := false;
  else
    v_is_subscribed := (v_effective_rank > 0);
  end if;

  -- 6. Build resolved features with merge rules D3, D4, D5
  for v_feat in select feature_key, name, feature_type, quota_period from public.feature_catalog loop
    -- A. Base Tier values
    select is_enabled, feature_level, quota_limit into v_tier_feat
    from public.access_tier_features
    where tier_id = v_effective_tier_id and feature_key = v_feat.feature_key;

    declare
      v_enabled boolean := coalesce(v_tier_feat.is_enabled, false);
      v_level text := v_tier_feat.feature_level;
      v_base_quota integer := coalesce(v_tier_feat.quota_limit, 0);
      v_grant_quota integer := 0;
      v_total_limit integer := 0;
      v_used_count integer := 0;
      v_remaining integer := 0;
      v_p_start timestamptz;
      v_p_end timestamptz;
    begin
      -- B. Inspect active individual student grants (Decision D3, D4, D5)
      for v_grant in
        select is_enabled, feature_level, quota_allowance
        from public.student_access_grants
        where user_id = p_user_id
          and feature_key = v_feat.feature_key
          and revoked_at is null
          and not is_suspended
          and (expires_at is null or expires_at > v_now)
      loop
        -- Decision D3: Boolean merge (Union of active grants and tier)
        if v_grant.is_enabled then
          v_enabled := true;
        end if;

        -- Decision D4: Feature level merge (Highest active level wins)
        if v_feat.feature_type = 'level' and v_grant.feature_level is not null then
          if v_level is null or v_level = 'none' then
            v_level := v_grant.feature_level;
          elsif v_level = 'standard' and v_grant.feature_level = 'scientific' then
            v_level := 'scientific';
          elsif v_level in ('discover','explore') and v_grant.feature_level in ('practise','advanced','complete') then
            v_level := v_grant.feature_level;
          elsif v_level = 'practise' and v_grant.feature_level in ('advanced','complete') then
            v_level := v_grant.feature_level;
          elsif v_level = 'advanced' and v_grant.feature_level = 'complete' then
            v_level := 'complete';
          end if;
        end if;

        -- Decision D5: Quota merge (Tier limit plus separately tracked grant allowance)
        if v_grant.quota_allowance is not null and v_grant.quota_allowance > 0 then
          v_grant_quota := v_grant_quota + v_grant.quota_allowance;
        end if;
      end loop;

      -- Compute quota boundaries and usage if applicable
      if v_feat.feature_type = 'quota' or v_base_quota > 0 or v_grant_quota > 0 then
        v_total_limit := v_base_quota + v_grant_quota;

        if v_feat.quota_period = 'daily' then
          v_p_start := date_trunc('day', v_now);
          v_p_end := v_p_start + interval '1 day';
        elsif v_feat.quota_period = 'monthly' then
          v_p_start := date_trunc('month', v_now);
          v_p_end := v_p_start + interval '1 month';
        else
          v_p_start := '1970-01-01 00:00:00+00'::timestamptz;
          v_p_end := '2099-12-31 23:59:59+00'::timestamptz;
        end if;

        select coalesce(sum(current_usage), 0) into v_used_count
        from public.access_usage_counters
        where user_id = p_user_id
          and feature_key = v_feat.feature_key
          and period_type = v_feat.quota_period
          and period_start = v_p_start;

        v_remaining := greatest(0, v_total_limit - v_used_count);
      end if;

      v_features := jsonb_set(
        v_features,
        array[v_feat.feature_key],
        jsonb_build_object(
          'enabled', v_enabled,
          'type', v_feat.feature_type,
          'level', v_level,
          'quota_limit', v_total_limit,
          'base_quota', v_base_quota,
          'grant_quota', v_grant_quota,
          'used', v_used_count,
          'remaining', v_remaining,
          'period', v_feat.quota_period
        )
      );
    end;
  end loop;

  return jsonb_build_object(
    'user_id', p_user_id,
    'tier_key', v_effective_tier_key,
    'tier_name', v_effective_tier_name,
    'rank', v_effective_rank,
    'is_subscribed', v_is_subscribed,
    'expires_at', v_effective_expiry,
    'features', v_features
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. ATOMIC QUOTA CONSUMPTION RPC (RACE-SAFE)
-- -----------------------------------------------------------------------------
create or replace function public.consume_student_quota(
  p_user_id uuid,
  p_feature_key text,
  p_amount integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now() at time zone 'utc';
  v_ent jsonb;
  v_feat jsonb;
  v_limit integer;
  v_period_type text;
  v_p_start timestamptz;
  v_p_end timestamptz;
  v_counter_id uuid;
  v_current_usage integer;
  v_new_usage integer;
begin
  if p_user_id is null then
    p_user_id := auth.uid();
  end if;

  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated', 'message', 'Authentication required');
  end if;

  if p_amount <= 0 then
    p_amount := 1;
  end if;

  -- 1. Resolve authoritative allowance
  v_ent := public.resolve_student_entitlements(p_user_id);
  v_feat := v_ent->'features'->p_feature_key;

  if v_feat is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_feature', 'message', 'Feature not found in catalogue');
  end if;

  if (v_ent->>'tier_key') = 'apex' and (v_ent->>'tier_name') ilike '%Universal VIP%' then
    -- Admin bypass: infinite quota
    return jsonb_build_object('ok', true, 'remaining', 999999, 'unlimited', true);
  end if;

  v_limit := coalesce((v_feat->>'quota_limit')::int, 0);
  v_period_type := coalesce(v_feat->>'period', 'monthly');

  if v_limit >= 999999 then
    return jsonb_build_object('ok', true, 'remaining', 999999, 'unlimited', true);
  end if;

  -- 2. Determine period interval
  if v_period_type = 'daily' then
    v_p_start := date_trunc('day', v_now);
    v_p_end := v_p_start + interval '1 day';
  elsif v_period_type = 'monthly' then
    v_p_start := date_trunc('month', v_now);
    v_p_end := v_p_start + interval '1 month';
  else
    v_p_start := '1970-01-01 00:00:00+00'::timestamptz;
    v_p_end := '2099-12-31 23:59:59+00'::timestamptz;
  end if;

  -- 3. Atomic lock & increment
  -- Ensure counter row exists
  insert into public.access_usage_counters (
    user_id, feature_key, period_type, period_start, period_end, current_usage
  )
  values (
    p_user_id, p_feature_key, v_period_type, v_p_start, v_p_end, 0
  )
  on conflict (user_id, feature_key, period_type, period_start) do nothing;

  -- Row lock with FOR UPDATE to prevent race condition
  select id, current_usage
  into v_counter_id, v_current_usage
  from public.access_usage_counters
  where user_id = p_user_id
    and feature_key = p_feature_key
    and period_type = v_period_type
    and period_start = v_p_start
  for update;

  if v_current_usage + p_amount > v_limit then
    return jsonb_build_object(
      'ok', false,
      'error', 'quota_exceeded',
      'message', 'Your quota limit for this period has been reached.',
      'current_usage', v_current_usage,
      'quota_limit', v_limit,
      'remaining', greatest(0, v_limit - v_current_usage)
    );
  end if;

  v_new_usage := v_current_usage + p_amount;

  update public.access_usage_counters
  set current_usage = v_new_usage, updated_at = v_now
  where id = v_counter_id;

  return jsonb_build_object(
    'ok', true,
    'consumed', p_amount,
    'current_usage', v_new_usage,
    'quota_limit', v_limit,
    'remaining', greatest(0, v_limit - v_new_usage)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 12. ATOMIC HASHED ACCESS CODE REDEMPTION RPC
-- -----------------------------------------------------------------------------
create or replace function public.redeem_hashed_access_code(
  p_code text,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now() at time zone 'utc';
  v_clean_code text := upper(trim(p_code));
  v_hash text;
  v_code_row public.access_hashed_codes%rowtype;
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_tier_row public.access_tiers%rowtype;
  v_period_end timestamptz;
begin
  if v_clean_code is null or length(v_clean_code) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty_code', 'message', 'Please enter a valid code');
  end if;

  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required', 'message', 'You must be signed in to redeem this code');
  end if;

  v_hash := encode(sha256(v_clean_code::bytea), 'hex');

  -- 1. Try finding in access_hashed_codes with row lock
  select * into v_code_row
  from public.access_hashed_codes
  where code_hash = v_hash
  for update;

  if found then
    if v_code_row.is_redeemed then
      return jsonb_build_object('ok', false, 'error', 'already_redeemed', 'message', 'This code has already been redeemed');
    end if;

    if v_code_row.expires_at is not null and v_code_row.expires_at <= v_now then
      return jsonb_build_object('ok', false, 'error', 'expired_code', 'message', 'This code has expired');
    end if;

    v_period_end := v_now + (v_code_row.validity_days || ' days')::interval;

    -- Mark redeemed
    update public.access_hashed_codes
    set is_redeemed = true,
        redeemed_by = v_user_id,
        redeemed_at = v_now
    where id = v_code_row.id;

    -- If grants tier, upsert into user_subscriptions & learning_entitlements
    if v_code_row.grants_tier_id is not null then
      select * into v_tier_row from public.access_tiers where id = v_code_row.grants_tier_id;
      
      insert into public.user_subscriptions (
        user_id, plan_id, status, current_period_start, current_period_end, payment_provider, updated_at
      ) values (
        v_user_id, v_tier_row.tier_key, 'active', v_now, v_period_end, 'voucher_pin', v_now
      )
      on conflict (user_id) do update set
        plan_id = excluded.plan_id,
        status = 'active',
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        payment_provider = 'voucher_pin',
        updated_at = v_now;

      insert into public.learning_entitlements (
        user_id, entitlement_type, membership_type, max_questions, status, permanent, starts_at, expires_at
      ) values (
        v_user_id, 'membership', v_tier_row.tier_key, 10000, 'active', false, v_now, v_period_end
      );
    end if;

    -- If grants programme, insert into programme_memberships
    if v_code_row.grants_programme_id is not null then
      insert into public.programme_memberships (
        programme_id, user_id, tier_id, joined_at, expires_at, is_active
      ) values (
        v_code_row.grants_programme_id, v_user_id, v_code_row.grants_tier_id, v_now, v_period_end, true
      )
      on conflict (programme_id, user_id) do update set
        tier_id = excluded.tier_id,
        expires_at = excluded.expires_at,
        is_active = true,
        suspended_at = null;
    end if;

    -- Insert audit log
    insert into public.access_audit_logs(actor_id, action, target_type, target_id, details)
    values (
      v_user_id,
      'code_redeemed',
      'access_hashed_code',
      v_code_row.id::text,
      jsonb_build_object(
        'code_prefix', v_code_row.code_prefix,
        'tier_key', v_tier_row.tier_key,
        'validity_days', v_code_row.validity_days
      )
    );

    return jsonb_build_object(
      'ok', true,
      'tier_key', v_tier_row.tier_key,
      'tier_name', v_tier_row.name,
      'expires_at', v_period_end,
      'message', 'Code successfully redeemed'
    );
  end if;

  -- 2. Fallback to legacy redeem_plan_voucher if table exists
  begin
    return public.redeem_plan_voucher(v_clean_code, v_user_id);
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'invalid_code', 'message', 'The code is invalid or does not exist');
  end;
end;
$$;

-- -----------------------------------------------------------------------------
-- 13. PRIVILEGE ASSIGNMENTS & SECURITY HARDENING
-- -----------------------------------------------------------------------------
-- Revoke direct mutations on sensitive tables from client roles
revoke all on public.feature_catalog from anon, authenticated;
revoke all on public.access_tiers from anon, authenticated;
revoke all on public.access_tier_features from anon, authenticated;
revoke all on public.access_programmes from anon, authenticated;
revoke all on public.programme_memberships from anon, authenticated;
revoke all on public.student_access_grants from anon, authenticated;
revoke all on public.access_grant_history from anon, authenticated;
revoke all on public.access_usage_counters from anon, authenticated;
revoke all on public.access_hashed_codes from anon, authenticated;
revoke all on public.access_migration_batches from anon, authenticated;
revoke all on public.access_migration_items from anon, authenticated;
revoke all on public.access_audit_logs from anon, authenticated;

-- Allow read on catalog and tiers to clients
grant select on public.feature_catalog to anon, authenticated;
grant select on public.access_tiers to anon, authenticated;
grant select on public.access_tier_features to anon, authenticated;

-- Grant execution on authoritative resolver and consumption RPCs
grant execute on function public.resolve_student_entitlements(uuid) to anon, authenticated;
grant execute on function public.consume_student_quota(uuid, text, integer) to authenticated;
grant execute on function public.redeem_hashed_access_code(text, uuid) to authenticated;
