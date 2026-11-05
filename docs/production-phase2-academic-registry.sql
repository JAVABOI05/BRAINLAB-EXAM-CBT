-- ==============================================================================
-- BRAINLAB ACADEMY — PRODUCTION PHASE 2: CANONICAL ACADEMIC SUBJECT REGISTRY
-- Target Database: BrainLabCBT Production (bupkyppvtkrmzmluzjmf) & Staging
-- Safety Guarantee: NON-DESTRUCTIVE. ZERO DATA LOSS. FULLY IDEMPOTENT.
-- Purpose:
--   1. Reconcile triplicated subject taxonomies:
--      • CBT question strings (public.questions.subject)
--      • Learning Hub subjects (public.learning_subjects.id / slug)
--      • STEM Studio simulation subjects (subj-math, subj-physics, etc.)
--      • JAMB UTME / WAEC curriculum syllabus slugs
--   2. Establish public.academic_subject_registry as single source of truth.
--   3. Enable cross-navigation between STEM simulations and CBT questions.
-- ==============================================================================

BEGIN;

-- ============================================================================
-- 1. ACADEMIC_SUBJECT_REGISTRY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.academic_subject_registry (
  id text PRIMARY KEY,                       -- e.g. 'mathematics', 'english', 'physics'
  name text NOT NULL,                        -- Display Name: e.g. 'Mathematics'
  slug text NOT NULL UNIQUE,                 -- URL slug: e.g. 'mathematics'
  cbt_key text NOT NULL,                     -- CBT Questions subject matching string
  learning_hub_id uuid REFERENCES public.learning_subjects(id) ON DELETE SET NULL,
  learning_hub_slug text NOT NULL,           -- Learning Hub slug
  stem_subject_id text NOT NULL,             -- STEM Studio subject ID (e.g. 'subj-math')
  category text NOT NULL CHECK (category IN ('Compulsory', 'Science', 'Arts & Humanities', 'Commercial & Social Sciences', 'Technology')),
  icon text NOT NULL DEFAULT '📚',
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academic_subj_slug ON public.academic_subject_registry(slug);
CREATE INDEX IF NOT EXISTS idx_academic_subj_cbt_key ON public.academic_subject_registry(cbt_key);
CREATE INDEX IF NOT EXISTS idx_academic_subj_stem_id ON public.academic_subject_registry(stem_subject_id);

ALTER TABLE public.academic_subject_registry ENABLE ROW LEVEL SECURITY;

-- Public read for active subjects
DROP POLICY IF EXISTS "academic_subject_registry_public_read" ON public.academic_subject_registry;
CREATE POLICY "academic_subject_registry_public_read" ON public.academic_subject_registry
  FOR SELECT
  USING (is_active = true);

-- Admin management
DROP POLICY IF EXISTS "academic_subject_registry_admin_all" ON public.academic_subject_registry;
CREATE POLICY "academic_subject_registry_admin_all" ON public.academic_subject_registry
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.id = auth.uid()
      AND a.role IN ('super_admin', 'platform_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.id = auth.uid()
      AND a.role IN ('super_admin', 'platform_admin')
  ));

GRANT SELECT ON public.academic_subject_registry TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.academic_subject_registry TO service_role;

