-- ============================================================================
-- ROLLBACK: 20261111100000_two_category_access_and_apex_cohort_enrolments.sql
-- Safely reverts two-category access and apex cohort tables
-- ============================================================================

DROP FUNCTION IF EXISTS public.resolve_my_access_category();
DROP FUNCTION IF EXISTS public.resolve_effective_access_category(uuid);

DROP TABLE IF EXISTS public.cohort_tutor_reports CASCADE;
DROP TABLE IF EXISTS public.cohort_attendance CASCADE;
DROP TABLE IF EXISTS public.cohort_assessments CASCADE;
DROP TABLE IF EXISTS public.cohort_curriculum_assignments CASCADE;
DROP TABLE IF EXISTS public.apex_enrolments CASCADE;
DROP TABLE IF EXISTS public.cohorts CASCADE;
DROP TABLE IF EXISTS public.cohort_programmes CASCADE;
