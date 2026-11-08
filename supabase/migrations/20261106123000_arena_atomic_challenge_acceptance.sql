create or replace function public.accept_competition_challenge_atomic(
  p_challenge_id uuid,
  p_accepting_user_id uuid,
  p_questions_snapshot jsonb,
  p_answer_keys_snapshot jsonb,
  p_duration_seconds integer,
  p_metadata jsonb,
  p_challenger_display_name text,
  p_accepting_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_challenge public.competition_challenges%rowtype;
  v_match_id uuid;
begin
  select * into v_challenge
  from public.competition_challenges
  where id = p_challenge_id
  for update;
  if not found then raise exception 'Challenge not found'; end if;

  if v_challenge.status = 'accepted'
     and v_challenge.challenged_id = p_accepting_user_id
     and v_challenge.match_id is not null then
    return v_challenge.match_id;
  end if;

  if v_challenge.status <> 'pending' then
    raise exception 'Challenge is no longer pending';
  end if;
  if v_challenge.expires_at <= now() then
    raise exception 'Challenge has expired';
  end if;
  if v_challenge.challenge_type <> 'individual' then
    raise exception 'This challenge format is not supported by the individual match room';
  end if;
  if v_challenge.challenger_id = p_accepting_user_id then
    raise exception 'You cannot accept your own challenge';
  end if;
  if v_challenge.challenged_id is not null and v_challenge.challenged_id <> p_accepting_user_id then
    raise exception 'This challenge was sent to another player';
  end if;
  if p_duration_seconds < 60 or p_duration_seconds > 3600 then
    raise exception 'Invalid match duration';
  end if;

  insert into public.competition_matches (
    match_type,status,participant_a_id,participant_b_id,
    score_a,score_b,questions_snapshot,answer_keys_snapshot,
    duration_seconds,metadata
  ) values (
    '1v1','lobby',v_challenge.challenger_id,p_accepting_user_id,
    0,0,coalesce(p_questions_snapshot,'[]'::jsonb),
    coalesce(p_answer_keys_snapshot,'{}'::jsonb),
    p_duration_seconds,coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_match_id;

  insert into public.competition_match_participants (
    match_id,user_id,display_name,is_ready,current_question_index,score
  ) values
    (v_match_id,v_challenge.challenger_id,coalesce(nullif(p_challenger_display_name,''),'Private player'),false,0,0),
    (v_match_id,p_accepting_user_id,coalesce(nullif(p_accepting_display_name,''),'Private player'),false,0,0);

  update public.competition_challenges
  set status='accepted',
      challenged_id=p_accepting_user_id,
      match_id=v_match_id,
      accepted_at=now()
  where id=p_challenge_id;

  return v_match_id;
end;
$$;
revoke all on function public.accept_competition_challenge_atomic(uuid, uuid, jsonb, jsonb, integer, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.accept_competition_challenge_atomic(uuid, uuid, jsonb, jsonb, integer, jsonb, text, text) to service_role;