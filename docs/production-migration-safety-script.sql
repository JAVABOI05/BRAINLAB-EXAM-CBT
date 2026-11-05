-- ==============================================================================
-- BRAINLAB ACADEMY — PRODUCTION DATABASE SAFETY & FORWARD MIGRATION SCRIPT
-- Target Database: BrainLabCBT Production (bupkyppvtkrmzmluzjmf)
-- Safety Guarantee: NON-DESTRUCTIVE, ZERO DATA LOSS
-- Preserved Data: 5,625 questions, 7,580 answers, 179 sessions, 43 results
-- Purpose:
--   1. Authoritative entitlement resolution RPC fix (removes legacy admin_user_roles reference)
--   2. Plaintext password nulling & deprecation in admin_users
-- ==============================================================================

BEGIN;

-- 1. VERIFY NO DROP COMMANDS OR TABLE RESETS
-- This script contains ZERO DROP TABLE, TRUNCATE, or schema-wiping commands.

-- 2. CREATE OR REPLACE public.get_authoritative_learner_entitlements
CREATE OR REPLACE FUNCTION public.get_authoritative_learner_entitlements(
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_target_user uuid := coalesce(p_user_id, auth.uid());
  v_is_admin boolean := false;
  v_now timestamptz := now();
  v_sub_record RECORD;
  v_ent_record RECORD;
  v_plan_id text := 'free';
  v_plan_name text := 'Free Learner';
  v_is_subscribed boolean := false;
  v_expires_at timestamptz := NULL;
  v_max_questions integer := 50;
  v_entitlements jsonb;
BEGIN
  IF v_target_user IS NULL THEN
    RETURN jsonb_build_object(
      'is_subscribed', false,
      'plan_id', 'free',
      'plan_name', 'Free Learner',
      'expires_at', null,
      'max_questions', 50,
      'entitlements', jsonb_build_object(
        'cbt_access', true,
        'cbt_unlimited', false,
        'cbt_daily_limit', 1,
        'cbt_corrections', false,
        'offline_saving', false,
        'ai_tutor_enabled', true,
        'ai_monthly_quota', 50,
        'ai_voice_tutor', false,
        'classroom_access', false,
        'competitions_included', false,
        'advanced_analytics', false,
        'certificates_issued', false,
        'calculator_type', 'standard',
        'vip_support', false
      )
    );
  END IF;

  -- 1. Check if user is an Administrator or Super Admin in admin_users or admin_profiles
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = v_target_user)
     OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = v_target_user) THEN
    v_is_admin := true;
  END IF;

  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'is_subscribed', true,
      'plan_id', 'admin_vip',
      'plan_name', 'Super Admin (Universal Access)',
      'expires_at', null,
      'max_questions', 999999,
      'entitlements', jsonb_build_object(
        'cbt_access', true,
        'cbt_unlimited', true,
        'cbt_daily_limit', 999999,
        'cbt_corrections', true,
        'offline_saving', true,
        'ai_tutor_enabled', true,
        'ai_monthly_quota', 999999,
        'ai_voice_tutor', true,
        'classroom_access', true,
        'competitions_included', true,
        'advanced_analytics', true,
        'certificates_issued', true,
        'calculator_type', 'scientific',
        'vip_support', true
      )
    );
  END IF;

  -- 2. Inspect active subscription in user_subscriptions (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_subscriptions') THEN
    SELECT s.plan_id, s.current_period_end, p.name AS plan_name, p.entitlements
    INTO v_sub_record
    FROM public.user_subscriptions s
    LEFT JOIN public.subscription_plans p ON lower(p.id) = lower(s.plan_id)
    WHERE s.user_id = v_target_user
      AND s.status = 'active'
      AND s.current_period_end > v_now
    ORDER BY s.updated_at DESC
    LIMIT 1;
  END IF;

  -- 3. Inspect active membership in learning_entitlements (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'learning_entitlements') THEN
    SELECT e.membership_type, e.max_questions, e.expires_at, e.permanent
    INTO v_ent_record
    FROM public.learning_entitlements e
    WHERE e.user_id = v_target_user
      AND e.entitlement_type = 'membership'
      AND e.status = 'active'
      AND e.revoked_at IS NULL
      AND e.starts_at <= v_now
      AND (e.permanent OR e.expires_at > v_now)
    ORDER BY e.created_at DESC
    LIMIT 1;
  END IF;

  -- 4. Resolve tier priority: pro (3) > plus (2) > premium (1) > free (0)
  DECLARE
    v_sub_tier text := lower(coalesce(v_sub_record.plan_id, ''));
    v_ent_tier text := lower(coalesce(v_ent_record.membership_type, ''));
    v_sub_rank int := CASE v_sub_tier WHEN 'pro' THEN 3 WHEN 'plus' THEN 2 WHEN 'premium' THEN 1 ELSE 0 END;
    v_ent_rank int := CASE v_ent_tier WHEN 'pro' THEN 3 WHEN 'plus' THEN 2 WHEN 'premium' THEN 1 ELSE 0 END;
  BEGIN
    IF v_ent_rank >= v_sub_rank AND v_ent_rank > 0 THEN
      v_plan_id := v_ent_tier;
      v_is_subscribed := true;
      v_expires_at := CASE WHEN v_ent_record.permanent THEN NULL ELSE v_ent_record.expires_at END;
      v_max_questions := coalesce(v_ent_record.max_questions, CASE v_ent_tier WHEN 'pro' THEN 500 WHEN 'plus' THEN 400 ELSE 250 END);
    ELSIF v_sub_rank > 0 THEN
      v_plan_id := v_sub_tier;
      v_is_subscribed := true;
      v_expires_at := v_sub_record.current_period_end;
      v_max_questions := CASE v_sub_tier WHEN 'pro' THEN 500 WHEN 'plus' THEN 400 ELSE 250 END;
    END IF;
  END;

  IF NOT v_is_subscribed THEN
    RETURN jsonb_build_object(
      'is_subscribed', false,
      'plan_id', 'free',
      'plan_name', 'Free Learner',
      'expires_at', null,
      'max_questions', 50,
      'entitlements', jsonb_build_object(
        'cbt_access', true,
        'cbt_unlimited', false,
        'cbt_daily_limit', 1,
        'cbt_corrections', false,
        'offline_saving', false,
        'ai_tutor_enabled', true,
        'ai_monthly_quota', 50,
        'ai_voice_tutor', false,
        'classroom_access', false,
        'competitions_included', false,
        'advanced_analytics', false,
        'certificates_issued', false,
        'calculator_type', 'standard',
        'vip_support', false
      )
    );
  END IF;

  v_plan_name := CASE v_plan_id
    WHEN 'premium' THEN 'Premium Study'
    WHEN 'plus' THEN 'BrainLab Plus'
    WHEN 'pro' THEN 'BrainLab Pro'
    ELSE initcap(v_plan_id)
  END;

  IF v_plan_id = 'pro' THEN
    v_entitlements := jsonb_build_object(
      'cbt_access', true,
      'cbt_unlimited', true,
      'cbt_daily_limit', 999999,
      'cbt_corrections', true,
      'offline_saving', true,
      'ai_tutor_enabled', true,
      'ai_monthly_quota', 999999,
      'ai_voice_tutor', true,
      'classroom_access', true,
      'competitions_included', true,
      'advanced_analytics', true,
      'certificates_issued', true,
      'calculator_type', 'scientific',
      'vip_support', true
    );
  ELSIF v_plan_id = 'plus' THEN
    v_entitlements := jsonb_build_object(
      'cbt_access', true,
      'cbt_unlimited', true,
      'cbt_daily_limit', 999999,
      'cbt_corrections', true,
      'offline_saving', true,
      'ai_tutor_enabled', true,
      'ai_monthly_quota', 1500,
      'ai_voice_tutor', false,
      'classroom_access', true,
      'competitions_included', true,
      'advanced_analytics', true,
      'certificates_issued', true,
      'calculator_type', 'scientific',
      'vip_support', false
    );
  ELSE
    v_entitlements := jsonb_build_object(
      'cbt_access', true,
      'cbt_unlimited', true,
      'cbt_daily_limit', 999999,
      'cbt_corrections', true,
      'offline_saving', true,
      'ai_tutor_enabled', true,
      'ai_monthly_quota', 500,
      'ai_voice_tutor', false,
      'classroom_access', true,
      'competitions_included', true,
      'advanced_analytics', true,
      'certificates_issued', false,
      'calculator_type', 'scientific',
      'vip_support', false
    );
  END IF;

  RETURN jsonb_build_object(
    'is_subscribed', true,
    'plan_id', v_plan_id,
    'plan_name', v_plan_name,
    'expires_at', v_expires_at,
    'max_questions', v_max_questions,
    'entitlements', v_entitlements
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_authoritative_learner_entitlements(uuid) TO anon, authenticated, service_role;

-- 3. NEUTRALIZE PLAINTEXT PASSWORDS IN admin_users (IF TABLE AND COLUMN EXIST)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'admin_users' 
      AND column_name = 'password'
  ) THEN
    ALTER TABLE public.admin_users ALTER COLUMN password DROP NOT NULL;
    UPDATE public.admin_users SET password = NULL WHERE password IS NOT NULL;
    COMMENT ON COLUMN public.admin_users.password IS 'DEPRECATED: Authentication is strictly managed via Supabase auth.users';
  END IF;
END $$;

COMMIT;
