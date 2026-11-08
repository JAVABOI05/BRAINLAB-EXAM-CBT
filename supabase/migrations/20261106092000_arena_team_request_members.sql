begin;
create table if not exists public.competition_team_request_members (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.competition_team_requests(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);
create index if not exists competition_team_request_members_user_idx
  on public.competition_team_request_members (user_id, status);
alter table public.competition_team_request_members enable row level security;
commit;