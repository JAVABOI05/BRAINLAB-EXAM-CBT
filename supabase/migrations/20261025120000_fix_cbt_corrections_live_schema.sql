-- Fix CBT corrections against the live legacy results/answers schema.
-- Does not alter historical CBT records or add speculative columns to results.
create or replace function public.get_result_corrections(p_result_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_results boolean;
  v_items jsonb;
begin
  select (s.value = 'true'::jsonb)
    into v_show_results
  from public.settings s
  where s.key = 'show_results'
  limit 1;

  if not coalesce(v_show_results, false) then
    return jsonb_build_object(
      'ok', false,
      'error', 'results_not_released',
      'message', 'Results have not been released yet. Please check back later.'
    );
  end if;

  -- A result is reviewable only when attached to a submitted exam session.
  if not exists (
    select 1
    from public.results r
    join public.exam_sessions es on es.result_id = r.id
    where r.id = p_result_id
      and es.status = 'submitted'
      and es.submitted_at is not null
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
        'id', a.question_id,
        'subject', coalesce(a.subject, q.subject, r.subject, 'General'),
        'text', coalesce(a.question_text, q.question, 'Question text unavailable'),
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
        'correctAnswer', upper(coalesce(a.correct_answer, q.correct_answer, 'A')),
        'explanation', coalesce(q.explanation, ''),
        'explanationImageUrl', q.explanation_image_url,
        'explanationImageAlt', q.explanation_image_alt,
        'userAnswer', nullif(upper(coalesce(a.selected_answer, '')), ''),
        'isCorrect', coalesce(a.is_correct, false),
        'marks', coalesce(a.marks, q.marks, 1)
      )
      order by a.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.answers a
  join public.results r on r.id = a.result_id
  left join public.questions q on q.id = a.question_id
  where a.result_id = p_result_id;

  if jsonb_array_length(v_items) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'corrections_unavailable',
      'message', 'No saved answer records were found for this completed exam.'
    );
  end if;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

revoke all on function public.get_result_corrections(uuid) from public;
grant execute on function public.get_result_corrections(uuid) to anon, authenticated;
