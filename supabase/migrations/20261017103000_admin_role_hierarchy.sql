-- BrainLab Academy administrator role hierarchy.
-- REVIEW/STAGING ONLY: do not apply to production until production/staging schema
-- reconciliation and CBT regression tests are complete.
begin;

alter table public.admin_profiles
  drop constraint if exists admin_profiles_role_check;

update public.admin_profiles set role = 'platform_admin' where role = 'admin';
update public.admin_profiles set role = 'platform_admin' where role is null;

alter table public.admin_profiles
  alter column role set default 'platform_admin',
  alter column role set not null,
  add constraint admin_profiles_role_check check (
    role = any (array[
      'super_admin',
      'platform_admin',
      'cbt_admin',
      'ai_learning_admin',
      'community_moderator',
      'analytics_admin',
      'school_admin',
      'teacher',
      'content_reviewer',
      'finance_admin',
      'read_only_auditor'
    ]::text[])
  );

create or replace function public.get_admin_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select ap.role
  from public.admin_profiles ap
  where ap.user_id = auth.uid()
  limit 1;
$function$;

create or replace function public.admin_has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce((
    select case
      when ap.role in ('super_admin', 'platform_admin') then true
      when ap.role = 'cbt_admin' then permission_key = any (array[
        'cbt.questions.manage', 'cbt.answers.read', 'cbt.results.read',
        'cbt.sessions.read', 'cbt.sessions.manage', 'cbt.codes.manage',
        'cbt.config.read', 'cbt.config.manage', 'audit.logs.write'
      ]::text[])
      when ap.role = 'ai_learning_admin' then permission_key = any (array[
        'ai.content.manage', 'learning.content.manage', 'ai.quality.review',
        'analytics.ai.read'
      ]::text[])
      when ap.role = 'community_moderator' then permission_key = any (array[
        'community.moderate', 'student.support'
      ]::text[])
      when ap.role = 'analytics_admin' then permission_key = any (array[
        'analytics.read', 'analytics.ai.read', 'cbt.results.read',
        'cbt.sessions.read', 'institution.reports.read', 'audit.logs.read'
      ]::text[])
      when ap.role = 'school_admin' then permission_key = any (array[
        'institution.manage', 'institution.reports.read', 'student.support'
      ]::text[])
      when ap.role = 'teacher' then permission_key = any (array[
        'learning.content.manage', 'student.support'
      ]::text[])
      when ap.role = 'content_reviewer' then permission_key = any (array[
        'learning.content.review', 'ai.quality.review'
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

create or replace function public.list_admin_profiles()
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
begin
  if not public.is_super_admin() then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  return query
    select ap.user_id, ap.email, ap.role, ap.created_at
    from public.admin_profiles ap
    order by ap.created_at asc;
end;
$function$;

create or replace function public.set_admin_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  target_email text;
  previous_role text;
  actor_email text;
begin
  if not public.is_super_admin() then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  if new_role not in (
    'super_admin', 'platform_admin', 'cbt_admin', 'ai_learning_admin',
    'community_moderator', 'analytics_admin', 'school_admin', 'teacher',
    'content_reviewer', 'finance_admin', 'read_only_auditor'
  ) then
    raise exception 'Invalid administrator role' using errcode = '22023';
  end if;

  select u.email into target_email from auth.users u where u.id = target_user_id;
  if target_email is null then
    raise exception 'User account not found' using errcode = '22023';
  end if;

  select ap.role into previous_role
  from public.admin_profiles ap where ap.user_id = target_user_id;

  if previous_role = 'super_admin' and new_role <> 'super_admin'
     and (select count(*) from public.admin_profiles ap where ap.role = 'super_admin') <= 1 then
    raise exception 'Cannot demote the last super administrator' using errcode = '23514';
  end if;

  insert into public.admin_profiles(user_id, email, role)
  values (target_user_id, target_email, new_role)
  on conflict (user_id) do update
    set email = excluded.email, role = excluded.role;

  select u.email into actor_email from auth.users u where u.id = auth.uid();

  insert into public.audit_logs(admin_email, action, target_table, target_id, details)
  values (
    coalesce(actor_email, 'unknown'),
    'admin_role_changed',
    'admin_profiles',
    target_user_id::text,
    jsonb_build_object('actor_user_id', auth.uid(), 'previous_role', previous_role, 'new_role', new_role)
  );
end;
$function$;

create or replace function public.remove_admin_role(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  previous_role text;
  target_email text;
  actor_email text;
begin
  if not public.is_super_admin() then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  select ap.role, ap.email into previous_role, target_email
  from public.admin_profiles ap where ap.user_id = target_user_id;

  if previous_role is null then
    return;
  end if;

  if previous_role = 'super_admin'
     and (select count(*) from public.admin_profiles ap where ap.role = 'super_admin') <= 1 then
    raise exception 'Cannot remove the last super administrator' using errcode = '23514';
  end if;

  delete from public.admin_profiles where user_id = target_user_id;
  select u.email into actor_email from auth.users u where u.id = auth.uid();

  insert into public.audit_logs(admin_email, action, target_table, target_id, details)
  values (
    coalesce(actor_email, 'unknown'),
    'admin_role_removed',
    'admin_profiles',
    target_user_id::text,
    jsonb_build_object('actor_user_id', auth.uid(), 'target_email', target_email, 'previous_role', previous_role)
  );
end;
$function$;

revoke all on function public.get_admin_role() from public, anon;
revoke all on function public.admin_has_permission(text) from public, anon;
revoke all on function public.list_admin_profiles() from public, anon;
revoke all on function public.set_admin_role(uuid, text) from public, anon;
revoke all on function public.remove_admin_role(uuid) from public, anon;
grant execute on function public.get_admin_role() to authenticated;
grant execute on function public.admin_has_permission(text) to authenticated;
grant execute on function public.list_admin_profiles() to authenticated;
grant execute on function public.set_admin_role(uuid, text) to authenticated;
grant execute on function public.remove_admin_role(uuid) to authenticated;

-- Replace the broad admin-only policies with role-aware command policies.
drop policy if exists admin_all on public.questions;
create policy admin_questions_read on public.questions for select to authenticated
  using (public.admin_has_permission('cbt.questions.manage'));
create policy admin_questions_insert on public.questions for insert to authenticated
  with check (public.admin_has_permission('cbt.questions.manage'));
create policy admin_questions_update on public.questions for update to authenticated
  using (public.admin_has_permission('cbt.questions.manage'))
  with check (public.admin_has_permission('cbt.questions.manage'));
create policy admin_questions_delete on public.questions for delete to authenticated
  using (public.admin_has_permission('cbt.questions.delete'));

drop policy if exists admin_all on public.access_codes;
create policy admin_codes_read on public.access_codes for select to authenticated
  using (public.admin_has_permission('cbt.codes.manage'));
create policy admin_codes_insert on public.access_codes for insert to authenticated
  with check (public.admin_has_permission('cbt.codes.manage'));
create policy admin_codes_update on public.access_codes for update to authenticated
  using (public.admin_has_permission('cbt.codes.manage'))
  with check (public.admin_has_permission('cbt.codes.manage'));
create policy admin_codes_delete on public.access_codes for delete to authenticated
  using (public.admin_has_permission('cbt.codes.delete'));

drop policy if exists admin_all on public.answers;
create policy admin_answers_read on public.answers for select to authenticated
  using (public.admin_has_permission('cbt.answers.read'));
create policy admin_answers_insert on public.answers for insert to authenticated
  with check (public.admin_has_permission('cbt.answers.manage'));
create policy admin_answers_update on public.answers for update to authenticated
  using (public.admin_has_permission('cbt.answers.manage'))
  with check (public.admin_has_permission('cbt.answers.manage'));
create policy admin_answers_delete on public.answers for delete to authenticated
  using (public.admin_has_permission('cbt.results.delete'));

drop policy if exists admin_all on public.results;
create policy admin_results_read on public.results for select to authenticated
  using (public.admin_has_permission('cbt.results.read'));
create policy admin_results_insert on public.results for insert to authenticated
  with check (public.admin_has_permission('cbt.results.create'));
create policy admin_results_update on public.results for update to authenticated
  using (public.admin_has_permission('cbt.results.manage'))
  with check (public.admin_has_permission('cbt.results.manage'));
create policy admin_results_delete on public.results for delete to authenticated
  using (public.admin_has_permission('cbt.results.delete'));

drop policy if exists admin_all on public.exam_sessions;
create policy admin_sessions_read on public.exam_sessions for select to authenticated
  using (public.admin_has_permission('cbt.sessions.read'));
create policy admin_sessions_insert on public.exam_sessions for insert to authenticated
  with check (public.admin_has_permission('cbt.sessions.create'));
create policy admin_sessions_update on public.exam_sessions for update to authenticated
  using (public.admin_has_permission('cbt.sessions.manage'))
  with check (public.admin_has_permission('cbt.sessions.manage'));
create policy admin_sessions_delete on public.exam_sessions for delete to authenticated
  using (public.admin_has_permission('cbt.sessions.delete'));

drop policy if exists admin_all on public.exam_config;
create policy admin_exam_config_read on public.exam_config for select to authenticated
  using (public.admin_has_permission('cbt.config.read'));
create policy admin_exam_config_insert on public.exam_config for insert to authenticated
  with check (public.admin_has_permission('cbt.config.manage'));
create policy admin_exam_config_update on public.exam_config for update to authenticated
  using (public.admin_has_permission('cbt.config.manage'))
  with check (public.admin_has_permission('cbt.config.manage'));
create policy admin_exam_config_delete on public.exam_config for delete to authenticated
  using (public.admin_has_permission('cbt.config.delete'));

drop policy if exists admin_all on public.settings;
create policy admin_settings_read on public.settings for select to authenticated
  using (public.admin_has_permission('cbt.config.read'));
create policy admin_settings_insert on public.settings for insert to authenticated
  with check (public.admin_has_permission('cbt.config.manage'));
create policy admin_settings_update on public.settings for update to authenticated
  using (public.admin_has_permission('cbt.config.manage'))
  with check (public.admin_has_permission('cbt.config.manage'));
create policy admin_settings_delete on public.settings for delete to authenticated
  using (public.admin_has_permission('cbt.config.delete'));

drop policy if exists admin_read on public.audit_logs;
drop policy if exists admin_append on public.audit_logs;
create policy admin_audit_read on public.audit_logs for select to authenticated
  using (public.admin_has_permission('audit.logs.read'));
create policy admin_audit_append on public.audit_logs for insert to authenticated
  with check (public.admin_has_permission('audit.logs.write'));

drop policy if exists admin_all on public.question_upload_logs;
create policy admin_question_upload_logs_read on public.question_upload_logs for select to authenticated
  using (public.admin_has_permission('cbt.questions.manage'));
create policy admin_question_upload_logs_insert on public.question_upload_logs for insert to authenticated
  with check (public.admin_has_permission('cbt.questions.manage'));
create policy admin_question_upload_logs_update on public.question_upload_logs for update to authenticated
  using (public.admin_has_permission('cbt.questions.manage'))
  with check (public.admin_has_permission('cbt.questions.manage'));
create policy admin_question_upload_logs_delete on public.question_upload_logs for delete to authenticated
  using (public.admin_has_permission('cbt.questions.delete'));

commit;
