-- Central Authoritative Entitlement Engine & Database Implementation
-- Checkpoint 1: Feature Catalogue, Tiers, Programmes, Grants, Audit, RLS and Resolvers
begin;

-- ============================================================================
-- 1. FEATURE CATALOGUE
-- ============================================================================
create table if not exists public.feature_catalog (
  feature_key text primary key,
  display_name text not null,
  description text not null default '',
  feature_group text not null check (feature_group in ('cbt', 'ai_learning', 'learning_hub', 'live_classroom', 'arena', 'stem_studio', 'student_tools', 'certificates')),
  entitlement_type text not null check (entitlement_type in ('boolean', 'stepped_level', 'quota', 'configurable_value')),
  supported_levels jsonb not null default '[]'::jsonb,
  level_ordering jsonb not null default '{}'::jsonb,
  quota_unit text,
  quota_period text check (quota_period is null or quota_period in ('daily', 'monthly', 'yearly', 'lifetime')),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_catalog_levels_check check (
    entitlement_type != 'stepped_level' or jsonb_typeof(supported_levels) = 'array'
  ),
  constraint feature_catalog_quota_check check (
    entitlement_type != 'quota' or (quota_unit is not null and quota_period is not null)
  )
);

-- Seed core feature catalogue
insert into public.feature_catalog (
  feature_key, display_name, description, feature_group, entitlement_type,
  supported_levels, level_ordering, quota_unit, quota_period
) values
('cbt.mock_exams', 'CBT Mock Examinations', 'Daily CBT practice mock tests and timed full simulations', 'cbt', 'quota', '[]'::jsonb, '{}'::jsonb, 'attempts', 'daily'),
('cbt.corrections', 'Question Corrections & Explanations', 'Comprehensive step-by-step solutions and explanations', 'cbt', 'boolean', '[]'::jsonb, '{}'::jsonb, null, null),
('cbt.calculator', 'Examination Calculator Type', 'Allowed examination calculator mode in simulator', 'cbt', 'stepped_level', '["standard", "scientific"]'::jsonb, '{"standard": 1, "scientific": 2}'::jsonb, null, null),
('ai.tutor.queries', 'AI Tutor Study Hints & Explanations', 'Interactive AI study assistance and deep diagnostic feedback', 'ai_learning', 'quota', '[]'::jsonb, '{}'::jsonb, 'queries', 'monthly'),
('ai.model_family', 'AI Intelligence Tier', 'Assigned AI foundation model tier', 'ai_learning', 'stepped_level', '["groq_fast", "gemini_flash", "gemini_pro"]'::jsonb, '{"groq_fast": 1, "gemini_flash": 2, "gemini_pro": 3}'::jsonb, null, null),
('live.classroom.access', 'Live Interactive Classroom Access', 'Access to live audio/video coaching broadcasts', 'live_classroom', 'boolean', '[]'::jsonb, '{}'::jsonb, null, null),
('live.classroom.stage', 'Live Classroom Stage Privilege', 'Participation tier in live classroom stages', 'live_classroom', 'stepped_level', '["viewer", "interactive", "speaker"]'::jsonb, '{"viewer": 1, "interactive": 2, "speaker": 3}'::jsonb, null, null),
('arena.competitions', 'Challenge Arena Tournaments', 'Participation in rated 1v1 and multiplayer arena battles', 'arena', 'boolean', '[]'::jsonb, '{}'::jsonb, null, null),
('arena.hosting', 'Arena Battle Host Privilege', 'Host custom head-to-head challenge rooms', 'arena', 'boolean', '[]'::jsonb, '{}'::jsonb, null, null),
('stem.studio.access', 'STEM Studio 3D Interactive Atlas', 'Access to 3D visual STEM anatomical models and pathways', 'stem_studio', 'boolean', '[]'::jsonb, '{}'::jsonb, null, null),
('stem.studio.level', 'STEM Studio Simulation Tier', 'Interactivity depth for STEM visual experiments', 'stem_studio', 'stepped_level', '["viewer", "interactive_3d", "simulation"]'::jsonb, '{"viewer": 1, "interactive_3d": 2, "simulation": 3}'::jsonb, null, null),
('certificates.issued', 'Verified Certificates of Completion', 'Issuance and cryptographic verification of certificates', 'certificates', 'boolean', '[]'::jsonb, '{}'::jsonb, null, null),
('analytics.advanced', 'Advanced Psychometrics & Analytics', 'In-depth speed, accuracy and topic mastery insights', 'student_tools', 'boolean', '[]'::jsonb, '{}'::jsonb, null, null)
on conflict (feature_key) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  feature_group = excluded.feature_group,
  entitlement_type = excluded.entitlement_type,
  supported_levels = excluded.supported_levels,
  level_ordering = excluded.level_ordering,
  quota_unit = excluded.quota_unit,
  quota_period = excluded.quota_period,
  updated_at = now();

