-- Migration: 20261108110000_school_and_tutor_inquiries_b2.sql
-- Description: Extends school inquiries with review tracking and creates tutor applications table with strict RLS and NDPA 2023 compliance.

-- 1. Extend school_inquiries with audit and review fields
ALTER TABLE IF EXISTS public.school_inquiries
  ADD COLUMN IF NOT EXISTS consent_ndpa_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 2. Create tutor_applications table
CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT NOT NULL CHECK (length(trim(phone)) BETWEEN 10 AND 25),
  location TEXT NOT NULL DEFAULT 'Nigeria',
  subjects TEXT[] NOT NULL DEFAULT '{}',
  highest_qualification TEXT NOT NULL CHECK (highest_qualification IN ('NCE', 'OND', 'HND', 'B.Sc / B.Ed', 'M.Sc / M.Ed', 'Ph.D', 'Other')),
  years_of_experience TEXT NOT NULL CHECK (years_of_experience IN ('Under 1 year', '1-3 years', '4-7 years', '8+ years')),
  curriculum_experience TEXT[] NOT NULL DEFAULT '{}',
  linkedin_or_cv_url TEXT,
  intro_statement TEXT NOT NULL CHECK (length(trim(intro_statement)) BETWEEN 20 AND 1200),
  consent_ndpa_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewing', 'Interview_Scheduled', 'Approved', 'Rejected', 'Withdrawn')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Row Level Security
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

-- 4. RLS: Anonymous public visitors can only INSERT their own application
DROP POLICY IF EXISTS "Public anonymous visitors can submit tutor applications" ON public.tutor_applications;
CREATE POLICY "Public anonymous visitors can submit tutor applications"
  ON public.tutor_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5. RLS: Only verified governance administrators can SELECT, UPDATE, or manage tutor applications
DROP POLICY IF EXISTS "Administrators can read and manage tutor applications" ON public.tutor_applications;
CREATE POLICY "Administrators can read and manage tutor applications"
  ON public.tutor_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.admin_profiles WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- 6. Indexes for search and reporting performance
CREATE INDEX IF NOT EXISTS idx_tutor_applications_created_at ON public.tutor_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_status ON public.tutor_applications (status);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_email ON public.tutor_applications (email);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_reference ON public.tutor_applications (reference_code);
