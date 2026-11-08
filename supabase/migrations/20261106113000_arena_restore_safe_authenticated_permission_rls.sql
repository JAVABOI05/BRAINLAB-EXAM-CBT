create or replace function public.has_competition_permission(
  p_user_id uuid,
  p_permission text,
  p_scope_type text default 'global',
  p_scope_id text default 'all'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_has_scoped boolean;
begin
  -- RLS callers may only ask about their own authenticated identity.
  if auth.uid() is null or auth.uid() <> p_user_id then
    return false;
  end if;
  if p_user_id is null then return false; end if;

  select ap.role into v_role
  from public.admin_profiles ap
  where ap.user_id = p_user_id
  limit 1;

  if v_role = 'super_admin' then return true; end if;
  if v_role = 'platform_admin' and p_permission not in ('competition.manage_roles', 'competition.view_audit_logs') then
    return true;
  end if;

  if v_role = 'competition_admin' and p_permission in (
    'competition.view','competition.create','competition.edit_assigned','competition.publish',
    'competition.schedule','competition.cancel','competition.manage_participants','competition.view_results',
    'competition.publish_results','competition.manage_rounds','competition.manage_rewards',
    'competition.approve_rewards','question_bank.create','question_bank.view','question_bank.edit_assigned',
    'question_bank.import_csv','question_bank.export','question_bank.publish','question_builder.use',
    'question_bank.link_main_bank'
  ) then return true; end if;

  if v_role = 'competition_moderator' and p_permission in (
    'competition.view','competition.manage_participants','competition.view_results',
    'question_bank.view','question_bank.moderate','question_builder.use'
  ) then return true; end if;

  if v_role in ('competition_host','teacher') and p_permission in (
    'competition.view','competition.create','competition.edit_own','competition.view_results',
    'question_bank.create','question_bank.view','question_bank.edit_own',
    'question_bank.import_csv','question_builder.use'
  ) then return true; end if;

  select exists (
    select 1 from public.competition_user_permissions cup
    where cup.user_id = p_user_id
      and cup.permission_key = p_permission
      and (
        cup.scope_type = 'global'
        or (cup.scope_type = p_scope_type and (cup.scope_id = 'all' or cup.scope_id = p_scope_id))
      )
  ) into v_has_scoped;

  if v_has_scoped then return true; end if;
  return p_permission = 'competition.view';
end;
$$;
revoke all on function public.has_competition_permission(uuid, text, text, text) from public, anon;
grant execute on function public.has_competition_permission(uuid, text, text, text) to authenticated, service_role;