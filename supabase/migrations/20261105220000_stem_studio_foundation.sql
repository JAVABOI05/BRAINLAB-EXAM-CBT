-- ==============================================================================
-- BRAINLAB STEM STUDIO FOUNDATION (PHASE 1)
-- Migration: 20261105220000_stem_studio_foundation.sql
-- Description: Immutable STEM resources catalog, versioning, curriculum mappings,
--              virtual experiment attempts, and strict role-based RLS policies.
-- ==============================================================================

BEGIN;

-- 1. STEM Resources Catalog
CREATE TABLE IF NOT EXISTS public.stem_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  summary TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.learning_subjects(id) ON DELETE RESTRICT,
  topic_id UUID REFERENCES public.learning_topics(id) ON DELETE SET NULL,
  tier INTEGER NOT NULL DEFAULT 2 CHECK (tier IN (1, 2, 3)),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('simulation', 'formula_card', 'worked_example', 'diagram', 'experiment')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  current_published_version_id UUID,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  entitlement_tier TEXT NOT NULL DEFAULT 'free' CHECK (entitlement_tier IN ('free', 'premium', 'vip')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stem_resources_subject_status
  ON public.stem_resources(subject_id, status, is_featured);

CREATE INDEX IF NOT EXISTS idx_stem_resources_author
  ON public.stem_resources(author_id, status);

-- 2. Immutable Versioned Content Payloads
CREATE TABLE IF NOT EXISTS public.stem_resource_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.stem_resources(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  schema_version INTEGER NOT NULL DEFAULT 1,
  adapter_type TEXT NOT NULL,
  initial_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  learning_objectives TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT stem_resource_version_unique UNIQUE (resource_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_stem_versions_resource_version
  ON public.stem_resource_versions(resource_id, version_number DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_stem_current_version' AND table_name = 'stem_resources'
  ) THEN
    ALTER TABLE public.stem_resources
      ADD CONSTRAINT fk_stem_current_version
      FOREIGN KEY (current_published_version_id)
      REFERENCES public.stem_resource_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Syllabus & Examination Relational Mapping
CREATE TABLE IF NOT EXISTS public.stem_curriculum_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.stem_resources(id) ON DELETE CASCADE,
  exam_body TEXT NOT NULL CHECK (exam_body IN ('JAMB_UTME', 'WAEC_SSCE', 'NECO_SSCE')),
  curriculum_topic_id UUID REFERENCES public.learning_topics(id) ON DELETE CASCADE,
  syllabus_section TEXT,
  relevance_weight NUMERIC(3, 2) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT stem_curriculum_unique UNIQUE (resource_id, exam_body, curriculum_topic_id)
);

CREATE INDEX IF NOT EXISTS idx_stem_curriculum_topic_exam
  ON public.stem_curriculum_mappings(curriculum_topic_id, exam_body);

-- 4. Student Virtual Experiment Attempts & Saved Workspaces
CREATE TABLE IF NOT EXISTS public.stem_experiment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_version_id UUID NOT NULL REFERENCES public.stem_resource_versions(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.live_classes(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'graded')),
  observations JSONB NOT NULL DEFAULT '{}'::jsonb,
  measurements JSONB NOT NULL DEFAULT '[]'::jsonb,
  conclusion TEXT,
  tutor_score NUMERIC(5, 2),
  tutor_feedback TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stem_attempts_student_status
  ON public.stem_experiment_attempts(student_id, status, started_at DESC);

-- Trigger for auto-updating timestamps
CREATE OR REPLACE FUNCTION public.set_stem_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stem_resources_updated_at ON public.stem_resources;
CREATE TRIGGER trg_stem_resources_updated_at
  BEFORE UPDATE ON public.stem_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_stem_updated_at();

DROP TRIGGER IF EXISTS trg_stem_attempts_updated_at ON public.stem_experiment_attempts;
CREATE TRIGGER trg_stem_attempts_updated_at
  BEFORE UPDATE ON public.stem_experiment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_stem_updated_at();

-- 5. Row Level Security Policies
ALTER TABLE public.stem_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stem_resource_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stem_curriculum_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stem_experiment_attempts ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an authorized reviewer or platform admin
CREATE OR REPLACE FUNCTION public.is_stem_reviewer_or_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- admin_profiles is the canonical user-to-role mapping. The legacy
  -- admin_users table has its own generated row id, so match it by the
  -- authenticated email rather than incorrectly comparing unrelated UUIDs.
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('super_admin', 'platform_admin', 'content_reviewer', 'ai_learning_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND a.role IN ('super_admin', 'admin')
  );
END;
$$;

-- RLS: stem_resources
DROP POLICY IF EXISTS "Public and students can view published STEM resources" ON public.stem_resources;
CREATE POLICY "Public and students can view published STEM resources"
  ON public.stem_resources FOR SELECT
  USING (
    status = 'published'
    OR author_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR public.is_stem_reviewer_or_admin()
  );

DROP POLICY IF EXISTS "Tutors and admins can create STEM resources" ON public.stem_resources;
CREATE POLICY "Tutors and admins can create STEM resources"
  ON public.stem_resources FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    OR public.is_stem_reviewer_or_admin()
  );

DROP POLICY IF EXISTS "Authors and admins can update STEM resources" ON public.stem_resources;
CREATE POLICY "Authors and admins can update STEM resources"
  ON public.stem_resources FOR UPDATE
  USING (
    author_id = auth.uid()
    OR public.is_stem_reviewer_or_admin()
  );

DROP POLICY IF EXISTS "Authors can delete draft resources and admins can delete any" ON public.stem_resources;
CREATE POLICY "Authors can delete draft resources and admins can delete any"
  ON public.stem_resources FOR DELETE
  USING (
    (author_id = auth.uid() AND status = 'draft')
    OR public.is_stem_reviewer_or_admin()
  );

-- RLS: stem_resource_versions
DROP POLICY IF EXISTS "Anyone can view published resource versions, authors view owned" ON public.stem_resource_versions;
CREATE POLICY "Anyone can view published resource versions, authors view owned"
  ON public.stem_resource_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stem_resources r
      WHERE r.id = stem_resource_versions.resource_id
        AND (
          r.status = 'published'
          OR r.author_id = auth.uid()
          OR public.is_stem_reviewer_or_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Authors and admins can insert resource versions" ON public.stem_resource_versions;
CREATE POLICY "Authors and admins can insert resource versions"
  ON public.stem_resource_versions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    OR public.is_stem_reviewer_or_admin()
  );

-- RLS: stem_curriculum_mappings
DROP POLICY IF EXISTS "Anyone can view STEM curriculum mappings" ON public.stem_curriculum_mappings;
CREATE POLICY "Anyone can view STEM curriculum mappings"
  ON public.stem_curriculum_mappings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authors and admins manage curriculum mappings" ON public.stem_curriculum_mappings;
CREATE POLICY "Authors and admins manage curriculum mappings"
  ON public.stem_curriculum_mappings FOR ALL
  USING (
    public.is_stem_reviewer_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.stem_resources r
      WHERE r.id = stem_curriculum_mappings.resource_id AND r.author_id = auth.uid()
    )
  );

