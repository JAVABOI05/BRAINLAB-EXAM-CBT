begin;
create unique index if not exists competition_team_elections_one_active_per_team
  on public.competition_team_elections (team_id)
  where status = 'active';

create or replace function public.guard_team_roster_during_active_election()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_team_id uuid;
  v_roster_change boolean := false;
begin
  if tg_op = 'INSERT' then
    v_team_id := new.team_id;
    v_roster_change := true;
  elsif tg_op = 'DELETE' then
    v_team_id := old.team_id;
    v_roster_change := true;
  else
    v_team_id := old.team_id;
    v_roster_change :=
      new.team_id is distinct from old.team_id
      or new.user_id is distinct from old.user_id
      or new.is_active is distinct from old.is_active;
  end if;

  if v_roster_change and exists (
    select 1 from public.competition_team_elections
    where team_id = v_team_id and status = 'active'
  ) then
    raise exception 'Team roster changes are locked while a democratic election is active';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists competition_team_roster_election_guard on public.competition_team_members;
create trigger competition_team_roster_election_guard
before insert or update or delete on public.competition_team_members
for each row execute function public.guard_team_roster_during_active_election();
commit;