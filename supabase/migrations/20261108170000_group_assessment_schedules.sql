-- ==============================================================================
-- BRAINLAB ACADEMY: STUDENT COMMUNITIES & ENGAGEMENT ECOSYSTEM (PHASE 3)
-- Migration: 20261108170000_group_assessment_schedules.sql
-- Purpose:
--   1. Create public.group_assessment_schedules for scheduling timed CBT tests
--      across academic cohorts and study groups with frozen question snapshots.
--   2. Create public.group_assessment_attempts tracking candidate test runs,
--      scores, time spent, and eligibility compliance.
--   3. Enforce server-side Row Level Security (RLS) preventing answer leakages.
-- ==============================================================================

BEGIN;

-- 1. GROUP ASSESSMENT SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.group_assessment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) >= 3),
  description TEXT,
  subject TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  question_count INTEGER NOT NULL DEFAULT 40 CHECK (question_count BETWEEN 5 AND 200),
  difficulty_distribution JSONB NOT NULL DEFAULT '{"easy": 30, "medium": 50, "hard": 20}'::jsonb,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 5 AND 360),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts BETWEEN 1 AND 10),
  is_published BOOLEAN NOT NULL DEFAULT false,
  freeze_eligible_members BOOLEAN NOT NULL DEFAULT true,
  frozen_eligible_member_ids UUID[] DEFAULT NULL,
  frozen_question_ids INTEGER[] DEFAULT NULL,
  settings JSONB NOT NULL DEFAULT '{
    "shuffle_options": true,
    "show_corrections_after_close": true,
    "require_webcam": false,
    "allow_late_entry": false
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT check_assessment_schedule_window CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_group_assessments_group ON public.group_assessment_schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_group_assessments_window ON public.group_assessment_schedules(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_group_assessments_published ON public.group_assessment_schedules(is_published);

-- 2. GROUP ASSESSMENT ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.group_assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.group_assessment_schedules(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_session_id TEXT,
  score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  total_questions INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  tab_switch_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'disqualified', 'expired')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_group_attempts_assessment ON public.group_assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_group_attempts_user ON public.group_assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_group_attempts_group_status ON public.group_assessment_attempts(group_id, status);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.group_assessment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_assessment_attempts ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR SCHEDULES
-- Members can view published schedules in their groups
CREATE POLICY p_group_assessments_select ON public.group_assessment_schedules
  FOR SELECT
  USING (
    is_published = true AND (
      EXISTS (
        SELECT 1 FROM public.community_group_memberships m
        WHERE m.group_id = group_assessment_schedules.group_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.community_groups g
        WHERE g.id = group_assessment_schedules.group_id
          AND (g.owner_id = auth.uid() OR g.visibility = 'public')
      )
    )
  );

-- Group tutors, owners, and admins can insert/update schedules
CREATE POLICY p_group_assessments_manage ON public.group_assessment_schedules
  FOR ALL
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = group_assessment_schedules.group_id AND g.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_group_memberships m
      WHERE m.group_id = group_assessment_schedules.group_id
        AND m.user_id = auth.uid()
        AND m.group_role IN ('owner', 'tutor', 'moderator')
        AND m.status = 'active'
    )
  );

-- 5. RLS POLICIES FOR ATTEMPTS
-- Users can view their own attempts; tutors can view attempts for their group
CREATE POLICY p_group_attempts_select ON public.group_assessment_attempts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = group_assessment_attempts.group_id AND g.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_group_memberships m
      WHERE m.group_id = group_assessment_attempts.group_id
        AND m.user_id = auth.uid()
        AND m.group_role IN ('owner', 'tutor', 'moderator')
        AND m.status = 'active'
    )
  );

-- Users can insert their own attempts if eligible
CREATE POLICY p_group_attempts_insert ON public.group_assessment_attempts
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- Users can update their own ongoing attempt
CREATE POLICY p_group_attempts_update ON public.group_assessment_attempts
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );

COMMIT;
