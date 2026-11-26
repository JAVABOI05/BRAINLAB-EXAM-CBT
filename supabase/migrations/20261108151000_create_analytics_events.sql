-- Migration: 20261108151000_create_analytics_events.sql
-- Description: Creates first-party anonymous analytics events store with strict RLS and zero PII requirements.

CREATE TABLE IF NOT EXISTS public.platform_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL CHECK (event_name IN (
    'programme_viewed',
    'programme_selected',
    'channel_join_clicked',
    'countdown_viewed',
    'free_practice_started',
    'demo_completed',
    'signup_started',
    'signup_completed',
    'enrolment_started',
    'payment_completed',
    'school_enquiry_submitted',
    'tutor_application_submitted'
  )),
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.platform_analytics_events ENABLE ROW LEVEL SECURITY;

-- 1. Anonymous and authenticated public visitors can only INSERT validated events
DROP POLICY IF EXISTS "Public can record analytics events" ON public.platform_analytics_events;
CREATE POLICY "Public can record analytics events"
  ON public.platform_analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Strict read protection: Only verified administrators can SELECT analytics events
DROP POLICY IF EXISTS "Administrators can read analytics events" ON public.platform_analytics_events;
CREATE POLICY "Administrators can read analytics events"
  ON public.platform_analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
      AND admin_profiles.role IN ('super_admin', 'platform_admin', 'analytics_admin')
    )
  );

-- Indexes for time-series aggregation and funnel conversion calculations
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.platform_analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.platform_analytics_events (event_name);
