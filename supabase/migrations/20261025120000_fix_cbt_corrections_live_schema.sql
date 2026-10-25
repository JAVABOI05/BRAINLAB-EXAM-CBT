-- Correct the legacy production schema without changing existing CBT records.
-- Answer keys are exposed only when the official show_results setting is enabled.
create or replace function public.get_result_corrections(p_result_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_items jsonb;
begin
  if not public._setting_bool('show_results', false) then
    return jsonb_build_object('ok', false, 'error', 'results_not_released',
      'message', 'Results have not been released yet. Please check back later.');
  end if;

  if p_result_id is null or not exists (
    select 1 from public.results r
    where r.id = p_result_id
      and exists (select 1 from public.answers a where a.result_id = r.id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_found',
      'message', 'This result could not be found or has no saved answers.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.question_id::text,
    'subject', coalesce(a.subject, q.subject, r.subject, 'General'),
    'type', q.category,
    'text', coalesce(a.question_text, q.question, 'Question text unavailable'),
    'options', jsonb_build_object('A', coalesce(q.option_a, ''), 'B', coalesce(q.option_b, ''),
      'C', coalesce(q.option_c, ''), 'D', coalesce(q.option_d, '')),
    'correctAnswer', upper(coalesce(nullif(trim(a.correct_answer), ''), nullif(trim(q.correct_answer), ''), 'A')),
    'explanation', coalesce(q.explanation, ''),
    'userAnswer', case when upper(trim(coalesce(a.selected_answer, ''))) in ('A','B','C','D')
      then upper(trim(a.selected_answer)) else null end,
    'isCorrect', coalesce(a.is_correct, false),
    'marks', coalesce(a.marks, q.marks, 1)
  ) order by a.id), '[]'::jsonb)
  into v_items
  from public.answers a
  join public.results r on r.id = a.result_id
  left join public.questions q on q.id = a.question_id
  where a.result_id = p_result_id;

  if jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'corrections_unavailable',
      'message', 'No saved answer records were found for this completed exam.');
  end if;
  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;
revoke all on function public.get_result_corrections(uuid) from public;
grant execute on function public.get_result_corrections(uuid) to anon, authenticated;
