-- BRAINLAB ACADEMY COMPETITION ARENA
-- ADDENDUM: ROLE-BASED ACCESS CONTROL AND DEDICATED QUESTION BANK
-- Migration: 20261027120000_competition_arena_rbac_and_question_bank.sql

begin;

-- ============================================================================
-- 1. EXPAND ADMIN ROLES TO SUPPORT COMPETITION ARENA ROLES
-- ============================================================================
alter table public.admin_profiles
  drop constraint if exists admin_profiles_role_check;

alter table public.admin_profiles
  add constraint admin_profiles_role_check check (
    role = any (array[
      'super_admin',
      'platform_admin',
      'cbt_admin',
      'ai_learning_admin',
      'community_moderator',
      'analytics_admin',
      'school_admin',
      'teacher',
      'content_reviewer',
      'finance_admin',
      'read_only_auditor',
      'competition_admin',
      'competition_moderator',
      'competition_host'
    ]::text[])
  );

-- ============================================================================
-- 2. GRANULAR COMPETITION USER SCOPED PERMISSIONS
-- ============================================================================
create table if not exists public.competition_user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  permission_key text not null,
  scope_type text not null check (scope_type in ('global', 'competition', 'question_bank', 'moderation', 'reward_limit')),
  scope_id text default 'all',
  granted_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  constraint competition_user_perm_unique unique (user_id, permission_key, scope_type, scope_id)
);

create index if not exists idx_comp_user_perms_lookup
  on public.competition_user_permissions (user_id, permission_key, scope_type, scope_id);

-- ============================================================================
-- 3. DEDICATED COMPETITION QUESTION BANKS
-- ============================================================================
create table if not exists public.competition_question_banks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  subject text not null,
  academic_level text default 'Secondary / UTME',
  visibility text not null default 'private' check (visibility in ('private', 'shared', 'public')),
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  owner_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comp_banks_owner on public.competition_question_banks (owner_id);
create index if not exists idx_comp_banks_subject on public.competition_question_banks (subject);

-- ============================================================================
-- 4. DEDICATED COMPETITION QUESTIONS
-- ============================================================================
create table if not exists public.competition_questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.competition_question_banks(id) on delete cascade,
  question text not null,
  subject text not null,
  topic text,
  subtopic text,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  question_type text not null default 'multiple_choice',
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  option_e text,
  option_a_image_url text,
  option_b_image_url text,
  option_c_image_url text,
  option_d_image_url text,
  option_e_image_url text,
  question_image_url text,
  question_image_alt text,
  correct_answer text not null,
  explanation text,
  marks numeric not null default 1.0 check (marks > 0),
  tags text[] default '{}'::text[],
  learning_objectives text[] default '{}'::text[],
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'published', 'archived')),
  duplicate_of_id uuid,
  group_hash text,
  import_batch_id uuid,
  created_by uuid not null,
  approved_by uuid,
  is_archived boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comp_questions_bank on public.competition_questions (bank_id);
create index if not exists idx_comp_questions_subject_topic on public.competition_questions (subject, topic);
create index if not exists idx_comp_questions_status on public.competition_questions (status);
create index if not exists idx_comp_questions_hash on public.competition_questions (group_hash);

