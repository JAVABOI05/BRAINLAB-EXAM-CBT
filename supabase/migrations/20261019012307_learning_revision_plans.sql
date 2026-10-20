-- Store each learner's revision plan in their BrainLab account.
-- Row Level Security ensures learners can access only their own plan.
begin;

create table if not exists public.learning_revision_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal text not null default 'Prepare confidently for my next exam'
    check (length(goal) <= 160),
  plan_days smallint not null default 7 check (plan_days between 1 and 30),
  daily_minutes smallint not null default 30 check (daily_minutes between 10 and 180),
  tasks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(tasks) = 'array' and jsonb_array_length(tasks) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_revision_plans enable row level security;

revoke all on public.learning_revision_plans from anon;
grant select, insert, update, delete on public.learning_revision_plans to authenticated;

drop policy if exists "Learners read their own revision plan" on public.learning_revision_plans;
create policy "Learners read their own revision plan"
  on public.learning_revision_plans for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Learners create their own revision plan" on public.learning_revision_plans;
create policy "Learners create their own revision plan"
  on public.learning_revision_plans for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Learners update their own revision plan" on public.learning_revision_plans;
create policy "Learners update their own revision plan"
  on public.learning_revision_plans for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Learners delete their own revision plan" on public.learning_revision_plans;
create policy "Learners delete their own revision plan"
  on public.learning_revision_plans for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
