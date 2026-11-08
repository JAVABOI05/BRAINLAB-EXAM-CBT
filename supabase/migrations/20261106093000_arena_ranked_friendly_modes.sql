begin;
alter table public.competition_challenges
  add column if not exists match_mode text not null default 'ranked';
alter table public.competition_challenges
  add constraint competition_challenges_match_mode_check
  check (match_mode in ('ranked', 'friendly'));
commit;