-- ============================================================================
-- 5. DUPLICATE QUESTION REVIEWS FOR COMPETITION QUESTION BANK
-- ============================================================================
create table if not exists public.competition_question_duplicates (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid references public.competition_question_banks(id) on delete cascade,
  group_hash text not null,
  duplicate_type text not null check (duplicate_type in ('exact', 'identical_options', 'similar', 'batch')),
  question_ids uuid[] not null,
  status text not null default 'pending' check (status in ('pending', 'resolved_distinct', 'resolved_retained', 'resolved_merged')),
  retained_question_id uuid,
  reviewed_by uuid,
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_comp_dup_hash on public.competition_question_duplicates (group_hash);

-- ============================================================================
-- 6. CSV IMPORT BATCHES & AUDIT
-- ============================================================================
create table if not exists public.competition_import_batches (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.competition_question_banks(id) on delete cascade,
  filename text not null,
  total_rows int not null default 0,
  imported_count int not null default 0,
  rejected_count int not null default 0,
  duplicates_count int not null default 0,
  review_needed_count int not null default 0,
  errors_json jsonb not null default '[]'::jsonb,
  imported_by uuid not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 7. COMPETITIONS TABLE
-- ============================================================================
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  code text unique not null,
  competition_type text not null default 'arena' check (competition_type in ('arena', 'battle_1v1', 'tournament', 'quiz_sprint')),
  question_source_mode text not null default 'competition_bank' check (question_source_mode in ('competition_bank', 'main_bank', 'combined')),
  question_bank_id uuid references public.competition_question_banks(id) on delete set null,
  main_bank_filters jsonb default '{"subject": "General", "min_questions": 10}'::jsonb,
  combined_config jsonb default '{"competition_bank_ratio": 0.5, "main_bank_ratio": 0.5}'::jsonb,
  rules jsonb not null default '{
    "question_count": 10,
    "duration_seconds": 300,
    "randomize_questions": true,
    "randomize_options": true,
    "identical_questions_for_all": false,
    "difficulty_distribution": {"easy": 30, "medium": 50, "hard": 20},
    "topic_coverage": {"target_distinct_topics": 3},
    "high_yield_weighting": 1.5,
    "attempt_limit": 1
  }'::jsonb,
  rewards_config jsonb not null default '{
    "xp_first_place": 200,
    "xp_participation": 20,
    "allowed_reward_types": ["xp", "badge"],
    "max_xp_budget": 1000
  }'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'scheduled', 'published', 'active', 'paused', 'cancelled', 'concluded')),
  visibility text not null default 'public' check (visibility in ('public', 'private', 'open_link')),
  creator_id uuid not null,
  moderator_id uuid,
  approved_by uuid,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_competitions_status on public.competitions (status);
create index if not exists idx_competitions_creator on public.competitions (creator_id);

-- ============================================================================
-- 8. COMPETITION PARTICIPANTS
-- ============================================================================
create table if not exists public.competition_participants (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid,
  guest_session_id text,
  display_name text not null,
  is_guest boolean not null default false,
  status text not null default 'registered' check (status in ('registered', 'active', 'submitted', 'disqualified')),
  score numeric default 0,
  raw_score numeric default 0,
  max_score numeric default 100,
  rank int,
  duration_spent_seconds int default 0,
  rewards_awarded jsonb default '{}'::jsonb,
  disqualification_reason text,
  joined_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint comp_participant_unique unique (competition_id, user_id, guest_session_id)
);

create index if not exists idx_comp_participants_comp on public.competition_participants (competition_id);

-- ============================================================================
-- 9. IMMUTABLE COMPETITION ATTEMPT SNAPSHOTS
-- ============================================================================
create table if not exists public.competition_attempt_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid,
  guest_session_id text,
  question_source_mode text not null,
  questions_snapshot jsonb not null,
  answer_key_snapshot jsonb not null,
  scoring_rules jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comp_snapshots_comp on public.competition_attempt_snapshots (competition_id);

