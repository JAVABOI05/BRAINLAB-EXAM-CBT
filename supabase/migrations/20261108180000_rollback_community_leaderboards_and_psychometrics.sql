-- ==============================================================================
-- BRAINLAB ACADEMY: ROLLBACK COHORT LEADERBOARDS & PSYCHOMETRICS (PHASE 4)
-- Migration: 20261108180000_rollback_community_leaderboards_and_psychometrics.sql
-- ==============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.get_cohort_psychometrics(UUID);
DROP FUNCTION IF EXISTS public.get_cohort_leaderboard(UUID, TEXT, INTEGER);

COMMIT;