-- RLS: stem_experiment_attempts
-- Students may read their own work and submit/update learning data while an
-- attempt is in progress. Grading fields are never writable through student
-- policies. Tutors can review attempts for their own classes.
DROP POLICY IF EXISTS "Students view and manage own experiment attempts" ON public.stem_experiment_attempts;
DROP POLICY IF EXISTS "Students read own STEM attempts" ON public.stem_experiment_attempts;
DROP POLICY IF EXISTS "Students create own STEM attempts" ON public.stem_experiment_attempts;
DROP POLICY IF EXISTS "Students update own in-progress STEM attempts" ON public.stem_experiment_attempts;
DROP POLICY IF EXISTS "Tutors and admins review STEM attempts" ON public.stem_experiment_attempts;
DROP POLICY IF EXISTS "Students delete own in-progress STEM attempts" ON public.stem_experiment_attempts;

CREATE POLICY "Students read own STEM attempts"
  ON public.stem_experiment_attempts FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.is_stem_reviewer_or_admin()
    OR (
      class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.live_classes c
        WHERE c.id = stem_experiment_attempts.class_id AND c.tutor_id = auth.uid()
      )
    )
  );

CREATE POLICY "Students create own STEM attempts"
  ON public.stem_experiment_attempts FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'in_progress'
    AND tutor_score IS NULL
    AND tutor_feedback IS NULL
  );

CREATE POLICY "Students update own in-progress STEM attempts"
  ON public.stem_experiment_attempts FOR UPDATE
  USING (student_id = auth.uid() AND status = 'in_progress')
  WITH CHECK (
    student_id = auth.uid()
    AND status IN ('in_progress', 'completed')
    AND tutor_score IS NULL
    AND tutor_feedback IS NULL
  );

CREATE POLICY "Tutors and admins review STEM attempts"
  ON public.stem_experiment_attempts FOR UPDATE
  USING (
    public.is_stem_reviewer_or_admin()
    OR (
      class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.live_classes c
        WHERE c.id = stem_experiment_attempts.class_id AND c.tutor_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_stem_reviewer_or_admin()
    OR (
      class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.live_classes c
        WHERE c.id = stem_experiment_attempts.class_id AND c.tutor_id = auth.uid()
      )
    )
  );

CREATE POLICY "Students delete own in-progress STEM attempts"
  ON public.stem_experiment_attempts FOR DELETE
  USING (student_id = auth.uid() AND status = 'in_progress');

-- Grants
GRANT SELECT ON public.stem_resources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stem_resources TO authenticated;

GRANT SELECT ON public.stem_resource_versions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.stem_resource_versions TO authenticated;

GRANT SELECT ON public.stem_curriculum_mappings TO anon, authenticated;
GRANT ALL ON public.stem_curriculum_mappings TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stem_experiment_attempts TO authenticated;

COMMIT;
