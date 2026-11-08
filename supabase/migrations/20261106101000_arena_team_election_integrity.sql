begin;
alter table public.competition_team_votes
  add column if not exists vote_choice text not null default 'candidate';
alter table public.competition_team_votes
  add constraint competition_team_votes_choice_check
  check (vote_choice in ('candidate', 'support', 'oppose'));
create unique index if not exists competition_team_votes_one_ballot
  on public.competition_team_votes (election_id, voter_id);
alter table public.competition_team_elections
  add column if not exists eligible_voter_count integer,
  add column if not exists support_threshold_percent numeric not null default 50;
alter table public.competition_team_elections
  add constraint competition_team_elections_voter_count_check
  check (eligible_voter_count is null or eligible_voter_count >= 1),
  add constraint competition_team_elections_threshold_check
  check (support_threshold_percent > 0 and support_threshold_percent <= 100);
commit;