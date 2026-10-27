-- ============================================================================
-- Migration: 20261021020000_gamification_and_rewards.sql
-- Description: Gamification, Badges, XP Ledger, Levels, Streaks, Leaderboards,
--              and Rewards System
-- ============================================================================

begin;

-- ============================================================================
-- 1. Badge Definitions Table
-- ============================================================================
create table if not exists public.badge_definitions (
  id text primary key,
  name text not null,
  description text not null,
  category text not null check (category in ('academic', 'consistency', 'community', 'membership')),
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  icon text not null,
  visual_style jsonb not null default '{}'::jsonb,
  award_type text not null default 'permanent' check (award_type in ('permanent', 'temporary_ranking', 'entitlement')),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_badge_definitions_active on public.badge_definitions(is_active, display_order);
alter table public.badge_definitions enable row level security;

-- Public can view active badge definitions
DROP POLICY IF EXISTS "badge_definitions_public_select" ON public.badge_definitions;
create policy badge_definitions_public_select on public.badge_definitions
  for select using (is_active);

-- Admin can manage badge definitions
DROP POLICY IF EXISTS "badge_definitions_admin_all" ON public.badge_definitions;
create policy badge_definitions_admin_all on public.badge_definitions
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'ai_learning_admin', 'content_reviewer')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'ai_learning_admin', 'content_reviewer')
    )
  );

-- ============================================================================
-- 2. User Badge Awards Table
-- ============================================================================
create table if not exists public.user_badge_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badge_definitions(id) on delete cascade,
  is_featured boolean not null default false,
  is_hidden boolean not null default false,
  awarded_at timestamptz not null default now(),
  expires_at timestamptz,
  provenance jsonb default '{}'::jsonb,
  constraint uq_user_badge unique (user_id, badge_id)
);

create index if not exists idx_user_badge_user on public.user_badge_awards(user_id, is_hidden);
create index if not exists idx_user_badge_featured on public.user_badge_awards(user_id, is_featured);
alter table public.user_badge_awards enable row level security;

-- Public can view non-hidden awards
DROP POLICY IF EXISTS "user_badge_awards_public_select" ON public.user_badge_awards;
create policy user_badge_awards_public_select on public.user_badge_awards
  for select using (not is_hidden);

-- Users can update feature/hidden toggles on their own badges
DROP POLICY IF EXISTS "user_badge_awards_user_update" ON public.user_badge_awards;
create policy user_badge_awards_user_update on public.user_badge_awards
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin full access
DROP POLICY IF EXISTS "user_badge_awards_admin_all" ON public.user_badge_awards;
create policy user_badge_awards_admin_all on public.user_badge_awards
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'ai_learning_admin')
    )
  );

-- ============================================================================
-- 3. Gamification Levels Table
-- ============================================================================
create table if not exists public.gamification_levels (
  level integer primary key,
  name text not null,
  min_xp integer not null unique,
  badge_reward_id text references public.badge_definitions(id) on delete set null
);

alter table public.gamification_levels enable row level security;
DROP POLICY IF EXISTS "gamification_levels_public_select" ON public.gamification_levels;
create policy gamification_levels_public_select on public.gamification_levels for select using (true);

-- Seed Initial Level Progression (Configurable)
insert into public.gamification_levels (level, name, min_xp)
values
  (1, 'Beginner', 0),
  (2, 'Learner', 100),
  (3, 'Achiever', 300),
  (4, 'Scholar', 700),
  (5, 'Elite Scholar', 1500),
  (6, 'BrainLab Legend', 3000)
on conflict (level) do update set name = excluded.name, min_xp = excluded.min_xp;

-- ============================================================================
-- 4. User Gamification Profiles (Cached Totals & Streaks)
-- ============================================================================
create table if not exists public.user_gamification_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lifetime_xp integer not null default 0 check (lifetime_xp >= 0),
  current_level integer not null default 1 references public.gamification_levels(level),
  level_name text not null default 'Beginner',
  current_streak_days integer not null default 0 check (current_streak_days >= 0),
  longest_streak_days integer not null default 0 check (longest_streak_days >= 0),
  last_activity_date date,
  quizzes_completed_count integer not null default 0,
  perfect_scores_count integer not null default 0,
  competitions_won_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_profile_xp on public.user_gamification_profiles(lifetime_xp desc);
