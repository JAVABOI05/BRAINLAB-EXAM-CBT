-- ====================================================================
-- BRAINLAB ACADEMY: EXAM CALENDAR & DYNAMIC SLOTS SCHEMA
-- Migration: 20261108100000_exam_calendar_and_statistics.sql
-- Safe for the production schema: uses the existing admin permission
-- function and creates the configuration table required by this feature.
-- ====================================================================

BEGIN;

-- The calendar API also stores public channel configuration here.
-- Production did not previously have this table; staging already does.
CREATE TABLE IF NOT EXISTS public.platform_configuration (
    key TEXT PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'general',
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    is_secret BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_configuration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read non-secret platform configuration" ON public.platform_configuration;
CREATE POLICY "Public can read non-secret platform configuration"
    ON public.platform_configuration
    FOR SELECT
    TO anon, authenticated
    USING (is_secret = false);

DROP POLICY IF EXISTS "Admins can manage platform configuration" ON public.platform_configuration;
CREATE POLICY "Admins can manage platform configuration"
    ON public.platform_configuration
    FOR ALL
    TO authenticated
    USING (public.admin_has_permission('platform.config.manage'))
    WITH CHECK (public.admin_has_permission('platform.config.manage'));

CREATE TABLE IF NOT EXISTS public.exam_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    programme TEXT NOT NULL DEFAULT 'utme'
        CHECK (programme IN ('utme', 'waec', 'neco', 'post_utme', 'all')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    short_note TEXT,
    official_source_url TEXT,
    placement TEXT NOT NULL DEFAULT 'both'
        CHECK (placement IN ('landing', 'dashboard', 'both')),
    priority INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_exam_calendar_dates CHECK (end_time IS NULL OR end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_exam_calendar_published_active
    ON public.exam_calendar_events (status, placement, priority ASC, start_time ASC)
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_exam_calendar_programme
    ON public.exam_calendar_events (programme, status, start_time ASC)
    WHERE status = 'published';

ALTER TABLE public.exam_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published exam calendar events" ON public.exam_calendar_events;
CREATE POLICY "Public can view published exam calendar events"
    ON public.exam_calendar_events
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage all exam calendar events" ON public.exam_calendar_events;
CREATE POLICY "Admins can manage all exam calendar events"
    ON public.exam_calendar_events
    FOR ALL
    TO authenticated
    USING (public.admin_has_permission('exam.calendar.manage'))
    WITH CHECK (public.admin_has_permission('exam.calendar.manage'));

INSERT INTO public.exam_calendar_events (
    name, short_name, programme, start_time, end_time, short_note,
    official_source_url, placement, priority, status
) VALUES (
    '2027 JAMB UTME National Examination',
    'JAMB UTME',
    'utme',
    '2027-04-18 07:00:00+00',
    '2027-04-28 17:00:00+00',
    'Official Computer Based Test across all accredited CBT examination centres nationwide.',
    'https://www.jamb.gov.ng',
    'both',
    10,
    'published'
) ON CONFLICT DO NOTHING;

COMMIT;
