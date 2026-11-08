-- Read-only session context for the additive access-management model.
-- Global permissions are separated from resource-scoped permissions.
-- Consumers must enforce each scoped grant against the target resource.
begin;

create schema if not exists private;
revoke all on schema private from public,anon;

create or replace function private.access_get_session_context_impl()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  with active_assignments as (
    select a.id as assignment_id,
           a.role_id,
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
  assignment_permissions as (
    select a.assignment_id,a.role_id,a.role_key,a.role_name,
           a.resource_scope,a.expires_at,
           coalesce(array_agg(rp.permission_key order by rp.permission_key)
             filter(where rp.permission_key is not null),'{}'::text[]) as permission_keys
    from active_assignments a
    left join public.access_role_permissions rp on rp.role_id=a.role_id
    group by a.assignment_id,a.role_id,a.role_key,a.role_name,a.resource_scope,a.expires_at
  )
  select jsonb_build_object(
    'user_id', auth.uid(),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'assignment_id',assignment_id,
        'role_key',role_key,
        'role_name',role_name,
        'resource_scope',resource_scope,
        'expires_at',expires_at,
        'permissions',permission_keys
      ) order by role_name)
      from assignment_permissions
    ),'[]'::jsonb),
    -- Only unscoped assignments contribute to the global permission list.
    'permissions',coalesce((
      select jsonb_agg(global_permission.permission_key order by global_permission.permission_key)
      from (
        select distinct unnest(ap.permission_keys) as permission_key
        from assignment_permissions ap
        where ap.resource_scope='{}'::jsonb
      ) global_permission
    ),'[]'::jsonb),
    -- Scoped grants remain attached to their assignment and are never flattened globally.
    'scoped_permissions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'assignment_id',assignment_id,
        'role_key',role_key,
        'resource_scope',resource_scope,
        'permissions',permission_keys
      ) order by role_key)
      from assignment_permissions
      where resource_scope<>'{}'::jsonb
    ),'[]'::jsonb)
  )
  where auth.uid() is not null;
$function$;


-- Public PostgREST entry point is SECURITY INVOKER; privileged reads stay private.
create or replace function public.access_get_session_context()
returns jsonb
language sql stable security invoker
set search_path=''
as $function$ select private.access_get_session_context_impl(); $function$;

comment on function private.access_get_session_context_impl() is
  'Returns only the caller own active role assignments. Unscoped permissions are global; resource-scoped permissions remain attached to their scope and must be enforced by the consuming module.';

-- Final function privileges are centralised in the fourth hardening migration.

commit;