alter table public.user_gamification_profiles enable row level security;

DROP POLICY IF EXISTS "user_gamification_profiles_public_select" ON public.user_gamification_profiles;
create policy user_gamification_profiles_public_select on public.user_gamification_profiles
  for select using (true);

-- ============================================================================
-- 5. User XP Transaction Ledger (Auditability & Idempotency)
-- ============================================================================
create table if not exists public.user_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  activity_type text not null,
  idempotency_key text unique not null,
  description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_xp_ledger_user on public.user_xp_ledger(user_id, created_at desc);
create index if not exists idx_user_xp_ledger_idempotency on public.user_xp_ledger(idempotency_key);
alter table public.user_xp_ledger enable row level security;

DROP POLICY IF EXISTS "user_xp_ledger_user_select" ON public.user_xp_ledger;
create policy user_xp_ledger_user_select on public.user_xp_ledger
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admin_users a where a.id = auth.uid())
  );

-- ============================================================================
-- 6. Gamification Rewards Catalog Table
-- ============================================================================
create table if not exists public.gamification_rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  reward_type text not null check (reward_type in ('avatar_frame', 'coupon_discount', 'certificate', 'exclusive_challenge')),
  cost_xp integer not null default 0,
  min_level integer not null default 1,
  quantity_available integer,
  redemptions_count integer not null default 0,
  is_active boolean not null default true,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_rewards_active on public.gamification_rewards(is_active);
alter table public.gamification_rewards enable row level security;
DROP POLICY IF EXISTS "gamification_rewards_public_select" ON public.gamification_rewards;
create policy gamification_rewards_public_select on public.gamification_rewards for select using (is_active);

-- Claims Table
create table if not exists public.user_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.gamification_rewards(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  claim_data jsonb default '{}'::jsonb
);

create index if not exists idx_user_reward_claims_user on public.user_reward_claims(user_id);
alter table public.user_reward_claims enable row level security;
DROP POLICY IF EXISTS "user_reward_claims_user_select" ON public.user_reward_claims;
create policy user_reward_claims_user_select on public.user_reward_claims
  for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()));

