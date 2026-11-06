-- Migration: 20261106040000_grant_instructor_academic_permissions.sql
-- Description: Grant instructors academic & content authoring permissions and ensure super_admin omnipotence across student and instructor portals.

create or replace function public.admin_has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce((
    select case
      -- super_admin has absolute, universal read & write access across all portals
      when ap.role = 'super_admin' then true

      when ap.role = 'platform_admin' then permission_key = any (array[
        'cbt.questions.manage', 'cbt.questions.delete', 'cbt.answers.read',
        'cbt.answers.manage', 'cbt.results.read', 'cbt.results.create',
        'cbt.results.manage', 'cbt.results.delete', 'cbt.sessions.read',
        'cbt.sessions.create', 'cbt.sessions.manage', 'cbt.sessions.delete',
        'cbt.codes.manage', 'cbt.codes.delete', 'cbt.config.read',
        'cbt.config.manage', 'cbt.config.delete', 'ai.content.manage',
        'learning.content.manage', 'ai.quality.review', 'analytics.ai.read',
        'community.moderate', 'student.support', 'analytics.read',
        'institution.reports.read', 'institution.manage',
        'learning.content.review', 'finance.billing.manage',
        'audit.logs.read', 'audit.logs.write',
        'stem.resource.view', 'stem.resource.manage', 'stem.resource.publish',
        'question_bank.create', 'question_bank.view', 'question_bank.edit_own',
        'question_bank.import_csv', 'question_builder.use'
      ]::text[])

      when ap.role = 'cbt_admin' then permission_key = any (array[
        'cbt.questions.manage', 'cbt.questions.delete', 'cbt.answers.read',
        'cbt.results.read', 'cbt.sessions.read', 'cbt.sessions.manage',
        'cbt.codes.manage', 'cbt.config.read', 'cbt.config.manage',
        'question_bank.create', 'question_bank.view', 'question_bank.edit_own',
        'question_bank.import_csv', 'question_builder.use', 'audit.logs.write'
      ]::text[])

      when ap.role = 'ai_learning_admin' then permission_key = any (array[
        'ai.content.manage', 'learning.content.manage', 'ai.quality.review',
        'analytics.ai.read', 'stem.resource.view', 'stem.resource.manage'
      ]::text[])

      -- Teachers & Instructors: Full academic content and question bank management
      when ap.role in ('teacher', 'competition_host') then permission_key = any (array[
        'learning.content.manage', 'student.support',
        'cbt.questions.manage', 'cbt.questions.delete', 'cbt.results.read',
        'ai.content.manage', 'question_bank.create', 'question_bank.view',
        'question_bank.edit_own', 'question_bank.import_csv', 'question_builder.use',
        'stem.resource.view', 'stem.resource.manage'
      ]::text[])

      when ap.role = 'competition_moderator' then permission_key = any (array[
        'community.moderate', 'student.support', 'question_bank.view',
        'question_bank.moderate', 'cbt.questions.manage'
      ]::text[])

      when ap.role = 'community_moderator' then permission_key = any (array[
        'community.moderate', 'student.support'
      ]::text[])

      when ap.role = 'analytics_admin' then permission_key = any (array[
        'analytics.read', 'analytics.ai.read',
        'cbt.sessions.read', 'institution.reports.read', 'audit.logs.read'
      ]::text[])

      when ap.role = 'school_admin' then permission_key = any (array[
        'institution.manage', 'institution.reports.read', 'student.support',
        'cbt.results.read', 'cbt.sessions.read'
      ]::text[])

      when ap.role = 'content_reviewer' then permission_key = any (array[
        'learning.content.review', 'ai.quality.review', 'stem.resource.review',
        'cbt.questions.manage'
      ]::text[])

      when ap.role = 'finance_admin' then permission_key = 'finance.billing.manage'

      when ap.role = 'read_only_auditor' then permission_key = any (array[
        'audit.logs.read', 'analytics.read'
      ]::text[])

      else false
    end
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
    limit 1
  ), false);
$function$;
