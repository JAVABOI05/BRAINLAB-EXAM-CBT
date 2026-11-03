-- -----------------------------------------------------------------------------
-- BrainLab Academy: Synchronize Admin Subscription Grants, PIN Vouchers,
-- and Learner Entitlements into Single Atomic Transactions
-- -----------------------------------------------------------------------------

-- 1. Admin Manual Subscription Grant RPC
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
  v_plan_id text := lower(trim(coalesce(p_plan_id, '')));
  v_plan_name text;
  v_start timestamptz := now();
  v_end timestamptz;
  v_questions integer;
BEGIN
  -- Strict server-side execution guard: browser/client roles must NEVER invoke this RPC
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'candidate_not_found',
      'message', 'Candidate account was not found.'
    );
  END IF;

  IF v_plan_id NOT IN ('premium', 'plus', 'pro') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invalid_plan',
      'message', 'Choose Premium Study, BrainLab Plus, or BrainLab Pro.'
    );
  END IF;

  IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 3650 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invalid_duration',
      'message', 'Subscription duration must be between 1 and 3650 days.'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_plans
    WHERE id = v_plan_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'plan_unavailable',
      'message', 'The selected subscription plan is not currently available.'
    );
  END IF;

  v_plan_name := CASE v_plan_id
    WHEN 'premium' THEN 'Premium Study'
    WHEN 'plus' THEN 'BrainLab Plus'
    WHEN 'pro' THEN 'BrainLab Pro'
  END;

  -- Apply appropriate question allowance matching plan capabilities within constraint [1, 500]
  v_questions := CASE v_plan_id
    WHEN 'premium' THEN 250
    WHEN 'plus' THEN 400
    WHEN 'pro' THEN 500
    ELSE 500
  END;

  v_end := v_start + make_interval(days => p_duration_days);

  -- Upsert active subscription record
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
      'grant_reason', coalesce(p_reason, 'Direct Administrator Plan Upgrade'),
      'granted_by', p_admin_email,
      'granted_at', v_start,
      'validity_days', p_duration_days
    ),
    v_start
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = false,
    payment_provider = 'admin_manual_grant',
    provider_subscription_id = EXCLUDED.provider_subscription_id,
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at;

  -- Replace any previous active membership entitlement instead of stacking conflicting tiers
  UPDATE public.learning_entitlements
  SET status = 'revoked', revoked_at = v_start
  WHERE user_id = p_user_id
    AND entitlement_type = 'membership'
    AND membership_type IN ('premium', 'plus', 'pro')
    AND status = 'active'
    AND revoked_at IS NULL;

  INSERT INTO public.learning_entitlements (
    user_id, entitlement_type, membership_type, max_questions,
    status, permanent, starts_at, expires_at
  )
  VALUES (
    p_user_id, 'membership', v_plan_id, v_questions,
    'active', false, v_start, v_end
  );

  INSERT INTO public.notifications (
    user_id, title, message, type, is_read, created_at
  )
  VALUES (
    p_user_id,
    '🎉 Account Upgraded to ' || v_plan_name,
    'Your account has been upgraded to ' || v_plan_name ||
      ' for ' || p_duration_days || ' days. Your learning entitlements are now active until ' ||
      to_char(v_end, 'DD Mon YYYY') || '.',
    'subscription', false, v_start
  );

  RETURN jsonb_build_object(
    'ok', true,
    'plan_id', v_plan_id,
    'plan_name', v_plan_name,
    'validity_days', p_duration_days,
    'expires_at', v_end,
    'max_questions', v_questions,
    'message', 'Candidate upgraded to ' || v_plan_name ||
      '. Subscription and learning entitlements are active.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_grant_candidate_subscription(uuid, text, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_grant_candidate_subscription(uuid, text, integer, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_grant_candidate_subscription(uuid, text, integer, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_candidate_subscription(uuid, text, integer, text, text) TO service_role;


-- 2. PIN / Voucher Redemption RPC (Atomically updates subscription, entitlement, and access_codes)
CREATE OR REPLACE FUNCTION public.redeem_plan_voucher(
  p_code text,
  p_user_id uuid DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_clean_code text := upper(trim(coalesce(p_code, '')));
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_row public.access_codes%ROWTYPE;
  v_plan_id text;
  v_plan_name text;
  v_validity_days integer;
  v_period_end timestamptz;
  v_questions integer;
BEGIN
  IF v_clean_code IS NULL OR length(v_clean_code) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'empty_code',
      'message', 'Please enter a valid access PIN or voucher code.'
    );
  END IF;

  -- 1. Check access_codes table with row-level lock
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

  -- 2. Verify code has not already been used
  IF coalesce(v_row.is_used, false) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_used',
      'message', 'This PIN code has already been redeemed and is no longer valid.',
      'used_at', v_row.used_at
    );
  END IF;

  -- 3. Preserve Single Exam Pass behavior: A null or non-subscription grants_plan must NEVER become a subscription
  IF v_row.grants_plan IS NULL OR trim(v_row.grants_plan) = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'single_exam_pass',
      'message', 'This PIN is a Single Exam CBT access code for taking mock examinations. It cannot be converted into a subscription membership. Please enter it directly on the CBT exam page to begin your test.'
    );
  END IF;

  v_plan_id := lower(trim(v_row.grants_plan));
  IF v_plan_id NOT IN ('premium', 'plus', 'pro') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invalid_plan',
      'message', 'This PIN grants an unrecognized plan (' || v_row.grants_plan || '). Choose Premium, Plus, or Pro.'
    );
  END IF;

  -- 4. Authentication requirement
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'auth_required',
      'message', 'Please sign in or create an account to activate this ' || initcap(v_plan_id) || ' voucher code on your profile.',
      'plan_id', v_plan_id
    );
  END IF;

  -- 5. Calculate validity period & question allowances
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

  v_questions := CASE v_plan_id
    WHEN 'premium' THEN 250
    WHEN 'plus' THEN 400
    WHEN 'pro' THEN 500
    ELSE 500
  END;

  -- 6. Upsert into user_subscriptions
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
      'redeemed_at', now(),
      'validity_days', v_validity_days
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

  -- 7. Revoke previous active membership entitlements
  UPDATE public.learning_entitlements
  SET status = 'revoked', revoked_at = now()
  WHERE user_id = v_user_id
    AND entitlement_type = 'membership'
    AND membership_type IN ('premium', 'plus', 'pro')
    AND status = 'active'
    AND revoked_at IS NULL;

  -- 8. Insert new active membership entitlement strictly satisfying table check constraints
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
    'membership',
    v_plan_id,
    v_questions,
    'active',
    false,
    now(),
    v_period_end
  );

  -- 9. Mark access code as consumed atomically
  UPDATE public.access_codes
  SET
    is_used = true,
    used_by = coalesce(v_user_id::text, p_phone, 'candidate'),
    used_at = now()
  WHERE id = v_row.id;

  -- 10. Deliver confirmation in-app notification
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
      'Your access voucher ' || v_clean_code || ' was redeemed successfully. You now have full access to CBT corrections, step-by-step solutions, and AI tutor explanations until ' || to_char(v_period_end, 'DD Mon YYYY') || '.',
      'subscription',
      false,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal if notifications table differs
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_clean_code,
    'plan_id', v_plan_id,
    'plan_name', v_plan_name,
    'validity_days', v_validity_days,
    'expires_at', v_period_end,
    'max_questions', v_questions,
    'message', 'Congratulations! Your account has been upgraded to ' || v_plan_name || '. Full CBT corrections and study features are unlocked until ' || to_char(v_period_end, 'DD Mon YYYY') || '.'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.redeem_plan_voucher(text, uuid, text) TO authenticated, service_role;


