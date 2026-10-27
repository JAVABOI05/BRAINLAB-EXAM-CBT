-- Scheduled, tutor-controlled Live Classroom lifecycle and subject-scoped tutor assignments.
-- This migration is additive and does not modify production until applied.

CREATE TABLE IF NOT EXISTS public.tutor_subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.learning_subjects(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tutor_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_subject_assignments_tutor
  ON public.tutor_subject_assignments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_subject_assignments_subject
  ON public.tutor_subject_assignments(subject_id);

CREATE TABLE IF NOT EXISTS public.live_class_tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_role TEXT NOT NULL DEFAULT 'co_tutor' CHECK (assignment_role IN ('lead', 'co_tutor')),
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, tutor_id)
);

CREATE INDEX IF NOT EXISTS idx_live_class_tutors_tutor ON public.live_class_tutors(tutor_id);
CREATE INDEX IF NOT EXISTS idx_live_class_tutors_class ON public.live_class_tutors(class_id);

CREATE TABLE IF NOT EXISTS public.live_class_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('scheduled','rescheduled','started','ended','cancelled','tutor_assigned','tutor_removed','recovered')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_class_events_class_created
  ON public.live_class_events(class_id, created_at DESC);

ALTER TABLE public.tutor_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_events ENABLE ROW LEVEL SECURITY;

-- Server routes use the service-role client after validating the user's role.
-- No direct client policies are intentionally granted for these privileged tables.

-- Add an explicit ended state while retaining compatibility with existing statuses.
ALTER TABLE public.live_classes DROP CONSTRAINT IF EXISTS live_classes_status_check;
ALTER TABLE public.live_classes
  ADD CONSTRAINT live_classes_status_check
  CHECK (status IN ('draft','scheduled','open','live','ended','completed','cancelled','failed'));

ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS max_session_minutes INTEGER NOT NULL DEFAULT 180
  CHECK (max_session_minutes BETWEEN 15 AND 360);

ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS ended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Lagos';
