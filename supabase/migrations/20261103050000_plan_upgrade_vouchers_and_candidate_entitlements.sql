-- Migration: 20261103050000_plan_upgrade_vouchers_and_candidate_entitlements.sql
-- Purpose:
-- 1. Extend access_codes to support direct plan upgrades (grants_plan, validity_days, cohort).
-- 2. Provide atomic redeem_plan_voucher RPC that updates user_subscriptions and unlocks CBT corrections immediately.
-- 3. Intercept learning_access_codes redemption to seamlessly resolve access_codes vouchers.

-- 1. EXTEND ACCESS_CODES SCHEMA
ALTER TABLE IF EXISTS public.access_codes
  ADD COLUMN IF NOT EXISTS grants_plan TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS cohort TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_access_codes_grants_plan ON public.access_codes (grants_plan);
CREATE INDEX IF NOT EXISTS idx_access_codes_cohort ON public.access_codes (cohort);

-- 2. ATOMIC REDEMPTION RPC FOR PLAN UPGRADES
CREATE OR REPLACE FUNCTION public.redeem_plan_voucher(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_code TEXT := upper(trim(p_code));
  v_user_id UUID := coalesce(p_user_id, auth.uid());
  v_row public.access_codes%ROWTYPE;
  v_plan_id TEXT;
  v_plan_name TEXT;
  v_validity_days INTEGER;
  v_period_end TIMESTAMPTZ;
  v_notification_id UUID;
BEGIN
  IF v_clean_code IS NULL OR length(v_clean_code) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'empty_code',
      'message', 'Please enter a valid access PIN or voucher code.'
    );
  END IF;

  -- 1. Check access_codes table
  SELECT * INTO v_row
  FROM public.access_codes
  WHERE upper(trim(code)) = v_clean_code
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Fallback: check if learning_access_codes exists and has this code
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'learning_access_codes'
    ) THEN
      BEGIN
        RETURN public.redeem_learning_access_code(v_clean_code);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'not_found',
          'message', 'The PIN or voucher entered is invalid or does not exist.'
        );
      END;
    END IF;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'message', 'The PIN or voucher entered is invalid or does not exist.'
    );
  END IF;

  -- 2. Verify code hasn't already been consumed
  IF v_row.is_used THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_used',
      'message', 'This PIN code has already been redeemed and is no longer valid.',
      'used_at', v_row.used_at
    );
  END IF;

  -- 3. Authentication requirement
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'auth_required',
      'message', 'You must be signed in to upgrade your account with this PIN voucher.',
      'plan_id', coalesce(v_row.grants_plan, 'premium')
    );
  END IF;

  -- 4. Determine target plan and validity duration
  v_plan_id := lower(trim(coalesce(nullif(v_row.grants_plan, ''), 'premium')));
  v_validity_days := coalesce(v_row.validity_days, 30);
  IF v_validity_days <= 0 THEN
    v_validity_days := 30;
  END IF;

  v_period_end := now() + (v_validity_days || ' days')::interval;

  v_plan_name := CASE v_plan_id
    WHEN 'premium' THEN 'Premium Study'
    WHEN 'plus' THEN 'BrainLab Plus'
    WHEN 'pro' THEN 'BrainLab Pro'
    ELSE initcap(v_plan_id)
  END;

  -- 5. Upsert active subscription into user_subscriptions
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
    metadata,
    updated_at
  )
  VALUES (
    v_user_id,
    v_plan_id,
    'active',
    now(),
    v_period_end,
    'voucher_pin',
    0,
    'NGN',
    'PIN-' || v_clean_code,
    jsonb_build_object(
      'pin_code', v_clean_code,
      'cohort', v_row.cohort,
      'subject', v_row.subject,
      'redeemed_at', now()
    ),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    payment_provider = 'voucher_pin',
    provider_subscription_id = EXCLUDED.provider_subscription_id,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  -- 6. Upsert into learning_entitlements if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'learning_entitlements'
  ) THEN
    BEGIN
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
        v_user_id,
        'tier_membership',
        v_plan_id,
        10000,
        'active',
        (v_validity_days >= 365),
        now(),
        v_period_end
      );
    EXCEPTION WHEN OTHERS THEN
      -- Non-fatal if learning_entitlements constraint differs
    END;
  END IF;

  -- 7. Mark access code as consumed
  UPDATE public.access_codes
  SET
    is_used = true,
    used_by = coalesce(v_user_id::text, p_phone, 'candidate'),
    used_at = now()
  WHERE id = v_row.id;

  -- 8. Deliver confirmation in-app notification if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    BEGIN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
      )
      VALUES (
        v_user_id,
        '🎉 Account Upgraded to ' || v_plan_name,
        'Your access voucher ' || v_clean_code || ' was redeemed successfully. You now have active access to full question corrections, solutions, and AI tutor explanations until ' || to_char(v_period_end, 'DD Mon YYYY') || '.',
        'subscription',
        false,
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Non-fatal
    END;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_clean_code,
    'plan_id', v_plan_id,
    'plan_name', v_plan_name,
    'validity_days', v_validity_days,
    'expires_at', v_period_end,
    'message', 'Congratulations! Your account has been upgraded to ' || v_plan_name || '. Full question solutions and AI corrections are now unlocked.'
  );