-- ============================================================================
-- 2. ACCESS TIERS
-- ============================================================================
create table if not exists public.access_tiers (
  id uuid primary key default gen_random_uuid(),
  tier_key text not null unique check (tier_key = lower(tier_key)),
  name text not null,
  description text not null default '',
  tier_priority integer not null default 0,
  is_active boolean not null default true,
  is_retired boolean not null default false,
  is_visible boolean not null default true,
  is_assignable boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed canonical access tiers
insert into public.access_tiers (tier_key, name, description, tier_priority, is_active, is_retired) values
('free', 'Free Learner', 'Essential CBT practice and foundational learning access', 0, true, false),
('premium', 'Premium Study', 'Expanded CBT practice and question explanations', 10, true, false),
('plus', 'BrainLab Plus', 'Full interactive study suite with scientific tools and AI hints', 20, true, false),
('pro', 'BrainLab Pro', 'Comprehensive study suite with unlimited CBT and advanced AI', 30, true, false),
('apex', 'BrainLab Apex Cohort', 'Flagship cohort-level universal access across all platform disciplines', 50, true, false)
on conflict (tier_key) do update set
  name = excluded.name,
  description = excluded.description,
  tier_priority = excluded.tier_priority,
  is_active = excluded.is_active,
  is_retired = excluded.is_retired,
  updated_at = now();

-- ============================================================================
-- 3. TIER-FEATURE MAPPINGS
-- ============================================================================
create table if not exists public.access_tier_features (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid not null references public.access_tiers(id) on delete cascade,
  feature_key text not null references public.feature_catalog(feature_key) on delete cascade,
  is_enabled boolean not null default true,
  feature_level text,
  quota_limit integer check (quota_limit is null or quota_limit >= 0),
  quota_period text check (quota_period is null or quota_period in ('daily', 'monthly', 'yearly', 'lifetime')),
  config_value jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tier_id, feature_key)
);

-- Validation trigger for tier-feature mappings
create or replace function public.validate_access_tier_feature_mapping()
returns trigger
language plpgsql
as $$
declare
  v_catalog record;
begin
  select * into v_catalog from public.feature_catalog where feature_key = new.feature_key;
  if not found then
    raise exception 'Feature key % does not exist in feature_catalog', new.feature_key;
  end if;

  if v_catalog.entitlement_type = 'boolean' then
    if new.feature_level is not null or new.quota_limit is not null then
      raise exception 'Boolean feature % must not define a level or quota', new.feature_key;
    end if;
  elsif v_catalog.entitlement_type = 'stepped_level' then
    if new.quota_limit is not null then
      raise exception 'Stepped feature % must not define a quota limit', new.feature_key;
    end if;
    if new.feature_level is not null and not (v_catalog.supported_levels ? new.feature_level) then
      raise exception 'Invalid level % for feature %. Supported: %', new.feature_level, new.feature_key, v_catalog.supported_levels;
    end if;
  elsif v_catalog.entitlement_type = 'quota' then
    if new.feature_level is not null then
      raise exception 'Quota feature % must not define a feature level', new.feature_key;
    end if;
    if new.quota_period is not null and new.quota_period != v_catalog.quota_period then
      raise exception 'Quota period % must match catalogue period % for feature %', new.quota_period, v_catalog.quota_period, new.feature_key;
    end if;
    new.quota_period := coalesce(new.quota_period, v_catalog.quota_period);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_access_tier_feature_mapping on public.access_tier_features;
