-- Harden the additive access-management schema before any staging activation.
-- Direct table access is denied; approved SECURITY DEFINER RPCs are the only interface.
-- Every privileged RPC pins an empty search_path and schema-qualifies its objects.
begin;

alter table public.access_permissions enable row level security;
alter table public.access_roles enable row level security;
alter table public.access_role_permissions enable row level security;
alter table public.access_user_role_assignments enable row level security;

revoke all on table public.access_permissions from public, anon, authenticated;
revoke all on table public.access_roles from public, anon, authenticated;
revoke all on table public.access_role_permissions from public, anon, authenticated;
revoke all on table public.access_user_role_assignments from public, anon, authenticated;

-- Public RPC functions are invoker-only wrappers. Privileged implementations live
-- in the non-exposed private schema and independently verify the caller's Super Admin role.
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;

revoke all on function private.access_search_accounts_impl(text) from public,anon;
revoke all on function private.access_list_role_catalogue_impl() from public,anon;
revoke all on function private.access_create_custom_role_impl(text,text,text[]) from public,anon;
revoke all on function private.access_assign_role_impl(uuid,uuid,jsonb,timestamptz) from public,anon;
revoke all on function private.access_revoke_role_impl(uuid,uuid) from public,anon;
revoke all on function private.access_list_permissions_impl() from public,anon;
revoke all on function private.access_list_assignments_impl() from public,anon;
revoke all on function private.access_update_custom_role_impl(uuid,text,text,text[]) from public,anon;
revoke all on function private.access_retire_custom_role_impl(uuid) from public,anon;
revoke all on function private.access_get_session_context_impl() from public,anon;

grant execute on function private.access_search_accounts_impl(text) to authenticated;
grant execute on function private.access_list_role_catalogue_impl() to authenticated;
grant execute on function private.access_create_custom_role_impl(text,text,text[]) to authenticated;
grant execute on function private.access_assign_role_impl(uuid,uuid,jsonb,timestamptz) to authenticated;
grant execute on function private.access_revoke_role_impl(uuid,uuid) to authenticated;
grant execute on function private.access_list_permissions_impl() to authenticated;
grant execute on function private.access_list_assignments_impl() to authenticated;
grant execute on function private.access_update_custom_role_impl(uuid,text,text,text[]) to authenticated;
grant execute on function private.access_retire_custom_role_impl(uuid) to authenticated;
grant execute on function private.access_get_session_context_impl() to authenticated;

revoke all on function public.access_search_accounts(text) from public,anon;
revoke all on function public.access_list_role_catalogue() from public,anon;
revoke all on function public.access_create_custom_role(text,text,text[]) from public,anon;
revoke all on function public.access_assign_role(uuid,uuid,jsonb,timestamptz) from public,anon;
revoke all on function public.access_revoke_role(uuid,uuid) from public,anon;
revoke all on function public.access_list_permissions() from public,anon;
revoke all on function public.access_list_assignments() from public,anon;
revoke all on function public.access_update_custom_role(uuid,text,text,text[]) from public,anon;
revoke all on function public.access_retire_custom_role(uuid) from public,anon;
revoke all on function public.access_get_session_context() from public,anon;

grant execute on function public.access_search_accounts(text) to authenticated;
grant execute on function public.access_list_role_catalogue() to authenticated;
grant execute on function public.access_create_custom_role(text,text,text[]) to authenticated;
grant execute on function public.access_assign_role(uuid,uuid,jsonb,timestamptz) to authenticated;
grant execute on function public.access_revoke_role(uuid,uuid) to authenticated;
grant execute on function public.access_list_permissions() to authenticated;
grant execute on function public.access_list_assignments() to authenticated;
grant execute on function public.access_update_custom_role(uuid,text,text,text[]) to authenticated;
grant execute on function public.access_retire_custom_role(uuid) to authenticated;
grant execute on function public.access_get_session_context() to authenticated;

comment on table public.access_permissions is
  'Permission catalogue; direct client table access is intentionally disabled. Use authorized access-management RPCs.';
comment on table public.access_roles is
  'Role catalogue; direct client table access is intentionally disabled. Use authorized access-management RPCs.';
comment on table public.access_role_permissions is
  'Role-permission mappings; direct client table access is intentionally disabled. Use authorized access-management RPCs.';
comment on table public.access_user_role_assignments is
  'User role assignments; direct client table access is intentionally disabled. Use authorized access-management RPCs.';

commit;
