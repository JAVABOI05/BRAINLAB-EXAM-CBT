-- Create organisations and assign the creator as owner in one privileged transaction.
create or replace function public.create_learning_organisation(p_name text,p_slug text)
returns public.learning_organisations
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare v_user uuid := auth.uid(); v_org public.learning_organisations%rowtype;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.learning_can_manage_all() then raise exception 'Insufficient permission' using errcode='42501'; end if;
  if length(trim(coalesce(p_name,''))) not between 2 and 200 or trim(coalesce(p_slug,'')) !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Enter a valid organisation name and slug' using errcode='22023';
  end if;
  insert into public.learning_organisations(name,slug,created_by) values(trim(p_name),trim(p_slug),v_user) returning * into v_org;
  insert into public.learning_organisation_members(organisation_id,user_id,member_role,status,invited_by)
  values(v_org.id,v_user,'owner','active',v_user)
  on conflict (organisation_id,user_id) do update set member_role='owner',status='active';
  insert into public.audit_logs(action,target_table,target_id,details)
  values('learning_organisation_created','learning_organisations',v_org.id::text,jsonb_build_object('slug',v_org.slug));
  return v_org;
end;
$function$;
revoke all on function public.create_learning_organisation(text,text) from public,anon;
grant execute on function public.create_learning_organisation(text,text) to authenticated,service_role;
