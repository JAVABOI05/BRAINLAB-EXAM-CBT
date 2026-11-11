-- ============================================================================
-- BRAINLAB ACADEMY: ACCESS MODEL & EXAMINATION POSITIONING DIRECTIVE
-- Migration: 20261111100000_two_category_access_and_apex_cohort_enrolments.sql
-- 
-- 1. Introduces exactly two access categories: 'public' and 'apex_cohort'.
-- 2. Apex access is an authoritative enrolment record, not a flag on profile.
-- 3. Creates cohort_programmes, cohorts, and apex_enrolments with RLS.
-- 4. Creates cohort-specific operational tables for curriculum, assessments,
--    attendance, and tutor reports.
-- 5. Implements derived access resolver: resolve_effective_access_category(user_id)
--    Access reverts to 'public' automatically upon expiration.
-- 6. Seamlessly maps existing active paid subscribers to Apex enrolments per Decision 5.6.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COHORT PROGRAMMES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cohort_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_key text NOT NULL UNIQUE,
  title text NOT NULL,
  examination_target text NOT NULL, -- 'UTME', 'Post-UTME', 'WAEC', 'NECO', 'Other'
  academic_session text NOT NULL DEFAULT '2026/2027',
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. COHORTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.cohort_programmes(id) ON DELETE RESTRICT,
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 50 CHECK (capacity > 0),
  lead_tutor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  timetable jsonb NOT NULL DEFAULT '[]'::jsonb,
  live_room_id text,
  status text NOT NULL DEFAULT 'enrolling' CHECK (status IN ('draft', 'enrolling', 'in_session', 'completed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. APEX ENROLMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apex_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE RESTRICT,
  programme_id uuid NOT NULL REFERENCES public.cohort_programmes(id) ON DELETE RESTRICT,
  academic_session text NOT NULL DEFAULT '2026/2027',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'transferred')),
  payment_reference text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apex_enrolments_dates_check CHECK (ends_at >= starts_at)
);

-- ----------------------------------------------------------------------------
-- 4. COHORT-SPECIFIC OPERATIONAL TABLES
-- ----------------------------------------------------------------------------

-- 4.1 Curriculum Assignments (Structured weekly assigned topics)
CREATE TABLE IF NOT EXISTS public.cohort_curriculum_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  subject text NOT NULL,
  topic_code text,
  title text NOT NULL,
  assigned_week integer NOT NULL DEFAULT 1 CHECK (assigned_week > 0),
  due_date timestamptz,
  instructions text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.2 Scheduled Cohort Assessments & Special Mocks
CREATE TABLE IF NOT EXISTS public.cohort_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title text NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type IN ('weekly_drill', 'cohort_mock', 'milestone_test', 'diagnostic')),
  scheduled_at timestamptz NOT NULL,
  due_at timestamptz,
  cbt_template_id text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.3 Cohort Attendance Tracking
CREATE TABLE IF NOT EXISTS public.cohort_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_title text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  attended boolean NOT NULL DEFAULT true,
  joined_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cohort_attendance_unique_session UNIQUE (cohort_id, student_id, session_title, session_date)
);

