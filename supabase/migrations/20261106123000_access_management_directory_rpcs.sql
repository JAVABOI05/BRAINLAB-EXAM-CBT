-- Directory and permission-catalogue RPCs for the People & Access Centre.
-- Additive only; does not change the legacy role resolver or grant new login access.
begin;

create or replace function public.access_list_permissions()
returns table(permission_key text,module_key text,label text,description text,is_sensitive boolean)
language sql stable security definer
set search_path=public,pg_temp
as $function$
  select p.permission_key,p.module_key,p.label,p.description,p.is_sensitive
  from public.access_permissions p
  where public.is_super_admin()
  order by p.module_key,p.label;
$function$;

create or replace function public.access_list_assignments()
returns table(
  assignment_id uuid,
  user_id uuid,
  email text,
  display_name text,
  role_id uuid,
  role_key text,
  role_name text,
  assigned_at timestamptz,
  expires_at timestamptz,
  resource_scope jsonb
)
language plpgsql stable security definer
set search_path=public,pg_temp
as $function$
begin
  if not public.is_super_admin() then
    raise exception 'Insufficient permission' using errcode='42501';
  end if;
  return query
  select a.id,a.user_id,u.email,
    coalesce(nullif(u.raw_user_meta_data->>'full_name',''),
             nullif(u.raw_user_meta_data->>'name',''),
             nullif(tp.name,''),split_part(coalesce(u.email,''),'@',1)),
    r.id,r.role_key,r.name,a.assigned_at,a.expires_at,a.resource_scope
  from public.access_user_role_assignments a
  join public.access_roles r on r.id=a.role_id
  join auth.users u on u.id=a.user_id
  left join public.tutor_profiles tp on tp.user_id=a.user_id
  where a.revoked_at is null and (a.expires_at is null or a.expires_at>now())
  order by display_name,r.name;
end;
$function$;

create or replace function public.access_update_custom_role(
  target_role_id uuid, role_name text, role_description text, permission_keys text[]
) returns void
language plpgsql security definer
set search_path=public,pg_temp
as $function$
declare role_row public.access_roles%rowtype;
begin
  if not public.is_super_admin() then raise exception 'Insufficient permission' using errcode='42501'; end if;
  select * into role_row from public.access_roles where id=target_role_id for update;
  if not found or role_row.is_system or role_row.role_key not like 'custom:%' then
    raise exception 'Only custom roles can be edited' using errcode='42501';
  end if;
  if length(trim(coalesce(role_name,'')))<2 or length(role_name)>80 then
    raise exception 'Role name must be between 2 and 80 characters' using errcode='22023';
  end if;
  if coalesce(cardinality(permission_keys),0)=0 then
    raise exception 'Select at least one permission' using errcode='22023';
  end if;
  if permission_keys && array['admin.roles.manage','security.settings.manage']::text[] then
    raise exception 'Custom roles cannot receive governance or root security permissions' using errcode='42501';
  end if;
  if exists(select 1 from unnest(permission_keys) p where not exists(
    select 1 from public.access_permissions ap where ap.permission_key=p)) then
    raise exception 'Unknown permission key' using errcode='22023';
  end if;
  update public.access_roles set name=trim(role_name),description=coalesce(role_description,''),
    updated_at=now() where id=target_role_id;
  delete from public.access_role_permissions where role_id=target_role_id;
  insert into public.access_role_permissions(role_id,permission_key)
  select target_role_id,p from (select distinct unnest(permission_keys) p) q;
  insert into public.audit_logs(admin_email,action,target_table,target_id,details)
  select coalesce(u.email,'unknown'),'access_custom_role_updated','access_roles',target_role_id::text,
    jsonb_build_object('role_name',trim(role_name),'permission_count',cardinality(permission_keys))
  from auth.users u where u.id=auth.uid();
end;
$function$;

create or replace function public.access_retire_custom_role(target_role_id uuid)
returns void language plpgsql security definer
set search_path=public,pg_temp
as $function$
declare role_row public.access_roles%rowtype;
begin
  if not public.is_super_admin() then raise exception 'Insufficient permission' using errcode='42501'; end if;
  select * into role_row from public.access_roles where id=target_role_id for update;
  if not found or role_row.is_system or role_row.role_key not like 'custom:%' then
    raise exception 'Only custom roles can be retired' using errcode='42501';
  end if;
  update public.access_roles set is_active=false,updated_at=now() where id=target_role_id;
  update public.access_user_role_assignments set revoked_at=now(),revoked_by=auth.uid()
    where role_id=target_role_id and revoked_at is null;
  insert into public.audit_logs(admin_email,action,target_table,target_id,details)
  select coalesce(u.email,'unknown'),'access_custom_role_retired','access_roles',target_role_id::text,
    jsonb_build_object('role_key',role_row.role_key)
  from auth.users u where u.id=auth.uid();
end;
$function$;

revoke all on function public.access_list_permissions() from public,anon;
revoke all on function public.access_list_assignments() from public,anon;
revoke all on function public.access_update_custom_role(uuid,text,text,text[]) from public,anon;
revoke all on function public.access_retire_custom_role(uuid) from public,anon;
grant execute on function public.access_list_permissions() to authenticated;
grant execute on function public.access_list_assignments() to authenticated;
grant execute on function public.access_update_custom_role(uuid,text,text,text[]) to authenticated;
grant execute on function public.access_retire_custom_role(uuid) to authenticated;

commit;
