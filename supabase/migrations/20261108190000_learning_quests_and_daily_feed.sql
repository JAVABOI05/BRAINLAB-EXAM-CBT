-- ==============================================================================
-- BRAINLAB ACADEMY: STUDENT COMMUNITIES & ENGAGEMENT ECOSYSTEM (PHASE 5)
-- Migration: 20261108190000_learning_quests_and_daily_feed.sql
-- Purpose:
--   1. Create public.learning_quests for verified academic engagement quests
--      (CBT speed drills, STEM simulations, cohort tests, streak maintenance).
--   2. Create public.user_quest_progress tracking student progress, completions,
--      and XP rewards.
--   3. Enforce Row Level Security (RLS) policies.
-- ==============================================================================

BEGIN;

-- 1. LEARNING QUESTS TABLE
CREATE TABLE IF NOT EXISTS public.learning_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) >= 3),
  description TEXT,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('cbt_drill', 'stem_simulation', 'group_assessment', 'live_class', 'streak_maintain')),
  subject TEXT,
  target_count INTEGER NOT NULL DEFAULT 1 CHECK (target_count >= 1),
  xp_reward INTEGER NOT NULL DEFAULT 50 CHECK (xp_reward >= 0),
  is_daily BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_learning_quests_active ON public.learning_quests(is_active, is_daily);

-- 2. USER QUEST PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.learning_quests(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_quest UNIQUE (user_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_user_quest_progress_user ON public.user_quest_progress(user_id);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.learning_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES
-- Quests are readable by all authenticated learners and public catalog
CREATE POLICY p_learning_quests_select ON public.learning_quests
  FOR SELECT
  USING (is_active = true);

-- User quest progress: users can select their own progress
CREATE POLICY p_user_quest_progress_select ON public.user_quest_progress
  FOR SELECT
  USING (user_id = auth.uid());

-- User quest progress: users can insert/update their own progress
CREATE POLICY p_user_quest_progress_insert ON public.user_quest_progress
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY p_user_quest_progress_update ON public.user_quest_progress
  FOR UPDATE
  USING (user_id = auth.uid());

COMMIT;
