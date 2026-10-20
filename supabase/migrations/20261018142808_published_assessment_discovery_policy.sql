-- Let signed-in learners discover published assessments that require a code.
-- The start RPC still validates the exact assessment-scoped code server-side.
alter policy learning_assessments_read_published_scoped
on public.learning_assessments
using (
  public.learning_can_manage_all()
  or (
    is_published and (
      organisation_id is null
      or access_code_required
      or exists (
        select 1 from public.learning_organisation_members m
        where m.organisation_id=learning_assessments.organisation_id
          and m.user_id=auth.uid() and m.status='active'
      )
    )
  )
  or (organisation_id is not null and public.learning_can_manage_organisation(organisation_id))
);
