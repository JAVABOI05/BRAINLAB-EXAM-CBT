-- Enforce unique attempt numbering and provide scoped administrator result reporting/revocation.
begin;

create unique index if not exists learning_practice_attempts_assessment_attempt_unique
on public.learning_practice_attempts(user_id,assessment_id,attempt_number)
where assessment_id is not null;

create or replace function public.get_organisation_assessment_results(p_assessment_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_user uuid:=auth.uid(); a public.learning_assessments%rowtype; rows jsonb;
begin
  if v_user is null then return public._err('authentication_required','Sign in to view assessment results.'); end if;
  select * into a from public.learning_assessments where id=p_assessment_id;
  if not found then return public._err('assessment_missing','Assessment not found.'); end if;
  if not (public.learning_can_manage_all()
    or (a.organisation_id is not null and public.learning_can_manage_organisation(a.organisation_id))
    or public.admin_has_permission('analytics.read')
    or public.admin_has_permission('cbt.results.read')) then
    raise exception 'Insufficient permission' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'attempt_id',p.id,'user_id',p.user_id,'attempt_number',p.attempt_number,'status',p.status,
    'score',p.score,'total',p.total,
    'percentage',case when coalesce(p.total,0)>0 then round((p.score/p.total)*100,2) else null end,
    'started_at',p.started_at,'submitted_at',p.submitted_at,'deadline_at',p.deadline_at,
    'auto_submitted',p.auto_submitted,'answer_count',jsonb_object_length(p.answers)
  ) order by p.started_at desc),'[]'::jsonb) into rows
  from public.learning_practice_attempts p where p.assessment_id=a.id;
  return jsonb_build_object('ok',true,'assessment_id',a.id,'title',a.title,'result_release',a.result_release,'attempts',rows);
end;
$function$;
revoke all on function public.get_organisation_assessment_results(uuid) from public,anon;
grant execute on function public.get_organisation_assessment_results(uuid) to authenticated,service_role;

create or replace function public.revoke_learning_entitlement(p_entitlement_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare e public.learning_entitlements%rowtype; actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into e from public.learning_entitlements where id=p_entitlement_id for update;
  if not found then return public._err('entitlement_missing','Entitlement not found.'); end if;
  if not (public.learning_can_manage_all() or (e.organisation_id is not null and public.learning_can_manage_organisation(e.organisation_id))) then
    raise exception 'Insufficient permission' using errcode='42501';
  end if;
  if e.status='revoked' then return jsonb_build_object('ok',true,'already_revoked',true,'id',e.id); end if;
  update public.learning_entitlements set status='revoked',revoked_at=now() where id=e.id;
  if e.organisation_id is not null then
    update public.learning_organisation_members set status='suspended' where organisation_id=e.organisation_id and user_id=e.user_id;
  end if;
  insert into public.audit_logs(action,target_table,target_id,details)
  values('learning_entitlement_revoked','learning_entitlements',e.id::text,
    jsonb_build_object('actor_user_id',actor,'user_id',e.user_id,'entitlement_type',e.entitlement_type,'organisation_id',e.organisation_id,'assessment_id',e.assessment_id));
  return jsonb_build_object('ok',true,'id',e.id,'status','revoked');
end;
$function$;
revoke all on function public.revoke_learning_entitlement(uuid) from public,anon;
grant execute on function public.revoke_learning_entitlement(uuid) to authenticated,service_role;
commit;
