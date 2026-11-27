-- Candidate-safe metadata surface and per-assessment sign-in policy.
-- Existing assessments default to requiring a registered/sign-in session.
ALTER TABLE public.learning_assessments
  ADD COLUMN IF NOT EXISTS requires_sign_in boolean NOT NULL DEFAULT true;

CREATE OR REPLACE VIEW public.public_learning_assessment_metadata
WITH (security_barrier = true)
AS
SELECT
  id,
  slug,
  title,
  description,
  instructions,
  assessment_type,
  question_count,
  duration_seconds,
  max_attempts,
  access_code_required,
  result_release,
  requires_sign_in
FROM public.learning_assessments
WHERE is_published IS TRUE
  AND status = 'open'
  AND organisation_id IS NULL;

REVOKE ALL ON public.public_learning_assessment_metadata FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_learning_assessment_metadata TO anon, authenticated;

COMMENT ON VIEW public.public_learning_assessment_metadata IS
  'Safe candidate-facing assessment metadata only; excludes organisation-bound assessments and question/configuration secrets.';
