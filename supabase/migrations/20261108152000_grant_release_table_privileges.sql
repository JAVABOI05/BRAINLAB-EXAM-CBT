-- Migration: 20261108152000_grant_release_table_privileges.sql
-- Explicit SQL privileges required in addition to RLS policies.
-- Every granted operation remains filtered by the table's RLS policies.

BEGIN;

GRANT SELECT ON public.platform_configuration TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_configuration TO authenticated;

GRANT SELECT ON public.exam_calendar_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exam_calendar_events TO authenticated;

GRANT INSERT ON public.tutor_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.tutor_applications TO authenticated;

GRANT INSERT ON public.platform_analytics_events TO anon, authenticated;
GRANT SELECT ON public.platform_analytics_events TO authenticated;

COMMIT;
