-- Harden the additive access-management schema before any staging activation.
-- Direct table access is denied; approved SECURITY DEFINER RPCs are the only interface.
begin;

alter table public.access_permissions enable row level security;
alter table public.access_roles enable row level security;
alter table public.access_role_permissions enable row level security;
alter table public.access_user_role_assignments enable row level security;

revoke all on table public.access_permissions from public, anon, authenticated;
revoke all on table public.access_roles from public, anon, authenticated;
revoke all on table public.access_role_permissions from public, anon, authenticated;
revoke all on table public.access_user_role_assignments from public, anon, authenticated;

-- PostgreSQL grants EXECUTE to PUBLIC on newly-created functions by default.
-- Explicitly remove that default for every access-management RPC.
revoke all on function public.access_search_accounts(text) from public, anon;
revoke all on function public.access_list_role_catalogue() from public, anon;
revoke all on function public.access_create_custom_role(text,text,text[]) from public, anon;
revoke all on function public.access_assign_role(uuid,uuid,jsonb,timestamptz) from public, anon;
revoke all on function public.access_revoke_role(uuid,uuid) from public, anon;
revoke all on function public.access_list_permissions() from public, anon;
revoke all on function public.access_list_assignments() from public, anon;
revoke all on function public.access_update_custom_role(uuid,text,text,text[]) from public, anon;
revoke all on function public.access_retire_custom_role(uuid) from public, anon;
revoke all on function public.access_get_session_context() from public, anon;

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
