begin;

create table if not exists public.learning_topic_mcq_grading_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid not null references public.learning_topic_content_items(id) on delete cascade,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_topic_mcq_grading_attempts_user_item_time
  on public.learning_topic_mcq_grading_attempts(user_id, content_item_id, submitted_at desc);

alter table public.learning_topic_mcq_grading_attempts enable row level security;
revoke all on public.learning_topic_mcq_grading_attempts from public, anon, authenticated;
grant all on public.learning_topic_mcq_grading_attempts to service_role;

create or replace function public.grade_topic_mcq_assessment(
  p_content_item_id uuid,
  p_candidate_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_item record;
  v_questions jsonb;
  v_q jsonb;
  v_q_id text;
  v_correct_opt text;
  v_chosen_opt text;
  v_score integer := 0;
  v_total integer := 0;
  v_feedback jsonb := '[]'::jsonb;
  v_recent_attempts integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'authentication_required');
  end if;

  -- Lock the content row so concurrent requests cannot bypass the daily limit.
  select i.id, i.data, i.topic_id
    into v_item
  from public.learning_topic_content_items i
  join public.learning_topics t on t.id = i.topic_id and t.is_published = true
  join public.learning_subjects s on s.id = t.subject_id and s.is_published = true
  where i.id = p_content_item_id
    and i.content_type = 'in_class_mcq'
    and i.is_published = true
  for update of i;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  select count(*)::integer into v_recent_attempts
  from public.learning_topic_mcq_grading_attempts a
  where a.user_id = v_user_id
    and a.content_item_id = p_content_item_id
    and a.submitted_at > now() - interval '24 hours';

  if v_recent_attempts >= 1 then
    return jsonb_build_object(
      'ok', false,
      'error', 'attempt_limit_reached',
      'message', 'You have already submitted this practice check in the last 24 hours.'
    );
  end if;

  insert into public.learning_topic_mcq_grading_attempts(user_id, content_item_id)
  values (v_user_id, p_content_item_id);

  v_questions := coalesce(v_item.data -> 'questions', '[]'::jsonb);
  if jsonb_typeof(v_questions) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'invalid_question_data');
  end if;
  v_total := jsonb_array_length(v_questions);

  for v_q in select value from jsonb_array_elements(v_questions) as q(value) loop
    v_q_id := v_q ->> 'id';
    v_correct_opt := upper(trim(v_q ->> 'correct_option_id'));
    v_chosen_opt := upper(trim(p_candidate_answers ->> v_q_id));

    if v_correct_opt is null or v_correct_opt = '' then
      raise exception 'Invalid answer key configuration for topic MCQ';
    end if;

    if v_chosen_opt = v_correct_opt then
      v_score := v_score + 1;
      v_feedback := v_feedback || jsonb_build_object(
        'question_id', v_q_id,
        'correct', true,
        'chosen', v_chosen_opt,
        'correct_answer', v_correct_opt,
        'explanation', v_q ->> 'explanation'
      );
    else
      v_feedback := v_feedback || jsonb_build_object(
        'question_id', v_q_id,
        'correct', false,
        'chosen', v_chosen_opt,
        'correct_answer', v_correct_opt,
        'explanation', v_q ->> 'explanation',
        'distractor_note', (v_q -> 'distractor_explanations') ->> v_chosen_opt
      );
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'score', v_score,
    'total', v_total,
    'percentage', case when v_total > 0 then round((v_score::numeric / v_total::numeric) * 100.0, 1) else 0 end,
    'feedback', v_feedback,
    'attempts_remaining', 0
  );
end;
$function$;

revoke all on function public.grade_topic_mcq_assessment(uuid, jsonb) from public, anon;
grant execute on function public.grade_topic_mcq_assessment(uuid, jsonb) to authenticated, service_role;

commit;
