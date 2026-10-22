-- 20261022040000_classroom_live_polls.sql
-- Classroom Live Interactive Polls & Checkpoint Quizzes (Pillar 4)

CREATE TABLE IF NOT EXISTS public.classroom_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of { id: string, text: string, is_correct?: boolean }
  explanation TEXT,       -- Optional pedagogical explanation shown when poll ends
  is_open BOOLEAN NOT NULL DEFAULT true,
  duration_seconds INTEGER DEFAULT 60, -- null or 0 for untimed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.classroom_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.classroom_polls(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_classroom_poll_vote UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_polls_class_id ON public.classroom_polls(class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_polls_is_open ON public.classroom_polls(is_open);
CREATE INDEX IF NOT EXISTS idx_classroom_poll_votes_poll ON public.classroom_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_classroom_poll_votes_user ON public.classroom_poll_votes(user_id);

-- Enable RLS
ALTER TABLE public.classroom_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_poll_votes ENABLE ROW LEVEL SECURITY;

-- Policies for classroom_polls
DROP POLICY IF EXISTS "classroom_polls_read" ON public.classroom_polls;
CREATE POLICY "classroom_polls_read" ON public.classroom_polls
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "classroom_polls_insert" ON public.classroom_polls;
CREATE POLICY "classroom_polls_insert" ON public.classroom_polls
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "classroom_polls_update" ON public.classroom_polls;
CREATE POLICY "classroom_polls_update" ON public.classroom_polls
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'platform_admin', 'teacher')
  ));

-- Policies for classroom_poll_votes
DROP POLICY IF EXISTS "classroom_poll_votes_read" ON public.classroom_poll_votes;
CREATE POLICY "classroom_poll_votes_read" ON public.classroom_poll_votes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "classroom_poll_votes_insert" ON public.classroom_poll_votes;
CREATE POLICY "classroom_poll_votes_insert" ON public.classroom_poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
