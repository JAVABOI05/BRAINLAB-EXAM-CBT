-- Add safe, optional image support to legacy CBT questions and released corrections.
begin;

alter table public.questions
  add column if not exists question_image_url text,
  add column if not exists question_image_alt text,
  add column if not exists option_a_image_url text,
  add column if not exists option_a_image_alt text,
  add column if not exists option_b_image_url text,
  add column if not exists option_b_image_alt text,
  add column if not exists option_c_image_url text,
  add column if not exists option_c_image_alt text,
  add column if not exists option_d_image_url text,
  add column if not exists option_d_image_alt text,
  add column if not exists explanation_image_url text,
  add column if not exists explanation_image_alt text;

do $constraints$
declare
  col text;
  constraint_name text;
begin
  foreach col in array array[
    'question_image_url','option_a_image_url','option_b_image_url',
    'option_c_image_url','option_d_image_url','explanation_image_url'
  ] loop
    constraint_name := 'questions_' || col || '_https_check';
    if not exists (
      select 1 from pg_constraint where conname = constraint_name
        and conrelid = 'public.questions'::regclass
    ) then
      execute format(
        'alter table public.questions add constraint %I check (%I is null or %I ~* %L)',
        constraint_name, col, col, '^https://'
      );
    end if;
  end loop;
end;
$constraints$;

create or replace function public._paper_json(p_ids bigint[])
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'subject', q.subject, 'section', q.section, 'category', q.category,
      'passage_id', q.passage_id, 'passage_title', q.passage_title, 'passage_text', q.passage_text,
      'question', q.question,
      'question_image_url', q.question_image_url,
      'question_image_alt', q.question_image_alt,
      'option_a', q.option_a, 'option_a_image_url', q.option_a_image_url, 'option_a_image_alt', q.option_a_image_alt,
      'option_b', q.option_b, 'option_b_image_url', q.option_b_image_url, 'option_b_image_alt', q.option_b_image_alt,
      'option_c', q.option_c, 'option_c_image_url', q.option_c_image_url, 'option_c_image_alt', q.option_c_image_alt,
      'option_d', q.option_d, 'option_d_image_url', q.option_d_image_url, 'option_d_image_alt', q.option_d_image_alt,
      'marks', q.marks) order by array_position(p_ids, q.id)), '[]'::jsonb)
  from public.questions q where q.id = any (p_ids);
$function$;

create or replace function public._result_payload(p_session uuid, p_flagged jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  s public.exam_sessions%rowtype;
  r public.results%rowtype;
  v_show boolean := public._setting_bool('show_results', false);
  v_scores jsonb;
  v_items jsonb := '[]'::jsonb;
begin
  select * into s from public.exam_sessions where id = p_session;
  if not found then
    return public._err('invalid_session', 'Session not found.');
  end if;

  select * into r from public.results where id = s.result_id;
  if r.id is null then
    return public._err('no_result', 'No result is available for this attempt.');
  end if;

  if v_show then
    select coalesce(jsonb_object_agg(subject, got), '{}'::jsonb) into v_scores
    from (
      select subject, round(sum(case when is_correct then marks else 0 end))::int as got
      from public.answers
      where result_id = r.id
      group by subject
    ) t;

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', coalesce(a.question_id::text, a.id::text),
      'subject', a.subject,
      'type', q.section,
      'text', coalesce(q.question, a.question_text),
      'questionImageUrl', q.question_image_url,
      'questionImageAlt', coalesce(q.question_image_alt, ''),
      'optionImages', jsonb_build_object(
        'A', q.option_a_image_url,
        'B', q.option_b_image_url,
        'C', q.option_c_image_url,
        'D', q.option_d_image_url
      ),
      'optionImageAlts', jsonb_build_object(
        'A', coalesce(q.option_a_image_alt, ''),
        'B', coalesce(q.option_b_image_alt, ''),
        'C', coalesce(q.option_c_image_alt, ''),
        'D', coalesce(q.option_d_image_alt, '')
      ),
      'options', jsonb_build_object(
        'A', coalesce(trim(q.option_a), ''),
        'B', coalesce(trim(q.option_b), ''),
        'C', coalesce(trim(q.option_c), ''),
        'D', coalesce(trim(q.option_d), '')
      ),
      'correctAnswer', a.correct_answer,
      'explanation', coalesce(q.explanation, ''),
      'explanationImageUrl', q.explanation_image_url,
      'explanationImageAlt', coalesce(q.explanation_image_alt, ''),
      'userAnswer', a.selected_answer,
      'isCorrect', coalesce(a.is_correct, false),
      'flagged', coalesce((p_flagged ->> a.question_id::text) = 'true', false),
      'marks', a.marks
    ) order by array_position(s.paper_ids, a.question_id), a.id), '[]'::jsonb)
    into v_items
    from public.answers a
    left join public.questions q on q.id = a.question_id
    where a.result_id = r.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'finished', true,
    'status', s.status,
    'result_id', r.id,
    'score', case when v_show then r.score else null end,
    'total', case when v_show then r.total else null end,
    'subject_scores', case when v_show then coalesce(v_scores, '{}'::jsonb) else '{}'::jsonb end,
    'show_results', v_show,
    'items', v_items
  );
end
$function$;

commit;
