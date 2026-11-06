-- Restrict legacy tables that intentionally have no client-facing RLS policies.
-- RLS already denies row access, but removing broad SQL privileges makes the
-- server-only boundary explicit and avoids accidental exposure if policies change.
begin;

revoke all privileges on table
  public.access_attempts,
  public.admin_profiles,
  public.admin_users,
  public.phase0_backup
from public, anon, authenticated;

grant all privileges on table
  public.access_attempts,
  public.admin_profiles,
  public.admin_users,
  public.phase0_backup
to service_role;

-- These identity helpers are meaningful only for signed-in users.
-- Anonymous callers always have auth.uid() = NULL and gain no useful capability.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated, service_role;

commit;
