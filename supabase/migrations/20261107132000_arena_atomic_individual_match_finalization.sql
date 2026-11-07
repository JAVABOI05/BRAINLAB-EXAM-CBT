-- Make individual Arena match finalization atomic and retry-safe.
-- The match row is locked for the full transaction. Ratings are then locked in
-- stable user-id order so simultaneous matches cannot double-award or deadlock.
begin;

create or replace function public.finalize_competition_individual_match_atomic(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_match public.competition_matches%rowtype;
  v_a public.competition_match_participants%rowtype;
  v_b public.competition_match_participants%rowtype;
  v_rating_a public.competition_ratings%rowtype;
  v_rating_b public.competition_ratings%rowtype;
  v_participant_count integer;
  v_score_a numeric;
  v_score_b numeric;
  v_outcome_a numeric := 0.5;
  v_outcome_b numeric := 0.5;
  v_winner_id uuid;
  v_ranked boolean;
  v_elo_a integer;
  v_elo_b integer;
  v_delta_a integer;
  v_delta_b integer;
  v_next_a integer;
  v_next_b integer;
  v_streak_a integer;
  v_streak_b integer;
  v_tier_a text;
  v_tier_b text;
  v_season_id uuid;
  v_now timestamptz := now();
begin
  select * into v_match
  from public.competition_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.match_type = 'team_vs_team' then
    raise exception 'Use the team match finalizer for team-versus-team matches';
  end if;

  if v_match.status = 'completed' then
    return jsonb_build_object('ok', true, 'already_finalized', true, 'match_id', p_match_id);
  end if;

  if v_match.status <> 'in_progress' then
    raise exception 'Individual match must be in progress before it can be finalized';
  end if;

  if v_match.participant_a_id is null
     or v_match.participant_b_id is null
     or v_match.participant_a_id = v_match.participant_b_id then
    raise exception 'Individual match requires two distinct participants';
  end if;

  select count(*) into v_participant_count
  from public.competition_match_participants
  where match_id = p_match_id;

  if v_participant_count <> 2 then
    raise exception 'Individual match must have exactly two participant records';
  end if;

  select * into v_a
  from public.competition_match_participants
  where match_id = p_match_id and user_id = v_match.participant_a_id
  for update;

  if not found then
    raise exception 'Participant A record is missing';
  end if;

  select * into v_b
  from public.competition_match_participants
  where match_id = p_match_id and user_id = v_match.participant_b_id
  for update;

  if not found then
    raise exception 'Participant B record is missing';
  end if;

  v_score_a := coalesce(v_a.score, 0);
  v_score_b := coalesce(v_b.score, 0);

  if v_score_a > v_score_b then
    v_winner_id := v_a.user_id;
    v_outcome_a := 1;
    v_outcome_b := 0;
  elsif v_score_b > v_score_a then
    v_winner_id := v_b.user_id;
    v_outcome_a := 0;
    v_outcome_b := 1;
  end if;

  v_ranked := coalesce(v_match.metadata->>'match_mode', 'ranked') <> 'friendly'
    and coalesce((v_match.metadata->>'ranked')::boolean, true);

  if v_ranked then
    -- Ensure both rating rows exist, then lock them in deterministic order.
    insert into public.competition_ratings (user_id)
    select ids.user_id
    from (values (v_a.user_id), (v_b.user_id)) as ids(user_id)
    order by ids.user_id
    on conflict (user_id) do nothing;

    perform user_id
    from public.competition_ratings
    where user_id in (v_a.user_id, v_b.user_id)
    order by user_id
    for update;

    select * into v_rating_a
    from public.competition_ratings
    where user_id = v_a.user_id;

    select * into v_rating_b
    from public.competition_ratings
    where user_id = v_b.user_id;

    v_elo_a := coalesce(v_rating_a.elo_rating, 1200);
    v_elo_b := coalesce(v_rating_b.elo_rating, 1200);

    v_delta_a := round(32 * (v_outcome_a -
      (1.0 / (1.0 + power(10.0, (v_elo_b - v_elo_a)::numeric / 400.0)))))::integer;
    v_delta_b := round(32 * (v_outcome_b -
      (1.0 / (1.0 + power(10.0, (v_elo_a - v_elo_b)::numeric / 400.0)))))::integer;

    v_next_a := greatest(100, v_elo_a + v_delta_a);
    v_next_b := greatest(100, v_elo_b + v_delta_b);

    v_streak_a := case when v_outcome_a = 1
      then coalesce(v_rating_a.win_streak, 0) + 1 else 0 end;
    v_streak_b := case when v_outcome_b = 1
      then coalesce(v_rating_b.win_streak, 0) + 1 else 0 end;

    v_tier_a := case
      when v_next_a >= 2200 then 'Grandmaster'
      when v_next_a >= 1900 then 'Master'
      when v_next_a >= 1650 then 'Diamond'
      when v_next_a >= 1450 then 'Platinum'
      when v_next_a >= 1300 then 'Gold'
      when v_next_a >= 1150 then 'Silver'
      else 'Bronze' end;
    v_tier_b := case
      when v_next_b >= 2200 then 'Grandmaster'
      when v_next_b >= 1900 then 'Master'
      when v_next_b >= 1650 then 'Diamond'
      when v_next_b >= 1450 then 'Platinum'
      when v_next_b >= 1300 then 'Gold'
      when v_next_b >= 1150 then 'Silver'
      else 'Bronze' end;

    update public.competition_ratings
    set elo_rating = v_next_a,
        peak_elo = greatest(coalesce(peak_elo, 1200), v_next_a),
        matches_played = matches_played + 1,
        matches_won = matches_won + case when v_outcome_a = 1 then 1 else 0 end,
        matches_drawn = matches_drawn + case when v_outcome_a = 0.5 then 1 else 0 end,
        matches_lost = matches_lost + case when v_outcome_a = 0 then 1 else 0 end,
        win_streak = v_streak_a,
        best_streak = greatest(coalesce(best_streak, 0), v_streak_a),
        tier = v_tier_a,
        updated_at = v_now
    where user_id = v_a.user_id;

    update public.competition_ratings
    set elo_rating = v_next_b,
        peak_elo = greatest(coalesce(peak_elo, 1200), v_next_b),
        matches_played = matches_played + 1,
        matches_won = matches_won + case when v_outcome_b = 1 then 1 else 0 end,
        matches_drawn = matches_drawn + case when v_outcome_b = 0.5 then 1 else 0 end,
        matches_lost = matches_lost + case when v_outcome_b = 0 then 1 else 0 end,
        win_streak = v_streak_b,
        best_streak = greatest(coalesce(best_streak, 0), v_streak_b),
        tier = v_tier_b,
        updated_at = v_now
    where user_id = v_b.user_id;

    select id into v_season_id
    from public.competition_seasons
    where status = 'active' and starts_at <= v_now and ends_at >= v_now
    order by starts_at desc
    limit 1;

    insert into public.competition_rating_history (
      season_id, user_id, match_id, rating_kind,
      rating_before, rating_after, rating_delta, reason
    ) values
      (v_season_id, v_a.user_id, p_match_id, 'individual',
       v_elo_a, v_next_a, v_next_a - v_elo_a, 'verified_ranked_match'),
      (v_season_id, v_b.user_id, p_match_id, 'individual',
       v_elo_b, v_next_b, v_next_b - v_elo_b, 'verified_ranked_match');
  end if;

  -- Preserve existing Arena XP policy: ranked and friendly individual matches
  -- both award participation/victory XP. Idempotency keys protect retries.
  insert into public.user_xp_ledger (
    user_id, amount, activity_type, idempotency_key, description, metadata
  ) values
    (v_a.user_id,
     case when v_outcome_a = 1 then 50 else 20 end,
     'competition_match',
     'arena-match:' || p_match_id::text || ':user:' || v_a.user_id::text,
     case when v_outcome_a = 1 then 'Arena Match Victory!' else 'Arena Match Participation' end,
     jsonb_build_object('match_id', p_match_id, 'outcome',
       case when v_outcome_a = 1 then 'win' when v_outcome_a = 0.5 then 'draw' else 'participation' end)),
    (v_b.user_id,
     case when v_outcome_b = 1 then 50 else 20 end,
     'competition_match',
     'arena-match:' || p_match_id::text || ':user:' || v_b.user_id::text,
     case when v_outcome_b = 1 then 'Arena Match Victory!' else 'Arena Match Participation' end,
     jsonb_build_object('match_id', p_match_id, 'outcome',
       case when v_outcome_b = 1 then 'win' when v_outcome_b = 0.5 then 'draw' else 'participation' end))
  on conflict (idempotency_key) do nothing;

  -- Completion is deliberately last: every rating/history/XP write above
  -- commits together with this update, or the whole function rolls back.
  update public.competition_matches
  set status = 'completed',
      ended_at = v_now,
      score_a = v_score_a,
      score_b = v_score_b,
      winner_id = v_winner_id
  where id = p_match_id;

  return jsonb_build_object(
    'ok', true,
    'already_finalized', false,
    'match_id', p_match_id,
    'score_a', v_score_a,
    'score_b', v_score_b,
    'winner_id', v_winner_id,
    'ranked', v_ranked
  );
end;
$function$;

revoke all on function public.finalize_competition_individual_match_atomic(uuid) from public, anon, authenticated;
grant execute on function public.finalize_competition_individual_match_atomic(uuid) to service_role;

commit;
