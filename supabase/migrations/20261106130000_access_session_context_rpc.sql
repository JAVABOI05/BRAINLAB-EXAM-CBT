-- Read-only session context for the additive access-management model.
-- This exposes only the authenticated user's own active assignments and permission keys.
-- It does not replace get_admin_role() or admin_has_permission().
begin;

create or replace function public.access_get_session_context()
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $function$
  with active_assignments as (
    select a.id as assignment_id,
           r.role_key,
           r.name as role_name,
           a.resource_scope,
           a.expires_at
    from public.access_user_role_assignments a
    join public.access_roles r on r.id=a.role_id
    where a.user_id=auth.uid()
      and a.revoked_at is null
      and (a.expires_at is null or a.expires_at>now())
      and r.is_active=true
  ),
  effective_permissions as (
    select distinct rp.permission_key
    from active_assignments a
    join public.access_roles r on r.role_key=a.role_key
    join public.access_role_permissions rp on rp.role_id=r.id
  )
  select jsonb_build_object(
    'user_id', auth.uid(),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'assignment_id', assignment_id,
        'role_key', role_key,
        'role_name', role_name,
        'resource_scope', resource_scope,
        'expires_at', expires_at
      ) order by role_name)
      from active_assignments
    ), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(permission_key order by permission_key)
      from effective_permissions
    ), '[]'::jsonb)
  )
  where auth.uid() is not null;
$function$;

revoke all on function public.access_get_session_context() from public,anon;
grant execute on function public.access_get_session_context() to authenticated;

comment on function public.access_get_session_context() is
  'Returns the caller own active role assignments, resource scopes, expiry values and effective permission keys. Read-only compatibility API; does not grant or activate access by itself.';

commit;
