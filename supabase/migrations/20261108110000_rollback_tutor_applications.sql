-- Rollback Migration: 20261108110000_rollback_tutor_applications.sql
-- Description: Clean teardown of tutor applications table, policies, and indexes.

DROP POLICY IF EXISTS "Administrators can read and manage tutor applications" ON public.tutor_applications;
DROP POLICY IF EXISTS "Public applicants can submit tutor application" ON public.tutor_applications;
DROP TABLE IF EXISTS public.tutor_applications CASCADE;
