-- Personalized question rotation: durable per-user exposure history.
-- Apply only after review and after the CBT selector integration is ready.
begin;

create table if not exists public.learner_question_exposures (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  exposure_count integer not null default 1 check (exposure_count > 0),
  last_outcome text check (last_outcome in ('correct', 'incorrect', 'unanswered') or last_outcome is null),
  last_session_id uuid references public.exam_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists learner_question_exposures_user_recent_idx
  on public.learner_question_exposures (user_id, last_seen_at desc);

create index if not exists learner_question_exposures_question_idx
  on public.learner_question_exposures (question_id);

alter table public.learner_question_exposures enable row level security;

drop policy if exists "Learners can read their own question exposure" on public.learner_question_exposures;
create policy "Learners can read their own question exposure"
  on public.learner_question_exposures
  for select to authenticated
  using (auth.uid() = user_id);

-- Deliberately no client INSERT/UPDATE/DELETE policy. Trusted server-side code
-- must record exposure after verifying the authenticated user and session.
commit;
