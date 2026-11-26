-- Rollback Migration: 20261108151000_rollback_analytics_events.sql
-- Description: Clean teardown of platform_analytics_events table, policies, and indexes.

DROP POLICY IF EXISTS "Administrators can read analytics events" ON public.platform_analytics_events;
DROP POLICY IF EXISTS "Public can record analytics events" ON public.platform_analytics_events;
DROP TABLE IF EXISTS public.platform_analytics_events CASCADE;
