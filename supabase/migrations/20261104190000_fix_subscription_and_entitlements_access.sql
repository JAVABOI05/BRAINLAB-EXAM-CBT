-- =============================================================================
-- Migration: 20261104190000_fix_subscription_and_entitlements_access.sql
-- Description:
-- 1. Grant SELECT privileges on subscription_plans, user_subscriptions,
--    learning_entitlements, and payment_transactions to authenticated & anon.
-- 2. Ensure RLS policies allow students to view their own subscriptions and
--    entitlements without 42501 permission denied errors.
-- 3. Provide an authoritative RPC get_authoritative_learner_entitlements()
--    with SECURITY DEFINER for atomic, reliable server and client checks.
-- 4. Establish an automated sync trigger between user_subscriptions and
--    learning_entitlements so any payment or upgrade unlocks all features.
-- 5. Backfill/repair all successful payment transactions into active subscriptions.
-- =============================================================================

BEGIN;

-- 1. TABLE PRIVILEGES (CRITICAL FIX FOR CODE 42501 "permission denied")
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.subscription_plans TO anon, authenticated, service_role;
GRANT SELECT ON public.user_subscriptions TO authenticated, service_role;
GRANT SELECT ON public.learning_entitlements TO authenticated, service_role;
GRANT SELECT ON public.payment_transactions TO authenticated, service_role;

-- 2. ENSURE RLS IS ENABLED AND POLICIES ARE AUTHORITATIVE
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_entitlements ENABLE ROW LEVEL SECURITY;

-- A. subscription_plans read policy (active plans are public to all)
DROP POLICY IF EXISTS "subscription_plans_read_active" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_select_public" ON public.subscription_plans;
CREATE POLICY "subscription_plans_read_active" ON public.subscription_plans
  FOR SELECT
  TO public
  USING (is_active = true);

-- B. user_subscriptions read policy (users can read own records, admins read all)
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_select_own" ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );

-- C. learning_entitlements read policy (users read own entitlements, admins read all)
DROP POLICY IF EXISTS "learning_entitlements_read_own_or_admin" ON public.learning_entitlements;
CREATE POLICY "learning_entitlements_read_own_or_admin" ON public.learning_entitlements
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );

-- 3. AUTHORITATIVE ENTITLEMENT RESOLUTION RPC
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
  v_plan_features jsonb;
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

  -- 1. Check if user is an Administrator or Super Admin (Universal VIP Access)
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = v_target_user)
     OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = v_target_user)
     OR EXISTS (SELECT 1 FROM public.admin_user_roles WHERE user_id = v_target_user) THEN
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

  -- 2. Inspect active subscription in user_subscriptions
  SELECT s.plan_id, s.current_period_end, p.name AS plan_name, p.entitlements
  INTO v_sub_record
  FROM public.user_subscriptions s
  LEFT JOIN public.subscription_plans p ON lower(p.id) = lower(s.plan_id)
  WHERE s.user_id = v_target_user
    AND s.status = 'active'
    AND s.current_period_end > v_now
  ORDER BY s.updated_at DESC
  LIMIT 1;

  -- 3. Inspect active membership in learning_entitlements
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

  -- Format plan display name
  v_plan_name := CASE v_plan_id
    WHEN 'premium' THEN 'Premium Study'
    WHEN 'plus' THEN 'BrainLab Plus'
    WHEN 'pro' THEN 'BrainLab Pro'
    ELSE initcap(v_plan_id)
  END;

  -- Synthesize active tier entitlements
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
  ELSE -- premium
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

-- 4. AUTOMATED SYNCHRONIZATION TRIGGER (user_subscriptions -> learning_entitlements)
-- Whenever a subscription is inserted or updated to 'active', automatically sync learning_entitlements
CREATE OR REPLACE FUNCTION public.sync_user_subscription_to_learning_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_plan_id text := lower(trim(coalesce(NEW.plan_id, '')));
  v_questions integer;
