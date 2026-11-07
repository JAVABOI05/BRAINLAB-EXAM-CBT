create or replace function public.finalize_competition_team_match_atomic(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_match public.competition_matches%rowtype;
  v_team_a public.competition_teams%rowtype;
  v_team_b public.competition_teams%rowtype;
  v_roster_size integer;
  v_count_a integer;
  v_count_b integer;
  v_unassigned integer;
  v_score_a numeric;
  v_score_b numeric;
  v_winner_team_id uuid;
  v_outcome_a numeric;
  v_outcome_b numeric;
  v_ranked boolean;
  v_rating_a integer;
  v_rating_b integer;
  v_expected_a numeric;
  v_delta_a integer;
  v_delta_b integer;
  v_next_a integer;
  v_next_b integer;
  v_season_id uuid;
  v_xp_total_a integer;
  v_xp_total_b integer;
  v_scoring_mode text;
  v_top_count integer;
begin
  select * into v_match
  from public.competition_matches
  where id = p_match_id
  for update;

  if not found then raise exception 'Match not found'; end if;
  if v_match.match_type <> 'team_vs_team' then raise exception 'This finalizer only accepts team-versus-team matches'; end if;
  if v_match.status = 'completed' then
    return jsonb_build_object('ok', true, 'already_finalized', true, 'match_id', p_match_id);
  end if;
  if v_match.status <> 'in_progress' then raise exception 'Team match must be in progress before it can be finalized'; end if;
  if v_match.team_a_id is null or v_match.team_b_id is null or v_match.team_a_id = v_match.team_b_id then
    raise exception 'Team match requires two distinct teams';
  end if;

  v_roster_size := greatest(2, least(5, coalesce((v_match.metadata->>'roster_size')::integer, 2)));
  select count(*) filter (where team_id = v_match.team_a_id),
         count(*) filter (where team_id = v_match.team_b_id),
         count(*) filter (where team_id is null or team_id not in (v_match.team_a_id, v_match.team_b_id))
  into v_count_a, v_count_b, v_unassigned
  from public.competition_match_participants
  where match_id = p_match_id;

  if v_count_a <> v_roster_size or v_count_b <> v_roster_size or v_unassigned <> 0 then
    raise exception 'Locked team rosters do not match the configured battle format';
  end if;

  v_scoring_mode := coalesce(v_match.metadata->>'team_scoring_mode', 'sum');
  if v_scoring_mode = 'sum' then
    select coalesce(sum(score), 0) into v_score_a from public.competition_match_participants where match_id = p_match_id and team_id = v_match.team_a_id;
    select coalesce(sum(score), 0) into v_score_b from public.competition_match_participants where match_id = p_match_id and team_id = v_match.team_b_id;
  elsif v_scoring_mode = 'average' then
    select coalesce(avg(score), 0) into v_score_a from public.competition_match_participants where match_id = p_match_id and team_id = v_match.team_a_id;
    select coalesce(avg(score), 0) into v_score_b from public.competition_match_participants where match_id = p_match_id and team_id = v_match.team_b_id;
  elsif v_scoring_mode = 'top_performers' then
    v_top_count := greatest(1, least(v_roster_size, coalesce((v_match.metadata->>'top_performer_count')::integer, 2)));
    select coalesce(sum(score), 0) into v_score_a from (
      select score from public.competition_match_participants where match_id = p_match_id and team_id = v_match.team_a_id order by score desc limit v_top_count
    ) top_a;
    select coalesce(sum(score), 0) into v_score_b from (
      select score from public.competition_match_participants where match_id = p_match_id and team_id = v_match.team_b_id order by score desc limit v_top_count
    ) top_b;
  else
    raise exception 'Unsupported team scoring mode: %', v_scoring_mode;
  end if;

  v_winner_team_id := case when v_score_a > v_score_b then v_match.team_a_id when v_score_b > v_score_a then v_match.team_b_id else null end;
  v_outcome_a := case when v_score_a > v_score_b then 1 when v_score_a < v_score_b then 0 else 0.5 end;
  v_outcome_b := 1 - v_outcome_a;
  v_ranked := coalesce(v_match.metadata->>'match_mode', 'ranked') <> 'friendly'
    and coalesce((v_match.metadata->>'ranked')::boolean, true);

  -- Lock both team rows in deterministic order to avoid cross-match deadlocks.
  perform id from public.competition_teams where id in (v_match.team_a_id, v_match.team_b_id) order by id for update;
  select * into v_team_a from public.competition_teams where id = v_match.team_a_id;
  select * into v_team_b from public.competition_teams where id = v_match.team_b_id;
  if not found then raise exception 'A team in this match no longer exists'; end if;

  if v_ranked then
    v_rating_a := coalesce(v_team_a.elo_rating, 1200);
    v_rating_b := coalesce(v_team_b.elo_rating, 1200);
    v_expected_a := 1 / (1 + power(10::numeric, (v_rating_b - v_rating_a)::numeric / 400));
    v_delta_a := round(32 * (v_outcome_a - v_expected_a))::integer;
    v_delta_b := -v_delta_a;
    v_next_a := greatest(100, v_rating_a + v_delta_a);
    v_next_b := greatest(100, v_rating_b + v_delta_b);

    update public.competition_teams set
      elo_rating = v_next_a,
      matches_played = matches_played + 1,
      matches_won = matches_won + case when v_outcome_a = 1 then 1 else 0 end,
      matches_drawn = matches_drawn + case when v_outcome_a = 0.5 then 1 else 0 end,
      matches_lost = matches_lost + case when v_outcome_a = 0 then 1 else 0 end,
      updated_at = now()
    where id = v_match.team_a_id;
    update public.competition_teams set
      elo_rating = v_next_b,
      matches_played = matches_played + 1,
      matches_won = matches_won + case when v_outcome_b = 1 then 1 else 0 end,
      matches_drawn = matches_drawn + case when v_outcome_b = 0.5 then 1 else 0 end,
      matches_lost = matches_lost + case when v_outcome_b = 0 then 1 else 0 end,
      updated_at = now()
    where id = v_match.team_b_id;

    select id into v_season_id from public.competition_seasons
    where status = 'active' and starts_at <= now() and ends_at >= now()
    order by starts_at desc limit 1;

    insert into public.competition_rating_history (
      season_id,user_id,team_id,match_id,rating_kind,rating_before,rating_after,rating_delta,reason
    ) values
      (v_season_id,v_team_a.captain_id,v_match.team_a_id,p_match_id,'team',v_rating_a,v_next_a,v_next_a-v_rating_a,'verified_ranked_team_match'),
      (v_season_id,v_team_b.captain_id,v_match.team_b_id,p_match_id,'team',v_rating_b,v_next_b,v_next_b-v_rating_b,'verified_ranked_team_match');
  end if;

  insert into public.user_xp_ledger (user_id,amount,activity_type,idempotency_key,description,metadata)
  select participant.user_id,
         case when v_winner_team_id is null then 20 when participant.team_id = v_winner_team_id then 50 else 20 end,
         'competition_team_match',
         'arena-match:' || p_match_id::text || ':user:' || participant.user_id::text,
         case when v_winner_team_id is not null and participant.team_id = v_winner_team_id then 'Arena Team Match Victory!' else 'Arena Team Match Participation' end,
         jsonb_build_object('match_id',p_match_id,'team_id',participant.team_id,'outcome',
           case when v_winner_team_id is null then 'draw' when participant.team_id = v_winner_team_id then 'win' else 'participation' end)
  from public.competition_match_participants participant
  where participant.match_id = p_match_id
  on conflict (idempotency_key) do nothing;

  select coalesce(sum(case when v_winner_team_id is null then 20 when team_id = v_winner_team_id then 50 else 20 end),0)::integer
  into v_xp_total_a from public.competition_match_participants where match_id = p_match_id and team_id = v_match.team_a_id;
  select coalesce(sum(case when v_winner_team_id is null then 20 when team_id = v_winner_team_id then 50 else 20 end),0)::integer
  into v_xp_total_b from public.competition_match_participants where match_id = p_match_id and team_id = v_match.team_b_id;

  update public.competition_teams set total_xp = total_xp + v_xp_total_a, updated_at = now() where id = v_match.team_a_id;
  update public.competition_teams set total_xp = total_xp + v_xp_total_b, updated_at = now() where id = v_match.team_b_id;

  update public.competition_matches set
    status = 'completed',
    ended_at = now(),
    score_a = v_score_a,
    score_b = v_score_b,
    winner_id = null,
    winner_team_id = v_winner_team_id
  where id = p_match_id;

  return jsonb_build_object('ok',true,'already_finalized',false,'match_id',p_match_id,
    'score_a',v_score_a,'score_b',v_score_b,'winner_team_id',v_winner_team_id,'ranked',v_ranked);
end;
$function$;

revoke all on function public.finalize_competition_team_match_atomic(uuid) from public, anon, authenticated;
grant execute on function public.finalize_competition_team_match_atomic(uuid) to service_role;
