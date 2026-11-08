-- ====================================================================
-- BRAINLAB ACADEMY: EXAM CALENDAR & DYNAMIC SLOTS SCHEMA
-- Migration: 20261108100000_exam_calendar_and_statistics.sql
-- ====================================================================

BEGIN;

-- 1. Create table exam_calendar_events
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_exam_calendar_dates CHECK (end_time IS NULL OR end_time >= start_time)
);

-- 2. Indexes for high-performance filtered retrieval
CREATE INDEX IF NOT EXISTS idx_exam_calendar_published_active 
    ON public.exam_calendar_events (status, placement, priority ASC, start_time ASC)
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_exam_calendar_programme 
    ON public.exam_calendar_events (programme, status, start_time ASC)
    WHERE status = 'published';

-- 3. Enable Row-Level Security
ALTER TABLE public.exam_calendar_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Public read access for published events only
DROP POLICY IF EXISTS "Public can view published exam calendar events" ON public.exam_calendar_events;
CREATE POLICY "Public can view published exam calendar events"
    ON public.exam_calendar_events
    FOR SELECT
    USING (status = 'published');

-- 5. RLS Policy: Administrative access for exam management
DROP POLICY IF EXISTS "Admins can manage all exam calendar events" ON public.exam_calendar_events;
CREATE POLICY "Admins can manage all exam calendar events"
    ON public.exam_calendar_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('super_admin', 'platform_admin', 'cbt_admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_configuration pc
            WHERE pc.key = 'super_admin_override' AND auth.uid() IS NOT NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('super_admin', 'platform_admin', 'cbt_admin')
        )
    );

-- 6. Seed canonical 2027 JAMB UTME National Examination (WAT: 2027-04-18 08:00 WAT = 07:00 UTC)
INSERT INTO public.exam_calendar_events (
    name,
    short_name,
    programme,
    start_time,
    end_time,
    short_note,
    official_source_url,
    placement,
    priority,
    status
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
