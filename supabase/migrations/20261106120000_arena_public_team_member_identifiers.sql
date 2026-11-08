begin;
alter table public.competition_team_members
  add column if not exists public_member_id uuid not null default gen_random_uuid();
create unique index if not exists competition_team_members_public_member_id_uidx
  on public.competition_team_members(public_member_id);
commit;