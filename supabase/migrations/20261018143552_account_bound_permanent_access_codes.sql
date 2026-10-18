-- Permanent access codes are assigned to a registered account and cannot be claimed by another user.
begin;
alter table public.learning_access_codes add column if not exists assigned_user_id uuid references auth.users(id) on delete set null;
create index if not exists learning_access_codes_assigned_user_idx on public.learning_access_codes(assigned_user_id);

revoke all on function public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid) from public,anon,authenticated;
drop function if exists public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid);

create function public.create_learning_access_code(
  p_scope_type text,p_permanent boolean,p_expires_at timestamptz,p_max_redemptions integer,
  p_max_questions integer,p_membership_type text,p_resource_key text,
  p_organisation_id uuid,p_assessment_id uuid,p_assigned_email text
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_assigned_user uuid; v_result jsonb; v_email text:=lower(trim(coalesce(p_assigned_email,'')));
begin
  if p_permanent and v_email='' then raise exception 'Permanent codes must be assigned to a registered account email' using errcode='22023'; end if;
  if v_email<>'' then
    select u.id into v_assigned_user from auth.users u where lower(u.email)=v_email limit 1;
    if v_assigned_user is null then raise exception 'No registered account matches the assigned email' using errcode='22023'; end if;
  end if;
  v_result:=public.create_learning_access_code(p_scope_type,p_permanent,p_expires_at,p_max_redemptions,p_max_questions,p_membership_type,p_resource_key,p_organisation_id,p_assessment_id);
  if coalesce((v_result->>'ok')::boolean,false) then
    update public.learning_access_codes set assigned_user_id=v_assigned_user where id=(v_result->>'id')::uuid;
    v_result:=v_result||jsonb_build_object('assigned_user_id',v_assigned_user);
  end if;
  return v_result;
end;
$function$;
revoke all on function public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid,text) from public,anon;
grant execute on function public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid,text) to authenticated,service_role;

create or replace function public.redeem_learning_access_code(p_code text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_user uuid:=auth.uid(); c public.learning_access_codes%rowtype; v_entitlement uuid; v_existing public.learning_access_code_redemptions%rowtype;
begin
  if v_user is null then return public._err('authentication_required','Sign in before redeeming an access code.'); end if;
  if length(trim(coalesce(p_code,'')))<8 or length(trim(coalesce(p_code,'')))>128 then return public._err('invalid_code','Enter a valid access code.'); end if;
  select * into c from public.learning_access_codes where code_hash=encode(extensions.digest(upper(trim(p_code)),'sha256'),'hex') for update;
  if not found then return public._err('invalid_code','This access code is invalid.'); end if;
  if c.assigned_user_id is not null and c.assigned_user_id<>v_user then return public._err('code_assigned_to_another_account','This code was issued to a different account.'); end if;
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
    values(c.organisation_id,v_user,'learner','active',c.created_by) on conflict (organisation_id,user_id) do update set status='active';
  end if;
  insert into public.learning_access_code_redemptions(access_code_id,user_id,entitlement_id) values(c.id,v_user,v_entitlement);
  update public.learning_access_codes set redemption_count=redemption_count+1 where id=c.id;
  insert into public.audit_logs(action,target_table,target_id,details)
  values('learning_access_code_redeemed','learning_access_codes',c.id::text,jsonb_build_object('scope_type',c.scope_type,'user_id',v_user,'entitlement_id',v_entitlement));
  return jsonb_build_object('ok',true,'already_redeemed',false,'scope_type',c.scope_type,'entitlement_id',v_entitlement,'permanent',c.permanent,'expires_at',c.expires_at,'max_questions',c.max_questions);
end;
$function$;
revoke all on function public.redeem_learning_access_code(text) from public,anon;
grant execute on function public.redeem_learning_access_code(text) to authenticated,service_role;
commit;
