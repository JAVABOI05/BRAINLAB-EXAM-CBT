-- BrainLab Academy Learning Hub foundation.
-- This migration is intentionally staged on feature/learning-hub-foundation.
-- Do not apply to production until the existing auth model, schema drift, and CBT
-- regression suite have been reconciled and reviewed.

begin;

create type public.lesson_block_type as enum (
  'text',
  'image',
  'voice_note',
  'short_video',
  'long_video',
  'inline_mcq'
);

create type public.topic_question_type as enum ('mcq', 'true_false');

create type public.learning_membership_role as enum ('tutor', 'reviewer');

create type public.learning_attempt_status as enum (
  'in_progress',
  'submitted',
  'expired',
  'abandoned'
);

create type public.lesson_progress_status as enum ('not_started', 'in_progress', 'completed');

create table public.learning_subjects (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null check (length(trim(name)) > 0),
  slug varchar(255) not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  icon_url text,
  order_index integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.learning_subjects(id) on delete cascade,
  title varchar(255) not null check (length(trim(title)) > 0),
  slug varchar(255) not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  learning_objectives jsonb not null default '[]'::jsonb
    check (jsonb_typeof(learning_objectives) = 'array'),
  order_index integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, slug),
  unique (id, subject_id)
);

create table public.learning_lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.learning_topics(id) on delete cascade,
  title varchar(255) not null check (length(trim(title)) > 0),
  summary text,
  order_index integer not null default 0,
  estimated_duration_mins integer not null default 5
    check (estimated_duration_mins between 1 and 600),
  is_published boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.learning_lessons(id) on delete cascade,
  block_type public.lesson_block_type not null,
  content jsonb not null check (
    jsonb_typeof(content) = 'object'
    and (
      (block_type = 'text' and jsonb_typeof(coalesce(content -> 'markdown', content -> 'html')) = 'string')
      or (block_type = 'image' and jsonb_typeof(content -> 'url') = 'string')
      or (block_type = 'voice_note' and jsonb_typeof(content -> 'url') = 'string')
      or (block_type = 'short_video' and jsonb_typeof(content -> 'url') = 'string')
      or (block_type = 'long_video' and jsonb_typeof(content -> 'url') = 'string' and jsonb_typeof(content -> 'provider') = 'string')
      or (block_type = 'inline_mcq' and jsonb_typeof(content -> 'question') = 'string'
        and jsonb_typeof(content -> 'options') = 'array'
        and jsonb_typeof(content -> 'correct_option_id') = 'string')
    )
  ),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, order_index)
);

-- Subject-scoped authoring avoids giving every tutor global write access.
create table public.learning_subject_memberships (
  subject_id uuid not null references public.learning_subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role public.learning_membership_role not null,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (subject_id, user_id)
);

create table public.learning_topic_tests (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null unique references public.learning_topics(id) on delete cascade,
  title varchar(255) not null check (length(trim(title)) > 0),
  instructions text,
  question_limit integer not null default 10 check (question_limit between 1 and 200),
  time_limit_mins integer check (time_limit_mins is null or time_limit_mins between 1 and 600),
  pass_percentage integer not null default 70 check (pass_percentage between 0 and 100),
  shuffle_questions boolean not null default true,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Answer keys remain inaccessible to student sessions. Student-facing test delivery
-- must use a server endpoint that returns only prompt/options and validates the attempt.
create table public.learning_test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.learning_topic_tests(id) on delete cascade,
  question_type public.topic_question_type not null default 'mcq',
  prompt text not null check (length(trim(prompt)) > 0),
  image_url text,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_answer text not null check (length(trim(correct_answer)) > 0),
  explanation text,
  order_index integer not null default 0,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_id, order_index),
  check (
    question_type <> 'true_false'
    or correct_answer in ('true', 'false')
  )
);

