-- ==============================================================================
-- ROLLBACK MIGRATION: 20261108160000_rollback_community_announcements_and_polls.sql
-- Purpose: Safely reverse community_announcements_and_polls schema changes.
-- ==============================================================================

BEGIN;

DROP TRIGGER IF EXISTS set_community_announcements_updated_at ON public.community_announcements;

DROP TABLE IF EXISTS public.community_poll_votes CASCADE;
DROP TABLE IF EXISTS public.community_polls CASCADE;
DROP TABLE IF EXISTS public.community_announcement_receipts CASCADE;
DROP TABLE IF EXISTS public.community_announcements CASCADE;

COMMIT;
