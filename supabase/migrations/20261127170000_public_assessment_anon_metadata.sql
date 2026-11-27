-- Allow anonymous candidates to read only the public metadata required
-- by the assessment landing page and runner metadata lookup.
--
-- Do not expose custom_questions, question-source internals, creator IDs,
-- or organisation-scoped assessments through the anon Data API role.

drop policy if exists learning_assessments_read_published_anon
on public.learning_assessments;

create policy learning_assessments_read_published_anon
on public.learning_assessments
for select
to anon
using (
  is_published is true
  and status = 'open'
  and organisation_id is null
);

-- Replace any table-wide anon SELECT grant with a least-privilege column grant.
revoke select on table public.learning_assessments from anon;

grant select (
  id,
  slug,
  title,
  description,
  instructions,
  assessment_type,
  question_count,
  duration_seconds,
  max_attempts,
  access_code_required,
  result_release,
  is_published
)
on table public.learning_assessments
to anon;

comment on policy learning_assessments_read_published_anon
on public.learning_assessments
is 'Anonymous candidates may read only published, open, public assessment rows; column grants separately restrict exposed metadata.';