-- Attempts are finalized by a trusted server-side grading path, not by client writes.
create table public.learning_test_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.learning_topic_tests(id) on delete restrict,
  status public.learning_attempt_status not null default 'in_progress',
  question_order jsonb not null default '[]'::jsonb
    check (jsonb_typeof(question_order) = 'array'),
  score integer,
  total_questions integer,
  pass_percentage_snapshot integer not null check (pass_percentage_snapshot between 0 and 100),
  percentage numeric(5,2),
  passed boolean,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (score is null or score >= 0),
  check (total_questions is null or total_questions >= 0),
  check (percentage is null or percentage between 0 and 100),
  check (
    status not in ('submitted', 'expired')
    or (submitted_at is not null and score is not null
      and total_questions is not null and percentage is not null and passed is not null)
  )
);

-- Immutable per-attempt question snapshots preserve grading consistency if a tutor
-- edits or removes the source question after the attempt begins. This table has RLS
-- enabled and intentionally has no student SELECT policy or direct table grants.
create table public.learning_test_attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.learning_test_attempts(id) on delete cascade,
  question_id uuid not null,
  question_version integer not null check (question_version > 0),
  question_type public.topic_question_type not null,
  prompt_snapshot text not null,
  image_url_snapshot text,
  options_snapshot jsonb not null check (jsonb_typeof(options_snapshot) = 'array'),
  correct_answer_snapshot text not null,
  explanation_snapshot text,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index learning_attempt_questions_attempt_idx
  on public.learning_test_attempt_questions(attempt_id);

create table public.learning_test_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.learning_test_attempts(id) on delete cascade,
  question_id uuid not null,
  question_version integer not null check (question_version > 0),
  selected_answer text not null,
  is_correct boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table public.learning_lesson_progress (
  student_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.learning_lessons(id) on delete cascade,
  status public.lesson_progress_status not null default 'not_started',
  last_block_id uuid references public.learning_lesson_blocks(id) on delete set null,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create index learning_topics_subject_order_idx
  on public.learning_topics(subject_id, order_index);
create index learning_lessons_topic_order_idx
  on public.learning_lessons(topic_id, order_index);
create index learning_blocks_lesson_order_idx
  on public.learning_lesson_blocks(lesson_id, order_index);
create index learning_memberships_user_idx
  on public.learning_subject_memberships(user_id, membership_role);
create index learning_test_questions_test_order_idx
  on public.learning_test_questions(test_id, order_index);
create index learning_test_attempts_student_recent_idx
  on public.learning_test_attempts(student_id, started_at desc);
create index learning_test_attempts_test_status_idx
  on public.learning_test_attempts(test_id, status);

create unique index learning_one_active_attempt_per_student_test
  on public.learning_test_attempts(student_id, test_id)
  where status = 'in_progress';
create index learning_test_answers_attempt_idx
  on public.learning_test_answers(attempt_id);
create index learning_lesson_progress_student_status_idx
  on public.learning_lesson_progress(student_id, status);

-- updated_at maintenance is database-owned.
create or replace function public.set_learning_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create trigger learning_subjects_updated_at
before update on public.learning_subjects
for each row execute function public.set_learning_updated_at();

create trigger learning_topics_updated_at
before update on public.learning_topics
for each row execute function public.set_learning_updated_at();

create trigger learning_lessons_updated_at
before update on public.learning_lessons
for each row execute function public.set_learning_updated_at();

create trigger learning_lesson_blocks_updated_at
before update on public.learning_lesson_blocks
for each row execute function public.set_learning_updated_at();

create trigger learning_topic_tests_updated_at
before update on public.learning_topic_tests
for each row execute function public.set_learning_updated_at();

create trigger learning_test_questions_updated_at
before update on public.learning_test_questions
for each row execute function public.set_learning_updated_at();

create trigger learning_test_attempts_updated_at
before update on public.learning_test_attempts
for each row execute function public.set_learning_updated_at();

create trigger learning_test_answers_updated_at
before update on public.learning_test_answers
for each row execute function public.set_learning_updated_at();

create trigger learning_lesson_progress_updated_at
before update on public.learning_lesson_progress
for each row execute function public.set_learning_updated_at();

-- Only platform-level administrators bypass subject assignment. Teachers and specialist
-- administrators must receive an explicit subject membership; the broad permission
-- helper also grants content capabilities to scoped roles and is not suitable here.
create or replace function public.learning_can_manage_all()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $function$
  select coalesce(public.get_admin_role() in ('super_admin', 'platform_admin'), false);
$function$;

-- RLS is enabled on every exposed table.
alter table public.learning_subjects enable row level security;
alter table public.learning_topics enable row level security;
alter table public.learning_lessons enable row level security;
alter table public.learning_lesson_blocks enable row level security;
alter table public.learning_subject_memberships enable row level security;
alter table public.learning_topic_tests enable row level security;
alter table public.learning_test_questions enable row level security;
alter table public.learning_test_attempts enable row level security;
alter table public.learning_test_answers enable row level security;
alter table public.learning_test_attempt_questions enable row level security;
alter table public.learning_lesson_progress enable row level security;

-- Publicly visible learning content is published-only. Tutors/reviewers are scoped
-- to subjects explicitly assigned to them. Admin permission checks are server-owned.
create policy learning_subjects_read_published
on public.learning_subjects for select to anon, authenticated
using (
  is_published
  or exists (
    select 1 from public.learning_subject_memberships m
    where m.subject_id = id and m.user_id = (select auth.uid())
  )
  or (select public.learning_can_manage_all())
);

create policy learning_subjects_insert_admin
on public.learning_subjects for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select public.learning_can_manage_all())
);

