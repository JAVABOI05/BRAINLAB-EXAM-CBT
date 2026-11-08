-- ==============================================================================
-- BRAINLAB ACADEMY: ROLLBACK GROUP ASSESSMENT SCHEDULES (PHASE 3)
-- Migration: 20261108170000_rollback_group_assessment_schedules.sql
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS p_group_attempts_update ON public.group_assessment_attempts;
DROP POLICY IF EXISTS p_group_attempts_insert ON public.group_assessment_attempts;
DROP POLICY IF EXISTS p_group_attempts_select ON public.group_assessment_attempts;
DROP POLICY IF EXISTS p_group_assessments_manage ON public.group_assessment_schedules;
DROP POLICY IF EXISTS p_group_assessments_select ON public.group_assessment_schedules;

DROP TABLE IF EXISTS public.group_assessment_attempts CASCADE;
DROP TABLE IF EXISTS public.group_assessment_schedules CASCADE;

COMMIT;
