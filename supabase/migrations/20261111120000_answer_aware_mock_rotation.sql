-- Answer-aware question rotation for registered full-mock candidates.
-- Correct answers remain excluded from future standard mocks. Wrong and unanswered
-- questions are released back into the eligible pool after a mock is finalized.
begin;

-- Reconcile historical finalized full mocks. Preserve in-progress attempts so an
-- active paper does not change its eligibility state before submission.
delete from public.question_exposure_history h
using public.exam_sessions s
where h.surface = 'full_mock'
  and h.attempt_id = s.id
  and s.status in ('submitted', 'expired')
  and not exists (
    select 1
    from public.results r
    join public.answers a on a.result_id = r.id
    where r.session_id = s.id::text
      and a.question_id = h.question_id
      and a.is_correct is true
  );

create or replace function public.release_incorrect_full_mock_exposure()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_session_id uuid;
begin
  -- Correctly answered questions remain in history; unanswered and incorrect
  -- questions are removed so they remain eligible for the next standard mock.
  if coalesce(new.is_correct, false) then
    return new;
  end if;

  select s.id
    into v_session_id
  from public.results r
  join public.exam_sessions s on s.id::text = r.session_id
  where r.id = new.result_id;

  if v_session_id is not null then
    delete from public.question_exposure_history
    where attempt_id = v_session_id
      and question_id = new.question_id
      and surface = 'full_mock';
  end if;

  return new;
end;
$function$;

revoke all on function public.release_incorrect_full_mock_exposure() from public, anon, authenticated;

drop trigger if exists release_incorrect_full_mock_exposure on public.answers;
create trigger release_incorrect_full_mock_exposure
after insert on public.answers
for each row
execute function public.release_incorrect_full_mock_exposure();

commit;
