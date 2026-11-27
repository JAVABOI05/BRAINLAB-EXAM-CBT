-- Rollback: restore previous class_recordings_select_visible_or_owner policy

BEGIN;

DROP POLICY IF EXISTS "class_recordings_select_visible_or_owner" ON public.class_recordings;
CREATE POLICY "class_recordings_select_visible_or_owner"
  ON public.class_recordings FOR SELECT
  TO authenticated
  USING (
    (is_visible_to_students = true AND processing_status = 'ready')
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.live_classes lc
      WHERE lc.id = class_recordings.class_id AND lc.tutor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid() AND a.role IN ('super_admin', 'platform_admin')
    )
  );

COMMIT;
