-- ==============================================================================
-- BRAINLAB ACADEMY — PRODUCTION PHASE 1: ENTITLEMENT SCHEMA CREATION
-- Target Database: BrainLabCBT Production (bupkyppvtkrmzmluzjmf)
-- Safety Guarantee: NON-DESTRUCTIVE. ZERO DATA LOSS. FULLY IDEMPOTENT.
-- Purpose:
--   1. Create subscription_plans, user_subscriptions, learning_entitlements,
--      payment_transactions, coupon_campaigns, configuration_audit_logs tables
--      (skipped if already present — CREATE TABLE IF NOT EXISTS throughout).
--   2. Add UNIQUE (user_id) constraint to user_subscriptions so that
--      admin_grant_candidate_subscription ON CONFLICT clause works correctly.
--   3. Fix max_questions check constraint on learning_entitlements
--      (increase from 500 to 1,000,000 to allow VIP and admin grants).
--   4. Create / replace sync trigger and admin grant RPC that work on production.
--   5. Seed default subscription plans (premium, plus, pro, free) safely.
--   6. Grant appropriate privileges.
-- ==============================================================================
-- PRESERVED PRODUCTION DATA:
--   • 5,625+ questions in public.questions
--   • 7,580+ answers
--   • 179+ exam sessions
--   • 43+ exam results
--   • All existing admin_users, user_profiles, notifications records
-- ==============================================================================

BEGIN;

-- ============================================================================
-- 1. SUBSCRIPTION_PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_kobo bigint NOT NULL DEFAULT 0 CHECK (price_kobo >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  interval text NOT NULL DEFAULT 'monthly' CHECK (interval IN ('monthly', 'yearly')),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Public read for active subscription plans
DROP POLICY IF EXISTS "subscription_plans_read_active" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_public_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_read_active" ON public.subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Admin management
DROP POLICY IF EXISTS "subscription_plans_admin_all" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin_all" ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.id = auth.uid()
      AND a.role IN ('super_admin', 'platform_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.id = auth.uid()
      AND a.role IN ('super_admin', 'platform_admin')
  ));

GRANT SELECT ON public.subscription_plans TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plans TO service_role;

-- ============================================================================
-- 2. USER_SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired', 'trialing')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  payment_provider text DEFAULT 'paystack',
  provider_subscription_id text,
  provider_customer_id text,
  price_paid_kobo bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add UNIQUE constraint on user_id — this is REQUIRED for ON CONFLICT (user_id) in RPCs.
-- This is idempotent: DO $$ block checks existence before adding.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_subscriptions'::regclass
      AND conname = 'user_subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON public.user_subscriptions(plan_id);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users read own records; admins read all
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_select_own" ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );

-- Service role can write (admin grant RPCs use service_role)
DROP POLICY IF EXISTS "user_subscriptions_service_role_write" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_service_role_write" ON public.user_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.user_subscriptions TO authenticated, service_role;
GRANT INSERT, UPDATE ON public.user_subscriptions TO service_role;

-- ============================================================================
-- 3. LEARNING_ENTITLEMENTS TABLE
-- ============================================================================
-- NOTE: max_questions constraint raised from (1,500) to (1,1000000)
--       to allow admin VIP grants and pro-plan max_questions values > 500.
CREATE TABLE IF NOT EXISTS public.learning_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL CHECK (entitlement_type IN ('membership', 'assessment', 'resource', 'organisation')),
  membership_type text,
  resource_key text,
  organisation_id uuid,
  assessment_id uuid,
  max_questions integer NOT NULL DEFAULT 50 CHECK (max_questions BETWEEN 1 AND 1000000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  permanent boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((permanent AND expires_at IS NULL) OR (NOT permanent AND expires_at IS NOT NULL)),
  CHECK (entitlement_type <> 'membership' OR membership_type IS NOT NULL)
);

-- If the table already existed with the old (1,500) constraint, patch it.
DO $$
BEGIN
  -- Try to drop the old constraint if it exists with the tight bound
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.learning_entitlements'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%max_questions%500%'
  ) THEN
    -- Drop old constraint (name may vary)
    ALTER TABLE public.learning_entitlements
      DROP CONSTRAINT IF EXISTS learning_entitlements_max_questions_check;
    -- Re-add with relaxed bound
    ALTER TABLE public.learning_entitlements
      ADD CONSTRAINT learning_entitlements_max_questions_check
      CHECK (max_questions BETWEEN 1 AND 1000000);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_learning_entitlements_user ON public.learning_entitlements(user_id, status);

