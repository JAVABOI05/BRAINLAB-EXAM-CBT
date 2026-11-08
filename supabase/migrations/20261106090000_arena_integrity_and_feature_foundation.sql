-- BrainLab Competition Arena: integrity hardening and full-feature schema foundation
-- Additive only. Existing CBT tables, users, subscriptions and historical data are preserved.

begin;

-- Prevent duplicate answer submissions and duplicate active permanent-team memberships.
create unique index if not exists competition_match_answers_once_per_question
  on public.competition_match_answers (match_id, participant_id, question_id);

create unique index if not exists competition_one_active_team_per_student
  on public.competition_team_members (user_id)
  where is_active = true;

-- Competition registration, access, payment and visibility configuration.
alter table public.competitions
  add column if not exists registration_opens_at timestamptz,
  add column if not exists registration_closes_at timestamptz,
  add column if not exists max_participants integer,
  add column if not exists access_mode text not null default 'free',
  add column if not exists entry_fee_kobo bigint not null default 0,
  add column if not exists approval_mode text not null default 'automatic',
  add column if not exists allow_spectators boolean not null default true,
  add column if not exists spectator_mode text not null default 'view_only',
  add column if not exists results_visibility text not null default 'after_completion',
  add column if not exists answer_reveal_mode text not null default 'after_match',
  add column if not exists scoring_config jsonb not null default '{}'::jsonb,
  add column if not exists access_config jsonb not null default '{}'::jsonb,
  add column if not exists published_at timestamptz;

alter table public.competitions
  add constraint competitions_access_mode_check
    check (access_mode in ('free', 'code', 'request', 'paid')),
  add constraint competitions_entry_fee_nonnegative_check
    check (entry_fee_kobo >= 0),
  add constraint competitions_approval_mode_check
    check (approval_mode in ('automatic', 'manual')),
  add constraint competitions_max_participants_positive_check
    check (max_participants is null or max_participants > 0),
  add constraint competitions_spectator_mode_check
    check (spectator_mode in ('view_only', 'reactions', 'moderated_chat')),
  add constraint competitions_results_visibility_check
    check (results_visibility in ('hidden', 'participants', 'public', 'after_completion')),
  add constraint competitions_answer_reveal_mode_check
    check (answer_reveal_mode in ('never', 'after_question', 'after_round', 'after_match', 'after_competition'));

-- Per-round settings are independent from competition-level defaults.
alter table public.competition_rounds
  add column if not exists access_mode text not null default 'inherit',
  add column if not exists access_config jsonb not null default '{}'::jsonb,
  add column if not exists question_config jsonb not null default '{}'::jsonb,
  add column if not exists scoring_config jsonb not null default '{}'::jsonb,
  add column if not exists reveal_config jsonb not null default '{}'::jsonb,
  add column if not exists registration_opens_at timestamptz,
  add column if not exists registration_closes_at timestamptz,
  add column if not exists published_at timestamptz;

alter table public.competition_rounds
  add constraint competition_rounds_access_mode_check
    check (access_mode in ('inherit', 'free', 'code', 'request', 'paid'));

-- Permanent team requests require review before a permanent team is created.
create table if not exists public.competition_team_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null,
  proposed_name text not null,
  proposed_slug text not null,
  motto text,
  avatar_url text,
  description text,
  founding_member_ids uuid[] not null default '{}'::uuid[],
  recruitment_mode text not null default 'invitation_only'
    check (recruitment_mode in ('open', 'invitation_only', 'closed')),
  status text not null default 'pending'
    check (status in ('pending', 'needs_changes', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid,
  review_notes text,
  created_team_id uuid references public.competition_teams(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists competition_team_requests_status_idx
  on public.competition_team_requests (status, submitted_at desc);
alter table public.competition_team_requests enable row level security;

-- Team challenges extend the existing challenge system without replacing 1v1 records.
alter table public.competition_challenges
  add column if not exists challenge_type text not null default 'individual',
  add column if not exists challenger_team_id uuid references public.competition_teams(id) on delete set null,
  add column if not exists challenged_team_id uuid references public.competition_teams(id) on delete set null,
  add column if not exists scheduled_for timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.competition_challenges
  add constraint competition_challenges_type_check
    check (challenge_type in ('individual', 'team')),
  add constraint competition_challenges_team_shape_check
    check (
      (challenge_type = 'individual' and challenger_team_id is null and challenged_team_id is null)
      or
      (challenge_type = 'team' and challenger_team_id is not null)
    );

-- Formal appeals are separate from first-instance match disputes.
create table if not exists public.competition_appeals (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid references public.competition_disputes(id) on delete set null,
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete set null,
  submitted_by uuid not null,
  appeal_reason text not null,
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'upheld', 'rejected', 'withdrawn')),
  assigned_to uuid,
  decision text,
  decision_reason text,
  decided_by uuid,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists competition_appeals_status_idx
  on public.competition_appeals (status, submitted_at desc);
create index if not exists competition_appeals_submitter_idx
  on public.competition_appeals (submitted_by, submitted_at desc);
alter table public.competition_appeals enable row level security;

-- Seasons preserve lifetime records while enabling independent seasonal standings.
create table if not exists public.competition_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'active', 'completed', 'archived')),
  rating_carryover_mode text not null default 'partial'
    check (rating_carryover_mode in ('full', 'partial', 'reset', 'none')),
  rating_carryover_percent numeric not null default 75
    check (rating_carryover_percent between 0 and 100),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists competition_seasons_status_idx
  on public.competition_seasons (status, starts_at);
alter table public.competition_seasons enable row level security;

create table if not exists public.competition_rating_history (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.competition_seasons(id) on delete set null,
  user_id uuid not null,
  team_id uuid references public.competition_teams(id) on delete set null,
  match_id uuid references public.competition_matches(id) on delete set null,
  rating_kind text not null check (rating_kind in ('individual', 'team')),
  rating_before integer not null,
  rating_after integer not null,
  rating_delta integer not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (rating_kind = 'individual' and team_id is null)
    or (rating_kind = 'team' and team_id is not null)
  )
);
create index if not exists competition_rating_history_user_idx
  on public.competition_rating_history (user_id, created_at desc);
create index if not exists competition_rating_history_team_idx
  on public.competition_rating_history (team_id, created_at desc)
  where team_id is not null;
alter table public.competition_rating_history enable row level security;

-- Optional moderated spectator chat/reaction stream. Visibility is controlled by server APIs.
create table if not exists public.competition_spectator_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  user_id uuid,
  display_name text not null,
  message text not null,
  message_type text not null default 'chat'
    check (message_type in ('chat', 'reaction', 'system', 'moderation')),
  is_hidden boolean not null default false,
  moderated_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists competition_spectator_messages_match_idx
  on public.competition_spectator_messages (match_id, created_at);
alter table public.competition_spectator_messages enable row level security;

-- Separate Super Admin emergency switches for matches, challenges and registration.
alter table public.competition_emergency_controls
  drop constraint if exists competition_emergency_controls_scope_check;
alter table public.competition_emergency_controls
  add constraint competition_emergency_controls_scope_check
  check (scope in ('global', 'competition', 'match', 'challenge', 'registration'));

create unique index if not exists competition_emergency_controls_scope_target
  on public.competition_emergency_controls (scope, target_id);

commit;
