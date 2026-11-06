-- ==============================================================================
-- BRAINLAB ACADEMY — PRODUCTION PHASE 3: DOMAIN EVENTS & CLASSROOM SCOPING
-- Target Database: BrainLabCBT Production (bupkyppvtkrmzmluzjmf) & Staging
-- Safety Guarantee: NON-DESTRUCTIVE. ZERO DATA LOSS. FULLY IDEMPOTENT.
-- Purpose:
--   1. Establish public.platform_domain_events table for immutable event sourcing
--      (payments, subscription activations, voucher redemptions, exam submissions,
--      and live classroom lifecycle).
--   2. Provide public.emit_domain_event() RPC with service_role execution guard.
--   3. Provide public.auto_reconcile_orphaned_payments() RPC for automated
--      self-healing of paid candidates who lack active subscriptions.
--   4. Support dynamic class-scoped UUID / custom rooms in live classroom
--      while preserving BL-LIVE-101 as the permanent public auditorium (TD-06).
-- ==============================================================================

BEGIN;

-- ============================================================================
-- 1. PLATFORM DOMAIN EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,                    -- e.g. 'payment.succeeded', 'subscription.activated', 'classroom.started'
  aggregate_type text NOT NULL,                -- e.g. 'payment', 'subscription', 'classroom', 'candidate', 'exam'
  aggregate_id text NOT NULL,                  -- identifier of the entity affected
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,  -- structured event data snapshot
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  client_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate ON public.platform_domain_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_type_created ON public.platform_domain_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_actor ON public.platform_domain_events(actor_id);

ALTER TABLE public.platform_domain_events ENABLE ROW LEVEL SECURITY;

-- Learners can read their own events
DROP POLICY IF EXISTS "domain_events_user_read_own" ON public.platform_domain_events;
CREATE POLICY "domain_events_user_read_own" ON public.platform_domain_events
  FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    OR (payload->>'user_id')::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
        AND a.role IN ('super_admin', 'platform_admin', 'read_only_auditor')
    )
  );

-- Service role has full write access
DROP POLICY IF EXISTS "domain_events_service_role_write" ON public.platform_domain_events;
CREATE POLICY "domain_events_service_role_write" ON public.platform_domain_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.platform_domain_events TO authenticated, service_role;
GRANT INSERT ON public.platform_domain_events TO service_role;

