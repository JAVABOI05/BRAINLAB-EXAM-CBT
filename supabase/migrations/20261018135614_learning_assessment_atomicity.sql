-- Make topic-test answer saves and finalization serialize on the attempt row.
-- Both operations lock the same row, so a late answer cannot race with scoring.
-- Validate this migration on an isolated staging database before rollout.

begin;

create or replace function public.save_learning_attempt_answer(
  p_attempt_id uuid,
  p_student_id uuid,
  p_question_id uuid,
  p_selected_answer text
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_status public.learning_attempt_status;
  v_deadline timestamptz;
  v_options jsonb;
  v_question_version integer;
begin
  if p_selected_answer is null or length(p_selected_answer) = 0 or length(p_selected_answer) > 100 then
    raise exception 'Invalid selected answer' using errcode = '22023';
  end if;

  select a.status, a.deadline_at
    into v_status, v_deadline
    from public.learning_test_attempts a
   where a.id = p_attempt_id
     and a.student_id = p_student_id
   for update;

  if not found then
    raise exception 'Attempt not found' using errcode = 'P0002';
  end if;

  if v_status <> 'in_progress' then
    raise exception 'Attempt is no longer accepting answers' using errcode = '55000';
  end if;

  if v_deadline is not null and v_deadline <= clock_timestamp() then
    raise exception 'Attempt deadline has passed' using errcode = '55000';
  end if;

  select q.options_snapshot, q.question_version
    into v_options, v_question_version
    from public.learning_test_attempt_questions q
   where q.attempt_id = p_attempt_id
     and q.question_id = p_question_id;

  if not found then
    raise exception 'Question does not belong to this attempt' using errcode = '22023';
  end if;

  if not exists (
    select 1
      from jsonb_array_elements(v_options) as option_item(value)
     where option_item.value ->> 'id' = p_selected_answer
  ) then
    raise exception 'Selected answer is not an available option' using errcode = '22023';
  end if;

  insert into public.learning_test_answers (
    attempt_id, question_id, question_version, selected_answer, is_correct
  ) values (
    p_attempt_id, p_question_id, v_question_version, p_selected_answer, null
  )
  on conflict (attempt_id, question_id) do update
    set question_version = excluded.question_version,
        selected_answer = excluded.selected_answer,
        is_correct = null,
        updated_at = clock_timestamp();

  return jsonb_build_object('saved', true, 'question_id', p_question_id);
end;
$function$;

create or replace function public.finalize_learning_attempt(p_attempt_id uuid, p_student_id uuid)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_attempt public.learning_test_attempts%rowtype;
  v_total integer;
  v_score integer;
  v_percentage numeric(5,2);
  v_passed boolean;
  v_status public.learning_attempt_status;
  v_finalized_at timestamptz;
begin
  select a.*
    into v_attempt
    from public.learning_test_attempts a
   where a.id = p_attempt_id
     and a.student_id = p_student_id
   for update;

  if not found then
    raise exception 'Attempt not found' using errcode = 'P0002';
  end if;

  -- A retry after a successful submission returns the saved result without
  -- re-grading. This also handles two simultaneous submit requests safely.
  if v_attempt.status in ('submitted', 'expired') then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'status', v_attempt.status,
      'score', v_attempt.score,
      'total_questions', v_attempt.total_questions,
      'percentage', v_attempt.percentage,
      'passed', v_attempt.passed,
      'pass_percentage', v_attempt.pass_percentage_snapshot,
      'started_at', v_attempt.started_at,
      'submitted_at', v_attempt.submitted_at
    );
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'Attempt cannot be finalized in its current state' using errcode = '55000';
  end if;

  select count(*)::integer
    into v_total
    from public.learning_test_attempt_questions q
   where q.attempt_id = p_attempt_id;

  if v_total < 1 then
    raise exception 'Attempt has no question snapshots' using errcode = '55000';
  end if;

  update public.learning_test_answers a
     set is_correct = (a.selected_answer = q.correct_answer_snapshot),
         updated_at = clock_timestamp()
    from public.learning_test_attempt_questions q
   where q.attempt_id = p_attempt_id
     and a.attempt_id = q.attempt_id
     and a.question_id = q.question_id;

  select count(*) filter (where a.is_correct is true)::integer
    into v_score
    from public.learning_test_answers a
   where a.attempt_id = p_attempt_id;

  v_percentage := round((v_score::numeric / v_total::numeric) * 100, 2);
  v_passed := v_percentage >= v_attempt.pass_percentage_snapshot;
  v_finalized_at := clock_timestamp();
  v_status := case
    when v_attempt.deadline_at is not null and v_attempt.deadline_at <= v_finalized_at
      then 'expired'::public.learning_attempt_status
    else 'submitted'::public.learning_attempt_status
  end;

  update public.learning_test_attempts
     set status = v_status,
         score = v_score,
         total_questions = v_total,
         percentage = v_percentage,
         passed = v_passed,
         submitted_at = v_finalized_at
   where id = p_attempt_id
     and student_id = p_student_id;

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', v_status,
    'score', v_score,
    'total_questions', v_total,
    'percentage', v_percentage,
    'passed', v_passed,
    'pass_percentage', v_attempt.pass_percentage_snapshot,
    'started_at', v_attempt.started_at,
    'submitted_at', v_finalized_at
  );
end;
$function$;

revoke all on function public.save_learning_attempt_answer(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.finalize_learning_attempt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.save_learning_attempt_answer(uuid, uuid, uuid, text) to service_role;
grant execute on function public.finalize_learning_attempt(uuid, uuid) to service_role;

commit;