-- ============================================================================
-- 7. Seed Initial 22 Badges
-- ============================================================================
insert into public.badge_definitions (id, name, description, category, rarity, icon, visual_style, award_type, display_order)
values
  -- Academic
  ('top_student', 'Top Student', 'Verified top-performing learner across subject cohorts.', 'academic', 'legendary', '🏆', '{"color": "#f59e0b", "glow": true}'::jsonb, 'temporary_ranking', 1),
  ('top_scorer', 'Top Scorer', 'Highest eligible scorer in an official assessment window.', 'academic', 'epic', '🥇', '{"color": "#eab308"}'::jsonb, 'temporary_ranking', 2),
  ('quiz_champion', 'Quiz Champion', 'Winner of an official BrainLab CBT competition event.', 'academic', 'legendary', '👑', '{"color": "#ec4899", "sparkle": true}'::jsonb, 'permanent', 3),
  ('perfect_score', 'Perfect Score', 'Scored 100% on a verified examination or practice test.', 'academic', 'epic', '💯', '{"color": "#10b981"}'::jsonb, 'permanent', 4),
  ('subject_mastery', 'Subject Mastery', 'Completed full topic syllabus and achieved mastery threshold.', 'academic', 'rare', '🎓', '{"color": "#6366f1"}'::jsonb, 'permanent', 5),
  ('scholar', 'Scholar', 'Completed multi-topic lesson series and revision checklists.', 'academic', 'common', '📚', '{"color": "#3b82f6"}'::jsonb, 'permanent', 6),
  ('assignment_ace', 'Assignment Ace', 'Consistently met high performance criteria on coursework.', 'academic', 'rare', '⭐', '{"color": "#8b5cf6"}'::jsonb, 'permanent', 7),
  
  -- Consistency & Growth
  ('early_bird', 'Early Bird', 'Submitted assessments well before closing deadlines.', 'consistency', 'common', '🌅', '{"color": "#f97316"}'::jsonb, 'permanent', 8),
  ('consistency_master', 'Consistency Master', 'Maintained continuous weekly study without missed days.', 'consistency', 'rare', '⚡', '{"color": "#06b6d4"}'::jsonb, 'permanent', 9),
  ('unstoppable', 'Unstoppable Streak', 'Maintained an active 7-day or higher continuous learning streak.', 'consistency', 'epic', '🔥', '{"color": "#ef4444", "flame": true}'::jsonb, 'permanent', 10),
  ('rising_star', 'Rising Star', 'Demonstrated verified score improvements over successive tests.', 'consistency', 'rare', '🚀', '{"color": "#0ea5e9"}'::jsonb, 'permanent', 11),
  ('comeback_champion', 'Comeback Champion', 'Recovered from lower assessment marks to achieve excellence.', 'consistency', 'rare', '🛡️', '{"color": "#14b8a6"}'::jsonb, 'permanent', 12),
  ('100_quizzes', 'Century Club (100 Quizzes)', 'Completed 100 or more qualifying CBT practice sessions.', 'consistency', 'epic', '🎯', '{"color": "#d946ef"}'::jsonb, 'permanent', 13),
  ('live_class_regular', 'Live Class Regular', 'Attended and participated in interactive academic streams.', 'consistency', 'common', '🎥', '{"color": "#64748b"}'::jsonb, 'permanent', 14),

  -- Community & Legacy
  ('community_helper', 'Community Helper', 'Provided helpful peer support and verified study assistance.', 'community', 'rare', '🤝', '{"color": "#22c55e"}'::jsonb, 'permanent', 15),
  ('peer_mentor', 'Peer Mentor', 'Appointed peer study guide assisting younger learners.', 'community', 'epic', '💡', '{"color": "#a855f7"}'::jsonb, 'permanent', 16),
  ('brainlab_ambassador', 'BrainLab Ambassador', 'Recognized student ambassador representing excellence.', 'community', 'rare', '🌟', '{"color": "#eab308"}'::jsonb, 'permanent', 17),
  ('brainlab_og', 'BrainLab OG', 'Founding cohort member of BrainLab Academy.', 'community', 'legendary', '🎖️', '{"color": "#f43f5e"}'::jsonb, 'permanent', 18),
  ('challenge_winner', 'Challenge Arena Winner', 'Triumphed in an official BrainLab Challenge Arena tournament.', 'community', 'epic', '⚔️', '{"color": "#f59e0b"}'::jsonb, 'permanent', 19),

  -- Membership & Verification
  ('premium_member', 'Premium Member', 'Active premium subscription tier holder.', 'membership', 'rare', '💎', '{"color": "#38bdf8", "border": true}'::jsonb, 'entitlement', 20),
  ('scholarship_recipient', 'Scholarship Scholar', 'Verified scholarship or institutional sponsored access.', 'membership', 'rare', '🏛️', '{"color": "#4ade80"}'::jsonb, 'entitlement', 21),
  ('verified_student', 'Verified Student', 'Verified student status through school or institution credential.', 'membership', 'common', '✓', '{"color": "#3b82f6"}'::jsonb, 'entitlement', 22)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  rarity = excluded.rarity,
  icon = excluded.icon,
  visual_style = excluded.visual_style;