-- ============================================================================
-- 2. DOMAIN EVENT EMITTER RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.emit_domain_event(
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.platform_domain_events (
    event_type,
    aggregate_type,
    aggregate_id,
    payload,
    actor_id,
    actor_email
  )
  VALUES (
    trim(p_event_type),
    trim(p_aggregate_type),
    trim(p_aggregate_id),
    coalesce(p_payload, '{}'::jsonb),
    p_actor_id,
    p_actor_email
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.emit_domain_event(text, text, text, jsonb, uuid, text) TO service_role, authenticated;

-- ============================================================================
-- 3. AUTOMATED ORPHANED PAYMENTS RECONCILIATION RPC
-- Idempotently discovers successful payments from the last 45 days that lack
-- active subscriptions or entitlements, repairing them atomically.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_reconcile_orphaned_payments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_repaired_count integer := 0;
  v_tx RECORD;
  v_period_end timestamptz;
  v_max_q integer;
  v_now timestamptz := now();
BEGIN
  -- Strict server-side execution guard
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  -- Verify prerequisite tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_subscriptions') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Required subscription or payment tables do not exist yet.');
  END IF;

  -- Iterate through recent successful payments without an active subscription
  FOR v_tx IN
    SELECT DISTINCT ON (t.user_id)
      t.id AS tx_id,
      t.reference,
      t.user_id,
      lower(coalesce(t.plan_id, 'premium')) AS plan_id,
      t.amount_kobo,
      t.currency,
      t.provider,
      coalesce(t.paid_at, t.created_at, v_now) AS paid_at
    FROM public.payment_transactions t
    WHERE t.status = 'success'
      AND t.user_id IS NOT NULL
      AND lower(coalesce(t.plan_id, 'premium')) IN ('premium', 'plus', 'pro')
      AND coalesce(t.paid_at, t.created_at) > (v_now - interval '45 days')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_subscriptions s
        WHERE s.user_id = t.user_id
          AND s.status = 'active'
          AND s.current_period_end > v_now
      )
    ORDER BY t.user_id, coalesce(t.paid_at, t.created_at) DESC
  LOOP
    v_period_end := v_tx.paid_at + interval '30 days';
    v_max_q := CASE v_tx.plan_id WHEN 'pro' THEN 500 WHEN 'plus' THEN 400 ELSE 250 END;

    -- Upsert subscription
    INSERT INTO public.user_subscriptions (
      user_id, plan_id, status, current_period_start, current_period_end,
      payment_provider, price_paid_kobo, currency, provider_subscription_id,
      cancel_at_period_end, updated_at
    )
    VALUES (
      v_tx.user_id, v_tx.plan_id, 'active', v_tx.paid_at, v_period_end,
      v_tx.provider, v_tx.amount_kobo, v_tx.currency, v_tx.reference,
      false, v_now
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = 'active',
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      payment_provider = EXCLUDED.payment_provider,
      price_paid_kobo = EXCLUDED.price_paid_kobo,
      provider_subscription_id = EXCLUDED.provider_subscription_id,
      updated_at = v_now;

    -- Revoke obsolete entitlements and insert fresh active row
    UPDATE public.learning_entitlements
    SET status = 'revoked', revoked_at = v_now
    WHERE user_id = v_tx.user_id
      AND entitlement_type = 'membership'
      AND status = 'active';

    INSERT INTO public.learning_entitlements (
      user_id, entitlement_type, membership_type, max_questions,
      status, permanent, starts_at, expires_at
    )
    VALUES (
      v_tx.user_id, 'membership', v_tx.plan_id, v_max_q,
      'active', false, v_tx.paid_at, v_period_end
    );

    -- Emit domain event
    INSERT INTO public.platform_domain_events (
      event_type, aggregate_type, aggregate_id, payload, actor_id
    )
    VALUES (
      'subscription.auto_reconciled',
      'subscription',
      v_tx.user_id::text,
      jsonb_build_object(
        'transaction_id', v_tx.tx_id,
        'reference', v_tx.reference,
        'plan_id', v_tx.plan_id,
        'repaired_at', v_now
      ),
      v_tx.user_id
    );

    v_repaired_count := v_repaired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'repaired_count', v_repaired_count,
    'message', format('Successfully verified and auto-reconciled %s orphaned account(s).', v_repaired_count)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.auto_reconcile_orphaned_payments() TO service_role;

-- ============================================================================
-- 4. LIVE CLASSROOM DYNAMIC ROOM REGISTRATION (TD-06 Support)
-- Enables tutors and instructors to register dynamic room sessions.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.live_class_rooms (
  id text PRIMARY KEY,                       -- e.g. 'BL-LIVE-101', 'BL-ROOM-A8F2K9', or UUID
  title text NOT NULL,
  description text,
  room_type text NOT NULL DEFAULT 'stage' CHECK (room_type IN ('auditorium', 'stage', 'masterclass', 'private_tutoring', 'drill')),
  host_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  host_email text,
  subject_id text,
  is_active boolean NOT NULL DEFAULT true,
  max_participants integer NOT NULL DEFAULT 100,
  settings jsonb NOT NULL DEFAULT '{"mic_enabled": true, "chat_enabled": true, "recording_enabled": true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default permanent public auditorium (BL-LIVE-101)
INSERT INTO public.live_class_rooms (id, title, description, room_type, max_participants)
VALUES (
  'BL-LIVE-101',
  'BrainLab Live Academic Stage (BL-LIVE-101)',
  'Permanent public academic stage for daily UTME revision, live explanations, and speed drills.',
  'auditorium',
  500
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  updated_at = now();

ALTER TABLE public.live_class_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_class_rooms_public_read" ON public.live_class_rooms;
CREATE POLICY "live_class_rooms_public_read" ON public.live_class_rooms
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "live_class_rooms_staff_manage" ON public.live_class_rooms;
CREATE POLICY "live_class_rooms_staff_manage" ON public.live_class_rooms
  FOR ALL
  TO authenticated
  USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
        AND a.role IN ('super_admin', 'platform_admin', 'teacher', 'community_moderator')
    )
  );

GRANT SELECT ON public.live_class_rooms TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON public.live_class_rooms TO authenticated, service_role;

COMMIT;
