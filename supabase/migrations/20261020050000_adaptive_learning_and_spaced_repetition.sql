-- ============================================================================
-- Migration: 20261020050000_adaptive_learning_and_spaced_repetition.sql
-- Description: Core schema for BrainLab Academy Adaptive Learning Engine:
--   1. learner_topic_mastery: Tracks topic-by-topic competency, hesitation, and confidence
--   2. learner_spaced_reviews: SM-2 spaced repetition queue for missed exam questions
--   3. RPCs for atomic mastery updates and adaptive question selection
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Table: learner_topic_mastery
-- ----------------------------------------------------------------------------
create table if not exists public.learner_topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  category text not null,
  total_attempted int not null default 0,
  total_correct int not null default 0,
  mastery_score numeric(4,3) not null default 0.500, -- 0.000 (struggling) to 1.000 (mastered)
  confidence_level text not null default 'learning' check (confidence_level in ('struggling', 'learning', 'proficient', 'mastered')),
  average_hesitation_sec numeric(5,1) not null default 0.0,
  last_practiced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_topic_mastery_user_subject_category_key unique (user_id, subject, category)
);

create index if not exists idx_topic_mastery_user on public.learner_topic_mastery(user_id);
create index if not exists idx_topic_mastery_subject on public.learner_topic_mastery(user_id, subject);

-- ----------------------------------------------------------------------------
-- 2. Table: learner_spaced_reviews (SM-2 Algorithm)
-- ----------------------------------------------------------------------------
create table if not exists public.learner_spaced_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  subject text not null,
  category text not null,
  repetition_count int not null default 0,
  interval_days int not null default 1,
  ease_factor numeric(4,2) not null default 2.50,
  due_date date not null default current_date,
  last_rating int default null, -- 1 = Hard, 2 = Good, 3 = Easy
  is_mastered boolean not null default false,
  last_reviewed_at timestamptz default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_spaced_reviews_user_question_key unique (user_id, question_id)
);

create index if not exists idx_spaced_reviews_due on public.learner_spaced_reviews(user_id, due_date) where is_mastered = false;
create index if not exists idx_spaced_reviews_user on public.learner_spaced_reviews(user_id);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security Policies
-- ----------------------------------------------------------------------------
alter table public.learner_topic_mastery enable row level security;
alter table public.learner_spaced_reviews enable row level security;

-- learner_topic_mastery policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'learner_topic_mastery' and policyname = 'learner_topic_mastery_select_own') then
        DROP POLICY IF EXISTS "learner_topic_mastery_select_own" ON public.learner_topic_mastery;
create policy learner_topic_mastery_select_own on public.learner_topic_mastery
      for select to authenticated
      using (user_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where tablename = 'learner_topic_mastery' and policyname = 'learner_topic_mastery_modify_own') then
        DROP POLICY IF EXISTS "learner_topic_mastery_modify_own" ON public.learner_topic_mastery;
create policy learner_topic_mastery_modify_own on public.learner_topic_mastery
      for all to authenticated
      using (user_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()))
      with check (user_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()));
  end if;
end $$;

-- learner_spaced_reviews policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'learner_spaced_reviews' and policyname = 'learner_spaced_reviews_select_own') then
        DROP POLICY IF EXISTS "learner_spaced_reviews_select_own" ON public.learner_spaced_reviews;
create policy learner_spaced_reviews_select_own on public.learner_spaced_reviews
      for select to authenticated
      using (user_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where tablename = 'learner_spaced_reviews' and policyname = 'learner_spaced_reviews_modify_own') then
        DROP POLICY IF EXISTS "learner_spaced_reviews_modify_own" ON public.learner_spaced_reviews;
