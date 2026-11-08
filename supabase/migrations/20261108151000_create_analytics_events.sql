-- Migration: 20261108151000_create_analytics_events.sql
-- First-party anonymous analytics with bounded payloads and no sensitive keys.

BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL CHECK (event_name IN (
    'programme_viewed', 'programme_selected', 'channel_join_clicked',
    'countdown_viewed', 'free_practice_started', 'demo_completed',
    'signup_started', 'signup_completed', 'enrolment_started',
    'payment_completed', 'school_enquiry_submitted', 'tutor_application_submitted'
  )),
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_hash TEXT CHECK (session_hash IS NULL OR session_hash ~ '^[a-f0-9]{16}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT analytics_payload_object CHECK (jsonb_typeof(event_payload) = 'object'),
  CONSTRAINT analytics_payload_size CHECK (octet_length(event_payload::text) <= 2048),
  CONSTRAINT analytics_payload_allowed_keys CHECK (
    event_payload - ARRAY[
      'programme_slug', 'programme_title', 'is_planned', 'slot', 'source',
      'auth_provider', 'role', 'mode', 'subjects_count', 'plan_id',
      'exam_type', 'student_cohort', 'channel', 'placement', 'demo_type',
      'parameter', 'value', 'programme_id', 'title', 'qualification', 'exam'
    ] = '{}'::jsonb
  ),
  CONSTRAINT analytics_payload_no_sensitive_keys CHECK (
    event_payload::text !~* '"[^"]*(password|passcode|token|secret|email|phone|mobile|full.?name|address|bvn|nin|card|cvv|account.?number|answer|statement)[^"]*"\s*:'
  ),
  CONSTRAINT analytics_payload_no_email_values CHECK (
    event_payload::text !~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
  )
);

ALTER TABLE public.platform_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can record analytics events" ON public.platform_analytics_events;
CREATE POLICY "Public can record analytics events"
  ON public.platform_analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    jsonb_typeof(event_payload) = 'object'
    AND octet_length(event_payload::text) <= 2048
  );

DROP POLICY IF EXISTS "Administrators can read analytics events" ON public.platform_analytics_events;
CREATE POLICY "Administrators can read analytics events"
  ON public.platform_analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.role IN ('super_admin', 'platform_admin', 'analytics_admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.platform_analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.platform_analytics_events (event_name);

COMMIT;