-- 4.4 Detailed Tutor Progress Reports & Interventions
CREATE TABLE IF NOT EXISTS public.cohort_tutor_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES public.apex_enrolments(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporting_period text NOT NULL, -- e.g. 'Week 4 Progress Review', 'Monthly Assessment #1'
  strengths text[] NOT NULL DEFAULT '{}'::text[],
  weak_topics text[] NOT NULL DEFAULT '{}'::text[],
  attendance_score numeric(5,2) DEFAULT 100.0,
  assessment_average numeric(5,2),
  action_plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. INDEXES FOR PERFORMANCE & AUDIT
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cohort_programmes_target ON public.cohort_programmes(examination_target, is_active);
CREATE INDEX IF NOT EXISTS idx_cohorts_programme ON public.cohorts(programme_id, status);
CREATE INDEX IF NOT EXISTS idx_cohorts_tutor ON public.cohorts(lead_tutor_id);
CREATE INDEX IF NOT EXISTS idx_apex_enrolments_student_active ON public.apex_enrolments(student_id, status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_apex_enrolments_cohort ON public.apex_enrolments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_apex_enrolments_payment_ref ON public.apex_enrolments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_cohort_assignments_cohort ON public.cohort_curriculum_assignments(cohort_id, assigned_week);
CREATE INDEX IF NOT EXISTS idx_cohort_assessments_cohort ON public.cohort_assessments(cohort_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cohort_attendance_student ON public.cohort_attendance(student_id, cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_reports_student ON public.cohort_tutor_reports(student_id, enrolment_id);

-- ----------------------------------------------------------------------------
-- 6. AUTHORITATIVE DERIVED ACCESS RESOLVER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_effective_access_category(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_active_enrolment boolean;
  v_is_staff boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'public';
  END IF;

  -- 1. Root Administrators & Tutors receive universal Apex access
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE user_id = p_user_id
  ) INTO v_is_staff;

  IF v_is_staff THEN
    RETURN 'apex_cohort';
  END IF;

  -- 2. Derived Enrolment Check: Active Apex enrolment covering current timestamp
  SELECT EXISTS (
    SELECT 1 
    FROM public.apex_enrolments 
    WHERE student_id = p_user_id 
      AND status = 'active'
      AND starts_at <= now()
      AND ends_at > now()
  ) INTO v_has_active_enrolment;

  IF v_has_active_enrolment THEN
    RETURN 'apex_cohort';
  ELSE
    RETURN 'public';
  END IF;
END;
$$;

-- Authenticated session convenience wrapper
CREATE OR REPLACE FUNCTION public.resolve_my_access_category()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.resolve_effective_access_category(auth.uid());
$$;

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.cohort_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apex_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_curriculum_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_tutor_reports ENABLE ROW LEVEL SECURITY;

-- 7.1 Programmes: Publicly viewable by all learners, manageable by staff
DROP POLICY IF EXISTS cohort_programmes_select_all ON public.cohort_programmes;
CREATE POLICY cohort_programmes_select_all ON public.cohort_programmes
  FOR SELECT TO authenticated, anon
  USING (is_active = true OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS cohort_programmes_admin_manage ON public.cohort_programmes;
CREATE POLICY cohort_programmes_admin_manage ON public.cohort_programmes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

-- 7.2 Cohorts: Publicly viewable active list, manageable by staff
DROP POLICY IF EXISTS cohorts_select_all ON public.cohorts;
CREATE POLICY cohorts_select_all ON public.cohorts
  FOR SELECT TO authenticated, anon
  USING (status IN ('enrolling', 'in_session', 'completed') OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()) OR lead_tutor_id = auth.uid());

DROP POLICY IF EXISTS cohorts_admin_manage ON public.cohorts;
CREATE POLICY cohorts_admin_manage ON public.cohorts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()) OR lead_tutor_id = auth.uid())
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()) OR lead_tutor_id = auth.uid());

-- 7.3 Apex Enrolments: Students see their own enrolments; staff can manage
DROP POLICY IF EXISTS apex_enrolments_select_own ON public.apex_enrolments;
CREATE POLICY apex_enrolments_select_own ON public.apex_enrolments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS apex_enrolments_staff_manage ON public.apex_enrolments;
CREATE POLICY apex_enrolments_staff_manage ON public.apex_enrolments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

-- 7.4 Curriculum Assignments: Visible to enrolled cohort members and lead tutors
DROP POLICY IF EXISTS cohort_curriculum_select ON public.cohort_curriculum_assignments;
CREATE POLICY cohort_curriculum_select ON public.cohort_curriculum_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.apex_enrolments e 
      WHERE e.cohort_id = cohort_curriculum_assignments.cohort_id 
        AND e.student_id = auth.uid() 
        AND e.status = 'active'
    )
    OR EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_curriculum_assignments.cohort_id AND c.lead_tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS cohort_curriculum_manage ON public.cohort_curriculum_assignments;
CREATE POLICY cohort_curriculum_manage ON public.cohort_curriculum_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_curriculum_assignments.cohort_id AND c.lead_tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_curriculum_assignments.cohort_id AND c.lead_tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

-- 7.5 Assessments: Enrolled students and tutors
DROP POLICY IF EXISTS cohort_assessments_select ON public.cohort_assessments;
CREATE POLICY cohort_assessments_select ON public.cohort_assessments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.apex_enrolments e 
      WHERE e.cohort_id = cohort_assessments.cohort_id 
        AND e.student_id = auth.uid() 
        AND e.status = 'active'
    )
    OR EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_assessments.cohort_id AND c.lead_tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS cohort_assessments_manage ON public.cohort_assessments;
