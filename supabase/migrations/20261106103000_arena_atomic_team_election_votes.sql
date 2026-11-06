begin;
create or replace function public.cast_competition_team_election_vote(
  p_election_id uuid,
  p_voter_id uuid,
  p_candidate_id uuid,
  p_vote_choice text default 'candidate'
)
returns table(vote_count integer, eligible_count integer, election_status text, winner_id uuid, followup_election_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_election public.competition_team_elections%rowtype;
  v_team public.competition_teams%rowtype;
  v_eligible integer;
  v_votes integer;
  v_top_count integer;
  v_top_candidates uuid[];
  v_winner uuid;
  v_support integer;
  v_threshold integer;
  v_interim uuid;
  v_followup uuid;
  v_old_captain uuid;
begin
  select * into v_election
  from public.competition_team_elections
  where id = p_election_id
  for update;
  if not found or v_election.status <> 'active' then
    raise exception 'No active team election found';
  end if;
  if now() > v_election.end_time then
    raise exception 'Election deadline has passed; the ballot must be finalised';
  end if;

  select * into v_team from public.competition_teams where id = v_election.team_id for update;
  if not found then raise exception 'Team not found'; end if;

  if not exists (
    select 1 from public.competition_team_members
    where team_id = v_election.team_id and user_id = p_voter_id and is_active = true
  ) then
    raise exception 'Only active team members may vote';
  end if;

  select count(*) into v_eligible
  from public.competition_team_members
  where team_id = v_election.team_id and is_active = true;
  v_eligible := coalesce(v_election.eligible_voter_count, v_eligible);
  if v_eligible < 1 then raise exception 'This team has no eligible voters'; end if;

  if v_election.election_type = 'captaincy' then
    if p_vote_choice <> 'candidate' or not (p_candidate_id = any(v_election.candidate_ids)) then
      raise exception 'Select a valid candidate in this captaincy election';
    end if;
  elsif v_election.election_type = 'no_confidence' then
    if p_vote_choice not in ('support', 'oppose') or p_candidate_id <> v_team.captain_id then
      raise exception 'Choose whether to support or oppose the no-confidence motion';
    end if;
  else
    raise exception 'Unsupported team election type';
  end if;

  insert into public.competition_team_votes (election_id, voter_id, candidate_id, vote_choice)
  values (p_election_id, p_voter_id, p_candidate_id, p_vote_choice);

  select count(*) into v_votes
  from public.competition_team_votes
  where election_id = p_election_id;

  if v_votes >= v_eligible then
    if v_election.election_type = 'captaincy' then
      select max(candidate_votes) into v_top_count
      from (
        select count(*)::integer as candidate_votes
        from public.competition_team_votes
        where election_id = p_election_id and vote_choice = 'candidate'
        group by candidate_id
      ) tally;

      select array_agg(candidate_id order by candidate_id)
      into v_top_candidates
      from (
        select candidate_id, count(*)::integer as candidate_votes
        from public.competition_team_votes
        where election_id = p_election_id and vote_choice = 'candidate'
        group by candidate_id
      ) tally
      where candidate_votes = v_top_count;

      if coalesce(array_length(v_top_candidates, 1), 0) = 1 then
        v_winner := v_top_candidates[1];
        update public.competition_team_elections
        set status = 'completed', winner_id = v_winner
        where id = p_election_id;

        update public.competition_team_members
        set role = case when user_id = v_winner then 'captain' else case when role = 'captain' then 'member' else role end end
        where team_id = v_election.team_id and is_active = true;
        update public.competition_teams
        set captain_id = v_winner,
            co_captain_id = case when co_captain_id = v_winner then null else co_captain_id end,
            updated_at = now()
        where id = v_election.team_id;
      else
        update public.competition_team_elections set status = 'tied' where id = p_election_id;
        insert into public.competition_team_elections (
          team_id, election_type, initiated_by, candidate_ids, status,
          eligible_voter_count, support_threshold_percent, end_time
        ) values (
          v_election.team_id, 'captaincy', v_election.initiated_by, coalesce(v_top_candidates, v_election.candidate_ids), 'active',
          v_eligible, v_election.support_threshold_percent, now() + interval '48 hours'
        ) returning id into v_followup;
      end if;
    else
      select count(*) into v_support
      from public.competition_team_votes
      where election_id = p_election_id and vote_choice = 'support';
      v_threshold := ceil(v_eligible * v_election.support_threshold_percent / 100.0);
      if v_support >= v_threshold then
        v_old_captain := v_team.captain_id;
        select user_id into v_interim
        from public.competition_team_members
        where team_id = v_election.team_id and is_active = true and user_id <> v_old_captain
        order by case when user_id = v_team.co_captain_id then 0 else 1 end, joined_at
        limit 1;

        if v_interim is not null then
          update public.competition_team_members
          set role = case when user_id = v_interim then 'captain' else case when role = 'captain' then 'member' else role end end
          where team_id = v_election.team_id and is_active = true;
          update public.competition_teams
          set captain_id = v_interim,
              co_captain_id = case when co_captain_id = v_interim then null else co_captain_id end,
              updated_at = now()
          where id = v_election.team_id;
        else
          v_interim := v_old_captain;
        end if;

        update public.competition_team_elections set status = 'passed', winner_id = v_interim where id = p_election_id;

        select array_agg(user_id order by joined_at)
        into v_top_candidates
        from public.competition_team_members
        where team_id = v_election.team_id and is_active = true and user_id <> v_old_captain;
        if coalesce(array_length(v_top_candidates, 1), 0) = 0 then
          select array_agg(user_id order by joined_at)
          into v_top_candidates
          from public.competition_team_members
          where team_id = v_election.team_id and is_active = true;
        end if;

        insert into public.competition_team_elections (
          team_id, election_type, initiated_by, candidate_ids, status,
          eligible_voter_count, support_threshold_percent, end_time
        ) values (
          v_election.team_id, 'captaincy', p_voter_id, v_top_candidates, 'active',
          v_eligible, v_election.support_threshold_percent, now() + interval '48 hours'
        ) returning id into v_followup;
      else
        update public.competition_team_elections set status = 'failed' where id = p_election_id;
      end if;
    end if;
  end if;

  select status, winner_id into election_status, winner_id
  from public.competition_team_elections
  where id = p_election_id;
  vote_count := v_votes;
  eligible_count := v_eligible;
  followup_election_id := v_followup;
  return next;
end;
$$;
revoke all on function public.cast_competition_team_election_vote(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cast_competition_team_election_vote(uuid, uuid, uuid, text) to service_role;
commit;