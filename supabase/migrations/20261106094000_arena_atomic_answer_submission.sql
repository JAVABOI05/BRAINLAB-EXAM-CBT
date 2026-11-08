begin;
create or replace function public.record_competition_match_answer(
  p_match_id uuid,
  p_participant_id uuid,
  p_user_id uuid,
  p_question_id text,
  p_selected_option text,
  p_is_correct boolean,
  p_points_awarded numeric,
  p_time_taken_seconds numeric
)
returns table(score numeric, current_question_index integer, total_time_spent_seconds numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_participant public.competition_match_participants%rowtype;
  v_match_status text;
begin
  select status into v_match_status
  from public.competition_matches
  where id = p_match_id
  for share;

  if v_match_status not in ('live', 'in_progress') then
    raise exception 'Match is not accepting answers';
  end if;

  select * into v_participant
  from public.competition_match_participants
  where id = p_participant_id and match_id = p_match_id
  for update;

  if not found or v_participant.user_id <> p_user_id then
    raise exception 'Participant does not belong to the authenticated user and match';
  end if;

  insert into public.competition_match_answers (
    match_id, participant_id, user_id, question_id, selected_option,
    is_correct, points_awarded, time_taken_seconds
  ) values (
    p_match_id, p_participant_id, p_user_id, p_question_id, p_selected_option,
    p_is_correct, greatest(p_points_awarded, 0), greatest(p_time_taken_seconds, 0)
  );

  update public.competition_match_participants
  set score = score + greatest(p_points_awarded, 0),
      current_question_index = current_question_index + 1,
      total_time_spent_seconds = total_time_spent_seconds + greatest(p_time_taken_seconds, 0)
  where id = p_participant_id
  returning competition_match_participants.score,
            competition_match_participants.current_question_index,
            competition_match_participants.total_time_spent_seconds
  into score, current_question_index, total_time_spent_seconds;

  return next;
end;
$$;

revoke all on function public.record_competition_match_answer(uuid, uuid, uuid, text, text, boolean, numeric, numeric) from public, anon, authenticated;
grant execute on function public.record_competition_match_answer(uuid, uuid, uuid, text, text, boolean, numeric, numeric) to service_role;
commit;