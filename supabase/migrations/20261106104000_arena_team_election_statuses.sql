begin;
alter table public.competition_team_elections
  drop constraint if exists competition_team_elections_status_check;
alter table public.competition_team_elections
  add constraint competition_team_elections_status_check
  check (status in ('active','concluded','cancelled','completed','tied','passed','failed'));
commit;