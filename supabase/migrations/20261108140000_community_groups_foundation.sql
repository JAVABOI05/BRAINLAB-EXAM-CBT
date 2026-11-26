-- ==============================================================================
-- BRAINLAB ACADEMY: STUDENT COMMUNITIES & ENGAGEMENT ECOSYSTEM (PHASE 1)
-- Migration: 20261108140000_community_groups_foundation.sql
-- Purpose:
--   1. Create public.community_groups table for academic cohorts, tutor classes,
--      subject communities, public communities, and special programmes.
--   2. Create public.community_group_memberships with role hierarchy & privacy controls.
--   3. Create public.community_group_invitations for cryptographic invite links.
--   4. Establish comprehensive Row Level Security (RLS) policies.
-- ==============================================================================

BEGIN;

-- 1. COMMUNITY GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (length(trim(name)) >= 3),
  description TEXT,
  group_type TEXT NOT NULL CHECK (group_type IN (
    'academic_cohort', 'tutor_class', 'subject_community', 'public_community', 'special_programme'
  )),
  category TEXT NOT NULL DEFAULT 'General',
  subject_id TEXT REFERENCES public.academic_subject_registry(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  cover_image_url TEXT,
  icon_emoji TEXT DEFAULT '🎓',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  membership_policy TEXT NOT NULL DEFAULT 'open' CHECK (membership_policy IN ('open', 'approval_required', 'invite_only')),
  capacity INTEGER NOT NULL DEFAULT 500 CHECK (capacity BETWEEN 10 AND 50000),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
  group_rules TEXT,
  settings JSONB NOT NULL DEFAULT '{
    "allow_student_posts": false,
    "show_leaderboard": true,
    "mask_member_names": true,
    "enable_daily_quests": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_community_groups_slug ON public.community_groups(slug);
CREATE INDEX IF NOT EXISTS idx_community_groups_type_status ON public.community_groups(group_type, status);
CREATE INDEX IF NOT EXISTS idx_community_groups_owner ON public.community_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_community_groups_visibility ON public.community_groups(visibility, status);

-- 2. COMMUNITY GROUP MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.community_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_role TEXT NOT NULL DEFAULT 'student' CHECK (group_role IN ('owner', 'tutor', 'moderator', 'student')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_approval', 'suspended', 'left')),
  joined_via TEXT NOT NULL DEFAULT 'direct' CHECK (joined_via IN ('direct', 'invite_link', 'csv_import', 'admin_assign')),
  display_handle TEXT,
  is_ranking_opted_out BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_group_user_membership UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON public.community_group_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_role ON public.community_group_memberships(group_id, group_role, status);

-- 3. CRYPTOGRAPHIC GROUP INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS public.community_group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email TEXT,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_lookup ON public.community_group_invitations(token_hash, is_revoked);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON public.community_group_invitations(group_id, is_revoked);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all three tables
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_invitations ENABLE ROW LEVEL SECURITY;

-- 4.1 community_groups Policies
DROP POLICY IF EXISTS "Public and enrolled groups viewable" ON public.community_groups;
CREATE POLICY "Public and enrolled groups viewable" ON public.community_groups
  FOR SELECT USING (
    (visibility = 'public' AND status = 'active')
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_group_memberships m
      WHERE m.group_id = community_groups.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tutors and admins create groups" ON public.community_groups;
CREATE POLICY "Tutors and admins create groups" ON public.community_groups
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
  );

DROP POLICY IF EXISTS "Owners and admins update groups" ON public.community_groups;
CREATE POLICY "Owners and admins update groups" ON public.community_groups
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_group_memberships m
      WHERE m.group_id = community_groups.id
        AND m.user_id = auth.uid()
        AND m.group_role IN ('owner', 'tutor')
        AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

-- 4.2 community_group_memberships Policies
DROP POLICY IF EXISTS "Members view peer roster" ON public.community_group_memberships;
CREATE POLICY "Members view peer roster" ON public.community_group_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_group_memberships self_m
      WHERE self_m.group_id = community_group_memberships.group_id
        AND self_m.user_id = auth.uid()
        AND self_m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = community_group_memberships.group_id
        AND g.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users join open groups or admins assign" ON public.community_group_memberships;
CREATE POLICY "Users join open groups or admins assign" ON public.community_group_memberships
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = community_group_memberships.group_id
        AND (g.owner_id = auth.uid() OR g.membership_policy = 'open')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users update own profile or leaders manage" ON public.community_group_memberships;
CREATE POLICY "Users update own profile or leaders manage" ON public.community_group_memberships
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = community_group_memberships.group_id
        AND g.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_group_memberships leaders
      WHERE leaders.group_id = community_group_memberships.group_id
        AND leaders.user_id = auth.uid()
        AND leaders.group_role IN ('owner', 'tutor', 'moderator')
        AND leaders.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

-- 4.3 community_group_invitations Policies
DROP POLICY IF EXISTS "Leaders manage group invitations" ON public.community_group_invitations;
CREATE POLICY "Leaders manage group invitations" ON public.community_group_invitations
  FOR ALL USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = community_group_invitations.group_id
        AND g.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_group_memberships m
      WHERE m.group_id = community_group_invitations.group_id
        AND m.user_id = auth.uid()
        AND m.group_role IN ('owner', 'tutor')
        AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

-- Helper trigger for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION public.trigger_set_community_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_community_groups_updated_at ON public.community_groups;
CREATE TRIGGER set_community_groups_updated_at
  BEFORE UPDATE ON public.community_groups
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_community_updated_at();

DROP TRIGGER IF EXISTS set_community_memberships_updated_at ON public.community_group_memberships;
CREATE TRIGGER set_community_memberships_updated_at
  BEFORE UPDATE ON public.community_group_memberships
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_community_updated_at();

COMMIT;
