-- BRAINLAB COMPETITION ARENA CORE & MATCH SYSTEM
-- Migration: 20261103220000_competition_arena_advanced_core.sql

begin;

-- 1. COMPETITION ROUNDS (For multi-round & bracket tournaments)
create table if not exists public.competition_rounds (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  round_number int not null,
  name text not null,
  format text not null default 'single_elimination' check (format in ('single_elimination', 'double_elimination', 'round_robin', 'swiss', 'leaderboard_cut')),
  advancement_count int default 0,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed')),
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_comp_rounds_competition on public.competition_rounds (competition_id, round_number);

-- 2. TEAMS & SQUADS
create table if not exists public.competition_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  motto text,
  avatar_url text,
  captain_id uuid not null,
  co_captain_id uuid,
  is_recruiting boolean not null default true,
  elo_rating int not null default 1200,
  matches_played int not null default 0,
  matches_won int not null default 0,
  matches_drawn int not null default 0,
  matches_lost int not null default 0,
  total_xp int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comp_teams_elo on public.competition_teams (elo_rating desc);

-- 3. TEAM MEMBERS
create table if not exists public.competition_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.competition_teams(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('captain', 'co_captain', 'member', 'substitute')),
  joined_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint comp_team_member_uniq unique (team_id, user_id)
);

create index if not exists idx_comp_team_members_team on public.competition_team_members (team_id);
create index if not exists idx_comp_team_members_user on public.competition_team_members (user_id);

-- 4. TEAM RECRUITMENT APPLICATIONS
create table if not exists public.competition_team_applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.competition_teams(id) on delete cascade,
  user_id uuid not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_comp_team_apps_team on public.competition_team_applications (team_id, status);

-- 5. TEAM INVITATIONS
create table if not exists public.competition_team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.competition_teams(id) on delete cascade,
  invited_user_id uuid not null,
  invited_by uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists idx_comp_team_invites on public.competition_team_invitations (invited_user_id, status);

-- 6. TEAM DEMOCRATIC GOVERNANCE: ELECTIONS & NO-CONFIDENCE VOTES
create table if not exists public.competition_team_elections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.competition_teams(id) on delete cascade,
  election_type text not null check (election_type in ('captaincy', 'no_confidence')),
  initiated_by uuid not null,
  status text not null default 'active' check (status in ('active', 'concluded', 'cancelled')),
  candidate_ids uuid[] not null default '{}'::uuid[],
  winner_id uuid,
  start_time timestamptz not null default now(),
  end_time timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

create index if not exists idx_comp_team_elections_team on public.competition_team_elections (team_id, status);

-- 7. TEAM VOTES
create table if not exists public.competition_team_votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.competition_team_elections(id) on delete cascade,
  voter_id uuid not null,
  candidate_id uuid not null,
  created_at timestamptz not null default now(),
  constraint comp_team_vote_uniq unique (election_id, voter_id)
);

create index if not exists idx_comp_team_votes_election on public.competition_team_votes (election_id);

-- 8. COMPETITION MATCHES (1v1, Team-vs-Team, Bracket Matchups)
create table if not exists public.competition_matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references public.competitions(id) on delete set null,
  round_id uuid references public.competition_rounds(id) on delete set null,
  match_number int,
  match_type text not null default '1v1' check (match_type in ('1v1', 'team_vs_team', 'solo_time_trial', 'bracket_elimination')),
  status text not null default 'waiting' check (status in ('waiting', 'lobby', 'in_progress', 'paused', 'completed', 'cancelled', 'disputed')),
  participant_a_id uuid,
  participant_b_id uuid,
  team_a_id uuid references public.competition_teams(id) on delete set null,
  team_b_id uuid references public.competition_teams(id) on delete set null,
  score_a numeric not null default 0,
  score_b numeric not null default 0,
  winner_id uuid,
  winner_team_id uuid references public.competition_teams(id) on delete set null,
  questions_snapshot jsonb not null default '[]'::jsonb,
  answer_keys_snapshot jsonb not null default '{}'::jsonb,
  duration_seconds int not null default 300,
  started_at timestamptz,
  ended_at timestamptz,
  paused_at timestamptz,
  remaining_seconds_at_pause int,
  spectator_delay_seconds int not null default 30,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_comp_matches_status on public.competition_matches (status);
