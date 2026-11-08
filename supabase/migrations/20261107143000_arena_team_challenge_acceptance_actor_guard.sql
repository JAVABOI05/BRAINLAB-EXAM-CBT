-- Align the team challenge acceptance RPC with its API contract and
-- validate the accepting leader inside the same transaction that locks rosters.
create or replace function public.accept_competition_team_challenge_atomic(
  p_challenge_id uuid,
  p_accepting_team_id uuid,
  p_accepting_actor_id uuid,
  p_questions_snapshot jsonb,
  p_answer_keys_snapshot jsonb,
  p_duration_seconds integer,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_challenge public.competition_challenges%rowtype;
  v_challenger_team public.competition_teams%rowtype;
  v_accepting_team public.competition_teams%rowtype;
  v_match_id uuid;
  v_roster_size integer;
  v_a_count integer;
  v_b_count integer;
begin
  if p_accepting_actor_id is null then
    raise exception 'An authenticated accepting team leader is required';
  end if;

  select * into v_challenge
  from public.competition_challenges
  where id = p_challenge_id
  for update;

  if not found then raise exception 'Challenge not found'; end if;

  if v_challenge.status = 'accepted'
     and v_challenge.challenged_team_id = p_accepting_team_id
     and v_challenge.match_id is not null then
    -- Idempotent retries are allowed only for a current leader of the
    -- accepting team; the route also verifies this before returning the match.
    if not exists (
      select 1
      from public.competition_teams team
      join public.competition_team_members member
        on member.team_id = team.id
       and member.user_id = p_accepting_actor_id
       and member.is_active = true
      where team.id = p_accepting_team_id
        and (team.captain_id = p_accepting_actor_id or team.co_captain_id = p_accepting_actor_id)
    ) then
      raise exception 'Only an active team captain or co-captain can accept this challenge';
    end if;
    return v_challenge.match_id;
  end if;

  if v_challenge.status <> 'pending' then
    raise exception 'Challenge is no longer pending';
  end if;
  if v_challenge.expires_at <= now() then raise exception 'Challenge has expired'; end if;
  if v_challenge.challenge_type <> 'team' then raise exception 'This is not a team challenge'; end if;
  if v_challenge.challenger_team_id is null then raise exception 'Challenger team is missing'; end if;
  if v_challenge.challenger_team_id = p_accepting_team_id then raise exception 'A team cannot accept its own challenge'; end if;
  if v_challenge.challenged_team_id is not null and v_challenge.challenged_team_id <> p_accepting_team_id then
    raise exception 'This challenge was sent to another team';
  end if;
  if p_duration_seconds < 60 or p_duration_seconds > 3600 then raise exception 'Invalid match duration'; end if;

  v_roster_size := greatest(2, least(5, coalesce((v_challenge.metadata->>'roster_size')::integer, 2)));

  select * into v_challenger_team
  from public.competition_teams
  where id = v_challenge.challenger_team_id
  for update;
  if not found then raise exception 'Challenger team not found'; end if;

  select * into v_accepting_team
  from public.competition_teams
  where id = p_accepting_team_id
  for update;
  if not found then raise exception 'Accepting team not found'; end if;

  if v_accepting_team.captain_id <> p_accepting_actor_id
     and v_accepting_team.co_captain_id is distinct from p_accepting_actor_id then
    raise exception 'Only the accepting team captain or co-captain can accept this challenge';
  end if;

  if not exists (
    select 1
    from public.competition_team_members
    where team_id = p_accepting_team_id
      and user_id = p_accepting_actor_id
      and is_active = true
  ) then
    raise exception 'Accepting team leader is not an active member';
  end if;

  select count(*) into v_a_count
  from public.competition_team_members
  where team_id = v_challenge.challenger_team_id and is_active;
  select count(*) into v_b_count
  from public.competition_team_members
  where team_id = p_accepting_team_id and is_active;

  if v_a_count < v_roster_size or v_b_count < v_roster_size then
    raise exception 'Both teams must have the configured number of active players';
  end if;

  insert into public.competition_matches (
    match_type, status, team_a_id, team_b_id, score_a, score_b,
    questions_snapshot, answer_keys_snapshot, duration_seconds, metadata
  ) values (
    'team_vs_team', 'lobby', v_challenge.challenger_team_id, p_accepting_team_id,
    0, 0, coalesce(p_questions_snapshot, '[]'::jsonb),
    coalesce(p_answer_keys_snapshot, '{}'::jsonb), p_duration_seconds,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'challenge_id', p_challenge_id,
      'match_mode', v_challenge.match_mode,
      'roster_size', v_roster_size,
      'roster_locked_at', now(),
      'team_a_name', v_challenger_team.name,
      'team_b_name', v_accepting_team.name,
      'team_scoring_mode', coalesce(v_challenge.metadata->>'team_scoring_mode', 'sum')
    )
  ) returning id into v_match_id;

  with locked_rosters as (
    select member.team_id, member.user_id, member.joined_at,
           row_number() over (
             partition by member.team_id
             order by
               case when member.user_id = team.captain_id then 0
                    when member.user_id = team.co_captain_id then 1 else 2 end,
               member.joined_at, member.user_id
           ) as roster_position
    from public.competition_team_members member
    join public.competition_teams team on team.id = member.team_id
    where member.team_id in (v_challenge.challenger_team_id, p_accepting_team_id)
      and member.is_active
  )
  insert into public.competition_match_participants (
    match_id, user_id, team_id, display_name, is_ready, current_question_index, score
  )
  select v_match_id, roster.user_id, roster.team_id,
         coalesce(nullif(profile.display_name, ''), 'Private player'),
         false, 0, 0
  from locked_rosters roster
  left join public.competition_public_profiles profile
    on profile.user_id = roster.user_id and profile.visibility = 'public'
  where roster.roster_position <= v_roster_size
  order by roster.team_id, roster.roster_position;

  update public.competition_challenges
  set status = 'accepted',
      challenged_team_id = p_accepting_team_id,
      match_id = v_match_id,
      accepted_at = now()
  where id = p_challenge_id;

  return v_match_id;
end;
$function$;

revoke all on function public.accept_competition_team_challenge_atomic(uuid, uuid, uuid, jsonb, jsonb, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.accept_competition_team_challenge_atomic(uuid, uuid, uuid, jsonb, jsonb, integer, jsonb)
  to service_role;
