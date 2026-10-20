-- Safe, account-bound access-code issuance and redemption.
begin;

create or replace function public.create_learning_access_code(
  p_scope_type text,
  p_permanent boolean,
  p_expires_at timestamptz,
  p_max_redemptions integer default 1,
  p_max_questions integer default 50,
  p_membership_type text default null,
  p_resource_key text default null,
  p_organisation_id uuid default null,
  p_assessment_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $function$
declare v_code text; v_id uuid; v_actor uuid := auth.uid(); v_allowed boolean := false;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_scope_type not in ('membership','assessment','resource','organisation') then raise exception 'Invalid access-code scope' using errcode='22023'; end if;
  if p_permanent is null or (p_permanent and p_expires_at is not null) or (not p_permanent and (p_expires_at is null or p_expires_at<=now())) then raise exception 'Permanent codes have no expiry; temporary codes need a future expiry' using errcode='22023'; end if;
  if p_max_questions is null or p_max_questions<1 or p_max_questions>500 then raise exception 'Question limit must be between 1 and 500' using errcode='22023'; end if;
  if p_max_redemptions is null or p_max_redemptions<1 or p_max_redemptions>100000 then raise exception 'Redemption limit must be between 1 and 100000' using errcode='22023'; end if;
  if p_permanent and p_max_redemptions<>1 then raise exception 'Permanent access codes are account-bound and may be redeemed only once' using errcode='22023'; end if;

  if p_scope_type='membership' then
    v_allowed := public.learning_can_manage_all() and nullif(trim(coalesce(p_membership_type,'')),'') is not null;
  elsif p_scope_type='assessment' then
    v_allowed := (public.learning_can_manage_all() or public.admin_has_permission('cbt.codes.manage'))
      and p_assessment_id is not null and exists(select 1 from public.learning_assessments a where a.id=p_assessment_id);
  elsif p_scope_type='resource' then
    v_allowed := public.learning_can_manage_all() and nullif(trim(coalesce(p_resource_key,'')),'') is not null;
  elsif p_scope_type='organisation' then
    v_allowed := p_organisation_id is not null and public.learning_can_manage_organisation(p_organisation_id)
      and exists(select 1 from public.learning_organisations o where o.id=p_organisation_id and o.status='active');
  end if;
  if not coalesce(v_allowed,false) then raise exception 'Insufficient permission or invalid scope details' using errcode='42501'; end if;

  v_code := 'BLT-' || upper(encode(extensions.gen_random_bytes(16),'hex'));
  insert into public.learning_access_codes(code_hash,code_hint,scope_type,membership_type,resource_key,organisation_id,assessment_id,max_questions,permanent,expires_at,max_redemptions,created_by)
  values(encode(extensions.digest(upper(trim(v_code)),'sha256'),'hex'),right(v_code,4),p_scope_type,
    nullif(trim(coalesce(p_membership_type,'')),''),nullif(trim(coalesce(p_resource_key,'')),''),p_organisation_id,p_assessment_id,
    p_max_questions,p_permanent,p_expires_at,case when p_permanent then 1 else p_max_redemptions end,v_actor)
  returning id into v_id;

  insert into public.audit_logs(action,target_table,target_id,details)
  values('learning_access_code_created','learning_access_codes',v_id::text,
    jsonb_build_object('scope_type',p_scope_type,'permanent',p_permanent,'max_redemptions',case when p_permanent then 1 else p_max_redemptions end,'max_questions',p_max_questions));
  return jsonb_build_object('ok',true,'id',v_id,'code',v_code,'scope_type',p_scope_type,'permanent',p_permanent,
    'expires_at',p_expires_at,'max_redemptions',case when p_permanent then 1 else p_max_redemptions end,'max_questions',p_max_questions,'hint',right(v_code,4));
end;
$function$;

create or replace function public.redeem_learning_access_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $function$
declare v_user uuid := auth.uid(); c public.learning_access_codes%rowtype; v_entitlement uuid; v_existing public.learning_access_code_redemptions%rowtype;
begin
  if v_user is null then return public._err('authentication_required','Sign in before redeeming an access code.'); end if;
  if length(trim(coalesce(p_code,'')))<8 or length(trim(coalesce(p_code,'')))>128 then return public._err('invalid_code','Enter a valid access code.'); end if;
  select * into c from public.learning_access_codes where code_hash=encode(extensions.digest(upper(trim(p_code)),'sha256'),'hex') for update;
  if not found then return public._err('invalid_code','This access code is invalid.'); end if;
  select * into v_existing from public.learning_access_code_redemptions where access_code_id=c.id and user_id=v_user;
  if found then return jsonb_build_object('ok',true,'already_redeemed',true,'scope_type',c.scope_type,'entitlement_id',v_existing.entitlement_id,'permanent',c.permanent,'expires_at',c.expires_at); end if;
  if c.revoked_at is not null then return public._err('code_revoked','This access code has been revoked.'); end if;
  if not c.permanent and c.expires_at<=now() then return public._err('code_expired','This access code has expired.'); end if;
  if c.redemption_count>=c.max_redemptions then return public._err('code_fully_redeemed','This access code has already been used the maximum number of times.'); end if;

  insert into public.learning_entitlements(user_id,entitlement_type,membership_type,resource_key,organisation_id,assessment_id,max_questions,status,permanent,expires_at,created_by)
  values(v_user,case c.scope_type when 'membership' then 'membership' when 'assessment' then 'assessment' when 'resource' then 'resource' else 'organisation' end,
    c.membership_type,c.resource_key,c.organisation_id,c.assessment_id,c.max_questions,'active',c.permanent,c.expires_at,c.created_by)
  returning id into v_entitlement;

  if c.scope_type='organisation' then
    insert into public.learning_organisation_members(organisation_id,user_id,member_role,status,invited_by)
    values(c.organisation_id,v_user,'learner','active',c.created_by)
    on conflict (organisation_id,user_id) do update set status='active';
  end if;
  insert into public.learning_access_code_redemptions(access_code_id,user_id,entitlement_id) values(c.id,v_user,v_entitlement);
  update public.learning_access_codes set redemption_count=redemption_count+1 where id=c.id;
  insert into public.audit_logs(action,target_table,target_id,details)
  values('learning_access_code_redeemed','learning_access_codes',c.id::text,jsonb_build_object('scope_type',c.scope_type,'user_id',v_user,'entitlement_id',v_entitlement));
  return jsonb_build_object('ok',true,'already_redeemed',false,'scope_type',c.scope_type,'entitlement_id',v_entitlement,'permanent',c.permanent,'expires_at',c.expires_at,'max_questions',c.max_questions);
end;
$function$;

revoke all on function public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid) from public,anon;
grant execute on function public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid) to authenticated,service_role;
revoke all on function public.redeem_learning_access_code(text) from public,anon;
grant execute on function public.redeem_learning_access_code(text) to authenticated,service_role;

commit;
