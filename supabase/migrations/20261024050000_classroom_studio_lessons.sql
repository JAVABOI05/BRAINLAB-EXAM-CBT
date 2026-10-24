-- Classroom Studio: reusable lesson plans and durable page snapshots.
-- Apply through Supabase migrations before enabling cloud persistence.
CREATE TABLE IF NOT EXISTS public.classroom_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled lesson',
  subject TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','archived')),
  pages JSONB NOT NULL DEFAULT '[{"id":"page-1","title":"Page 1","aspectRatio":"16 / 9","backgroundMode":"blackboard","elements":[]}]'::jsonb,
  active_page_index INTEGER NOT NULL DEFAULT 0 CHECK (active_page_index >= 0),
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_lessons_tutor_updated
  ON public.classroom_lessons(tutor_id, updated_at DESC);

ALTER TABLE public.classroom_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tutors manage their own classroom lessons" ON public.classroom_lessons;
CREATE POLICY "Tutors manage their own classroom lessons"
  ON public.classroom_lessons FOR ALL
  USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_lessons TO authenticated;

CREATE OR REPLACE FUNCTION public.set_classroom_lesson_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classroom_lessons_updated_at ON public.classroom_lessons;
CREATE TRIGGER classroom_lessons_updated_at
  BEFORE UPDATE ON public.classroom_lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_classroom_lesson_updated_at();
