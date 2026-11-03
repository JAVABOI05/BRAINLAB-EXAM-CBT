-- Keep manual admin grants and learner entitlements in one transaction.
-- Existing active manual grants are backfilled below.

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
  v_questions integer := 500;
BEGIN
  -- This RPC is called only by the authenticated server route using its
  -- Supabase service-role client; browser roles must never execute it.
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'candidate_not_found',
      'message', 'Candidate account was not found.');
  END IF;

  IF v_plan_id NOT IN ('premium', 'plus', 'pro') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_plan',
      'message', 'Choose Premium Study, BrainLab Plus, or BrainLab Pro.');
  END IF;

  IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 3650 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_duration',
      'message', 'Subscription duration must be between 1 and 3650 days.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_plans
    WHERE id = v_plan_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'plan_unavailable',
      'message', 'The selected subscription plan is not currently available.');
  END IF;

  v_plan_name := CASE v_plan_id
    WHEN 'premium' THEN 'Premium Study'
    WHEN 'plus' THEN 'BrainLab Plus'
    WHEN 'pro' THEN 'BrainLab Pro'
  END;
  v_end := v_start + make_interval(days => p_duration_days);

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

  -- Replace any previous active membership instead of stacking conflicting
  -- premium tiers. Other entitlement types (assessment/resource/org) remain.
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

-- Repair active manual admin upgrades created before the entitlement write was
-- corrected. Do not alter expired subscriptions or unrelated voucher plans.
WITH candidates AS (
  SELECT DISTINCT ON (s.user_id)
    s.user_id, s.plan_id, s.current_period_start, s.current_period_end
  FROM public.user_subscriptions s
  WHERE s.payment_provider = 'admin_manual_grant'
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
  c.user_id, 'membership', c.plan_id, 500,
  'active', false, coalesce(c.current_period_start, now()), c.current_period_end
FROM candidates c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.learning_entitlements e
  WHERE e.user_id = c.user_id
    AND e.entitlement_type = 'membership'
    AND e.membership_type IN ('premium', 'plus', 'pro')
    AND e.status = 'active'
    AND e.revoked_at IS NULL
    AND e.starts_at <= now()
    AND (e.permanent OR e.expires_at > now())
);
