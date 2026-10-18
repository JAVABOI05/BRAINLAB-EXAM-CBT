-- Give authorised administrators scoped entitlement reporting and revocation.
begin;

create or replace function public.revoke_learning_entitlement(p_entitlement_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare e public.learning_entitlements%rowtype; v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into e from public.learning_entitlements where id=p_entitlement_id for update;
  if not found then return public._err('entitlement_missing','Entitlement not found.'); end if;
  if not (public.learning_can_manage_all() or (e.organisation_id is not null and public.learning_can_manage_organisation(e.organisation_id))) then raise exception 'Insufficient permission' using errcode='42501'; end if;
  if e.status='revoked' then return jsonb_build_object('ok',true,'already_revoked',true,'id',e.id); end if;
  update public.learning_entitlements set status='revoked',revoked_at=now() where id=e.id;
  if e.organisation_id is not null and not exists(
    select 1 from public.learning_entitlements other where other.id<>e.id and other.user_id=e.user_id
      and other.organisation_id=e.organisation_id and other.status='active' and other.starts_at<=now()
      and (other.permanent or other.expires_at>now())
  ) then update public.learning_organisation_members set status='suspended' where organisation_id=e.organisation_id and user_id=e.user_id; end if;
  insert into public.audit_logs(action,target_table,target_id,details)
  values('learning_entitlement_revoked','learning_entitlements',e.id::text,
    jsonb_build_object('actor_user_id',v_user,'user_id',e.user_id,'entitlement_type',e.entitlement_type,'organisation_id',e.organisation_id,'assessment_id',e.assessment_id));
  return jsonb_build_object('ok',true,'id',e.id,'status','revoked');
end;
$function$;
revoke all on function public.revoke_learning_entitlement(uuid) from public,anon;
grant execute on function public.revoke_learning_entitlement(uuid) to authenticated,service_role;

create or replace function public.list_learning_entitlements(p_organisation_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp
as $function$
declare v_user uuid:=auth.uid(); v_rows jsonb;
begin
  if v_user is null then return public._err('authentication_required','Sign in to view entitlements.'); end if;
  if not public.learning_can_manage_all() and (p_organisation_id is null or not public.learning_can_manage_organisation(p_organisation_id))
     and not exists(select 1 from public.learning_organisation_members m where m.user_id=v_user and m.status='active' and m.member_role in('owner','admin')) then
    raise exception 'Insufficient permission' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'user_id',e.user_id,'entitlement_type',e.entitlement_type,'membership_type',e.membership_type,
    'resource_key',e.resource_key,'organisation_id',e.organisation_id,'assessment_id',e.assessment_id,
    'max_questions',e.max_questions,'status',e.status,'permanent',e.permanent,'starts_at',e.starts_at,
    'expires_at',e.expires_at,'created_at',e.created_at,'revoked_at',e.revoked_at
  ) order by e.created_at desc),'[]'::jsonb) into v_rows
  from public.learning_entitlements e
  where (p_organisation_id is null or e.organisation_id=p_organisation_id)
    and (public.learning_can_manage_all() or (e.organisation_id is not null and public.learning_can_manage_organisation(e.organisation_id)));
  return jsonb_build_object('ok',true,'entitlements',v_rows);
end;
$function$;
revoke all on function public.list_learning_entitlements(uuid) from public,anon;
grant execute on function public.list_learning_entitlements(uuid) to authenticated,service_role;
commit;
