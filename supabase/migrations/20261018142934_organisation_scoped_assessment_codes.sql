-- Let organisation owners/admins issue codes only for their own organisation's assessments.
begin;
alter policy learning_access_codes_manage_scoped on public.learning_access_codes
using (
  public.learning_can_manage_all()
  or (scope_type='assessment' and (
    public.admin_has_permission('cbt.codes.manage')
    or exists(select 1 from public.learning_assessments a where a.id=learning_access_codes.assessment_id and a.organisation_id is not null and public.learning_can_manage_organisation(a.organisation_id))
  ))
  or (scope_type='organisation' and organisation_id is not null and public.learning_can_manage_organisation(organisation_id))
)
with check (
  public.learning_can_manage_all()
  or (scope_type='assessment' and (
    public.admin_has_permission('cbt.codes.manage')
    or exists(select 1 from public.learning_assessments a where a.id=learning_access_codes.assessment_id and a.organisation_id is not null and public.learning_can_manage_organisation(a.organisation_id))
  ))
  or (scope_type='organisation' and organisation_id is not null and public.learning_can_manage_organisation(organisation_id))
);

create or replace function public.create_learning_access_code(
  p_scope_type text,p_permanent boolean,p_expires_at timestamptz,p_max_redemptions integer default 1,
  p_max_questions integer default 50,p_membership_type text default null,p_resource_key text default null,
  p_organisation_id uuid default null,p_assessment_id uuid default null
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_code text; v_id uuid; v_actor uuid:=auth.uid(); v_allowed boolean:=false; v_assessment_org uuid;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_scope_type not in('membership','assessment','resource','organisation') then raise exception 'Invalid access-code scope' using errcode='22023'; end if;
  if p_permanent is null or (p_permanent and p_expires_at is not null) or (not p_permanent and (p_expires_at is null or p_expires_at<=now())) then raise exception 'Permanent codes have no expiry; temporary codes need a future expiry' using errcode='22023'; end if;
  if p_max_questions is null or p_max_questions<1 or p_max_questions>500 then raise exception 'Question limit must be between 1 and 500' using errcode='22023'; end if;
  if p_max_redemptions is null or p_max_redemptions<1 or p_max_redemptions>100000 then raise exception 'Redemption limit must be between 1 and 100000' using errcode='22023'; end if;
  if p_permanent and p_max_redemptions<>1 then raise exception 'Permanent access codes are account-bound and may be redeemed only once' using errcode='22023'; end if;
  if p_scope_type='membership' then
    v_allowed:=public.learning_can_manage_all() and nullif(trim(coalesce(p_membership_type,'')),'') is not null;
  elsif p_scope_type='assessment' then
    select organisation_id into v_assessment_org from public.learning_assessments where id=p_assessment_id;
    v_allowed:=p_assessment_id is not null and v_assessment_org is not null and exists(select 1 from public.learning_assessments where id=p_assessment_id)
      and (public.learning_can_manage_all() or public.admin_has_permission('cbt.codes.manage') or public.learning_can_manage_organisation(v_assessment_org));
    if v_assessment_org is null then v_allowed:=p_assessment_id is not null and exists(select 1 from public.learning_assessments where id=p_assessment_id) and (public.learning_can_manage_all() or public.admin_has_permission('cbt.codes.manage')); end if;
  elsif p_scope_type='resource' then
    v_allowed:=public.learning_can_manage_all() and nullif(trim(coalesce(p_resource_key,'')),'') is not null;
  elsif p_scope_type='organisation' then
    v_allowed:=p_organisation_id is not null and public.learning_can_manage_organisation(p_organisation_id) and exists(select 1 from public.learning_organisations o where o.id=p_organisation_id and o.status='active');
  end if;
  if not coalesce(v_allowed,false) then raise exception 'Insufficient permission or invalid scope details' using errcode='42501'; end if;
  v_code:='BLT-'||upper(encode(extensions.gen_random_bytes(16),'hex'));
  insert into public.learning_access_codes(code_hash,code_hint,scope_type,membership_type,resource_key,organisation_id,assessment_id,max_questions,permanent,expires_at,max_redemptions,created_by)
  values(encode(extensions.digest(upper(trim(v_code)),'sha256'),'hex'),right(v_code,4),p_scope_type,
    nullif(trim(coalesce(p_membership_type,'')),''),nullif(trim(coalesce(p_resource_key,'')),''),p_organisation_id,p_assessment_id,
    p_max_questions,p_permanent,p_expires_at,case when p_permanent then 1 else p_max_redemptions end,v_actor)
  returning id into v_id;
  insert into public.audit_logs(action,target_table,target_id,details)
  values('learning_access_code_created','learning_access_codes',v_id::text,jsonb_build_object('scope_type',p_scope_type,'permanent',p_permanent,'max_redemptions',case when p_permanent then 1 else p_max_redemptions end,'max_questions',p_max_questions));
  return jsonb_build_object('ok',true,'id',v_id,'code',v_code,'scope_type',p_scope_type,'permanent',p_permanent,'expires_at',p_expires_at,'max_redemptions',case when p_permanent then 1 else p_max_redemptions end,'max_questions',p_max_questions,'hint',right(v_code,4));
end;
$function$;
revoke all on function public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid) from public,anon;
grant execute on function public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid) to authenticated,service_role;
commit;