create policy learner_spaced_reviews_modify_own on public.learner_spaced_reviews
      for all to authenticated
      using (user_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()))
      with check (user_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. RPC: record_topic_mastery_attempt
-- ----------------------------------------------------------------------------
create or replace function public.record_topic_mastery_attempt(
  p_subject text,
  p_category text,
  p_is_correct boolean,
  p_hesitation_sec numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_current_attempted int;
  v_current_correct int;
  v_new_mastery numeric(4,3);
  v_new_confidence text;
  v_row public.learner_topic_mastery%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Unauthenticated');
  end if;

  select * into v_row from public.learner_topic_mastery
  where user_id = v_user_id and subject = p_subject and category = p_category;

  if not found then
    v_current_attempted := 1;
    v_current_correct := case when p_is_correct then 1 else 0 end;
    v_new_mastery := case when p_is_correct then 0.650 else 0.350 end;
  else
    v_current_attempted := v_row.total_attempted + 1;
    v_current_correct := v_row.total_correct + (case when p_is_correct then 1 else 0 end);
    
    -- Dynamic BKT/Elo heuristic: correct answers boost mastery, errors decrease
    if p_is_correct then
      v_new_mastery := least(1.000, v_row.mastery_score + 0.080);
    else
      v_new_mastery := greatest(0.050, v_row.mastery_score - 0.120);
    end if;
  end if;

  if v_new_mastery >= 0.850 then
    v_new_confidence := 'mastered';
  elsif v_new_mastery >= 0.700 then
    v_new_confidence := 'proficient';
  elsif v_new_mastery >= 0.400 then
    v_new_confidence := 'learning';
  else
    v_new_confidence := 'struggling';
  end if;

  insert into public.learner_topic_mastery (
    user_id, subject, category, total_attempted, total_correct,
    mastery_score, confidence_level, average_hesitation_sec, last_practiced_at, updated_at
  ) values (
    v_user_id, p_subject, p_category, v_current_attempted, v_current_correct,
    v_new_mastery, v_new_confidence, p_hesitation_sec, now(), now()
  )
  on conflict (user_id, subject, category) do update set
    total_attempted = excluded.total_attempted,
    total_correct = excluded.total_correct,
    mastery_score = excluded.mastery_score,
    confidence_level = excluded.confidence_level,
    average_hesitation_sec = (learner_topic_mastery.average_hesitation_sec * 0.7) + (p_hesitation_sec * 0.3),
    last_practiced_at = now(),
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'subject', p_subject,
    'category', p_category,
    'mastery_score', v_new_mastery,
    'confidence_level', v_new_confidence
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: complete_spaced_review_card
-- ----------------------------------------------------------------------------
create or replace function public.complete_spaced_review_card(
  p_review_id uuid,
  p_rating int -- 1 = Hard, 2 = Good, 3 = Easy
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_row public.learner_spaced_reviews%rowtype;
  v_new_reps int;
  v_new_interval int;
  v_new_ease numeric(4,2);
  v_is_mastered boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Unauthenticated');
  end if;

  select * into v_row from public.learner_spaced_reviews
  where id = p_review_id and user_id = v_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Card not found');
  end if;

  if p_rating = 1 then
    -- Hard: Reset streak, review tomorrow
    v_new_reps := 0;
    v_new_interval := 1;
    v_new_ease := greatest(1.30, v_row.ease_factor - 0.20);
    v_is_mastered := false;
  elsif p_rating = 2 then
    -- Good: Progress standard interval
    v_new_reps := v_row.repetition_count + 1;
    if v_new_reps = 1 then
      v_new_interval := 1;
    elsif v_new_reps = 2 then
      v_new_interval := 3;
    else
      v_new_interval := round(v_row.interval_days * v_row.ease_factor)::int;
    end if;
    v_new_ease := v_row.ease_factor;
    v_is_mastered := v_new_interval >= 21;
  else
    -- Easy: Significant jump in interval and ease factor
    v_new_reps := v_row.repetition_count + 1;
    if v_new_reps = 1 then
      v_new_interval := 3;
    elsif v_new_reps = 2 then
      v_new_interval := 7;
    else
      v_new_interval := round(v_row.interval_days * v_row.ease_factor * 1.3)::int;
    end if;
    v_new_ease := least(3.00, v_row.ease_factor + 0.15);
    v_is_mastered := v_new_interval >= 21;
  end if;

  update public.learner_spaced_reviews set
    repetition_count = v_new_reps,
    interval_days = v_new_interval,
    ease_factor = v_new_ease,
    due_date = current_date + v_new_interval,
    last_rating = p_rating,
    is_mastered = v_is_mastered,
    last_reviewed_at = now(),
    updated_at = now()
  where id = p_review_id;

  return jsonb_build_object(
    'ok', true,
    'next_due_days', v_new_interval,
    'is_mastered', v_is_mastered
  );
end;
$$;

commit;
