begin;
create or replace function public.finalize_competition_team_election(p_election_id uuid)
returns table(election_status text, winner_id uuid, followup_election_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_election public.competition_team_elections%rowtype;
  v_team public.competition_teams%rowtype;
  v_eligible integer;
  v_top_count integer;
  v_top_candidates uuid[];
  v_winner uuid;
  v_support integer;
  v_threshold integer;
  v_interim uuid;
begin
  select * into v_election
  from public.competition_team_elections
  where id = p_election_id
  for update;
  if not found then raise exception 'Election not found'; end if;
  if v_election.status <> 'active' then
    election_status := v_election.status;
    winner_id := v_election.winner_id;
    return next;
    return;
  end if;
  if now() < v_election.end_time then
    raise exception 'Election is still open';
  end if;

  select * into v_team
  from public.competition_teams
  where id = v_election.team_id
  for update;
  if not found then raise exception 'Team not found'; end if;

  select count(*) into v_eligible
  from public.competition_team_members
  where team_id = v_election.team_id and is_active = true;
  v_eligible := coalesce(v_election.eligible_voter_count, v_eligible);

  if v_election.election_type = 'captaincy' then
    select max(candidate_votes) into v_top_count
    from (
      select count(*)::integer as candidate_votes
      from public.competition_team_votes
      where election_id = p_election_id and vote_choice = 'candidate'
      group by candidate_id
    ) tally;

    if coalesce(v_top_count, 0) = 0 then
      update public.competition_team_elections set status = 'failed' where id = p_election_id;
    else
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
        if not exists (
          select 1 from public.competition_team_members
          where team_id = v_election.team_id and user_id = v_winner and is_active = true
        ) then
          update public.competition_team_elections set status = 'failed' where id = p_election_id;
        else
          update public.competition_team_elections
          set status = 'completed', winner_id = v_winner
          where id = p_election_id;
          update public.competition_team_members
          set role = case when user_id = v_winner then 'captain'
                          when role = 'captain' then 'member' else role end
          where team_id = v_election.team_id and is_active = true;
          update public.competition_teams
          set captain_id = v_winner,
              co_captain_id = case when co_captain_id = v_winner then null else co_captain_id end,
              updated_at = now()
          where id = v_election.team_id;
        end if;
      else
        update public.competition_team_elections set status = 'tied' where id = p_election_id;
        insert into public.competition_team_elections (
          team_id, election_type, initiated_by, candidate_ids, status,
          eligible_voter_count, support_threshold_percent, end_time
        ) values (
          v_election.team_id, 'captaincy', v_election.initiated_by,
          v_top_candidates, 'active', v_eligible,
          v_election.support_threshold_percent, now() + interval '48 hours'
        ) returning id into followup_election_id;
      end if;
    end if;
  elsif v_election.election_type = 'no_confidence' then
    select count(*) into v_support
    from public.competition_team_votes
    where election_id = p_election_id and vote_choice = 'support';
    v_threshold := ceil(v_eligible * v_election.support_threshold_percent / 100.0);

    if v_support >= v_threshold then
      select user_id into v_interim
      from public.competition_team_members
      where team_id = v_election.team_id and is_active = true
        and user_id <> v_team.captain_id
      order by case when user_id = v_team.co_captain_id then 0 else 1 end, joined_at
      limit 1;

      if v_interim is null then
        update public.competition_team_elections set status = 'failed' where id = p_election_id;
      else
        update public.competition_team_members
        set role = case when user_id = v_interim then 'captain'
                        when role = 'captain' then 'member' else role end
        where team_id = v_election.team_id and is_active = true;
        update public.competition_teams
        set captain_id = v_interim,
            co_captain_id = case when co_captain_id = v_interim then null else co_captain_id end,
            updated_at = now()
        where id = v_election.team_id;
        update public.competition_team_elections
        set status = 'passed', winner_id = v_interim
        where id = p_election_id;

        select array_agg(user_id order by joined_at)
        into v_top_candidates
        from public.competition_team_members
        where team_id = v_election.team_id and is_active = true
          and user_id <> v_team.captain_id;
        insert into public.competition_team_elections (
          team_id, election_type, initiated_by, candidate_ids, status,
          eligible_voter_count, support_threshold_percent, end_time
        ) values (
          v_election.team_id, 'captaincy', v_election.initiated_by,
          v_top_candidates, 'active', v_eligible,
          v_election.support_threshold_percent, now() + interval '48 hours'
        ) returning id into followup_election_id;
      end if;
    else
      update public.competition_team_elections set status = 'failed' where id = p_election_id;
    end if;
  end if;

  select e.status, e.winner_id
  into election_status, winner_id
  from public.competition_team_elections e
  where e.id = p_election_id;
  return next;
end;
$$;
revoke all on function public.finalize_competition_team_election(uuid) from public, anon, authenticated;
grant execute on function public.finalize_competition_team_election(uuid) to service_role;
commit;