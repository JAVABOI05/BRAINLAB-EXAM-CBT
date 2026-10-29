-- Tighten legacy CBT corrections retrieval without assuming newer question columns exist.
-- A result UUID remains the guest candidate's capability token, but it must map to a finalized session.
begin;

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
        'type', coalesce(to_jsonb(q)->>'topic', q.category, ''),
        'text', coalesce(a.question_text, q.question, ''),
        'options', case
          when nullif(trim(to_jsonb(q)->>'option_e'), '') is not null then
            jsonb_build_object(
              'A', coalesce(q.option_a, ''),
              'B', coalesce(q.option_b, ''),
              'C', coalesce(q.option_c, ''),
              'D', coalesce(q.option_d, ''),
              'E', to_jsonb(q)->>'option_e'
            )
          else jsonb_build_object(
            'A', coalesce(q.option_a, ''),
            'B', coalesce(q.option_b, ''),
            'C', coalesce(q.option_c, ''),
            'D', coalesce(q.option_d, '')
          )
        end,
        'optionImages', jsonb_build_object(
          'A', to_jsonb(q)->>'option_a_image_url',
          'B', to_jsonb(q)->>'option_b_image_url',
          'C', to_jsonb(q)->>'option_c_image_url',
          'D', to_jsonb(q)->>'option_d_image_url',
          'E', to_jsonb(q)->>'option_e_image_url'
        ),
        'optionImageAlts', jsonb_build_object(
          'A', to_jsonb(q)->>'option_a_image_alt',
          'B', to_jsonb(q)->>'option_b_image_alt',
          'C', to_jsonb(q)->>'option_c_image_alt',
          'D', to_jsonb(q)->>'option_d_image_alt',
          'E', to_jsonb(q)->>'option_e_image_alt'
        ),
        'questionImageUrl', to_jsonb(q)->>'question_image_url',
        'questionImageAlt', to_jsonb(q)->>'question_image_alt',
        'correctAnswer', upper(trim(a.correct_answer)),
        'explanation', coalesce(q.explanation, ''),
        'explanationImageUrl', to_jsonb(q)->>'explanation_image_url',
        'explanationImageAlt', to_jsonb(q)->>'explanation_image_alt',
        'userAnswer', case
          when upper(trim(coalesce(a.selected_answer, ''))) in ('A', 'B', 'C', 'D', 'E')
            then upper(trim(a.selected_answer))
          else null
        end,
        'isCorrect', coalesce(a.is_correct, false),
        'flagged', false,
        'marks', coalesce(a.marks, 1)
      ) order by array_position(s.paper_ids, a.question_id), a.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.answers a
  join public.results r on r.id = a.result_id
  join public.exam_sessions s on s.id::text = r.session_id
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
$function$;

revoke all on function public.get_result_corrections(uuid) from public;
grant execute on function public.get_result_corrections(uuid) to anon, authenticated;

commit;
