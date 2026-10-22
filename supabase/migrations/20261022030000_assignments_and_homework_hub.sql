-- ==============================================================================
-- BRAINLAB ACADEMY: COURSE ASSIGNMENTS & HOMEWORK SUBMISSION HUB
-- Migration: 20261022030000_assignments_and_homework_hub.sql
-- ==============================================================================

-- 1. Extend Assignment Submissions with Tutor Audio Feedback & Rubrics
ALTER TABLE public.assignment_submissions
  ADD COLUMN IF NOT EXISTS tutor_audio_asset_id UUID REFERENCES public.audio_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rubric_scores JSONB DEFAULT '{}'::jsonb;

-- 2. Extend Assignments with Optional Rubrics and Submission Deadlines
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS rubric JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS allow_late_submissions BOOLEAN NOT NULL DEFAULT true;

-- 3. Row Level Security Policies for Assignments
DROP POLICY IF EXISTS "Enrolled students and tutors view assignments" ON public.assignments;
CREATE POLICY "Enrolled students and tutors view assignments" ON public.assignments
  FOR SELECT USING (
    status = 'published' OR
    tutor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.course_id = assignments.course_id AND ce.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.admin_user_roles aur
      WHERE aur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tutors and admins manage assignments" ON public.assignments;
CREATE POLICY "Tutors and admins manage assignments" ON public.assignments
  FOR ALL USING (
    tutor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admin_user_roles aur
      WHERE aur.user_id = auth.uid() AND aur.role IN ('super_admin', 'platform_admin', 'teacher')
    )
  );

-- 4. Row Level Security Policies for Assignment Submissions
DROP POLICY IF EXISTS "Students view own submissions, tutors view course submissions" ON public.assignment_submissions;
CREATE POLICY "Students view own submissions, tutors view course submissions" ON public.assignment_submissions
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id AND a.tutor_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.admin_user_roles aur
      WHERE aur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students submit assignment work" ON public.assignment_submissions;
CREATE POLICY "Students submit assignment work" ON public.assignment_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id AND a.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Students update own submission or tutors grade" ON public.assignment_submissions;
CREATE POLICY "Students update own submission or tutors grade" ON public.assignment_submissions
  FOR UPDATE USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id AND a.tutor_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.admin_user_roles aur
      WHERE aur.user_id = auth.uid()
    )
  );

-- 5. Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_course_due ON public.assignments(course_id, due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON public.assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.assignment_submissions(status);
