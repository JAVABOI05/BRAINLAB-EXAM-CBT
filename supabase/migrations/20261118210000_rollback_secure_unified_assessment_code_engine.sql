-- Rollback for 20261118210000_secure_unified_assessment_code_engine.sql
BEGIN;

DROP FUNCTION IF EXISTS public.manage_assessment_code(UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ);

-- Revert policy to original scoped definition
DROP POLICY IF EXISTS learning_access_codes_manage_scoped ON public.learning_access_codes;
CREATE POLICY learning_access_codes_manage_scoped ON public.learning_access_codes
FOR ALL
USING (
  public.learning_can_manage_all()
  OR (scope_type = 'assessment' AND (
    public.admin_has_permission('cbt.codes.manage')
    OR EXISTS (
      SELECT 1 FROM public.learning_assessments a
      WHERE a.id = learning_access_codes.assessment_id
        AND a.organisation_id IS NOT NULL
        AND public.learning_can_manage_organisation(a.organisation_id)
    )
  ))
  OR (scope_type = 'organisation' AND organisation_id IS NOT NULL AND public.learning_can_manage_organisation(organisation_id))
)
WITH CHECK (
  public.learning_can_manage_all()
  OR (scope_type = 'assessment' AND (
    public.admin_has_permission('cbt.codes.manage')
    OR EXISTS (
      SELECT 1 FROM public.learning_assessments a
      WHERE a.id = learning_access_codes.assessment_id
        AND a.organisation_id IS NOT NULL
        AND public.learning_can_manage_organisation(a.organisation_id)
    )
  ))
  OR (scope_type = 'organisation' AND organisation_id IS NOT NULL AND public.learning_can_manage_organisation(organisation_id))
);

COMMIT;