BEGIN
  IF NEW.status = 'active' AND NEW.current_period_end > now() AND v_plan_id IN ('premium', 'plus', 'pro') THEN
    v_questions := CASE v_plan_id
      WHEN 'premium' THEN 250
      WHEN 'plus' THEN 400
      WHEN 'pro' THEN 500
      ELSE 500
    END;

    -- Revoke any conflicting previous membership
    UPDATE public.learning_entitlements
    SET status = 'revoked', revoked_at = now()
    WHERE user_id = NEW.user_id
      AND entitlement_type = 'membership'
      AND status = 'active'
      AND revoked_at IS NULL;

    -- Insert active membership matching the subscription
    INSERT INTO public.learning_entitlements (
      user_id,
      entitlement_type,
      membership_type,
      max_questions,
      status,
      permanent,
      starts_at,
      expires_at
    )
    VALUES (
      NEW.user_id,
      'membership',
      v_plan_id,
      v_questions,
      'active',
      false,
      coalesce(NEW.current_period_start, now()),
      NEW.current_period_end
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_user_subscription_to_entitlement ON public.user_subscriptions;
CREATE TRIGGER trg_sync_user_subscription_to_entitlement
  AFTER INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_subscription_to_learning_entitlement();

-- 5. IDEMPOTENT BACKFILL / REPAIR FOR ALL USERS
-- A. Ensure all active user_subscriptions have matching active learning_entitlements
INSERT INTO public.learning_entitlements (
  user_id, entitlement_type, membership_type, max_questions,
  status, permanent, starts_at, expires_at
)
SELECT
  s.user_id,
  'membership',
  lower(s.plan_id),
  CASE lower(s.plan_id) WHEN 'premium' THEN 250 WHEN 'plus' THEN 400 WHEN 'pro' THEN 500 ELSE 500 END,
  'active',
  false,
  coalesce(s.current_period_start, now()),
  s.current_period_end
FROM public.user_subscriptions s
WHERE s.status = 'active'
  AND s.current_period_end > now()
  AND lower(s.plan_id) IN ('premium', 'plus', 'pro')
  AND NOT EXISTS (
    SELECT 1 FROM public.learning_entitlements e
    WHERE e.user_id = s.user_id
      AND e.entitlement_type = 'membership'
      AND e.status = 'active'
      AND e.revoked_at IS NULL
      AND (e.permanent OR e.expires_at > now())
  );

-- B. Repair any successful payment transaction in the past 45 days that lacks an active subscription
WITH paid_candidates AS (
  SELECT DISTINCT ON (t.user_id)
    t.user_id,
    lower(t.plan_id) AS plan_id,
    coalesce(t.paid_at, t.created_at, now()) AS paid_at,
    coalesce(t.paid_at, t.created_at, now()) + interval '30 days' AS period_end,
    t.provider,
    t.amount_kobo,
    t.currency,
    t.reference
  FROM public.payment_transactions t
  WHERE t.status = 'success'
    AND t.user_id IS NOT NULL
    AND lower(t.plan_id) IN ('premium', 'plus', 'pro')
    AND coalesce(t.paid_at, t.created_at) > (now() - interval '45 days')
  ORDER BY t.user_id, coalesce(t.paid_at, t.created_at) DESC
)
INSERT INTO public.user_subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  payment_provider,
  price_paid_kobo,
  currency,
  provider_subscription_id,
  cancel_at_period_end,
  updated_at
)
SELECT
  p.user_id,
  p.plan_id,
  'active',
  p.paid_at,
  p.period_end,
  p.provider,
  p.amount_kobo,
  p.currency,
  p.reference,
  false,
  now()
FROM paid_candidates p
ON CONFLICT (user_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = 'active',
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  payment_provider = EXCLUDED.payment_provider,
  price_paid_kobo = EXCLUDED.price_paid_kobo,
  currency = EXCLUDED.currency,
  provider_subscription_id = EXCLUDED.provider_subscription_id,
  updated_at = now();

COMMIT;
