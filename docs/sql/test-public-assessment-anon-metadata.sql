-- Run after 20261127170000_public_assessment_anon_metadata.sql
-- Read-only assertions; no application data is modified.
begin;

do $$
declare
  v_visible_count integer;
  v_can_read_questions boolean;
  v_can_read_public_metadata boolean;
begin
  -- Confirm anon sees the known published public assessment.
  execute 'set local role anon';
  select count(*) into v_visible_count
  from public.learning_assessments
  where id = '6642bf7f-df4a-4ca6-8d52-57707d9e67b5';

  if v_visible_count <> 1 then
    raise exception 'Expected anon to see the published public assessment; got % rows', v_visible_count;
  end if;

  select has_column_privilege('anon', 'public.learning_assessments', 'title', 'SELECT')
    into v_can_read_public_metadata;
  select has_column_privilege('anon', 'public.learning_assessments', 'custom_questions', 'SELECT')
    into v_can_read_questions;

  if not v_can_read_public_metadata then
    raise exception 'Anon is missing SELECT on public assessment title metadata';
  end if;
  if v_can_read_questions then
    raise exception 'Anon unexpectedly has SELECT on custom_questions';
  end if;
end $$;

rollback;
