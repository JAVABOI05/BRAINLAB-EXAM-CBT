-- ==============================================================================
-- Rollback Migration: 20261108170000_rollback_student_portal_upgrade.sql
-- Description: Clean teardown of student portal upgrade columns and indexes.
-- ==============================================================================

BEGIN;

DROP INDEX IF EXISTS public.idx_group_memberships_active_student;

ALTER TABLE public.notification_preferences
  DROP COLUMN IF EXISTS quiet_hours_start,
  DROP COLUMN IF EXISTS quiet_hours_end,
  DROP COLUMN IF EXISTS timezone;

COMMIT;
