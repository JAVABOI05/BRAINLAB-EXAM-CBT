-- Restrict direct XP ledger mutation to trusted server-side callers.
-- record_learning_activity() invokes award_user_xp() as its SECURITY DEFINER owner,
-- so this does not block that nested call. Keep this migration staged until the
-- authenticated record_learning_activity() input is separately regression-tested.
begin;

revoke all on function public.award_user_xp(
  uuid,
  integer,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.award_user_xp(
  uuid,
  integer,
  text,
  text,
  text,
  jsonb
) to service_role;

commit;
