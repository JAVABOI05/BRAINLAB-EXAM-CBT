-- Ensure Self Practice RPCs cannot submit or reveal results for organised assessments.
begin;
do $$
begin
  if to_regprocedure('public.resume_self_practice_internal(uuid,uuid)') is null then execute 'alter function public.resume_self_practice(uuid,uuid) rename to resume_self_practice_internal'; end if;
  if to_regprocedure('public.save_self_practice_progress_internal(uuid,uuid,jsonb)') is null then execute 'alter function public.save_self_practice_progress(uuid,uuid,jsonb) rename to save_self_practice_progress_internal'; end if;
  if to_regprocedure('public.submit_self_practice_internal(uuid,uuid,jsonb)') is null then execute 'alter function public.submit_self_practice(uuid,uuid,jsonb) rename to submit_self_practice_internal'; end if;
end $$;
revoke all on function public.resume_self_practice_internal(uuid,uuid) from public,anon,authenticated;
revoke all on function public.save_self_practice_progress_internal(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.submit_self_practice_internal(uuid,uuid,jsonb) from public,anon,authenticated;

create or replace function public.resume_self_practice(p_attempt_id uuid,p_attempt_token uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
begin
  if auth.uid() is null or not exists(select 1 from public.learning_practice_attempts a where a.id=p_attempt_id and a.user_id=auth.uid() and a.attempt_token=p_attempt_token and a.attempt_type='self_practice') then return public._err('invalid_attempt','Attempt not found.'); end if;
  return public.resume_self_practice_internal(p_attempt_id,p_attempt_token);
end;
$function$;

create or replace function public.save_self_practice_progress(p_attempt_id uuid,p_attempt_token uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
begin
  if auth.uid() is null or not exists(select 1 from public.learning_practice_attempts a where a.id=p_attempt_id and a.user_id=auth.uid() and a.attempt_token=p_attempt_token and a.attempt_type='self_practice') then return public._err('invalid_attempt','Attempt not found.'); end if;
  return public.save_self_practice_progress_internal(p_attempt_id,p_attempt_token,p_answers);
end;
$function$;

create or replace function public.submit_self_practice(p_attempt_id uuid,p_attempt_token uuid,p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
begin
  if auth.uid() is null or not exists(select 1 from public.learning_practice_attempts a where a.id=p_attempt_id and a.user_id=auth.uid() and a.attempt_token=p_attempt_token and a.attempt_type='self_practice') then return public._err('invalid_attempt','Attempt not found.'); end if;
  return public.submit_self_practice_internal(p_attempt_id,p_attempt_token,p_answers);
end;
$function$;

revoke all on function public.resume_self_practice(uuid,uuid) from public,anon;
grant execute on function public.resume_self_practice(uuid,uuid) to authenticated,service_role;
revoke all on function public.save_self_practice_progress(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_self_practice_progress(uuid,uuid,jsonb) to authenticated,service_role;
revoke all on function public.submit_self_practice(uuid,uuid,jsonb) from public,anon;
grant execute on function public.submit_self_practice(uuid,uuid,jsonb) to authenticated,service_role;
commit;
