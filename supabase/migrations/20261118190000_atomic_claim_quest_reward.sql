-- ==============================================================================
-- BRAINLAB ACADEMY: ATOMIC CLAIM QUEST REWARD ENGINE
-- Migration: 20261118190000_atomic_claim_quest_reward.sql
-- Purpose:
--   1. Create an atomic, concurrency-safe, idempotent RPC function:
--      public.claim_quest_reward(p_quest_id UUID, p_user_id UUID)
--   2. Enforces genuine completion (current_count >= target_count OR is_completed = true)
--   3. Prevents duplicate claims (row lock FOR UPDATE + is_claimed check + user_xp_ledger idempotency)
--   4. Atomically updates quest status, user gamification profile, XP ledger, and level recalculation.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_quest_reward(
  p_quest_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_quest RECORD;
  v_progress RECORD;
  v_idempotency_key TEXT;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_new_lifetime_xp INTEGER;
  v_old_level INTEGER := 1;
  v_new_level INTEGER := 1;
  v_new_level_name TEXT := 'Beginner';
  v_reward_badge_id TEXT;
  v_leveled_up BOOLEAN := false;
BEGIN
  -- 1. Identify and authenticate target user
  v_caller_id := coalesce(p_user_id, auth.uid());
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'unauthorized',
      'message', 'Authentication required to claim quest rewards.'
    );
  END IF;

  -- Disallow claiming on behalf of other users when called via client auth
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_caller_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'forbidden',
      'message', 'You cannot claim quest rewards for another candidate.'
    );
  END IF;

  -- 2. Verify quest exists, is active, and is not expired
  SELECT id, title, target_count, xp_reward, is_active, expires_at
  INTO v_quest
  FROM public.learning_quests
  WHERE id = p_quest_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'quest_not_found',
      'message', 'The requested quest could not be found.'
    );
  END IF;

  IF NOT v_quest.is_active THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'quest_inactive',
      'message', 'This quest is currently inactive.'
    );
  END IF;

  IF v_quest.expires_at IS NOT NULL AND v_quest.expires_at <= v_now THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'quest_expired',
      'message', 'This quest deadline has passed.'
    );
  END IF;

  -- 3. Atomically check and lock user quest progress
  SELECT id, current_count, is_completed, is_claimed, completed_at
  INTO v_progress
  FROM public.user_quest_progress
  WHERE user_id = v_caller_id AND quest_id = p_quest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'quest_incomplete',
      'message', 'No progress record exists for this quest. Target has not been met.',
      'current_count', 0,
      'target_count', v_quest.target_count
    );
  END IF;

  -- 4. Check if already claimed
  IF v_progress.is_claimed THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_claimed',
      'message', 'This quest reward has already been claimed.'
    );
  END IF;

  -- 5. Enforce genuine completion criteria
  IF NOT v_progress.is_completed AND v_progress.current_count < v_quest.target_count THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'quest_incomplete',
      'message', 'Quest target has not yet been achieved.',
      'current_count', v_progress.current_count,
      'target_count', v_quest.target_count
    );
  END IF;

  -- 6. Check ledger idempotency key to prevent double XP
  v_idempotency_key := 'quest_claim:' || v_caller_id::text || ':' || p_quest_id::text;
  IF EXISTS (SELECT 1 FROM public.user_xp_ledger WHERE idempotency_key = v_idempotency_key) THEN
    -- Mark progress as claimed if ledger record already exists
    UPDATE public.user_quest_progress
    SET is_claimed = true,
        claimed_at = coalesce(claimed_at, v_now),
        updated_at = v_now
    WHERE id = v_progress.id;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_claimed',
      'message', 'XP reward has already been credited for this quest.'
    );
  END IF;

  -- 7. Mark quest progress claimed in user_quest_progress
  UPDATE public.user_quest_progress
  SET is_completed = true,
      completed_at = coalesce(v_progress.completed_at, v_now),
      is_claimed = true,
      claimed_at = v_now,
      updated_at = v_now
  WHERE id = v_progress.id;

  -- 8. Record in user_xp_ledger
  INSERT INTO public.user_xp_ledger (
    user_id,
    amount,
    activity_type,
    idempotency_key,
    description,
    metadata
  ) VALUES (
    v_caller_id,
    v_quest.xp_reward,
    'quest_complete',
    v_idempotency_key,
    'Daily Quest Completed: ' || v_quest.title,
    jsonb_build_object(
      'quest_id', p_quest_id,
      'quest_title', v_quest.title,
      'claimed_at', v_now
    )
  );

  -- 9. Upsert and update user_gamification_profiles safely
  INSERT INTO public.user_gamification_profiles (
    user_id,
    lifetime_xp,
    current_level,
    level_name,
    current_streak_days,
    longest_streak_days,
    last_activity_date,
    updated_at
  ) VALUES (
    v_caller_id,
    v_quest.xp_reward,
    1,
    'Beginner',
    1,
    1,
    v_now::date,
    v_now
  )
  ON CONFLICT (user_id) DO UPDATE
  SET lifetime_xp = public.user_gamification_profiles.lifetime_xp + excluded.lifetime_xp,
      last_activity_date = coalesce(public.user_gamification_profiles.last_activity_date, excluded.last_activity_date),
      updated_at = v_now
  RETURNING lifetime_xp, current_level INTO v_new_lifetime_xp, v_old_level;

  -- 10. Recalculate level thresholds
  SELECT level, name, badge_reward_id
  INTO v_new_level, v_new_level_name, v_reward_badge_id
  FROM public.gamification_levels
  WHERE min_xp <= v_new_lifetime_xp
  ORDER BY min_xp DESC
  LIMIT 1;

  IF v_new_level IS NOT NULL AND v_new_level > v_old_level THEN
    v_leveled_up := true;
    UPDATE public.user_gamification_profiles
    SET current_level = v_new_level,
        level_name = v_new_level_name,
        updated_at = v_now
    WHERE user_id = v_caller_id;

    -- Award level badge if configured
    IF v_reward_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badge_awards (user_id, badge_id, provenance)
      VALUES (
        v_caller_id,
        v_reward_badge_id,
        jsonb_build_object('event', 'quest_level_up', 'quest_id', p_quest_id, 'level', v_new_level)
      )
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'xp_earned', v_quest.xp_reward,
    'lifetime_xp', v_new_lifetime_xp,
    'current_level', coalesce(v_new_level, v_old_level, 1),
    'level_name', coalesce(v_new_level_name, 'Beginner'),
    'leveled_up', v_leveled_up
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_quest_reward(UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_quest_reward(UUID, UUID) TO authenticated, service_role;

COMMIT;
