-- Standardize every four-subject UTME attempt (English + three electives) to 400.
-- Preserve raw question-level marks and existing result rows; standardize only the
-- aggregate/subject score contract exposed and stored for UTME attempts.

begin;

create or replace function public._standardized_utme_scores(p_result_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_subject_count integer;
  v_has_english boolean;
  v_subject_scores jsonb;
  v_score integer;
begin
  if p_result_id is null then
    return jsonb_build_object('is_utme', false);
  end if;

  with subject_totals as (
    select
      a.subject,
      sum(case when coalesce(a.is_correct, false) then coalesce(a.marks, 0) else 0 end) as awarded,
      sum(coalesce(a.marks, 0)) as possible
    from public.answers a
    where a.result_id = p_result_id
    group by a.subject
  ),
  normalized as (
    select
      subject,
      least(100, greatest(0,
        case when possible > 0 then ceil((awarded / possible) * 100)::integer else 0 end
      )) as standardized_score
    from subject_totals
  )
  select
    count(*)::integer,
    coalesce(bool_or(lower(subject) like '%english%'), false),
    coalesce(jsonb_object_agg(subject, standardized_score), '{}'::jsonb),
    coalesce(sum(standardized_score), 0)::integer
  into v_subject_count, v_has_english, v_subject_scores, v_score
  from normalized;

  if v_subject_count = 4 and v_has_english then
    return jsonb_build_object(
      'is_utme', true,
      'score', least(400, greatest(0, v_score)),
      'total', 400,
      'subject_scores', v_subject_scores
    );
  end if;

  return jsonb_build_object('is_utme', false);
end
$function$;

revoke all on function public._standardized_utme_scores(uuid) from public, anon, authenticated;

create or replace function public._finalize_session(
  p_id uuid,
  p_answers jsonb,
  p_auto boolean,
  p_flagged jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  s public.exam_sessions%rowtype;
  v_late boolean;
  v_ans jsonb;
  v_status text;
  v_result_id uuid;
  v_score integer;
  v_total integer;
  v_standardized jsonb;
begin
  select * into s from public.exam_sessions where id = p_id for update;
  if not found then return public._err('invalid_session', 'Session not found.'); end if;
  if s.status = 'cancelled' then return public._err('cancelled', 'This attempt was cancelled.'); end if;
  if s.status <> 'started' then return public._result_payload(s.id, p_flagged); end if;

  v_late   := now() > s.deadline_at + interval '60 seconds';
  v_status := case when v_late then 'expired' else 'submitted' end;
  v_ans    := case when v_late or p_answers is null
                   then s.draft_answers
                   else public._clean_answers(p_answers, s.paper_ids) end;

  -- Keep the legacy raw calculation as the fallback for non-UTME assessments.
  select sum(got)::int, sum(possible)::int into v_score, v_total
  from (
    select round(sum(case when (v_ans ->> q.id::text) = upper(trim(q.correct_answer)) then q.marks else 0 end)) as got,
           round(sum(q.marks)) as possible
    from public.questions q
    where q.id = any (s.paper_ids)
    group by q.subject
  ) t;

  if v_total is null or v_total <= 0 then
    raise exception 'Cannot grade session %: empty paper', s.id;
  end if;

  insert into public.results (session_id, name, phone, subject, score, total)
  values (s.id::text, s.candidate_name, s.phone, coalesce(s.elective, s.subject), v_score, v_total)
  returning id into v_result_id;

  insert into public.answers (result_id, question_id, selected_answer, correct_answer, subject, question_text, is_correct, marks)
  select v_result_id, q.id, v_ans ->> q.id::text, upper(trim(q.correct_answer)), q.subject, q.question,
         coalesce((v_ans ->> q.id::text) = upper(trim(q.correct_answer)), false), q.marks
  from public.questions q
  where q.id = any (s.paper_ids);

  -- The authoritative UTME aggregate is the sum of four independently
  -- standardized subject scores, each out of 100.
  v_standardized := public._standardized_utme_scores(v_result_id);
  if coalesce((v_standardized ->> 'is_utme')::boolean, false) then
    update public.results
    set score = (v_standardized ->> 'score')::integer,
        total = 400
    where id = v_result_id;
  end if;

  update public.exam_sessions
  set status = v_status,
      submitted_at = now(),
      auto_submitted = (coalesce(p_auto, false) or v_late),
      time_left_seconds = public._seconds_left(s.deadline_at),
      result_id = v_result_id,
      draft_answers = v_ans
  where id = s.id;

  return public._result_payload(s.id, p_flagged);
end
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
  v_standardized jsonb;
  v_score integer;
  v_total integer;
begin
  select * into s from public.exam_sessions where id = p_session;
  if not found then
    return public._err('invalid_session', 'Session not found.');
  end if;

  select * into r from public.results where id = s.result_id;
  if r.id is null then
    return public._err('no_result', 'No result is available for this attempt.');
  end if;

  v_standardized := public._standardized_utme_scores(r.id);
  v_score := case when coalesce((v_standardized ->> 'is_utme')::boolean, false)
                  then (v_standardized ->> 'score')::integer else r.score end;
  v_total := case when coalesce((v_standardized ->> 'is_utme')::boolean, false)
                  then 400 else r.total end;

  if v_show then
    if coalesce((v_standardized ->> 'is_utme')::boolean, false) then
      v_scores := coalesce(v_standardized -> 'subject_scores', '{}'::jsonb);
    else
      select coalesce(jsonb_object_agg(subject, got), '{}'::jsonb) into v_scores
      from (
        select subject, round(sum(case when is_correct then marks else 0 end))::int as got
        from public.answers
        where result_id = r.id
        group by subject
      ) t;
    end if;

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
    'score', case when v_show then v_score else null end,
    'total', case when v_show then v_total else null end,
    'subject_scores', case when v_show then coalesce(v_scores, '{}'::jsonb) else '{}'::jsonb end,
    'show_results', v_show,
    'items', v_items
  );
end
$function$;

create or replace function public.lookup_result(p_phone text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_phone text := trim(coalesce(p_phone, ''));
  v_code text := upper(trim(coalesce(p_code, '')));
  rec record;
  v_standardized jsonb;
begin
  if not public._setting_bool('show_results', false) then
    return public._err('results_hidden', 'Results are not available yet.');
  end if;
  if v_phone = '' then
    return public._err('invalid_input', 'Please enter your phone number.');
  end if;
  if public._throttled(v_phone) then
    return public._err('too_many_attempts', 'Too many attempts. Please wait a few minutes and try again.');
  end if;

  select r.id as result_id, r.name, r.subject, r.score, r.total, r.created_at
  into rec
  from public.results r
  join public.exam_sessions s on s.id::text = r.session_id
  where s.phone = v_phone and coalesce(s.access_code, '') = v_code
  order by r.created_at desc
  limit 1;

  if not found then
    perform public._log_attempt(v_phone, false);
    return public._err('not_found', 'No result found for this phone number and access code.');
  end if;

  v_standardized := public._standardized_utme_scores(rec.result_id);
  perform public._log_attempt(v_phone, true);

  return jsonb_build_object(
    'ok', true,
    'name', rec.name,
    'subject', rec.subject,
    'score', case when coalesce((v_standardized ->> 'is_utme')::boolean, false)
                  then (v_standardized ->> 'score')::integer else rec.score end,
    'total', case when coalesce((v_standardized ->> 'is_utme')::boolean, false)
                  then 400 else rec.total end,
    'created_at', rec.created_at
  );
end
$function$;

create or replace function public.get_leaderboard(p_limit integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
begin
  if not public._setting_bool('leaderboard_enabled', false) then
    return jsonb_build_object('enabled', false, 'rows', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'enabled', true,
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ranked.id,
        'name', ranked.name,
        'subject', ranked.subject,
        'score', ranked.score,
        'total', ranked.total,
        'created_at', ranked.created_at
      ))
      from (
        select
          r.id,
          r.name,
          r.subject,
          case when coalesce((normalized.scores ->> 'is_utme')::boolean, false)
               then (normalized.scores ->> 'score')::integer else r.score end as score,
          case when coalesce((normalized.scores ->> 'is_utme')::boolean, false)
               then 400 else r.total end as total,
          r.created_at
        from public.results r
        left join lateral (
          select public._standardized_utme_scores(r.id) as scores
        ) normalized on true
        order by
          case when coalesce((normalized.scores ->> 'is_utme')::boolean, false)
               then (normalized.scores ->> 'score')::integer else r.score end desc,
          r.created_at asc
        limit least(greatest(coalesce(p_limit, 10), 1), 50)
      ) ranked
    ), '[]'::jsonb)
  );
end
$function$;

commit;