create policy learning_subjects_update_scoped
on public.learning_subjects for update to authenticated
using (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_subject_memberships m
    where m.subject_id = id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
)
with check (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_subject_memberships m
    where m.subject_id = id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
);

create policy learning_subjects_delete_admin
on public.learning_subjects for delete to authenticated
using ((select public.learning_can_manage_all()));

create policy learning_memberships_read_scoped
on public.learning_subject_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.learning_can_manage_all())
);

create policy learning_memberships_manage_admin
on public.learning_subject_memberships for all to authenticated
using ((select public.learning_can_manage_all()))
with check ((select public.learning_can_manage_all()));

create policy learning_topics_read_published_or_assigned
on public.learning_topics for select to anon, authenticated
using (
  (
    is_published
    and exists (
      select 1 from public.learning_subjects s
      where s.id = subject_id and s.is_published
    )
  )
  or exists (
    select 1 from public.learning_subject_memberships m
    where m.subject_id = subject_id and m.user_id = (select auth.uid())
  )
  or (select public.learning_can_manage_all())
);

create policy learning_topics_manage_scoped
on public.learning_topics for all to authenticated
using (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_subject_memberships m
    where m.subject_id = subject_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
)
with check (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_subject_memberships m
    where m.subject_id = subject_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
);

create policy learning_lessons_read_published_or_assigned
on public.learning_lessons for select to anon, authenticated
using (
  (
    is_published
    and exists (
      select 1 from public.learning_topics t
      join public.learning_subjects s on s.id = t.subject_id
      where t.id = topic_id and t.is_published and s.is_published
    )
  )
  or exists (
    select 1 from public.learning_topics t
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where t.id = topic_id and m.user_id = (select auth.uid())
  )
  or (select public.learning_can_manage_all())
);

create policy learning_lessons_manage_scoped
on public.learning_lessons for all to authenticated
using (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_topics t
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where t.id = topic_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
)
with check (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_topics t
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where t.id = topic_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
);

