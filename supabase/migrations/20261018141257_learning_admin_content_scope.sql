-- Give the dedicated AI/Learning administrator the Learning Hub-wide content scope.
-- Teachers still require an explicit subject membership; they do not gain global access.
create or replace function public.learning_can_manage_all()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(public.get_admin_role() in (
    'super_admin',
    'platform_admin',
    'ai_learning_admin'
  ), false);
$function$;

revoke all on function public.learning_can_manage_all() from public;
grant execute on function public.learning_can_manage_all() to anon, authenticated, service_role;
