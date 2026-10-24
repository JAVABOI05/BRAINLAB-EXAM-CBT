-- Repair the corrections RPC for the live results/answers schema.
-- Answer keys are returned only after the official show_results setting is enabled.
-- A result UUID is treated as a capability token; it must also map to a finalized session.

create or replace function public.get_result_corrections(p_result_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_items jsonb;
begin
  if not public._setting_bool('show_results', false) then
    return jsonb_build_object(
      'ok', false,
      'error', 'results_not_released',
      'message', 'Results have not been released yet. Please check back later.'
    );
  end if;

  if p_result_id is null or not exists (
    select 1
    from public.results r
    join public.exam_sessions s on s.id::text = r.session_id
    where r.id = p_result_id
      and s.result_id = r.id
      and s.submitted_at is not null
      and s.status in ('submitted', 'expired')
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'message', 'This result could not be found or is not yet finalised.'
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.question_id::text,
        'subject', coalesce(a.subject, q.subject, ''),
        'type', q.category,
        'text', coalesce(a.question_text, q.question, ''),
        'options', jsonb_build_object(
          'A', coalesce(q.option_a, ''),
          'B', coalesce(q.option_b, ''),
          'C', coalesce(q.option_c, ''),
          'D', coalesce(q.option_d, '')
        ),
        'optionImages', jsonb_build_object(
          'A', q.option_a_image_url,
          'B', q.option_b_image_url,
          'C', q.option_c_image_url,
          'D', q.option_d_image_url
        ),
        'optionImageAlts', jsonb_build_object(
          'A', q.option_a_image_alt,
          'B', q.option_b_image_alt,
          'C', q.option_c_image_alt,
          'D', q.option_d_image_alt
        ),
        'questionImageUrl', q.question_image_url,
        'questionImageAlt', q.question_image_alt,
        'correctAnswer', upper(trim(a.correct_answer)),
        'explanation', coalesce(q.explanation, ''),
        'explanationImageUrl', q.explanation_image_url,
        'explanationImageAlt', q.explanation_image_alt,
        'userAnswer', case
          when upper(trim(coalesce(a.selected_answer, ''))) in ('A', 'B', 'C', 'D')
            then upper(trim(a.selected_answer))
          else null
        end,
        'isCorrect', coalesce(a.is_correct, false),
        'marks', a.marks
      )
      order by a.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.answers a
  join public.questions q on q.id = a.question_id
  where a.result_id = p_result_id;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$function$;

revoke all on function public.get_result_corrections(uuid) from public;
grant execute on function public.get_result_corrections(uuid) to anon, authenticated;