create index if not exists idx_comp_matches_comp on public.competition_matches (competition_id);
create index if not exists idx_comp_matches_users on public.competition_matches (participant_a_id, participant_b_id);

-- 9. MATCH PARTICIPANTS (Lobby presence, latency, current index)
create table if not exists public.competition_match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  user_id uuid not null,
  team_id uuid references public.competition_teams(id) on delete set null,
  display_name text not null,
  is_ready boolean not null default false,
  ping_ms int not null default 0,
  current_question_index int not null default 0,
  score numeric not null default 0,
  total_time_spent_seconds numeric not null default 0,
  connected boolean not null default true,
  last_heartbeat timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  constraint comp_match_part_uniq unique (match_id, user_id)
);

create index if not exists idx_comp_match_parts_match on public.competition_match_participants (match_id);

-- 10. MATCH SUBMITTED ANSWERS
create table if not exists public.competition_match_answers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  participant_id uuid not null references public.competition_match_participants(id) on delete cascade,
  user_id uuid not null,
  question_id text not null,
  selected_option text not null,
  is_correct boolean not null,
  points_awarded numeric not null default 0,
  time_taken_seconds numeric not null default 0,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_comp_match_answers_match on public.competition_match_answers (match_id, participant_id);

-- 11. STUDENT 1v1 DIRECT & OPEN CHALLENGES
create table if not exists public.competition_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null,
  challenged_id uuid,
  subject text not null default 'General',
  question_count int not null default 10,
  duration_minutes int not null default 5,
  difficulty text not null default 'medium',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),
  match_id uuid references public.competition_matches(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists idx_comp_challenges_status on public.competition_challenges (status);
create index if not exists idx_comp_challenges_users on public.competition_challenges (challenger_id, challenged_id);

-- 12. COMPETITION RATINGS & ELO
create table if not exists public.competition_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  elo_rating int not null default 1200,
  peak_elo int not null default 1200,
  matches_played int not null default 0,
  matches_won int not null default 0,
  matches_drawn int not null default 0,
  matches_lost int not null default 0,
  win_streak int not null default 0,
  best_streak int not null default 0,
  tier text not null default 'Novice' check (tier in ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Novice')),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comp_ratings_elo on public.competition_ratings (elo_rating desc);

-- 13. SPECTATOR SESSIONS & REACTIONS
create table if not exists public.competition_spectator_sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  user_id uuid,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  reactions_count int not null default 0
);

create index if not exists idx_comp_spectator_match on public.competition_spectator_sessions (match_id);

-- 14. DISPUTES & APPEALS
create table if not exists public.competition_disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  raised_by uuid not null,
  reason text not null,
  evidence_notes text,
  status text not null default 'pending' check (status in ('pending', 'investigating', 'resolved', 'dismissed')),
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_comp_disputes_status on public.competition_disputes (status);

-- 15. EMERGENCY CONTROLS
create table if not exists public.competition_emergency_controls (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global' check (scope in ('global', 'competition', 'match')),
  target_id text not null default 'all',
  is_paused boolean not null default false,
  freeze_leaderboards boolean not null default false,
  maintenance_mode boolean not null default false,
  announcement text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- Seed initial global emergency control row if empty
insert into public.competition_emergency_controls (scope, target_id, is_paused, freeze_leaderboards, maintenance_mode, announcement)
select 'global', 'all', false, false, false, ''
where not exists (select 1 from public.competition_emergency_controls where scope = 'global');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table public.competition_rounds enable row level security;
alter table public.competition_teams enable row level security;
alter table public.competition_team_members enable row level security;
alter table public.competition_team_applications enable row level security;
alter table public.competition_team_invitations enable row level security;
alter table public.competition_team_elections enable row level security;
alter table public.competition_team_votes enable row level security;
alter table public.competition_matches enable row level security;
alter table public.competition_match_participants enable row level security;
alter table public.competition_match_answers enable row level security;
alter table public.competition_challenges enable row level security;
alter table public.competition_ratings enable row level security;
alter table public.competition_spectator_sessions enable row level security;
alter table public.competition_disputes enable row level security;
alter table public.competition_emergency_controls enable row level security;

-- Public read policies
create policy "comp_rounds_read" on public.competition_rounds for select using (true);
create policy "comp_teams_read" on public.competition_teams for select using (true);
create policy "comp_team_members_read" on public.competition_team_members for select using (true);
create policy "comp_team_elections_read" on public.competition_team_elections for select using (true);
create policy "comp_matches_read" on public.competition_matches for select using (true);
create policy "comp_match_parts_read" on public.competition_match_participants for select using (true);
create policy "comp_challenges_read" on public.competition_challenges for select using (true);
create policy "comp_ratings_read" on public.competition_ratings for select using (true);
create policy "comp_emergency_read" on public.competition_emergency_controls for select using (true);

-- Authenticated student team write policies
create policy "comp_teams_insert" on public.competition_teams for insert with check (auth.uid() = captain_id);
create policy "comp_teams_update" on public.competition_teams for update using (auth.uid() = captain_id or auth.uid() = co_captain_id);

create policy "comp_team_members_manage" on public.competition_team_members for all using (
  auth.uid() = user_id or
  exists (select 1 from public.competition_teams t where t.id = competition_team_members.team_id and (t.captain_id = auth.uid() or t.co_captain_id = auth.uid()))
);

create policy "comp_team_apps_manage" on public.competition_team_applications for all using (
  auth.uid() = user_id or
  exists (select 1 from public.competition_teams t where t.id = competition_team_applications.team_id and (t.captain_id = auth.uid() or t.co_captain_id = auth.uid()))
);

create policy "comp_team_invites_manage" on public.competition_team_invitations for all using (
  auth.uid() = invited_user_id or auth.uid() = invited_by or
  exists (select 1 from public.competition_teams t where t.id = competition_team_invitations.team_id and (t.captain_id = auth.uid() or t.co_captain_id = auth.uid()))
);

create policy "comp_team_votes_insert" on public.competition_team_votes for insert with check (auth.uid() = voter_id);

create policy "comp_challenges_manage" on public.competition_challenges for all using (
  auth.uid() = challenger_id or auth.uid() = challenged_id or challenged_id is null
);

create policy "comp_match_answers_read" on public.competition_match_answers for select using (
  auth.uid() = user_id or exists (select 1 from public.competition_matches m where m.id = competition_match_answers.match_id and m.status = 'completed')
);

create policy "comp_spectators_manage" on public.competition_spectator_sessions for all using (
  auth.uid() = user_id or user_id is null
);

create policy "comp_disputes_manage" on public.competition_disputes for all using (
  auth.uid() = raised_by
);

-- ============================================================================
-- ELO CALCULATION HELPER RPC
-- ============================================================================
create or replace function public.calculate_elo_delta(
  player_rating int,
  opponent_rating int,
  actual_score numeric, -- 1.0 = win, 0.5 = draw, 0.0 = loss
  k_factor int default 32
) returns int
language plpgsql
immutable
as $$
declare
  expected_score numeric;
  rating_diff numeric;
begin
  rating_diff := (opponent_rating - player_rating)::numeric / 400.0;
  expected_score := 1.0 / (1.0 + power(10.0, rating_diff));
  return round(k_factor * (actual_score - expected_score))::int;
end;
$$;

commit;
