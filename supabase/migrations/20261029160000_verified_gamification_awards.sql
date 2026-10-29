-- Award assessment XP only from a submitted, user-owned attempt with a server-stored score.
-- The generic activity RPC is made server-only because its reference and score arguments
-- are not sufficient evidence that an activity occurred.

begin;

create table if not exists public.verified_gamification_award_events (
  attempt_id uuid primary key references public.learning_practice_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('quiz_complete', 'competition')),
  created_at timestamptz not null default now()
);

alter table public.verified_gamification_award_events enable row level security;
revoke all on public.verified_gamification_award_events from public, anon, authenticated;
grant all on public.verified_gamification_award_events to service_role;

create or replace function public.record_verified_assessment_activity(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt record;
  v_activity_type text;
  v_percentage numeric;
  v_recorded boolean;
  v_result jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'authentication_required');
  end if;

  select a.id, a.user_id, a.attempt_type, a.status, a.score, a.total, a.submitted_at
    into v_attempt
  from public.learning_practice_attempts a
  where a.id = p_attempt_id
    and a.user_id = auth.uid()
    and a.attempt_type in ('organisation_quiz', 'competition')
  for update;

  if not found
     or v_attempt.status <> 'submitted'
     or v_attempt.submitted_at is null
     or v_attempt.total is null
     or v_attempt.total <= 0
     or v_attempt.score is null
     or v_attempt.score < 0
     or v_attempt.score > v_attempt.total then
    return jsonb_build_object('ok', false, 'error', 'verified_submission_required');
  end if;

  v_activity_type := case
    when v_attempt.attempt_type = 'competition' then 'competition'
    else 'quiz_complete'
  end;
  v_percentage := round((v_attempt.score / v_attempt.total) * 100, 2);

  insert into public.verified_gamification_award_events(attempt_id, user_id, activity_type)
  values (v_attempt.id, v_attempt.user_id, v_activity_type)
  on conflict (attempt_id) do nothing;
  get diagnostics v_recorded = row_count;

  if not v_recorded then
    return jsonb_build_object('ok', true, 'already_awarded', true, 'xp_awarded', 0);
  end if;

  v_result := public.record_learning_activity(
    v_attempt.user_id,
    v_activity_type,
    v_attempt.id::text,
    v_percentage
  );

  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'Verified gamification award failed';
  end if;

  return v_result || jsonb_build_object('already_awarded', false);
end;
$function$;

-- Clients may no longer claim arbitrary activities or scores directly.
revoke all on function public.record_learning_activity(uuid, text, text, numeric)
  from public, anon, authenticated;
grant execute on function public.record_learning_activity(uuid, text, text, numeric)
  to service_role;

revoke all on function public.record_verified_assessment_activity(uuid)
  from public, anon;
grant execute on function public.record_verified_assessment_activity(uuid)
  to authenticated, service_role;

commit;
