-- ====================================================================
-- BRAINLAB ACADEMY: ROLLBACK CURATED SAMPLE QUESTIONS SCHEMA
-- Migration: 20261108150000_rollback_curated_sample_questions.sql
-- ====================================================================

BEGIN;

DROP POLICY IF EXISTS "Administrators can manage sample questions" ON public.curated_sample_questions;
DROP POLICY IF EXISTS "Public can view published sample questions" ON public.curated_sample_questions;
DROP TABLE IF EXISTS public.curated_sample_questions CASCADE;

COMMIT;
