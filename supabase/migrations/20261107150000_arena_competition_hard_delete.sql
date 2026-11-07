begin;

-- Permanent competition deletion is an explicit Super Admin workflow.
-- Match rows must be removed first because competition_matches.competition_id
-- uses ON DELETE SET NULL; otherwise match history would become orphaned.
-- Dependent match participants/answers, rounds, entrants, attempt snapshots,
-- moderation cases and reward proposals are removed by their declared FKs.
create or replace function public.delete_competition_permanently_atomic(
  p_competition_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_competition public.competitions%rowtype;
  v_match_count integer := 0;
begin
  select *
    into v_competition
  from public.competitions
  where id = p_competition_id
  for update;

  if not found then
    raise exception 'Competition not found' using errcode = 'P0002';
  end if;

  delete from public.competition_matches
  where competition_id = p_competition_id;
  get diagnostics v_match_count = row_count;

  delete from public.competitions
  where id = p_competition_id;

  return jsonb_build_object(
    'competition_id', p_competition_id,
    'title', v_competition.title,
    'previous_status', v_competition.status,
    'matches_deleted', v_match_count,
    'deleted', true
  );
end;
$function$;

revoke all on function public.delete_competition_permanently_atomic(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_competition_permanently_atomic(uuid)
  to service_role;

commit;
