begin;
-- Enforce one active permanent team per student at the database boundary.
create unique index if not exists competition_team_members_one_active_team_per_user
  on public.competition_team_members (user_id)
  where is_active = true;

-- All team membership and ballot writes must pass through authenticated,
-- server-authoritative API handlers and atomic SECURITY DEFINER RPCs.
drop policy if exists comp_team_members_manage on public.competition_team_members;
drop policy if exists comp_team_votes_insert on public.competition_team_votes;

-- Ballot rows remain private: no client SELECT policy is intentionally created.
commit;