create trigger trg_validate_access_tier_feature_mapping
before insert or update on public.access_tier_features
for each row execute function public.validate_access_tier_feature_mapping();

-- Seed canonical tier mappings
do $$
declare
  v_free_id uuid;
  v_premium_id uuid;
  v_plus_id uuid;
  v_pro_id uuid;
  v_apex_id uuid;
begin
  select id into v_free_id from public.access_tiers where tier_key = 'free';
  select id into v_premium_id from public.access_tiers where tier_key = 'premium';
  select id into v_plus_id from public.access_tiers where tier_key = 'plus';
  select id into v_pro_id from public.access_tiers where tier_key = 'pro';
  select id into v_apex_id from public.access_tiers where tier_key = 'apex';

  -- Free Tier Mappings
  insert into public.access_tier_features (tier_id, feature_key, is_enabled, quota_limit, quota_period)
  values (v_free_id, 'cbt.mock_exams', true, 1, 'daily')
  on conflict (tier_id, feature_key) do update set quota_limit = 1, quota_period = 'daily';

  insert into public.access_tier_features (tier_id, feature_key, is_enabled, quota_limit, quota_period)
  values (v_free_id, 'ai.tutor.queries', true, 50, 'monthly')
  on conflict (tier_id, feature_key) do update set quota_limit = 50, quota_period = 'monthly';

  insert into public.access_tier_features (tier_id, feature_key, is_enabled, feature_level)
  values (v_free_id, 'cbt.calculator', true, 'standard')
  on conflict (tier_id, feature_key) do update set feature_level = 'standard';

  -- Plus Tier Mappings
  insert into public.access_tier_features (tier_id, feature_key, is_enabled, quota_limit, quota_period)
  values (v_plus_id, 'cbt.mock_exams', true, null, 'daily') -- Unlimited daily mocks
  on conflict (tier_id, feature_key) do update set quota_limit = null;

  insert into public.access_tier_features (tier_id, feature_key, is_enabled, quota_limit, quota_period)
  values (v_plus_id, 'ai.tutor.queries', true, 1000, 'monthly')
  on conflict (tier_id, feature_key) do update set quota_limit = 1000;

  insert into public.access_tier_features (tier_id, feature_key, is_enabled, feature_level)
  values (v_plus_id, 'cbt.calculator', true, 'scientific')
  on conflict (tier_id, feature_key) do update set feature_level = 'scientific';

  insert into public.access_tier_features (tier_id, feature_key, is_enabled)
  values (v_plus_id, 'cbt.corrections', true)
  on conflict (tier_id, feature_key) do update set is_enabled = true;

  insert into public.access_tier_features (tier_id, feature_key, is_enabled)
  values (v_plus_id, 'stem.studio.access', true)
  on conflict (tier_id, feature_key) do update set is_enabled = true;

  insert into public.access_tier_features (tier_id, feature_key, is_enabled, feature_level)
  values (v_plus_id, 'stem.studio.level', true, 'interactive_3d')
  on conflict (tier_id, feature_key) do update set feature_level = 'interactive_3d';

  -- Apex Tier Mappings (Universal Platform Access)
  insert into public.access_tier_features (tier_id, feature_key, is_enabled, quota_limit, quota_period)
  values (v_apex_id, 'cbt.mock_exams', true, null, 'daily')
  on conflict (tier_id, feature_key) do update set quota_limit = null;

  insert into public.access_tier_features (tier_id, feature_key, is_enabled, quota_limit, quota_period)
  values (v_apex_id, 'ai.tutor.queries', true, 5000, 'monthly')
  on conflict (tier_id, feature_key) do update set quota_limit = 5000;

  insert into public.access_tier_features (tier_id, feature_key, is_enabled, feature_level)
  values (v_apex_id, 'cbt.calculator', true, 'scientific')
  on conflict (tier_id, feature_key) do update set feature_level = 'scientific';

  insert into public.access_tier_features (tier_id, feature_key, is_enabled, feature_level)
  values (v_apex_id, 'stem.studio.level', true, 'simulation')
  on conflict (tier_id, feature_key) do update set feature_level = 'simulation';

  insert into public.access_tier_features (tier_id, feature_key, is_enabled)
  values (v_apex_id, 'cbt.corrections', true),
         (v_apex_id, 'live.classroom.access', true),
         (v_apex_id, 'arena.competitions', true),
         (v_apex_id, 'arena.hosting', true),
         (v_apex_id, 'stem.studio.access', true),
         (v_apex_id, 'certificates.issued', true),
         (v_apex_id, 'analytics.advanced', true)
  on conflict (tier_id, feature_key) do update set is_enabled = true;
