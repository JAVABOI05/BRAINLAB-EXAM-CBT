-- ==============================================================================
-- ROLLBACK MIGRATION: 20261108140000_rollback_community_groups_foundation.sql
-- Purpose: Safely reverse community_groups_foundation changes if needed.
-- ==============================================================================

BEGIN;

DROP TRIGGER IF EXISTS set_community_memberships_updated_at ON public.community_group_memberships;
DROP TRIGGER IF EXISTS set_community_groups_updated_at ON public.community_groups;
DROP FUNCTION IF EXISTS public.trigger_set_community_updated_at();

DROP TABLE IF EXISTS public.community_group_invitations CASCADE;
DROP TABLE IF EXISTS public.community_group_memberships CASCADE;
DROP TABLE IF EXISTS public.community_groups CASCADE;

COMMIT;