-- ============================================================================
-- 8. Core RPC: Award XP and Calculate Level Up Atomically
-- ============================================================================
create or replace function public.award_user_xp(
  p_user_id uuid,
  p_amount integer,
  p_activity_type text,
  p_idempotency_key text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_lifetime_xp integer;
  v_new_level integer := 1;
  v_new_level_name text := 'Beginner';
  v_old_level integer := 1;
  v_leveled_up boolean := false;
  v_reward_badge_id text;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount', 'message', 'XP amount must be positive.');
  end if;

  -- 1. Idempotency Check on Ledger
  if exists (select 1 from user_xp_ledger where idempotency_key = p_idempotency_key) then
    return jsonb_build_object('ok', true, 'idempotent_skip', true, 'message', 'XP already awarded for this event.');
  end if;

  -- 2. Insert into Ledger
  insert into user_xp_ledger (
    user_id,
    amount,
    activity_type,
    idempotency_key,
    description,
    metadata
  ) values (
    p_user_id,
    p_amount,
    p_activity_type,
    p_idempotency_key,
    p_description,
    p_metadata
  );

  -- 3. Lock or Initialize User Profile
  insert into user_gamification_profiles (user_id, lifetime_xp, current_level, level_name)
  values (p_user_id, p_amount, 1, 'Beginner')
  on conflict (user_id) do update
  set lifetime_xp = user_gamification_profiles.lifetime_xp + excluded.lifetime_xp,
      updated_at = now()
  returning lifetime_xp, current_level into v_new_lifetime_xp, v_old_level;

  -- 4. Calculate Level Threshold
  select level, name, badge_reward_id into v_new_level, v_new_level_name, v_reward_badge_id
  from gamification_levels
  where min_xp <= v_new_lifetime_xp
  order by min_xp desc
  limit 1;

  if v_new_level > v_old_level then
    v_leveled_up := true;
    update user_gamification_profiles
    set current_level = v_new_level,
        level_name = v_new_level_name,
        updated_at = now()
    where user_id = p_user_id;

    -- Award badge reward for level if defined
    if v_reward_badge_id is not null then
      insert into user_badge_awards (user_id, badge_id, provenance)
      values (p_user_id, v_reward_badge_id, jsonb_build_object('event', 'level_up', 'level', v_new_level))
      on conflict (user_id, badge_id) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'awarded_xp', p_amount,
    'lifetime_xp', v_new_lifetime_xp,
    'current_level', v_new_level,
    'level_name', v_new_level_name,
    'leveled_up', v_leveled_up
  );
end;
$$;

grant execute on function public.award_user_xp to authenticated, service_role;

