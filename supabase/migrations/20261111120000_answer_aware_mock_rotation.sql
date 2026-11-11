-- Answer-aware question rotation for registered full-mock candidates.
-- Unseen questions are preferred; previously incorrect or unanswered questions
-- remain eligible as a reinforcement pool. Correctly answered questions are excluded.
begin;

alter table public.question_exposure_history
  add column if not exists is_correct boolean;

-- Backfill finalized historical full mocks using server-recorded answer rows.
-- Keep null for in-progress sessions so their state is not guessed.
update public.question_exposure_history h
set is_correct = coalesce(a.is_correct, false)
from public.results r
join public.answers a on a.result_id = r.id
where h.surface = 'full_mock'
  and r.session_id = h.attempt_id::text
  and a.question_id = h.question_id
  and exists (
    select 1 from public.exam_sessions s
    where s.id = h.attempt_id
      and s.status in ('submitted', 'expired')
  );

-- A finalized question with no corresponding answer row is unanswered. Release it
-- to the reinforcement pool by marking it false, not by deleting its history.
update public.question_exposure_history h
set is_correct = false
where h.surface = 'full_mock'
  and h.is_correct is null
  and exists (
    select 1 from public.exam_sessions s
    where s.id = h.attempt_id
      and s.status in ('submitted', 'expired')
  );

create or replace function public.reconcile_full_mock_question_exposure()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_session_id uuid;
begin
  select s.id
    into v_session_id
  from public.results r
  join public.exam_sessions s on s.id::text = r.session_id
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

drop trigger if exists reconcile_full_mock_question_exposure on public.answers;
create trigger reconcile_full_mock_question_exposure
after insert on public.answers
for each row
execute function public.reconcile_full_mock_question_exposure();

commit;
