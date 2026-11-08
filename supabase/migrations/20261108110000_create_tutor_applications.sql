-- Migration: 20261108110000_create_tutor_applications.sql
-- Description: Creates persistent storage and secure RLS policies for Educator & Tutor Applications (NDPA 2023 Compliant)

CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  state_of_residence TEXT NOT NULL DEFAULT 'Nigeria',
  highest_qualification TEXT NOT NULL,
  primary_subjects TEXT[] NOT NULL DEFAULT '{}',
  target_curricula TEXT[] NOT NULL DEFAULT '{}',
  years_experience TEXT NOT NULL,
  portfolio_url TEXT,
  statement_of_pedagogy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Shortlisted', 'Interviewed', 'Approved', 'Rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  consent_recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  consent_version TEXT NOT NULL DEFAULT 'NDPA-2023-V1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

-- 1. Public anonymous visitors can only INSERT their own application
DROP POLICY IF EXISTS "Public applicants can submit tutor application" ON public.tutor_applications;
CREATE POLICY "Public applicants can submit tutor application"
  ON public.tutor_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Strict read protection: Only verified administrators can SELECT, UPDATE or DELETE
DROP POLICY IF EXISTS "Administrators can read and manage tutor applications" ON public.tutor_applications;
CREATE POLICY "Administrators can read and manage tutor applications"
  ON public.tutor_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
      AND admin_profiles.role IN ('super_admin', 'platform_admin', 'academic_director')
    )
  );

-- Indexes for fast administrative querying
CREATE INDEX IF NOT EXISTS idx_tutor_apps_created_at ON public.tutor_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_apps_status ON public.tutor_applications (status);
CREATE INDEX IF NOT EXISTS idx_tutor_apps_reference ON public.tutor_applications (reference_code);
CREATE INDEX IF NOT EXISTS idx_tutor_apps_email ON public.tutor_applications (email);
