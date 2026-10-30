-- Tutor accounts, not administrators, own profile creation.
begin;
drop policy if exists tutor_profiles_admin_insert on public.tutor_profiles;
commit;
