-- Harden class_recordings SELECT RLS policy to match server-side API authorization.
-- Prevents direct authenticated PostgREST reads from bypassing access_policy,
-- active course enrolment, or verified class attendance checks.

BEGIN;

ALTER TABLE public.class_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_recordings_select_visible_or_owner" ON public.class_recordings;
CREATE POLICY "class_recordings_select_visible_or_owner"
  ON public.class_recordings
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.live_classes lc
      WHERE lc.id = class_recordings.class_id
        AND lc.tutor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.role IN ('super_admin', 'platform_admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('super_admin', 'platform_admin')
    )
    OR (
      is_visible_to_students = true
      AND processing_status = 'ready'
      AND access_policy <> 'tutors_only'
      AND (
        access_policy = 'public'
        OR (
          access_policy = 'enrolled_only'
          AND (
            (
              COALESCE(
                class_recordings.course_id,
                (
                  SELECT lc.course_id
                  FROM public.live_classes lc
                  WHERE lc.id = class_recordings.class_id
                )
              ) IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM public.course_enrollments ce
                WHERE ce.course_id = COALESCE(
                  class_recordings.course_id,
                  (
                    SELECT lc.course_id
                    FROM public.live_classes lc
                    WHERE lc.id = class_recordings.class_id
                  )
                )
                  AND ce.user_id = auth.uid()
                  AND ce.status = 'active'
                  AND (ce.expires_at IS NULL OR ce.expires_at > now())
              )
            )
            OR (
              class_recordings.class_id IS NOT NULL
              AND COALESCE(
                class_recordings.course_id,
                (
                  SELECT lc.course_id
                  FROM public.live_classes lc
                  WHERE lc.id = class_recordings.class_id
                )
              ) IS NULL
              AND EXISTS (
                SELECT 1
                FROM public.class_attendance_records car
                WHERE car.class_id = class_recordings.class_id
                  AND car.user_id = auth.uid()
                  AND car.attendance_status IN ('present', 'partial', 'manual_verified')
              )
            )
          )
        )
      )
    )
  );

COMMIT;