ALTER TABLE public.learning_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learning_entitlements_read_own_or_admin" ON public.learning_entitlements;
CREATE POLICY "learning_entitlements_read_own_or_admin" ON public.learning_entitlements
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );

DROP POLICY IF EXISTS "learning_entitlements_service_role_write" ON public.learning_entitlements;
CREATE POLICY "learning_entitlements_service_role_write" ON public.learning_entitlements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.learning_entitlements TO authenticated, service_role;
GRANT INSERT, UPDATE ON public.learning_entitlements TO service_role;

-- ============================================================================
-- 4. COUPON_CAMPAIGNS TABLE (dependency for payment_transactions FK)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coupon_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_spend_kobo bigint NOT NULL DEFAULT 0,
  max_redemptions integer NOT NULL DEFAULT 100,
  current_redemptions integer NOT NULL DEFAULT 0 CHECK (current_redemptions >= 0),
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_code ON public.coupon_campaigns(code);
ALTER TABLE public.coupon_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupon_campaigns_public_validate" ON public.coupon_campaigns;
CREATE POLICY "coupon_campaigns_public_validate" ON public.coupon_campaigns
  FOR SELECT
  USING (
    is_active
    AND (expires_at IS NULL OR expires_at > now())
    AND starts_at <= now()
  );

GRANT SELECT ON public.coupon_campaigns TO anon, authenticated, service_role;

-- ============================================================================
-- 5. PAYMENT_TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id text REFERENCES public.subscription_plans(id),
  customer_email text NOT NULL,
  amount_kobo bigint NOT NULL CHECK (amount_kobo >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  provider text NOT NULL DEFAULT 'paystack',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'abandoned')),
  provider_reference text,
  coupon_id uuid REFERENCES public.coupon_campaigns(id) ON DELETE SET NULL,
  discount_kobo bigint NOT NULL DEFAULT 0,
  idempotency_key text,
  metadata jsonb DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref ON public.payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_idempotency ON public.payment_transactions(idempotency_key);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_transactions_user_select" ON public.payment_transactions;
CREATE POLICY "payment_transactions_user_select" ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );

DROP POLICY IF EXISTS "payment_transactions_service_role_write" ON public.payment_transactions;
CREATE POLICY "payment_transactions_service_role_write" ON public.payment_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.payment_transactions TO authenticated, service_role;
GRANT INSERT, UPDATE ON public.payment_transactions TO service_role;

-- ============================================================================
-- 6. CONFIGURATION_AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.configuration_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text,
  entity_type text NOT NULL CHECK (entity_type IN ('config', 'plan', 'coupon', 'competition', 'refund')),
  entity_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'published', 'reverted')),
  previous_value jsonb,
  new_value jsonb,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_config_audit_entity ON public.configuration_audit_logs(entity_type, entity_id);
ALTER TABLE public.configuration_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuration_audit_logs_admin_select" ON public.configuration_audit_logs;
CREATE POLICY "configuration_audit_logs_admin_select" ON public.configuration_audit_logs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.id = auth.uid()
      AND a.role IN ('super_admin', 'platform_admin')
  ));

GRANT SELECT ON public.configuration_audit_logs TO authenticated, service_role;
GRANT INSERT ON public.configuration_audit_logs TO service_role;