end $$;

-- ============================================================================
-- 4. PROGRAMMES AND COHORTS
-- ============================================================================
create table if not exists public.access_programmes (
  id uuid primary key default gen_random_uuid(),
  programme_key text not null unique check (programme_key = lower(programme_key)),
  name text not null,
  description text not null default '',
  associated_tier_id uuid references public.access_tiers(id) on delete set null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_programme_features (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.access_programmes(id) on delete cascade,
  feature_key text not null references public.feature_catalog(feature_key) on delete cascade,
  is_enabled boolean not null default true,
  feature_level text,
  quota_limit integer check (quota_limit is null or quota_limit >= 0),
  quota_period text check (quota_period is null or quota_period in ('daily', 'monthly', 'yearly', 'lifetime')),
  config_value jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (programme_id, feature_key)
);

create table if not exists public.programme_memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  programme_id uuid not null references public.access_programmes(id) on delete cascade,
  membership_status text not null default 'active' check (membership_status in ('active', 'suspended', 'expired', 'revoked', 'pending')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  suspended_at timestamptz,
  suspended_reason text,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_reason text,
  assigned_by uuid references auth.users(id) on delete set null,
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, programme_id)
);

-- ============================================================================
-- 5. INDIVIDUAL STUDENT ACCESS GRANTS
-- ============================================================================
create table if not exists public.student_access_grants (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  target_feature_key text references public.feature_catalog(feature_key) on delete cascade,
  target_tier_id uuid references public.access_tiers(id) on delete cascade,
  target_programme_id uuid references public.access_programmes(id) on delete cascade,
  feature_enabled boolean,
  feature_level text,
  quota_amount integer check (quota_amount is null or quota_amount >= 0),
  quota_period text check (quota_period is null or quota_period in ('daily', 'monthly', 'yearly', 'lifetime')),
  grant_source text not null default 'admin_manual' check (
    grant_source in ('admin_manual', 'scholarship', 'promotional', 'support_intervention', 'voucher_redemption', 'commercial_subscription')
  ),
  status text not null default 'active' check (status in ('active', 'suspended', 'expired', 'revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  reason text not null default '',
  original_source_ref text,
  original_subscription_id text,
  created_by uuid references auth.users(id) on delete set null,
  suspended_at timestamptz,
  suspended_reason text,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_access_grants_single_target check (
    (target_feature_key is not null)::int + (target_tier_id is not null)::int + (target_programme_id is not null)::int = 1
  )
);

create table if not exists public.access_grant_history (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid references public.student_access_grants(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('created', 'modified', 'extended', 'suspended', 'restored', 'revoked', 'expired')),
  previous_state jsonb,
  new_state jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. IMMUTABLE ACCESS AUDIT LOGS
-- ============================================================================
create table if not exists public.access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  target_student_id uuid references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  previous_state jsonb,
  new_state jsonb,
  reason text not null default '',
  request_ref text,
  created_at timestamptz not null default now()
);

-- Database guard trigger: enforce append-only immutability
create or replace function public.guard_access_audit_logs_immutability()
returns trigger
language plpgsql
as $$
begin
  raise exception 'access_audit_logs is append-only: UPDATE and DELETE operations are forbidden.';
end;
$$;

drop trigger if exists trg_guard_access_audit_logs_immutability on public.access_audit_logs;
create trigger trg_guard_access_audit_logs_immutability
before update or delete on public.access_audit_logs
for each row execute function public.guard_access_audit_logs_immutability();

-- ============================================================================
-- 7. PERFORMANCE INDEXES
-- ============================================================================
create index if not exists idx_tier_features_lookup on public.access_tier_features(tier_id, feature_key);
create index if not exists idx_prog_memberships_student on public.programme_memberships(student_id, membership_status, expires_at);
create index if not exists idx_student_grants_student on public.student_access_grants(student_id, status, expires_at);
create index if not exists idx_student_grants_target_feature on public.student_access_grants(student_id, target_feature_key) where status = 'active';
create index if not exists idx_audit_logs_target on public.access_audit_logs(target_student_id, created_at desc);

-- ============================================================================
-- 8. AUTHORITATIVE ENTITLEMENT RESOLVER
-- ============================================================================

create or replace function public.resolve_student_entitlements_internal(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_user_exists boolean;
  v_is_account_suspended boolean := false;
  
  v_effective_tier record;
  v_free_tier record;
  
  v_programmes jsonb := '[]'::jsonb;
  v_grants jsonb := '[]'::jsonb;
  v_permissions jsonb := '{}'::jsonb;
  v_levels jsonb := '{}'::jsonb;
  v_quotas jsonb := '{}'::jsonb;
  
  v_cat record;
  v_feat record;
  v_tier_feat record;
  v_prog_feat record;
  v_grant_feat record;
  
  v_bool_enabled boolean;
  v_highest_level text;
  v_highest_rank int;
  v_quota_limit int;
  v_quota_is_unlimited boolean;
  v_current_rank int;
begin
  if p_user_id is null then
    return null;
  end if;

  -- 1. Check account suspension (e.g. from user metadata or profile status)
  select exists(select 1 from auth.users where id = p_user_id) into v_user_exists;
  if not v_user_exists then
    return null;
  end if;

  select coalesce(raw_user_meta_data->>'account_status', 'active') = 'suspended'
  into v_is_account_suspended
  from auth.users where id = p_user_id;

  if v_is_account_suspended then
    return jsonb_build_object(
      'student_id', p_user_id,
      'is_suspended', true,
      'effective_tier', null,
      'programmes', '[]'::jsonb,
      'permissions', '{}'::jsonb,
      'levels', '{}'::jsonb,
      'quotas', '{}'::jsonb,
      'resolved_at', v_now
    );
  end if;

  -- 2. Identify candidate tiers:
  -- Source A: Direct active Tier Grants
  -- Source B: Active Programme Memberships with associated tiers
  -- Highest configured tier_priority wins. Deterministic tie-breaker: tier_priority DESC, created_at ASC, id ASC
  select t.*, g.id as source_grant_id, g.expires_at as tier_expires_at, 'grant' as source_type
  into v_effective_tier
  from public.student_access_grants g
  join public.access_tiers t on t.id = g.target_tier_id
  where g.student_id = p_user_id
    and g.status = 'active'
    and t.is_active = true
    and (g.starts_at <= v_now)
    and (g.expires_at is null or g.expires_at > v_now)
  union all
  select t.*, pm.id as source_grant_id, pm.expires_at as tier_expires_at, 'programme' as source_type
  from public.programme_memberships pm
  join public.access_programmes p on p.id = pm.programme_id
  join public.access_tiers t on t.id = p.associated_tier_id
  where pm.student_id = p_user_id
    and pm.membership_status = 'active'
    and p.is_active = true
    and t.is_active = true
    and (pm.starts_at <= v_now)
    and (pm.expires_at is null or pm.expires_at > v_now)
  order by tier_priority desc, created_at asc, id asc
  limit 1;

  -- Implicit Free Fallback if no higher active tier found
  select * into v_free_tier from public.access_tiers where tier_key = 'free';
  if v_effective_tier.id is null then
    v_effective_tier := v_free_tier;
  end if;

  -- 3. Collect active programmes
  select coalesce(jsonb_agg(jsonb_build_object(
    'programme_id', p.id,
    'programme_key', p.programme_key,
    'name', p.name,
    'cohort_ref', pm.source_ref,
    'expires_at', pm.expires_at
  )), '[]'::jsonb)
  into v_programmes
  from public.programme_memberships pm
  join public.access_programmes p on p.id = pm.programme_id
  where pm.student_id = p_user_id
    and pm.membership_status = 'active'
    and p.is_active = true
    and (pm.starts_at <= v_now)
    and (pm.expires_at is null or pm.expires_at > v_now);

  -- 4. Collect active individual grants
  select coalesce(jsonb_agg(jsonb_build_object(
    'grant_id', g.id,
    'source', g.grant_source,
    'feature_key', g.target_feature_key,
    'expires_at', g.expires_at,
    'reason', g.reason
  )), '[]'::jsonb)
  into v_grants
  from public.student_access_grants g
  where g.student_id = p_user_id
    and g.status = 'active'
    and (g.starts_at <= v_now)
    and (g.expires_at is null or g.expires_at > v_now);

  -- 5. Resolve features from catalogue
  for v_cat in select * from public.feature_catalog where is_active = true loop

    if v_cat.entitlement_type = 'boolean' then
      -- Boolean: Enabled if granted by effective tier, active programme, or active individual grant
      v_bool_enabled := false;

      -- Check tier
      select is_enabled into v_bool_enabled
      from public.access_tier_features
      where tier_id = v_effective_tier.id and feature_key = v_cat.feature_key and is_active = true;
      v_bool_enabled := coalesce(v_bool_enabled, false);

      -- Check programmes
      if not v_bool_enabled then
        select exists (
          select 1
          from public.programme_memberships pm
          join public.access_programme_features pf on pf.programme_id = pm.programme_id
          where pm.student_id = p_user_id
            and pm.membership_status = 'active'
            and pf.feature_key = v_cat.feature_key
            and pf.is_enabled = true
            and pf.is_active = true
            and (pm.starts_at <= v_now)
            and (pm.expires_at is null or pm.expires_at > v_now)
        ) into v_bool_enabled;
      end if;

      -- Check individual grants
      if not v_bool_enabled then
        select exists (
          select 1
          from public.student_access_grants g
          where g.student_id = p_user_id
            and g.target_feature_key = v_cat.feature_key
            and g.status = 'active'
            and coalesce(g.feature_enabled, true) = true
            and (g.starts_at <= v_now)
            and (g.expires_at is null or g.expires_at > v_now)
        ) into v_bool_enabled;
      end if;

      v_permissions := jsonb_set(v_permissions, array[v_cat.feature_key], to_jsonb(v_bool_enabled));

    elsif v_cat.entitlement_type = 'stepped_level' then
      -- Stepped level: Highest active level wins according to catalogue level_ordering
      v_highest_level := null;
      v_highest_rank := -1;

      -- Check tier
      select feature_level into v_highest_level
      from public.access_tier_features
      where tier_id = v_effective_tier.id and feature_key = v_cat.feature_key and is_active = true;
      if v_highest_level is not null then
        v_highest_rank := coalesce((v_cat.level_ordering->>v_highest_level)::int, 0);
      end if;

      -- Check programmes
      for v_prog_feat in
        select pf.feature_level
        from public.programme_memberships pm
        join public.access_programme_features pf on pf.programme_id = pm.programme_id
        where pm.student_id = p_user_id
          and pm.membership_status = 'active'
          and pf.feature_key = v_cat.feature_key
          and pf.is_active = true
          and (pm.starts_at <= v_now)
          and (pm.expires_at is null or pm.expires_at > v_now)
      loop
        v_current_rank := coalesce((v_cat.level_ordering->>v_prog_feat.feature_level)::int, 0);
        if v_current_rank > v_highest_rank then
          v_highest_rank := v_current_rank;
          v_highest_level := v_prog_feat.feature_level;
        end if;
      end loop;

      -- Check individual grants
      for v_grant_feat in
        select g.feature_level
        from public.student_access_grants g
        where g.student_id = p_user_id
          and g.target_feature_key = v_cat.feature_key
          and g.status = 'active'
          and g.feature_level is not null
          and (g.starts_at <= v_now)
          and (g.expires_at is null or g.expires_at > v_now)
      loop
        v_current_rank := coalesce((v_cat.level_ordering->>v_grant_feat.feature_level)::int, 0);
        if v_current_rank > v_highest_rank then
          v_highest_rank := v_current_rank;
          v_highest_level := v_grant_feat.feature_level;
        end if;
      end loop;

      if v_highest_level is not null then
        v_levels := jsonb_set(v_levels, array[v_cat.feature_key], to_jsonb(v_highest_level));
      end if;

    elsif v_cat.entitlement_type = 'quota' then
      -- Additive Quotas: Sum across active tier, programmes and individual grants
      -- If any active source grants NULL quota_limit, the effective quota is UNLIMITED
      v_quota_limit := 0;
      v_quota_is_unlimited := false;

      -- Tier allowance
      select quota_limit into v_tier_feat
      from public.access_tier_features
      where tier_id = v_effective_tier.id and feature_key = v_cat.feature_key and is_active = true;
      if found then
        if v_tier_feat.quota_limit is null then
          v_quota_is_unlimited := true;
        else
          v_quota_limit := v_quota_limit + v_tier_feat.quota_limit;
        end if;
      end if;

      -- Programme allowances
      for v_prog_feat in
        select pf.quota_limit
        from public.programme_memberships pm
        join public.access_programme_features pf on pf.programme_id = pm.programme_id
        where pm.student_id = p_user_id
          and pm.membership_status = 'active'
          and pf.feature_key = v_cat.feature_key
          and pf.is_active = true
          and (pm.starts_at <= v_now)
          and (pm.expires_at is null or pm.expires_at > v_now)
      loop
        if v_prog_feat.quota_limit is null then
          v_quota_is_unlimited := true;
        else
          v_quota_limit := v_quota_limit + v_prog_feat.quota_limit;
        end if;
      end loop;

      -- Individual grant allowances
      for v_grant_feat in
        select g.quota_amount
        from public.student_access_grants g
        where g.student_id = p_user_id
          and g.target_feature_key = v_cat.feature_key
          and g.status = 'active'
          and (g.starts_at <= v_now)
          and (g.expires_at is null or g.expires_at > v_now)
      loop
        if v_grant_feat.quota_amount is null then
          v_quota_is_unlimited := true;
        else
          v_quota_limit := v_quota_limit + v_grant_feat.quota_amount;
        end if;
      end loop;

      v_quotas := jsonb_set(
        v_quotas,
        array[v_cat.feature_key],
        jsonb_build_object(
          'is_unlimited', v_quota_is_unlimited,
          'quota_limit', case when v_quota_is_unlimited then null else v_quota_limit end,
          'quota_unit', v_cat.quota_unit,
          'quota_period', v_cat.quota_period
        )
      );

    end if;
  end loop;

  return jsonb_build_object(
    'student_id', p_user_id,
    'is_suspended', false,
    'effective_tier', jsonb_build_object(
      'id', v_effective_tier.id,
      'tier_key', v_effective_tier.tier_key,
      'name', v_effective_tier.name,
      'priority', v_effective_tier.tier_priority
    ),
    'programmes', v_programmes,
    'individual_grants', v_grants,
    'permissions', v_permissions,
    'levels', v_levels,
    'quotas', v_quotas,
    'resolved_at', v_now
  );
end;
$$;

-- Student-facing resolver: takes no parameters, derives identity strictly from auth.uid()
create or replace function public.resolve_my_entitlements()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required: session is anonymous or unauthenticated.';
  end if;

  return public.resolve_student_entitlements_internal(v_uid);
end;
$$;

-- Administrator resolver: inspects target student, strictly verifying admin privileges
create or replace function public.resolve_student_entitlements_for_admin(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_admin_uid uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_admin_uid is null then
    raise exception 'Authentication required: admin session missing.';
  end if;

  -- Verify administrative privilege via admin_profiles or centralized access_roles
  select exists (
    select 1 from public.admin_profiles where user_id = v_admin_uid
    union
    select 1 from public.access_user_role_assignments where user_id = v_admin_uid and revoked_at is null
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Unauthorized: caller lacks administrative access permissions.';
  end if;

  -- Append to audit log
  insert into public.access_audit_logs (
    actor_id, target_student_id, action, entity_type, entity_id, reason
  ) values (
    v_admin_uid, p_user_id, 'admin_inspected_entitlements', 'student_entitlements', p_user_id::text, 'Admin inspection from management console'
  );

  return public.resolve_student_entitlements_internal(p_user_id);
end;
$$;

-- ============================================================================
-- 9. ROW-LEVEL SECURITY & PERMISSION HARDENING
-- ============================================================================
alter table public.feature_catalog enable row level security;
alter table public.access_tiers enable row level security;
alter table public.access_tier_features enable row level security;
alter table public.access_programmes enable row level security;
alter table public.access_programme_features enable row level security;
alter table public.programme_memberships enable row level security;
alter table public.student_access_grants enable row level security;
alter table public.access_grant_history enable row level security;
alter table public.access_audit_logs enable row level security;

-- Default-deny for mutations; public read on catalogue and active tiers
drop policy if exists feature_catalog_read_policy on public.feature_catalog;
create policy feature_catalog_read_policy on public.feature_catalog
  for select to authenticated, anon using (is_active = true);

drop policy if exists access_tiers_read_policy on public.access_tiers;
create policy access_tiers_read_policy on public.access_tiers
  for select to authenticated, anon using (is_active = true and is_visible = true);

drop policy if exists access_tier_features_read_policy on public.access_tier_features;
create policy access_tier_features_read_policy on public.access_tier_features
  for select to authenticated, anon using (is_active = true);

drop policy if exists programme_memberships_student_read on public.programme_memberships;
create policy programme_memberships_student_read on public.programme_memberships
  for select to authenticated using (auth.uid() = student_id);

drop policy if exists student_access_grants_student_read on public.student_access_grants;
create policy student_access_grants_student_read on public.student_access_grants
  for select to authenticated using (auth.uid() = student_id);

-- Restrict function execution
revoke all on function public.resolve_student_entitlements_internal(uuid) from public, anon, authenticated;
grant execute on function public.resolve_student_entitlements_internal(uuid) to service_role;

grant execute on function public.resolve_my_entitlements() to authenticated;
grant execute on function public.resolve_student_entitlements_for_admin(uuid) to authenticated;

commit;