CREATE POLICY cohort_assessments_manage ON public.cohort_assessments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_assessments.cohort_id AND c.lead_tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_assessments.cohort_id AND c.lead_tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

-- 7.6 Attendance: Student views own records; tutors/staff manage
DROP POLICY IF EXISTS cohort_attendance_select_own ON public.cohort_attendance;
CREATE POLICY cohort_attendance_select_own ON public.cohort_attendance
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_attendance.cohort_id AND c.lead_tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS cohort_attendance_manage ON public.cohort_attendance;
CREATE POLICY cohort_attendance_manage ON public.cohort_attendance
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_attendance.cohort_id AND c.lead_tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_attendance.cohort_id AND c.lead_tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

-- 7.7 Tutor Reports: Student views own report; tutors/staff create and review
DROP POLICY IF EXISTS cohort_reports_select_own ON public.cohort_tutor_reports;
CREATE POLICY cohort_reports_select_own ON public.cohort_tutor_reports
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS cohort_reports_manage ON public.cohort_tutor_reports;
CREATE POLICY cohort_reports_manage ON public.cohort_tutor_reports
  FOR ALL TO authenticated
  USING (
    tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 8. INITIAL PROGRAMMES & SEED DATA (UTME & POST-UTME PRIORITY)
-- ----------------------------------------------------------------------------
INSERT INTO public.cohort_programmes (programme_key, title, examination_target, academic_session, description, starts_at, ends_at, is_active)
VALUES
  (
    'utme_2027_accelerator',
    'JAMB UTME 2027 Accelerated Cohort',
    'UTME',
    '2026/2027',
    'Intensive syllabus tutorials, daily speed drills, and weekend proctored mocks for candidates targeting 300+ in JAMB UTME.',
    now(),
    now() + interval '180 days',
    true
  ),
  (
    'post_utme_2027_screening',
    'University Post-UTME Screening Intensive',
    'Post-UTME',
    '2026/2027',
    'Institution-specific masterclasses and high-yield past question breakdown for UNILAG, UI, OAU, UNIBEN, ABU and FUTO screenings.',
    now(),
    now() + interval '180 days',
    true
  )
ON CONFLICT (programme_key) DO UPDATE SET
  title = EXCLUDED.title,
  examination_target = EXCLUDED.examination_target,
  updated_at = now();

-- Default initial cohort under UTME programme
DO $$
DECLARE
  v_prog_id uuid;
  v_cohort_id uuid;
BEGIN
  SELECT id INTO v_prog_id FROM public.cohort_programmes WHERE programme_key = 'utme_2027_accelerator';
  
  IF v_prog_id IS NOT NULL THEN
    INSERT INTO public.cohorts (programme_id, name, capacity, timetable, status)
    VALUES (
      v_prog_id,
      'Apex Alpha 2027 (Science & General)',
      100,
      '[
        {"day": "Monday", "time": "18:00 WAT", "subject": "Use of English"},
        {"day": "Wednesday", "time": "18:00 WAT", "subject": "Mathematics"},
        {"day": "Friday", "time": "18:00 WAT", "subject": "Physics / Chemistry"},
        {"day": "Saturday", "time": "10:00 WAT", "subject": "Weekly Milestone Mock Exam"}
      ]'::jsonb,
      'enrolling'
    )
    RETURNING id INTO v_cohort_id;

    -- ------------------------------------------------------------------------
    -- 9. DECISION 5.6: SEAMLESS MAPPING OF ACTIVE PAID SUBSCRIBERS
    -- Converts existing active paid subscribers to Apex enrolments without extra charge
    -- ------------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_subscriptions') THEN
      INSERT INTO public.apex_enrolments (student_id, cohort_id, programme_id, academic_session, starts_at, ends_at, status, notes)
      SELECT 
        s.user_id,
        v_cohort_id,
        v_prog_id,
        '2026/2027',
        COALESCE(s.current_period_start, now()),
        COALESCE(s.current_period_end, now() + interval '30 days'),
        'active',
        'Migrated from active paid plan: ' || COALESCE(s.plan_id, 'legacy_subscriber') || ' (Directive Decision 5.6)'
      FROM public.user_subscriptions s
      WHERE s.status = 'active'
        AND s.current_period_end > now()
        AND s.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.apex_enrolments e WHERE e.student_id = s.user_id AND e.cohort_id = v_cohort_id
        );
    END IF;
  END IF;
END $$;