-- ============================================================================
-- 7. SEED DEFAULT SUBSCRIPTION PLANS (idempotent)
-- ============================================================================
INSERT INTO public.subscription_plans (id, name, description, price_kobo, currency, interval, features, entitlements, display_order)
VALUES
  (
    'free',
    'Free Learner',
    'Essential CBT exam preparation and basic practice.',
    0, 'NGN', 'monthly',
    '["Full CBT examination portal", "1 mock exam per day", "10 AI Tutor hints per day", "Public leaderboards"]'::jsonb,
    '{"cbt_access": true, "cbt_unlimited": false, "cbt_daily_limit": 1, "cbt_corrections": false, "offline_saving": false, "ai_tutor_enabled": true, "ai_monthly_quota": 50, "ai_voice_tutor": false, "classroom_access": false, "competitions_included": false, "advanced_analytics": false, "certificates_issued": false, "calculator_type": "standard", "vip_support": false}'::jsonb,
    1
  ),
  (
    'premium',
    'Premium Study',
    'Enhanced practice with step-by-step AI explanations and full topic mastery.',
    150000, 'NGN', 'monthly',
    '["Everything in Free", "Unlimited CBT mock exams", "Full corrections & explanations", "500 AI Tutor hints per month", "Live classroom access", "Competition Arena", "Detailed analytics"]'::jsonb,
    '{"cbt_access": true, "cbt_unlimited": true, "cbt_daily_limit": 999999, "cbt_corrections": true, "offline_saving": true, "ai_tutor_enabled": true, "ai_monthly_quota": 500, "ai_voice_tutor": false, "classroom_access": true, "competitions_included": true, "advanced_analytics": true, "certificates_issued": false, "calculator_type": "scientific", "vip_support": false}'::jsonb,
    2
  ),
  (
    'plus',
    'BrainLab Plus',
    'Enhanced AI coaching, certificates and all premium features.',
    300000, 'NGN', 'monthly',
    '["Everything in Premium", "1,500 AI Tutor hints per month", "Downloadable certificates", "Priority support"]'::jsonb,
    '{"cbt_access": true, "cbt_unlimited": true, "cbt_daily_limit": 999999, "cbt_corrections": true, "offline_saving": true, "ai_tutor_enabled": true, "ai_monthly_quota": 1500, "ai_voice_tutor": false, "classroom_access": true, "competitions_included": true, "advanced_analytics": true, "certificates_issued": true, "calculator_type": "scientific", "vip_support": false}'::jsonb,
    3
  ),
  (
    'pro',
    'BrainLab Pro',
    'Unlimited AI coaching, voice tutor, VIP support and every BrainLab feature.',
    500000, 'NGN', 'monthly',
    '["Everything in Plus", "Unlimited AI Tutor", "AI Voice Tutor", "VIP support", "Early access to new features"]'::jsonb,
    '{"cbt_access": true, "cbt_unlimited": true, "cbt_daily_limit": 999999, "cbt_corrections": true, "offline_saving": true, "ai_tutor_enabled": true, "ai_monthly_quota": 999999, "ai_voice_tutor": true, "classroom_access": true, "competitions_included": true, "advanced_analytics": true, "certificates_issued": true, "calculator_type": "scientific", "vip_support": true}'::jsonb,
    4
  )
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  features    = EXCLUDED.features,
  entitlements = EXCLUDED.entitlements,
  display_order = EXCLUDED.display_order,
  updated_at  = now();

