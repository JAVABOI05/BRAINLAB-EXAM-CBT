-- Run after 20261127170000_public_assessment_anon_metadata.sql.
-- These checks are read-only and do not modify assessment records.
begin;

set local role anon;

-- Expected: exactly one row for the known published, open, public BIOLOGY assessment.
select count(*) as expected_one_public_assessment
from public.learning_assessments
where id = '6642bf7f-df4a-4ca6-8d52-57707d9e67b5';

-- Expected: title metadata is readable; question payload is not.
select
  has_column_privilege('anon', 'public.learning_assessments', 'title', 'SELECT')
    as anon_can_read_title,
  has_column_privilege('anon', 'public.learning_assessments', 'custom_questions', 'SELECT')
    as anon_can_read_custom_questions;

rollback;