-- ============================================================================
-- 9. Core RPC: Record Learning Activity (Streaks, Badges, Milestones)
-- ============================================================================
create or replace function public.record_learning_activity(
  p_user_id uuid,
  p_activity_type text, -- 'lesson_complete' | 'quiz_complete' | 'topic_mcq' | 'competition'
  p_reference_id text,
  p_score_percent numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_profile record;
  v_streak integer := 1;
  v_longest integer := 1;
  v_xp_base integer := 10;
  v_xp_bonus integer := 0;
  v_total_awarded integer := 0;
  v_idemp_key text;
  v_award_res jsonb;
  v_new_badges text[] := '{}';
begin
  -- 1. Ensure profile exists
  insert into user_gamification_profiles (user_id, last_activity_date, current_streak_days, longest_streak_days)
  values (p_user_id, v_today, 1, 1)
  on conflict (user_id) do nothing;

  select * into v_profile from user_gamification_profiles where user_id = p_user_id for update;

  -- 2. Streak Evaluation (Substantive Activity Only)
  if v_profile.last_activity_date is null then
    v_streak := 1;
  elsif v_profile.last_activity_date = v_today then
    -- Already active today, streak unchanged
    v_streak := v_profile.current_streak_days;
  elsif v_profile.last_activity_date = v_today - 1 then
    -- Consecutive day!
    v_streak := v_profile.current_streak_days + 1;
  else
    -- Streak reset
    v_streak := 1;
  end if;

  v_longest := greatest(v_streak, v_profile.longest_streak_days);

  -- Update streak and activity counters
  update user_gamification_profiles
  set current_streak_days = v_streak,
      longest_streak_days = v_longest,
      last_activity_date = v_today,
      quizzes_completed_count = case when p_activity_type in ('quiz_complete', 'competition', 'topic_mcq') then quizzes_completed_count + 1 else quizzes_completed_count end,
      perfect_scores_count = case when p_score_percent >= 100 then perfect_scores_count + 1 else perfect_scores_count end,
      updated_at = now()
  where user_id = p_user_id;

  -- 3. Calculate XP
  if p_activity_type = 'lesson_complete' then
    v_xp_base := 10;
  elsif p_activity_type in ('quiz_complete', 'topic_mcq') then
    v_xp_base := 5;
    if p_score_percent >= 80 then
      v_xp_bonus := 15;
    end if;
    if p_score_percent >= 100 then
      v_xp_bonus := 25;
    end if;
  elsif p_activity_type = 'competition' then
    v_xp_base := 20;
    if p_score_percent >= 100 then
      v_xp_bonus := 30;
    end if;
  end if;

  v_idemp_key := format('xp_%s_%s_%s', p_user_id, p_activity_type, p_reference_id);
  v_award_res := public.award_user_xp(
    p_user_id,
    v_xp_base + v_xp_bonus,
    p_activity_type,
    v_idemp_key,
    format('%s completed (%s%%)', p_activity_type, coalesce(p_score_percent::text, '100')),
    jsonb_build_object('ref_id', p_reference_id, 'score', p_score_percent)
  );

  v_total_awarded := v_xp_base + v_xp_bonus;

  -- 4. Check & Award Milestone Badges
  -- Perfect Score Badge
  if p_score_percent >= 100 then
    insert into user_badge_awards (user_id, badge_id, provenance)
    values (p_user_id, 'perfect_score', jsonb_build_object('event', p_activity_type, 'ref', p_reference_id))
    on conflict (user_id, badge_id) do nothing;
    v_new_badges := array_append(v_new_badges, 'perfect_score');
  end if;

  -- Unstoppable Streak (7+ days)
  if v_streak >= 7 then
    insert into user_badge_awards (user_id, badge_id, provenance)
    values (p_user_id, 'unstoppable', jsonb_build_object('streak_days', v_streak))
    on conflict (user_id, badge_id) do nothing;
    v_new_badges := array_append(v_new_badges, 'unstoppable');
  end if;

  -- Century Club (100 quizzes)
  if (v_profile.quizzes_completed_count + 1) >= 100 then
    insert into user_badge_awards (user_id, badge_id, provenance)
    values (p_user_id, '100_quizzes', jsonb_build_object('total_quizzes', v_profile.quizzes_completed_count + 1))
    on conflict (user_id, badge_id) do nothing;
    v_new_badges := array_append(v_new_badges, '100_quizzes');
  end if;

  -- Synchronize Premium Member Badge from active subscription
  if exists (
    select 1 from user_subscriptions
    where user_id = p_user_id
      and status = 'active'
      and current_period_end > now()
  ) then
    insert into user_badge_awards (user_id, badge_id, provenance)
    values (p_user_id, 'premium_member', jsonb_build_object('source', 'subscription_verified'))
    on conflict (user_id, badge_id) do nothing;
  else
    delete from user_badge_awards
    where user_id = p_user_id
      and badge_id = 'premium_member';
  end if;

  return jsonb_build_object(
    'ok', true,
    'streak_days', v_streak,
    'longest_streak', v_longest,
    'xp_awarded', v_total_awarded,
    'new_badges', v_new_badges,
    'profile', (select row_to_json(p) from user_gamification_profiles p where user_id = p_user_id)
  );
end;
$$;

grant execute on function public.record_learning_activity to authenticated, service_role;

-- ============================================================================
-- 10. RPC: Fetch User Badges (Featured & Complete Collection)
-- ============================================================================
create or replace function public.get_user_badges(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badges jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'badge_id', b.id,
        'name', b.name,
        'description', b.description,
        'category', b.category,
        'rarity', b.rarity,
        'icon', b.icon,
        'visual_style', b.visual_style,
        'award_type', b.award_type,
        'is_featured', a.is_featured,
        'awarded_at', a.awarded_at
      )
      order by a.is_featured desc, b.display_order asc
    ),
    '[]'::jsonb
  ) into v_badges
  from user_badge_awards a
  join badge_definitions b on b.id = a.badge_id
  where a.user_id = p_user_id
    and a.is_hidden = false
    and b.is_active = true
    and (a.expires_at is null or a.expires_at > now());

  return jsonb_build_object('ok', true, 'badges', v_badges);
end;
$$;

grant execute on function public.get_user_badges to anon, authenticated;