-- ============================================================================
-- 8. SUBSCRIPTION → ENTITLEMENT SYNC TRIGGER (safe to re-create)
-- ============================================================================
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
  IF NEW.status = 'active'
     AND NEW.current_period_end > now()
     AND v_plan_id IN ('premium', 'plus', 'pro') THEN

    v_questions := CASE v_plan_id
      WHEN 'premium' THEN 250
      WHEN 'plus'    THEN 400
      WHEN 'pro'     THEN 500
      ELSE 500
    END;

    -- Revoke any conflicting previous membership entitlements
    UPDATE public.learning_entitlements
    SET status = 'revoked', revoked_at = now()
    WHERE user_id = NEW.user_id
      AND entitlement_type = 'membership'
      AND status = 'active'
      AND revoked_at IS NULL;

    -- Insert fresh active membership matching the subscription
    INSERT INTO public.learning_entitlements (
      user_id, entitlement_type, membership_type, max_questions,
      status, permanent, starts_at, expires_at
    )
    VALUES (
      NEW.user_id,
      'membership',
      v_plan_id,
      v_questions,
      'active',
      false,
      COALESCE(NEW.current_period_start, now()),
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

-- ============================================================================
-- 9. ADMIN GRANT RPC — PRODUCTION-SAFE VERSION
-- Uses SELECT+UPDATE or INSERT pattern instead of ON CONFLICT to be safe
-- whether or not the unique constraint was just added.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_grant_candidate_subscription(
  p_user_id uuid,
  p_plan_id text,
  p_duration_days integer,
  p_reason text DEFAULT NULL,
  p_admin_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_plan_id    text := lower(trim(coalesce(p_plan_id, '')));
  v_plan_name  text;
  v_start      timestamptz := now();
  v_end        timestamptz;
  v_questions  integer;
  v_existing_id uuid;
BEGIN
  -- Guard: only service_role or postgres may invoke this
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  -- Verify candidate exists
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'candidate_not_found', 'message', 'Candidate account was not found.');
  END IF;

  -- Validate plan
  IF v_plan_id NOT IN ('premium', 'plus', 'pro') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_plan', 'message', 'Choose Premium Study, BrainLab Plus, or BrainLab Pro.');
  END IF;

  -- Validate duration
  IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 3650 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_duration', 'message', 'Duration must be between 1 and 3650 days.');
  END IF;

  -- Verify plan is active in subscription_plans
  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = v_plan_id AND is_active = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'plan_unavailable', 'message', 'The selected subscription plan is not currently available.');
  END IF;

  v_plan_name := CASE v_plan_id
    WHEN 'premium' THEN 'Premium Study'
    WHEN 'plus'    THEN 'BrainLab Plus'
    WHEN 'pro'     THEN 'BrainLab Pro'
  END;

  v_questions := CASE v_plan_id
    WHEN 'premium' THEN 250
    WHEN 'plus'    THEN 400
    WHEN 'pro'     THEN 500
    ELSE 500
  END;

  v_end := v_start + make_interval(days => p_duration_days);

  -- Safe upsert: check for existing row first, then UPDATE or INSERT
  SELECT id INTO v_existing_id
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.user_subscriptions SET
      plan_id               = v_plan_id,
      status                = 'active',
      current_period_start  = v_start,
      current_period_end    = v_end,
      cancel_at_period_end  = false,
      payment_provider      = 'admin_manual_grant',
      provider_subscription_id = 'ADMIN-GRANT-' || gen_random_uuid()::text,
      metadata              = jsonb_build_object(
        'grant_reason', COALESCE(p_reason, 'Direct Administrator Plan Upgrade'),
        'granted_by',   p_admin_email,
        'granted_at',   v_start,
        'validity_days', p_duration_days
      ),
      updated_at = v_start
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.user_subscriptions (
      user_id, plan_id, status, current_period_start, current_period_end,
      payment_provider, price_paid_kobo, currency, provider_subscription_id,
      cancel_at_period_end, metadata, updated_at
    )
    VALUES (
      p_user_id, v_plan_id, 'active', v_start, v_end,
      'admin_manual_grant', 0, 'NGN', 'ADMIN-GRANT-' || gen_random_uuid()::text,
      false,
      jsonb_build_object(
        'grant_reason', COALESCE(p_reason, 'Direct Administrator Plan Upgrade'),
        'granted_by',   p_admin_email,
        'granted_at',   v_start,
        'validity_days', p_duration_days
      ),
      v_start
    );
  END IF;

  -- Revoke any prior active membership entitlements
  UPDATE public.learning_entitlements
  SET status = 'revoked', revoked_at = v_start
  WHERE user_id = p_user_id
    AND entitlement_type = 'membership'
    AND membership_type IN ('premium', 'plus', 'pro')
    AND status = 'active'
    AND revoked_at IS NULL;

  -- Insert fresh membership entitlement
  INSERT INTO public.learning_entitlements (
    user_id, entitlement_type, membership_type, max_questions,
    status, permanent, starts_at, expires_at
  )
  VALUES (
    p_user_id, 'membership', v_plan_id, v_questions,
    'active', false, v_start, v_end
  );

  -- Notify candidate (only if notifications table exists on production)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    INSERT INTO public.notifications (user_id, title, message, type, is_read, created_at)
    VALUES (
      p_user_id,
      '🎉 Account Upgraded to ' || v_plan_name,
      'Your account has been upgraded to ' || v_plan_name ||
        ' for ' || p_duration_days || ' days. Your learning entitlements are now active until ' ||
        to_char(v_end, 'DD Mon YYYY') || '.',
      'subscription', false, v_start
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',           true,
    'plan_id',      v_plan_id,
    'plan_name',    v_plan_name,
    'validity_days', p_duration_days,
    'expires_at',   v_end,
    'max_questions', v_questions,
    'message', 'Candidate upgraded to ' || v_plan_name || '. Subscription and learning entitlements are now active.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_grant_candidate_subscription(uuid, text, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_grant_candidate_subscription(uuid, text, integer, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_grant_candidate_subscription(uuid, text, integer, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_candidate_subscription(uuid, text, integer, text, text) TO service_role;

-- ============================================================================
-- 10. AUTHORITATIVE ENTITLEMENT RPC — PRODUCTION HARDENED
-- Identical logic to 20261105200000 but WITH table existence guards so it
-- degrades gracefully even if learning_entitlements is somehow absent.
-- ============================================================================
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
  v_is_admin    boolean := false;
  v_now         timestamptz := now();
  v_sub_record  RECORD;
  v_ent_record  RECORD;
  v_plan_id     text := 'free';
  v_plan_name   text := 'Free Learner';
  v_is_subscribed boolean := false;
  v_expires_at  timestamptz := NULL;
  v_max_questions integer := 50;
  v_entitlements jsonb;
BEGIN
  -- Return free tier for unauthenticated calls
  IF v_target_user IS NULL THEN
    RETURN jsonb_build_object(
      'is_subscribed', false,
      'plan_id', 'free',
      'plan_name', 'Free Learner',
      'expires_at', null,
      'max_questions', 50,
      'entitlements', jsonb_build_object(
        'cbt_access', true, 'cbt_unlimited', false, 'cbt_daily_limit', 1,
        'cbt_corrections', false, 'offline_saving', false,
        'ai_tutor_enabled', true, 'ai_monthly_quota', 50, 'ai_voice_tutor', false,
        'classroom_access', false, 'competitions_included', false,
        'advanced_analytics', false, 'certificates_issued', false,
        'calculator_type', 'standard', 'vip_support', false
      )
    );
  END IF;

  -- Check administrator VIP status
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
        'cbt_access', true, 'cbt_unlimited', true, 'cbt_daily_limit', 999999,
        'cbt_corrections', true, 'offline_saving', true,
        'ai_tutor_enabled', true, 'ai_monthly_quota', 999999, 'ai_voice_tutor', true,
        'classroom_access', true, 'competitions_included', true,
        'advanced_analytics', true, 'certificates_issued', true,
        'calculator_type', 'scientific', 'vip_support', true
      )
    );
  END IF;

  -- Inspect user_subscriptions (guarded)
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

  -- Inspect learning_entitlements (guarded)
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

  -- Resolve effective tier
  DECLARE
    v_sub_tier text := lower(coalesce(v_sub_record.plan_id, ''));
    v_ent_tier text := lower(coalesce(v_ent_record.membership_type, ''));
    v_sub_rank int  := CASE v_sub_tier WHEN 'pro' THEN 3 WHEN 'plus' THEN 2 WHEN 'premium' THEN 1 ELSE 0 END;
    v_ent_rank int  := CASE v_ent_tier WHEN 'pro' THEN 3 WHEN 'plus' THEN 2 WHEN 'premium' THEN 1 ELSE 0 END;
  BEGIN
    IF v_ent_rank >= v_sub_rank AND v_ent_rank > 0 THEN
      v_plan_id      := v_ent_tier;
      v_is_subscribed:= true;
      v_expires_at   := CASE WHEN v_ent_record.permanent THEN NULL ELSE v_ent_record.expires_at END;
      v_max_questions:= coalesce(v_ent_record.max_questions, CASE v_ent_tier WHEN 'pro' THEN 500 WHEN 'plus' THEN 400 ELSE 250 END);
    ELSIF v_sub_rank > 0 THEN
      v_plan_id      := v_sub_tier;
      v_is_subscribed:= true;
      v_expires_at   := v_sub_record.current_period_end;
      v_max_questions:= CASE v_sub_tier WHEN 'pro' THEN 500 WHEN 'plus' THEN 400 ELSE 250 END;
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
        'cbt_access', true, 'cbt_unlimited', false, 'cbt_daily_limit', 1,
        'cbt_corrections', false, 'offline_saving', false,
        'ai_tutor_enabled', true, 'ai_monthly_quota', 50, 'ai_voice_tutor', false,
        'classroom_access', false, 'competitions_included', false,
        'advanced_analytics', false, 'certificates_issued', false,
        'calculator_type', 'standard', 'vip_support', false
      )
    );
  END IF;

  v_plan_name := CASE v_plan_id
    WHEN 'premium' THEN 'Premium Study'
    WHEN 'plus'    THEN 'BrainLab Plus'
    WHEN 'pro'     THEN 'BrainLab Pro'
    ELSE initcap(v_plan_id)
  END;

  v_entitlements := CASE v_plan_id
    WHEN 'pro' THEN jsonb_build_object(
      'cbt_access', true, 'cbt_unlimited', true, 'cbt_daily_limit', 999999,
      'cbt_corrections', true, 'offline_saving', true,
      'ai_tutor_enabled', true, 'ai_monthly_quota', 999999, 'ai_voice_tutor', true,
      'classroom_access', true, 'competitions_included', true,
      'advanced_analytics', true, 'certificates_issued', true,
      'calculator_type', 'scientific', 'vip_support', true
    )
    WHEN 'plus' THEN jsonb_build_object(
      'cbt_access', true, 'cbt_unlimited', true, 'cbt_daily_limit', 999999,
      'cbt_corrections', true, 'offline_saving', true,
      'ai_tutor_enabled', true, 'ai_monthly_quota', 1500, 'ai_voice_tutor', false,
      'classroom_access', true, 'competitions_included', true,
      'advanced_analytics', true, 'certificates_issued', true,
      'calculator_type', 'scientific', 'vip_support', false
    )
    ELSE -- premium
      jsonb_build_object(
        'cbt_access', true, 'cbt_unlimited', true, 'cbt_daily_limit', 999999,
        'cbt_corrections', true, 'offline_saving', true,
        'ai_tutor_enabled', true, 'ai_monthly_quota', 500, 'ai_voice_tutor', false,
        'classroom_access', true, 'competitions_included', true,
        'advanced_analytics', true, 'certificates_issued', false,
        'calculator_type', 'scientific', 'vip_support', false
      )
  END;

  RETURN jsonb_build_object(
    'is_subscribed', true,
    'plan_id',       v_plan_id,
    'plan_name',     v_plan_name,
    'expires_at',    v_expires_at,
    'max_questions', v_max_questions,
    'entitlements',  v_entitlements
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_authoritative_learner_entitlements(uuid) TO anon, authenticated, service_role;

-- ============================================================================
-- 11. SCHEMA PRIVILEGES (ensure authenticated role can query all tables)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- 12. VERIFICATION CHECK (Read-Only — confirms objects were created)
-- ============================================================================
DO $$
DECLARE
  v_tables text[] := ARRAY[
    'subscription_plans', 'user_subscriptions', 'learning_entitlements',
    'payment_transactions', 'configuration_audit_logs'
  ];
  v_tbl text;
  v_missing text[] := '{}';
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_tbl
    ) THEN
      v_missing := array_append(v_missing, v_tbl);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE WARNING 'Phase 1 script completed but these tables are still missing: %', array_to_string(v_missing, ', ');
  ELSE
    RAISE NOTICE 'Phase 1 verification PASSED: all 5 subscription/entitlement tables are present.';
  END IF;

  -- Verify UNIQUE constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_subscriptions'::regclass
      AND conname = 'user_subscriptions_user_id_key'
  ) THEN
    RAISE WARNING 'UNIQUE constraint on user_subscriptions(user_id) is MISSING — admin grant will fail.';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on user_subscriptions(user_id) confirmed present.';
  END IF;

  -- Verify plan rows
  IF (SELECT count(*) FROM public.subscription_plans WHERE id IN ('free','premium','plus','pro')) < 4 THEN
    RAISE WARNING 'Some subscription plan rows are missing from subscription_plans.';
  ELSE
    RAISE NOTICE 'All 4 subscription plans (free, premium, plus, pro) are present.';
  END IF;
END $$;

COMMIT;
