-- Fix answer reconciliation ordering for full-mock question exposure.
-- submit_exam inserts results and answers before it writes exam_sessions.result_id.
-- Resolve the session through results.session_id instead.

create or replace function public.reconcile_full_mock_question_exposure()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_session_id uuid;
begin
  select s.id
    into v_session_id
  from public.results r
  join public.exam_sessions s
    on s.id::text = r.session_id
  where r.id = new.result_id;

  if v_session_id is not null then
    update public.question_exposure_history
    set is_correct = coalesce(new.is_correct, false),
        last_seen_at = now()
    where attempt_id = v_session_id
      and question_id = new.question_id
      and surface = 'full_mock';
  end if;

  return new;
end;
$function$;

revoke all on function public.reconcile_full_mock_question_exposure() from public, anon, authenticated;
