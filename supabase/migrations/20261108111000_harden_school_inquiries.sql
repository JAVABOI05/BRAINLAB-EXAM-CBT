-- Migration: 20261108111000_harden_school_inquiries.sql
-- Description: Adds admin_notes and consent_recorded columns to school_inquiries.

ALTER TABLE public.school_inquiries
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS consent_recorded BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