create policy learning_blocks_read_published_or_assigned
on public.learning_lesson_blocks for select to anon, authenticated
using (
  exists (
    select 1 from public.learning_lessons l
    join public.learning_topics t on t.id = l.topic_id
    join public.learning_subjects s on s.id = t.subject_id
    where l.id = lesson_id and l.is_published and t.is_published and s.is_published
  )
  or exists (
    select 1 from public.learning_lessons l
    join public.learning_topics t on t.id = l.topic_id
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where l.id = lesson_id and m.user_id = (select auth.uid())
  )
  or (select public.learning_can_manage_all())
);

create policy learning_blocks_manage_scoped
on public.learning_lesson_blocks for all to authenticated
using (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_lessons l
    join public.learning_topics t on t.id = l.topic_id
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where l.id = lesson_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
)
with check (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_lessons l
    join public.learning_topics t on t.id = l.topic_id
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where l.id = lesson_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
);

create policy learning_topic_tests_read_published_or_assigned
on public.learning_topic_tests for select to anon, authenticated
using (
  (
    is_published and exists (
      select 1 from public.learning_topics t
      join public.learning_subjects s on s.id = t.subject_id
      where t.id = topic_id and t.is_published and s.is_published
    )
  )
  or exists (
    select 1 from public.learning_topics t
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where t.id = topic_id and m.user_id = (select auth.uid())
  )
  or (select public.learning_can_manage_all())
);

create policy learning_topic_tests_manage_scoped
on public.learning_topic_tests for all to authenticated
using (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_topics t
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where t.id = topic_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
)
with check (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_topics t
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where t.id = topic_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
);

-- Question-bank rows (including correct_answer/explanation) are never directly
-- selectable by students. A secure server endpoint must deliver a redacted payload.
create policy learning_test_questions_read_authorized
on public.learning_test_questions for select to authenticated
using (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_topic_tests tt
    join public.learning_topics t on t.id = tt.topic_id
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where tt.id = test_id and m.user_id = (select auth.uid())
  )
);

create policy learning_test_questions_manage_scoped
on public.learning_test_questions for all to authenticated
using (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_topic_tests tt
    join public.learning_topics t on t.id = tt.topic_id
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where tt.id = test_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
)
with check (
  (select public.learning_can_manage_all())
  or exists (
    select 1 from public.learning_topic_tests tt
    join public.learning_topics t on t.id = tt.topic_id
    join public.learning_subject_memberships m on m.subject_id = t.subject_id
    where tt.id = test_id and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
);

create policy learning_attempts_read_own
on public.learning_test_attempts for select to authenticated
using (student_id = (select auth.uid()));

create policy learning_answers_read_own_after_submit
on public.learning_test_answers for select to authenticated
using (
  exists (
    select 1 from public.learning_test_attempts a
    where a.id = attempt_id and a.student_id = (select auth.uid())
      and a.status in ('submitted', 'expired')
  )
);

-- No direct student INSERT/UPDATE/DELETE policies are intentionally provided for
-- attempts or answers. The secure server-side attempt service will own those writes.
create policy learning_progress_read_own
on public.learning_lesson_progress for select to authenticated
using (student_id = (select auth.uid()));

create policy learning_progress_insert_own
on public.learning_lesson_progress for insert to authenticated
with check (student_id = (select auth.uid()));

create policy learning_progress_update_own
on public.learning_lesson_progress for update to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));


-- Explicit Data API privileges; RLS remains the row-level authorization boundary.
grant select on public.learning_subjects,
  public.learning_topics,
  public.learning_lessons,
  public.learning_lesson_blocks,
  public.learning_topic_tests
to anon, authenticated;

grant insert, update, delete on public.learning_subjects,
  public.learning_topics,
  public.learning_lessons,
  public.learning_lesson_blocks,
  public.learning_subject_memberships,
  public.learning_topic_tests,
  public.learning_test_questions
to authenticated;

grant select on public.learning_subject_memberships to anon, authenticated;

grant select on public.learning_test_questions,
  public.learning_test_attempts,
  public.learning_test_answers
to authenticated;

grant select, insert, update on public.learning_lesson_progress
to authenticated;

commit;
