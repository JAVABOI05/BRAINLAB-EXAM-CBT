-- Rollback Migration: 20261108111000_rollback_school_inquiries.sql
-- Description: Rolls back hardening columns from school_inquiries.

ALTER TABLE public.school_inquiries
  DROP COLUMN IF EXISTS admin_notes,
  DROP COLUMN IF EXISTS consent_recorded,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at;
