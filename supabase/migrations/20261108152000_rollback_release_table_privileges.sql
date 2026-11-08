-- Rollback: 20261108152000_rollback_release_table_privileges.sql
-- Revoke only the explicit grants introduced by the paired migration.

BEGIN;

REVOKE INSERT, UPDATE, DELETE ON public.platform_configuration FROM authenticated;
REVOKE SELECT ON public.platform_configuration FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.exam_calendar_events FROM authenticated;
REVOKE SELECT ON public.exam_calendar_events FROM anon, authenticated;

REVOKE INSERT ON public.tutor_applications FROM anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON public.tutor_applications FROM authenticated;

REVOKE INSERT ON public.platform_analytics_events FROM anon, authenticated;
REVOKE SELECT ON public.platform_analytics_events FROM authenticated;

COMMIT;