-- ============================================================================
-- 2. SEED CANONICAL SUBJECTS (Idempotent upsert)
-- ============================================================================
INSERT INTO public.academic_subject_registry (
  id, name, slug, cbt_key, learning_hub_slug, stem_subject_id, category, icon, description, display_order
)
VALUES
  (
    'english',
    'Use of English',
    'use-of-english',
    'English',
    'use-of-english',
    'subj-english',
    'Compulsory',
    '📖',
    'Compulsory general examination assessing lexis, structure, comprehension, oral forms, and prescribed prose.',
    1
  ),
  (
    'mathematics',
    'Mathematics',
    'mathematics',
    'Mathematics',
    'mathematics',
    'subj-math',
    'Science',
    '📐',
    'Core mathematical sciences covering algebra, calculus, trigonometry, coordinate geometry, and statistics.',
    2
  ),
  (
    'physics',
    'Physics',
    'physics',
    'Physics',
    'physics',
    'subj-physics',
    'Science',
    '⚡',
    'Physical sciences investigating mechanics, kinematics, thermodynamics, electromagnetism, and modern quantum physics.',
    3
  ),
  (
    'chemistry',
    'Chemistry',
    'chemistry',
    'Chemistry',
    'chemistry',
    'subj-chem',
    'Science',
    '🧪',
    'Chemical sciences covering stoichiometry, chemical equilibrium, organic reactions, redox titration, and atomic structure.',
    4
  ),
  (
    'biology',
    'Biology',
    'biology',
    'Biology',
    'biology',
    'subj-bio',
    'Science',
    '🧬',
    'Life sciences spanning cell biology, genetics, ecology, plant physiology, animal nutrition, and evolutionary adaptations.',
    5
  ),
  (
    'economics',
    'Economics',
    'economics',
    'Economics',
    'economics',
    'subj-econ',
    'Commercial & Social Sciences',
    '📊',
    'Economic theory, microeconomics, macroeconomic indicators, monetary policies, and fiscal public finance.',
    6
  ),
  (
    'government',
    'Government',
    'government',
    'Government',
    'government',
    'subj-gov',
    'Commercial & Social Sciences',
    '🏛️',
    'Political science, constitutional evolution, electoral institutions, public administration, and international relations.',
    7
  ),
  (
    'literature',
    'Literature in English',
    'literature',
    'Literature in English',
    'literature',
    'subj-lit',
    'Arts & Humanities',
    '🎭',
    'Literary appreciation, African drama, non-African prose, poetic devices, and analytical literary commentary.',
    8
  ),
  (
    'engineering',
    'Engineering & Computer Studies',
    'engineering',
    'Engineering',
    'engineering',
    'subj-engineering',
    'Technology',
    '🤖',
    'Applied technology, digital logic circuits, algorithmic problem solving, Boolean algebra, and computer systems.',
    9
  )
ON CONFLICT (id) DO UPDATE SET
  name              = EXCLUDED.name,
  slug              = EXCLUDED.slug,
  cbt_key           = EXCLUDED.cbt_key,
  learning_hub_slug = EXCLUDED.learning_hub_slug,
  stem_subject_id   = EXCLUDED.stem_subject_id,
  category          = EXCLUDED.category,
  icon              = EXCLUDED.icon,
  description       = EXCLUDED.description,
  display_order     = EXCLUDED.display_order,
  updated_at        = now();

-- ============================================================================
-- 3. LINK EXISTING LEARNING_SUBJECTS TO REGISTRY (where present)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'learning_subjects'
  ) THEN
    -- Match by slug or matching names
    UPDATE public.academic_subject_registry reg
    SET learning_hub_id = ls.id
    FROM public.learning_subjects ls
    WHERE lower(ls.slug) = lower(reg.learning_hub_slug)
       OR lower(ls.name) = lower(reg.name)
       OR (reg.id = 'english' AND lower(ls.name) LIKE '%english%');
  END IF;
END $$;

-- ============================================================================
-- 4. CANONICAL SUBJECT LOOKUP FUNCTION
-- Resolves any variation of subject name / slug / ID to the canonical record.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_canonical_subject(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_clean text := lower(trim(coalesce(p_identifier, '')));
  v_rec RECORD;
BEGIN
  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_rec
  FROM public.academic_subject_registry
  WHERE id = v_clean
     OR lower(slug) = v_clean
     OR lower(cbt_key) = v_clean
     OR lower(stem_subject_id) = v_clean
     OR lower(learning_hub_slug) = v_clean
     OR lower(name) = v_clean
     OR (v_clean LIKE '%english%' AND id = 'english')
     OR (v_clean LIKE '%math%' AND id = 'mathematics')
     OR (v_clean LIKE '%physic%' AND id = 'physics')
     OR (v_clean LIKE '%chem%' AND id = 'chemistry')
     OR (v_clean LIKE '%bio%' AND id = 'biology')
     OR (v_clean LIKE '%econ%' AND id = 'economics')
     OR (v_clean LIKE '%gov%' AND id = 'government')
     OR (v_clean LIKE '%lit%' AND id = 'literature')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_rec.id,
    'name', v_rec.name,
    'slug', v_rec.slug,
    'cbt_key', v_rec.cbt_key,
    'learning_hub_id', v_rec.learning_hub_id,
    'learning_hub_slug', v_rec.learning_hub_slug,
    'stem_subject_id', v_rec.stem_subject_id,
    'category', v_rec.category,
    'icon', v_rec.icon,
    'description', v_rec.description,
    'display_order', v_rec.display_order
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_canonical_subject(text) TO anon, authenticated, service_role;

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.academic_subject_registry;
  IF v_count < 8 THEN
    RAISE WARNING 'Expected at least 8 canonical subjects, found %', v_count;
  ELSE
    RAISE NOTICE 'Phase 2 Academic Subject Registry created successfully with % canonical subjects.', v_count;
  END IF;
END $$;

COMMIT;
