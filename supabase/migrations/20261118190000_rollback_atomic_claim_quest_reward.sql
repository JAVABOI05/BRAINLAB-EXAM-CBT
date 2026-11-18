-- ==============================================================================
-- BRAINLAB ACADEMY: ROLLBACK ATOMIC CLAIM QUEST REWARD ENGINE
-- Migration: 20261118190000_rollback_atomic_claim_quest_reward.sql
-- ==============================================================================

BEGIN;

REVOKE ALL ON FUNCTION public.claim_quest_reward(UUID, UUID) FROM authenticated, service_role;
DROP FUNCTION IF EXISTS public.claim_quest_reward(UUID, UUID);

COMMIT;
