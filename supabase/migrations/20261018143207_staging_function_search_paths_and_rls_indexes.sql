-- Pin remaining legacy function search paths and cover assessment attempt foreign keys.
begin;
create index if not exists learning_practice_attempts_access_code_idx on public.learning_practice_attempts(access_code_id);
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and not exists(select 1 from unnest(coalesce(p.proconfig,'{}'::text[])) cfg where cfg like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp',f.signature);
  end loop;
end $$;
alter policy learning_organisations_read_scoped on public.learning_organisations
using (public.learning_can_manage_all() or exists(select 1 from public.learning_organisation_members m where m.organisation_id=id and m.user_id=(select auth.uid()) and m.status='active'));
alter policy learning_org_members_read_scoped on public.learning_organisation_members
using (user_id=(select auth.uid()) or public.learning_can_manage_organisation(organisation_id));
alter policy learning_entitlements_read_own_or_admin on public.learning_entitlements
using (user_id=(select auth.uid()) or public.learning_can_manage_all());
alter policy learning_code_redemptions_read_own on public.learning_access_code_redemptions
using (user_id=(select auth.uid()));
alter policy learning_assessments_read_published_scoped on public.learning_assessments
using (
  public.learning_can_manage_all()
  or (is_published and (
    organisation_id is null or access_code_required
    or exists(select 1 from public.learning_organisation_members m where m.organisation_id=learning_assessments.organisation_id and m.user_id=(select auth.uid()) and m.status='active')
  ))
  or (organisation_id is not null and public.learning_can_manage_organisation(organisation_id))
);
commit;
