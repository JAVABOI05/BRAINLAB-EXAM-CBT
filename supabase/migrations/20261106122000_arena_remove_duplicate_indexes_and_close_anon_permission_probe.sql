begin;
drop index if exists public.competition_team_members_one_active_team_per_user;
drop index if exists public.competition_team_votes_one_ballot;

revoke all on function public.check_competition_permission(text, text, text) from public, anon;
grant execute on function public.check_competition_permission(text, text, text) to authenticated, service_role;
commit;