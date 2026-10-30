-- Keep the tutor ownership trigger internal; only the boolean role helper is callable by signed-in users.
begin;
revoke all on function public.enforce_tutor_profile_ownership() from public, anon, authenticated;
commit;
