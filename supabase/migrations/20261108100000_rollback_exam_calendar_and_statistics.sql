-- ====================================================================
-- BRAINLAB ACADEMY: ROLLBACK EXAM CALENDAR & DYNAMIC SLOTS SCHEMA
-- ====================================================================

BEGIN;

DROP POLICY IF EXISTS "Admins can manage all exam calendar events" ON public.exam_calendar_events;
DROP POLICY IF EXISTS "Public can view published exam calendar events" ON public.exam_calendar_events;
DROP INDEX IF EXISTS idx_exam_calendar_programme;
DROP INDEX IF EXISTS idx_exam_calendar_published_active;
DROP TABLE IF EXISTS public.exam_calendar_events;

COMMIT;