-- 3. Idempotent Backfill: Repair active admin grants and vouchers missing entitlements
WITH active_subscriptions AS (
  SELECT DISTINCT ON (s.user_id)
    s.user_id, s.plan_id, s.current_period_start, s.current_period_end
  FROM public.user_subscriptions s
  WHERE s.payment_provider IN ('admin_manual_grant', 'voucher_pin')
    AND s.status = 'active'
    AND s.plan_id IN ('premium', 'plus', 'pro')
    AND s.current_period_end > now()
  ORDER BY s.user_id, s.updated_at DESC
)
INSERT INTO public.learning_entitlements (
  user_id, entitlement_type, membership_type, max_questions,
  status, permanent, starts_at, expires_at
)
SELECT
  a.user_id,
  'membership',
  a.plan_id,
  CASE a.plan_id WHEN 'premium' THEN 250 WHEN 'plus' THEN 400 WHEN 'pro' THEN 500 ELSE 500 END,
  'active',
  false,
  coalesce(a.current_period_start, now()),
  a.current_period_end
FROM active_subscriptions a
WHERE NOT EXISTS (
  SELECT 1
  FROM public.learning_entitlements e
  WHERE e.user_id = a.user_id
    AND e.entitlement_type = 'membership'
    AND e.membership_type IN ('premium', 'plus', 'pro')
    AND e.status = 'active'
    AND e.revoked_at IS NULL
    AND e.starts_at <= now()
    AND (e.permanent OR e.expires_at > now())
);
