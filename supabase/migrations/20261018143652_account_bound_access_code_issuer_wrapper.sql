-- Keep the original permission-checked issuer as the shared implementation.
-- This wrapper resolves a registered email and binds the code to that account.
begin;
revoke all on function public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid) from public,anon,authenticated;
drop function if exists public.create_learning_access_code(text,boolean,timestamptz,integer,integer,text,text,uuid,uuid,text);
create or replace function public.create_learning_access_code(
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
commit;
