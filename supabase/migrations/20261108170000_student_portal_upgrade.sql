-- ==============================================================================
-- BRAINLAB ACADEMY: STUDENT PORTAL UPGRADE (PHASE 1)
-- Migration: 20261108170000_student_portal_upgrade.sql
-- Purpose:
--   1. Extend public.notification_preferences with quiet hours and timezone.
--   2. Add performance index on active community memberships for rapid portal telemetry.
-- ==============================================================================

BEGIN;

-- 1. Extend notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME WITHOUT TIME ZONE DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME WITHOUT TIME ZONE DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Lagos';

-- 2. Performance Index for active learner group memberships
CREATE INDEX IF NOT EXISTS idx_group_memberships_active_student
  ON public.community_group_memberships(user_id, status)
  WHERE status = 'active';

COMMIT;
