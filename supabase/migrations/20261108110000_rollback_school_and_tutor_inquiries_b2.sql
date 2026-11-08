-- Rollback Migration: 20261108110000_rollback_school_and_tutor_inquiries_b2.sql
-- Description: Cleanly rolls back tutor_applications table and added school_inquiries review columns.

DROP TABLE IF EXISTS public.tutor_applications CASCADE;

ALTER TABLE IF EXISTS public.school_inquiries
  DROP COLUMN IF EXISTS consent_ndpa_at,
  DROP COLUMN IF EXISTS admin_notes,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at;
