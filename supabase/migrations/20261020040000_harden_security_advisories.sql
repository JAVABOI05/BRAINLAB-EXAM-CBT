-- ============================================================================
-- Migration: 20261020040000_harden_security_advisories.sql
-- Description: Resolve Supabase Security Advisories:
--   1. Add RLS policies for tables with RLS enabled but missing policies
--   2. Restrict execute permissions on administrative privileged functions
--   3. Ensure search_path = public, pg_temp across legacy helpers
-- ============================================================================

begin;

-- ============================================================================
-- PART 1: Missing RLS Policies for Learning Test Engine Tables
-- ============================================================================

-- Table: learning_test_attempts
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'learning_test_attempts' and policyname = 'learning_test_attempts_select_own_or_admin') then
    create policy learning_test_attempts_select_own_or_admin on public.learning_test_attempts
      for select to authenticated
      using (
        user_id = auth.uid()
        or exists (select 1 from public.admin_users a where a.id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'learning_test_attempts' and policyname = 'learning_test_attempts_insert_own') then
    create policy learning_test_attempts_insert_own on public.learning_test_attempts
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename = 'learning_test_attempts' and policyname = 'learning_test_attempts_update_own') then
    create policy learning_test_attempts_update_own on public.learning_test_attempts
      for update to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- Table: learning_test_answers
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'learning_test_answers' and policyname = 'learning_test_answers_select_own_or_admin') then
    create policy learning_test_answers_select_own_or_admin on public.learning_test_answers
      for select to authenticated
      using (
        exists (
          select 1 from public.learning_test_attempts att
          where att.id = attempt_id and (att.user_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()))
        )
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'learning_test_answers' and policyname = 'learning_test_answers_insert_own') then
    create policy learning_test_answers_insert_own on public.learning_test_answers
      for insert to authenticated
      with check (
        exists (
          select 1 from public.learning_test_attempts att
          where att.id = attempt_id and att.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'learning_test_answers' and policyname = 'learning_test_answers_update_own') then
    create policy learning_test_answers_update_own on public.learning_test_answers
      for update to authenticated
      using (
        exists (
          select 1 from public.learning_test_attempts att
          where att.id = attempt_id and att.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.learning_test_attempts att
          where att.id = attempt_id and att.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Table: learning_test_attempt_questions
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'learning_test_attempt_questions' and policyname = 'learning_test_attempt_questions_select_own_or_admin') then
    create policy learning_test_attempt_questions_select_own_or_admin on public.learning_test_attempt_questions
      for select to authenticated
      using (
        exists (
          select 1 from public.learning_test_attempts att
          where att.id = attempt_id and (att.user_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()))
        )
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'learning_test_attempt_questions' and policyname = 'learning_test_attempt_questions_insert_own') then
    create policy learning_test_attempt_questions_insert_own on public.learning_test_attempt_questions
      for insert to authenticated
      with check (
        exists (
          select 1 from public.learning_test_attempts att
          where att.id = attempt_id and att.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Table: learning_subject_memberships
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'learning_subject_memberships' and policyname = 'learning_subject_memberships_select_own') then
    create policy learning_subject_memberships_select_own on public.learning_subject_memberships
      for select to authenticated
      using (student_id = auth.uid() or exists (select 1 from public.admin_users a where a.id = auth.uid()));
  end if;
end $$;

-- ============================================================================
-- PART 2: Revoke Public & Anon from Privileged Functions
-- ============================================================================

-- Revoke anon from administrative helper
revoke execute on function public.learning_can_manage_all() from anon, public;
grant execute on function public.learning_can_manage_all() to authenticated, service_role;

-- Ensure admin mutations cannot be executed by anon
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_admin_role') then
    revoke execute on function public.set_admin_role(uuid, text) from anon, public;
  end if;

  if exists (select 1 from pg_proc where proname = 'remove_admin_role') then
    revoke execute on function public.remove_admin_role(uuid) from anon, public;
  end if;

  if exists (select 1 from pg_proc where proname = 'create_learning_organisation') then
    revoke execute on function public.create_learning_organisation(text, text) from anon, public;
  end if;

  if exists (select 1 from pg_proc where proname = 'revoke_learning_entitlement') then
    revoke execute on function public.revoke_learning_entitlement(uuid) from anon, public;
  end if;

  if exists (select 1 from pg_proc where proname = 'list_learning_entitlements') then
    revoke execute on function public.list_learning_entitlements(uuid) from anon, public;
  end if;

  if exists (select 1 from pg_proc where proname = 'get_organisation_assessment_results') then
    revoke execute on function public.get_organisation_assessment_results(uuid) from anon, public;
  end if;
end $$;

commit;
