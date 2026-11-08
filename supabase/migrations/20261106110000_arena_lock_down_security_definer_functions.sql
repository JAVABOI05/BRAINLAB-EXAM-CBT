begin;
revoke all on function public.log_competition_audit(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_competition_audit(text, text, text, jsonb) to service_role;

revoke all on function public.has_competition_permission(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.has_competition_permission(uuid, text, text, text) to service_role;
commit;