-- ============================================================================
-- 10. COMPETITION AUDIT LOGS (IMMUTABLE)
-- ============================================================================
create table if not exists public.competition_audit_logs (
  id uuid primary key default gen_random_uuid(),
  acting_user_id uuid,
  acting_user_email text not null default 'system',
  action text not null,
  resource_type text not null,
  resource_id text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_comp_audit_res on public.competition_audit_logs (resource_type, resource_id);
create index if not exists idx_comp_audit_time on public.competition_audit_logs (created_at desc);

-- Prevent unauthorized update or deletion of audit logs via trigger
create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $function$
begin
  raise exception 'Competition audit logs are immutable and cannot be updated or deleted.' using errcode = '42501';
end;
$function$;

drop trigger if exists trg_prevent_comp_audit_mutation on public.competition_audit_logs;
create trigger trg_prevent_comp_audit_mutation
  before update or delete on public.competition_audit_logs
  for each row execute function public.prevent_audit_log_mutation();

-- ============================================================================
-- 11. COMPETITION MODERATION CASES & SEPARATION OF DUTIES
-- ============================================================================
create table if not exists public.competition_moderation_cases (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  question_id uuid references public.competition_questions(id) on delete set null,
  reporter_id uuid,
  reported_participant_id uuid,
  case_type text not null check (case_type in ('flagged_question', 'cheating_misconduct', 'score_dispute', 'publication_request')),
  description text not null,
  recommended_action text,
  status text not null default 'pending' check (status in ('pending', 'under_review', 'approved_by_admin', 'rejected_by_admin', 'resolved')),
  assigned_moderator_id uuid,
  resolved_by_admin_id uuid,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 12. COMPETITION REWARD PROPOSALS (SEPARATION OF DUTIES)
-- ============================================================================
create table if not exists public.competition_reward_proposals (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  recipient_id uuid not null,
  reward_type text not null check (reward_type in ('xp', 'badge', 'title', 'subscription', 'prize')),
  proposed_by uuid not null,
  approved_by uuid,
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'issued')),
  amount_or_details jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 13. CORE RBAC RPC: has_competition_permission
-- ============================================================================
create or replace function public.has_competition_permission(
  p_user_id uuid,
  p_permission text,
  p_scope_type text default 'global',
  p_scope_id text default 'all'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_role text;
  v_has_scoped boolean;
begin
  if p_user_id is null then
    return false;
  end if;

  -- 1. Check user's platform/admin role from admin_profiles
  select ap.role into v_role
  from public.admin_profiles ap
  where ap.user_id = p_user_id
  limit 1;

  -- Super Admin has all competition permissions across all scopes
  if v_role = 'super_admin' then
    return true;
  end if;

  -- 2. Platform Admin has operational competition permissions
  if v_role = 'platform_admin' and p_permission not in ('competition.manage_roles', 'competition.view_audit_logs') then
    return true;
  end if;

  -- 3. Competition Administrator role permissions
  if v_role = 'competition_admin' then
    if p_permission in (
      'competition.view', 'competition.create', 'competition.edit_assigned',
      'competition.publish', 'competition.schedule', 'competition.cancel',
      'competition.manage_participants', 'competition.view_results',
      'competition.publish_results', 'competition.manage_rounds',
      'competition.manage_rewards', 'competition.approve_rewards',
      'question_bank.create', 'question_bank.view', 'question_bank.edit_assigned',
      'question_bank.import_csv', 'question_bank.export', 'question_bank.publish',
      'question_builder.use', 'question_bank.link_main_bank'
    ) then
      return true;
    end if;
  end if;

  -- 4. Competition Moderator role permissions
  if v_role = 'competition_moderator' then
    if p_permission in (
      'competition.view', 'competition.manage_participants', 'competition.view_results',
      'question_bank.view', 'question_bank.moderate', 'question_builder.use'
    ) then
      return true;
    end if;
  end if;

  -- 5. Competition Host / Tutor role permissions
  if v_role in ('competition_host', 'teacher') then
    if p_permission in (
      'competition.view', 'competition.create', 'competition.edit_own',
      'competition.view_results', 'question_bank.create', 'question_bank.view',
      'question_bank.edit_own', 'question_bank.import_csv', 'question_builder.use'
    ) then
      return true;
    end if;
  end if;

  -- 6. Check explicit granular scoped permission assignment
  select exists (
    select 1
    from public.competition_user_permissions cup
    where cup.user_id = p_user_id
      and cup.permission_key = p_permission
      and (
        cup.scope_type = 'global'
        or (cup.scope_type = p_scope_type and (cup.scope_id = 'all' or cup.scope_id = p_scope_id))
      )
  ) into v_has_scoped;

  if v_has_scoped then
    return true;
  end if;

  -- 7. Participant / Student basic actions
  if p_permission in ('competition.view') then
    return true;
  end if;

  return false;
end;
$function$;

-- Helper function for currently authenticated user
create or replace function public.check_competition_permission(
  p_permission text,
  p_scope_type text default 'global',
  p_scope_id text default 'all'
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select public.has_competition_permission(auth.uid(), p_permission, p_scope_type, p_scope_id);
$function$;

-- ============================================================================
-- 14. AUDIT LOGGING RPC
-- ============================================================================
create or replace function public.log_competition_audit(
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_log_id uuid;
  v_user_email text;
begin
  select u.email into v_user_email from auth.users u where u.id = auth.uid();

  insert into public.competition_audit_logs (
    acting_user_id,
    acting_user_email,
    action,
    resource_type,
    resource_id,
    details
  )
  values (
    auth.uid(),
    coalesce(v_user_email, 'anonymous/system'),
    p_action,
    p_resource_type,
    p_resource_id,
    coalesce(p_details, '{}'::jsonb)
  )
  returning id into v_log_id;

  return v_log_id;
end;
$function$;

commit;
