create or replace function public.approve_competition_team_request(
  p_request_id uuid,
  p_reviewed_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.competition_team_requests%rowtype;
  v_founder_ids uuid[];
  v_team_id uuid;
  v_founder_count integer;
begin
  select * into v_request from public.competition_team_requests
  where id = p_request_id for update;
  if not found then raise exception 'Team request not found'; end if;
  if v_request.status not in ('pending','needs_changes') then
    raise exception 'Team request is no longer awaiting approval';
  end if;

  select array_agg(user_id order by created_at), count(*)
  into v_founder_ids, v_founder_count
  from public.competition_team_request_members
  where request_id = p_request_id and status = 'accepted';
  if coalesce(v_founder_count,0) < 2 or coalesce(array_length(v_founder_ids,1),0) <> v_founder_count then
    raise exception 'At least two founding members must accept before approval';
  end if;

  if exists (
    select 1 from public.competition_team_members
    where user_id = any(v_founder_ids) and is_active = true
  ) then raise exception 'A proposed founder already belongs to another active team'; end if;

  insert into public.competition_teams (
    name,slug,motto,avatar_url,captain_id,is_recruiting,elo_rating
  ) values (
    v_request.proposed_name,v_request.proposed_slug,
    coalesce(v_request.motto,'Rise Together, Win Together'),
    v_request.avatar_url,v_request.requested_by,
    v_request.recruitment_mode='open',1200
  ) returning id into v_team_id;

  insert into public.competition_team_members(team_id,user_id,role,is_active)
  select v_team_id,founder_id,
    case when founder_id=v_request.requested_by then 'captain' else 'member' end,true
  from unnest(v_founder_ids) as founder_id;

  update public.competition_team_requests
  set status='approved',reviewed_by=p_reviewed_by,created_team_id=v_team_id,reviewed_at=now()
  where id=p_request_id;

  insert into public.competition_team_elections (
    team_id,election_type,initiated_by,candidate_ids,status,
    eligible_voter_count,support_threshold_percent,end_time
  ) values (
    v_team_id,'captaincy',v_request.requested_by,v_founder_ids,'active',
    v_founder_count,50,now()+interval '48 hours'
  );

  return v_team_id;
end;
$$;
revoke all on function public.approve_competition_team_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_competition_team_request(uuid, uuid) to service_role;