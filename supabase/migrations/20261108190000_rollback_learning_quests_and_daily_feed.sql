-- ==============================================================================
-- BRAINLAB ACADEMY: ROLLBACK LEARNING QUESTS & DAILY FEED (PHASE 5)
-- Migration: 20261108190000_rollback_learning_quests_and_daily_feed.sql
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS p_user_quest_progress_update ON public.user_quest_progress;
DROP POLICY IF EXISTS p_user_quest_progress_insert ON public.user_quest_progress;
DROP POLICY IF EXISTS p_user_quest_progress_select ON public.user_quest_progress;
DROP POLICY IF EXISTS p_learning_quests_select ON public.learning_quests;

DROP TABLE IF EXISTS public.user_quest_progress CASCADE;
DROP TABLE IF EXISTS public.learning_quests CASCADE;

COMMIT;
