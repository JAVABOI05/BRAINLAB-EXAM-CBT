-- Migration: 20261106030000_create_school_inquiries.sql
-- Description: Creates persistent storage and secure RLS policies for Institutional School Enquiries.

CREATE TABLE IF NOT EXISTS public.school_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE,
  school_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT DEFAULT 'Nigeria',
  student_count TEXT DEFAULT 'Unspecified',
  exam_type TEXT DEFAULT 'JAMB UTME Mocks',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Contacted', 'Quoted', 'Active Partner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.school_inquiries ENABLE ROW LEVEL SECURITY;

-- Anonymous public visitors can only INSERT their own enquiry
DROP POLICY IF EXISTS "Public anonymous visitors can submit school inquiries" ON public.school_inquiries;
CREATE POLICY "Public anonymous visitors can submit school inquiries"
  ON public.school_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only verified administrators can SELECT or UPDATE inquiries
DROP POLICY IF EXISTS "Administrators can read and manage school inquiries" ON public.school_inquiries;
CREATE POLICY "Administrators can read and manage school inquiries"
  ON public.school_inquiries
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
    )
  );

CREATE INDEX IF NOT EXISTS idx_school_inquiries_created_at ON public.school_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_inquiries_status ON public.school_inquiries (status);
