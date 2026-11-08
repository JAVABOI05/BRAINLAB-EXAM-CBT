-- ============================================================================
-- BrainLab: enforce the same recording visibility rules at the database layer.
--
-- The previous policy treated every published/ready recording as readable by
-- every authenticated user. API-side enrolment checks do not protect direct
-- Supabase queries, so this policy mirrors the established replay rules:
--   * owner / assigned class tutor / platform admin may inspect the row;
--   * public recordings are available to signed-in learners;
--   * enrolled_only course recordings require an active, unexpired enrolment;
--   * enrolled_only standalone class recordings require recorded attendance;
--   * tutors_only recordings are not visible to ordinary learners.
--
-- This migration intentionally changes no bucket, object, or recording data.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "class_recordings_select_visible_or_owner"
  ON public.class_recordings;

CREATE POLICY "class_recordings_select_visible_or_owner"
  ON public.class_recordings
  FOR SELECT
  TO authenticated
  USING (
    -- The creator can manage their own Studio recording metadata.
    created_by = auth.uid()

    -- The tutor assigned to the associated live class.
    OR EXISTS (
      SELECT 1
      FROM public.live_classes lc
      WHERE lc.id = class_recordings.class_id
        AND lc.tutor_id = auth.uid()
    )

    -- Existing platform administrator authority.
    OR EXISTS (
      SELECT 1
      FROM public.admin_users a
      WHERE a.id = auth.uid()
        AND a.role IN ('super_admin', 'platform_admin')
    )

    -- Student-facing access is conditional on publication and processing.
    OR (
      is_visible_to_students = true
      AND processing_status = 'ready'
      AND (
        access_policy = 'public'

        OR (
          access_policy = 'enrolled_only'
          AND (
            -- A course-linked replay requires an active, unexpired enrolment.
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
                WHERE ce.user_id = auth.uid()
                  AND ce.status = 'active'
                  AND (ce.expires_at IS NULL OR ce.expires_at > now())
                  AND ce.course_id = COALESCE(
                    class_recordings.course_id,
                    (
                      SELECT lc.course_id
                      FROM public.live_classes lc
                      WHERE lc.id = class_recordings.class_id
                    )
                  )
              )
            )

            OR

            -- Standalone class replays require actual attendance.
            (
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
                FROM public.class_attendance_records ar
                WHERE ar.class_id = class_recordings.class_id
                  AND ar.user_id = auth.uid()
                  AND ar.attendance_status IN ('present', 'partial', 'manual_verified')
              )
            )
          )
        )
      )
    )
  );

COMMIT;
