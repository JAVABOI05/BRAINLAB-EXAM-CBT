-- ==============================================================================
-- BRAINLAB ACADEMY: STUDENT COMMUNITIES & ENGAGEMENT ECOSYSTEM (PHASE 2)
-- Migration: 20261108160000_community_announcements_and_polls.sql
-- Purpose:
--   1. Create public.community_announcements table for faculty announcements.
--   2. Create public.community_announcement_receipts for lazy read tracking.
--   3. Create public.community_polls and public.community_poll_votes for checkpoint polling.
--   4. Establish comprehensive Row Level Security (RLS) policies.
-- ==============================================================================

BEGIN;

-- 1. COMMUNITY ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.community_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) >= 3),
  content TEXT NOT NULL CHECK (length(trim(content)) >= 5),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'critical')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  requires_acknowledgement BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_community_announcements_group ON public.community_announcements(group_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_announcements_author ON public.community_announcements(author_id);

-- 2. LAZY ANNOUNCEMENT READ RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS public.community_announcement_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.community_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  acknowledged_at TIMESTAMPTZ,
  CONSTRAINT uq_announcement_user_receipt UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_receipts_lookup ON public.community_announcement_receipts(announcement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_receipts_user ON public.community_announcement_receipts(user_id);

-- 3. COMMUNITY POLLS TABLE
CREATE TABLE IF NOT EXISTS public.community_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (length(trim(question)) >= 5),
  options JSONB NOT NULL, -- Array of { id: string, text: string }
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_multiple_choice BOOLEAN NOT NULL DEFAULT false,
  closes_at TIMESTAMPTZ NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_community_polls_group ON public.community_polls(group_id, is_closed, closes_at);

-- 4. COMMUNITY POLL VOTES TABLE
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_options TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_community_poll_vote UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_poll_votes_lookup ON public.community_poll_votes(poll_id, user_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_announcement_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;

-- 5.1 community_announcements Policies
DROP POLICY IF EXISTS "Enrolled members and leaders view announcements" ON public.community_announcements;
CREATE POLICY "Enrolled members and leaders view announcements" ON public.community_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_group_memberships m
      WHERE m.group_id = community_announcements.group_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = community_announcements.group_id
        AND (g.owner_id = auth.uid() OR g.visibility = 'public')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tutors, owners and admins create announcements" ON public.community_announcements;
CREATE POLICY "Tutors, owners and admins create announcements" ON public.community_announcements
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.community_group_memberships m
        WHERE m.group_id = community_announcements.group_id
          AND m.user_id = auth.uid()
          AND m.group_role IN ('owner', 'tutor', 'moderator')
          AND m.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.community_groups g
        WHERE g.id = community_announcements.group_id
          AND g.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.admin_users a
        WHERE a.id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Authors and admins update announcements" ON public.community_announcements;
CREATE POLICY "Authors and admins update announcements" ON public.community_announcements
  FOR UPDATE USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = community_announcements.group_id
        AND g.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

-- 5.2 community_announcement_receipts Policies
DROP POLICY IF EXISTS "Users manage own read receipts" ON public.community_announcement_receipts;
CREATE POLICY "Users manage own read receipts" ON public.community_announcement_receipts
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_announcements a
      JOIN public.community_groups g ON g.id = a.group_id
      WHERE a.id = community_announcement_receipts.announcement_id
        AND (a.author_id = auth.uid() OR g.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

-- 5.3 community_polls Policies
DROP POLICY IF EXISTS "Enrolled members view polls" ON public.community_polls;
CREATE POLICY "Enrolled members view polls" ON public.community_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_group_memberships m
      WHERE m.group_id = community_polls.group_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = community_polls.group_id
        AND (g.owner_id = auth.uid() OR g.visibility = 'public')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Leaders create community polls" ON public.community_polls;
CREATE POLICY "Leaders create community polls" ON public.community_polls
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.community_group_memberships m
        WHERE m.group_id = community_polls.group_id
          AND m.user_id = auth.uid()
          AND m.group_role IN ('owner', 'tutor', 'moderator')
          AND m.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.community_groups g
        WHERE g.id = community_polls.group_id
          AND g.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.admin_users a
        WHERE a.id = auth.uid()
      )
    )
  );

-- 5.4 community_poll_votes Policies
DROP POLICY IF EXISTS "Enrolled members vote once" ON public.community_poll_votes;
CREATE POLICY "Enrolled members vote once" ON public.community_poll_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_polls p
      JOIN public.community_group_memberships m ON m.group_id = p.group_id
      WHERE p.id = community_poll_votes.poll_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND p.is_closed = false
        AND p.closes_at > timezone('utc'::text, now())
    )
  );

DROP POLICY IF EXISTS "Users view own vote or aggregate counts" ON public.community_poll_votes;
CREATE POLICY "Users view own vote or aggregate counts" ON public.community_poll_votes
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_polls p
      JOIN public.community_groups g ON g.id = p.group_id
      WHERE p.id = community_poll_votes.poll_id
        AND (p.created_by = auth.uid() OR g.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid()
    )
  );

-- Trigger for updated_at on announcements
DROP TRIGGER IF EXISTS set_community_announcements_updated_at ON public.community_announcements;
CREATE TRIGGER set_community_announcements_updated_at
  BEFORE UPDATE ON public.community_announcements
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_community_updated_at();

COMMIT;