-- ============================================================================
-- 11. RPC: Filterable Competitive Leaderboard
-- ============================================================================
create or replace function public.get_gamification_leaderboard(
  p_period text default 'all_time', -- 'all_time' | 'monthly' | 'weekly'
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_results jsonb;
  v_caller_id uuid := auth.uid();
begin
  if p_period = 'weekly' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', r.user_id,
          'display_name', coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
          'score', r.period_xp,
          'current_level', p.current_level,
          'level_name', p.level_name,
          'streak_days', p.current_streak_days,
          'is_caller', (r.user_id = v_caller_id)
        )
      ),
      '[]'::jsonb
    ) into v_results
    from (
      select user_id, sum(amount) as period_xp
      from user_xp_ledger
      where created_at >= (now() - interval '7 days')
      group by user_id
      order by period_xp desc
      limit p_limit
    ) r
    join auth.users u on u.id = r.user_id
    left join user_gamification_profiles p on p.user_id = r.user_id;

  elsif p_period = 'monthly' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', r.user_id,
          'display_name', coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
          'score', r.period_xp,
          'current_level', p.current_level,
          'level_name', p.level_name,
          'streak_days', p.current_streak_days,
          'is_caller', (r.user_id = v_caller_id)
        )
      ),
      '[]'::jsonb
    ) into v_results
    from (
      select user_id, sum(amount) as period_xp
      from user_xp_ledger
      where created_at >= (now() - interval '30 days')
      group by user_id
      order by period_xp desc
      limit p_limit
    ) r
    join auth.users u on u.id = r.user_id
    left join user_gamification_profiles p on p.user_id = r.user_id;

  else
    -- All-time leaderboard based on lifetime_xp
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', p.user_id,
          'display_name', coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
          'score', p.lifetime_xp,
          'current_level', p.current_level,
          'level_name', p.level_name,
          'streak_days', p.current_streak_days,
          'is_caller', (p.user_id = v_caller_id)
        )
      ),
      '[]'::jsonb
    ) into v_results
    from (
      select * from user_gamification_profiles
      order by lifetime_xp desc
      limit p_limit
    ) p
    join auth.users u on u.id = p.user_id;
  end if;

  return jsonb_build_object('ok', true, 'leaderboard', v_results);
end;
$$;

grant execute on function public.get_gamification_leaderboard to anon, authenticated;

-- ============================================================================
-- 12. RPC: Claim Gamification Reward (Atomic XP Deduction & Limit Check)
-- ============================================================================
create or replace function public.claim_gamification_reward(
  p_reward_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_reward record;
  v_profile record;
  v_idemp_key text;
begin
  if v_caller_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Please sign in to claim rewards.');
  end if;

  select * into v_reward from gamification_rewards where id = p_reward_id and is_active = true for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Reward is not available.');
  end if;

  if v_reward.quantity_available is not null and v_reward.redemptions_count >= v_reward.quantity_available then
    return jsonb_build_object('ok', false, 'error', 'exhausted', 'message', 'This reward has reached its maximum inventory.');
  end if;

  select * into v_profile from user_gamification_profiles where user_id = v_caller_id for update;
  if not found or v_profile.lifetime_xp < v_reward.cost_xp then
    return jsonb_build_object('ok', false, 'error', 'insufficient_xp', 'message', format('You need %s XP to claim this reward.', v_reward.cost_xp));
  end if;

  if v_profile.current_level < v_reward.min_level then
    return jsonb_build_object('ok', false, 'error', 'level_locked', 'message', format('This reward requires Level %s.', v_reward.min_level));
  end if;

  -- Insert claim record
  insert into user_reward_claims (user_id, reward_id, claim_data)
  values (v_caller_id, p_reward_id, jsonb_build_object('cost_xp', v_reward.cost_xp, 'claimed_at', now()));

  -- Increment counter
  update gamification_rewards
  set redemptions_count = redemptions_count + 1,
      updated_at = now()
  where id = p_reward_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Reward claimed successfully!',
    'reward', row_to_json(v_reward)
  );
end;
$$;

grant execute on function public.claim_gamification_reward to authenticated;

-- Seed Sample Rewards
insert into public.gamification_rewards (title, description, reward_type, cost_xp, min_level, payload)
values
  ('BrainLab Scholar Avatar Frame', 'Exclusive luminous gold avatar ring highlighting your academic dedication.', 'avatar_frame', 250, 2, '{"frame_css": "ring-4 ring-amber-400 shadow-lg"}'::jsonb),
  ('10% Subscription Boost Coupon', 'Redeemable 10% discount promo code applicable on any monthly or quarterly pass.', 'coupon_discount', 500, 3, '{"coupon_code": "SCHOLAR10", "discount": 10}'::jsonb),
  ('Verified Certificate of Academic Excellence', 'Cryptographically verified PDF completion diploma with tamper-proof QR verification code.', 'certificate', 1000, 4, '{"cert_template": "distinction_v1"}'::jsonb)
on conflict do nothing;

commit;
