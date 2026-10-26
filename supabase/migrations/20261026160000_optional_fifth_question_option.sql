-- Optional fifth multiple-choice option for legacy CBT questions.
-- Four-option questions remain valid; correct answer E requires a populated option_e.
begin;
alter table public.questions
  add column if not exists option_e text,
  add column if not exists option_e_image_url text,
  add column if not exists option_e_image_alt text;

alter table public.questions drop constraint if exists questions_correct_answer_check;

alter table public.questions add constraint questions_correct_answer_option_e_check
  check (upper(trim(correct_answer)) in ('A','B','C','D','E')
    and (upper(trim(correct_answer)) <> 'E' or nullif(trim(option_e),'') is not null));

do $$
begin
  if not exists (select 1 from pg_constraint where conname='questions_option_e_image_url_https_check' and conrelid='public.questions'::regclass) then
    alter table public.questions add constraint questions_option_e_image_url_https_check
      check (option_e_image_url is null or option_e_image_url ~* '^https://');
  end if;
end $$;

create or replace function public._clean_answers(p_answers jsonb, p_ids bigint[])
returns jsonb language sql immutable set search_path to 'public','pg_temp'
as $function$
  select coalesce(jsonb_object_agg(t.k,upper(t.v)),'{}'::jsonb)
  from jsonb_each_text(case when jsonb_typeof(p_answers)='object' then p_answers else '{}'::jsonb end) t(k,v)
  where t.k ~ '^[0-9]{1,15}$'
    and (case when t.k ~ '^[0-9]{1,15}$' then t.k::bigint end)=any(p_ids)
    and upper(t.v) in ('A','B','C','D','E');
$function$;

create or replace function public._paper_json(p_ids bigint[])
returns jsonb language sql stable security definer set search_path to 'public','pg_temp'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,'subject',q.subject,'section',q.section,'category',q.category,
    'passage_id',q.passage_id,'passage_title',q.passage_title,'passage_text',q.passage_text,
    'question',q.question,'question_image_url',q.question_image_url,'question_image_alt',q.question_image_alt,
    'option_a',q.option_a,'option_a_image_url',q.option_a_image_url,'option_a_image_alt',q.option_a_image_alt,
    'option_b',q.option_b,'option_b_image_url',q.option_b_image_url,'option_b_image_alt',q.option_b_image_alt,
    'option_c',q.option_c,'option_c_image_url',q.option_c_image_url,'option_c_image_alt',q.option_c_image_alt,
    'option_d',q.option_d,'option_d_image_url',q.option_d_image_url,'option_d_image_alt',q.option_d_image_alt,
    'option_e',q.option_e,'option_e_image_url',q.option_e_image_url,'option_e_image_alt',q.option_e_image_alt,
    'marks',public._legacy_exam_marks(q.id)) order by array_position(p_ids,q.id)),'[]'::jsonb)
  from public.questions q where q.id=any(p_ids);
$function$;

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
          'D', coalesce(q.option_d, ''),
          'E', coalesce(q.option_e, '')
        ),
        'optionImages', jsonb_build_object(
          'A', q.option_a_image_url,
          'B', q.option_b_image_url,
          'C', q.option_c_image_url,
          'D', q.option_d_image_url,
          'E', q.option_e_image_url
        ),
        'optionImageAlts', jsonb_build_object(
          'A', q.option_a_image_alt,
          'B', q.option_b_image_alt,
          'C', q.option_c_image_alt,
          'D', q.option_d_image_alt,
          'E', q.option_e_image_alt
        ),
        'questionImageUrl', q.question_image_url,
        'questionImageAlt', q.question_image_alt,
        'correctAnswer', upper(trim(a.correct_answer)),
        'explanation', coalesce(q.explanation, ''),
        'explanationImageAlt', q.explanation_image_alt,
        'userAnswer', case
          when upper(trim(coalesce(a.selected_answer, ''))) in ('A', 'B', 'C', 'D', 'E')
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

commit;