END;
$$;

-- Grant execution permissions
REVOKE ALL ON FUNCTION public.redeem_plan_voucher(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_plan_voucher(TEXT, UUID, TEXT) TO authenticated, service_role, anon;

-- 3. Seamlessly Bridge learning_access_codes redemption
CREATE OR REPLACE FUNCTION public.redeem_learning_access_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  c public.learning_access_codes%ROWTYPE;
  v_entitlement UUID;
  v_existing public.learning_access_code_redemptions%ROWTYPE;
  v_clean_code TEXT := upper(trim(coalesce(p_code, '')));
BEGIN
  IF v_user IS NULL THEN
    RETURN public._err('authentication_required', 'Sign in before redeeming an access code.');
  END IF;

  IF length(v_clean_code) < 4 OR length(v_clean_code) > 128 THEN
    RETURN public._err('invalid_code', 'Enter a valid access code.');
  END IF;

  -- Check if code matches an access_codes PIN voucher first
  IF EXISTS (
    SELECT 1 FROM public.access_codes
    WHERE upper(trim(code)) = v_clean_code
  ) THEN
    RETURN public.redeem_plan_voucher(v_clean_code, v_user);
  END IF;

  -- Proceed with native learning_access_codes resolution
  SELECT * INTO c
  FROM public.learning_access_codes
  WHERE code_hash = encode(extensions.digest(v_clean_code, 'sha256'), 'hex')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN public._err('invalid_code', 'This access code is invalid.');
  END IF;

  IF c.assigned_user_id IS NOT NULL AND c.assigned_user_id <> v_user THEN
    RETURN public._err('code_assigned_to_another_account', 'This code was issued to a different account.');
  END IF;

  SELECT * INTO v_existing
  FROM public.learning_access_code_redemptions
  WHERE access_code_id = c.id AND user_id = v_user;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_redeemed', true,
      'scope_type', c.scope_type,
      'entitlement_id', v_existing.entitlement_id,
      'permanent', c.permanent,
      'expires_at', c.expires_at
    );
  END IF;

  IF c.revoked_at IS NOT NULL THEN
    RETURN public._err('code_revoked', 'This access code has been revoked.');
  END IF;

  IF NOT c.permanent AND c.expires_at <= now() THEN
    RETURN public._err('code_expired', 'This access code has expired.');
  END IF;

  IF c.redemption_count >= c.max_redemptions THEN
    RETURN public._err('code_fully_redeemed', 'This access code has already been used the maximum number of times.');
  END IF;

  INSERT INTO public.learning_entitlements(
    user_id,
    entitlement_type,
    membership_type,
    resource_key,
    organisation_id,
    assessment_id,
    max_questions,
    status,
    permanent,
    expires_at,
    created_by
  )
  VALUES (
    v_user,
    CASE c.scope_type
      WHEN 'membership' THEN 'membership'
      WHEN 'assessment' THEN 'assessment'
      WHEN 'resource' THEN 'resource'
      ELSE 'organisation'
    END,
    c.membership_type,
    c.resource_key,
    c.organisation_id,
    c.assessment_id,
    c.max_questions,
    'active',
    c.permanent,
    c.expires_at,
    c.created_by
  )
  RETURNING id INTO v_entitlement;

  -- Also activate user_subscriptions if membership_type maps to a plan
  IF c.scope_type = 'membership' AND c.membership_type IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      payment_provider,
      metadata,
      updated_at
    )
    VALUES (
      v_user,
      lower(c.membership_type),
      'active',
      now(),
      coalesce(c.expires_at, now() + interval '365 days'),
      'learning_voucher',
      jsonb_build_object('learning_code_id', c.id),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = 'active',
      current_period_end = EXCLUDED.current_period_end,
      updated_at = now();
  END IF;

  IF c.scope_type = 'organisation' THEN
    INSERT INTO public.learning_organisation_members(organisation_id, user_id, member_role, status, invited_by)
    VALUES (c.organisation_id, v_user, 'learner', 'active', c.created_by)
    ON CONFLICT (organisation_id, user_id) DO UPDATE SET status = 'active';
  END IF;

  INSERT INTO public.learning_access_code_redemptions(access_code_id, user_id, entitlement_id)
  VALUES (c.id, v_user, v_entitlement);

  UPDATE public.learning_access_codes
  SET redemption_count = redemption_count + 1
  WHERE id = c.id;

  INSERT INTO public.audit_logs(action, target_table, target_id, details)
  VALUES (
    'learning_access_code_redeemed',
    'learning_access_codes',
    c.id::text,
    jsonb_build_object('scope_type', c.scope_type, 'user_id', v_user, 'entitlement_id', v_entitlement)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'already_redeemed', false,
    'scope_type', c.scope_type,
    'entitlement_id', v_entitlement,
    'permanent', c.permanent,
    'expires_at', c.expires_at,
    'max_questions', c.max_questions
  );
END;
$$;
