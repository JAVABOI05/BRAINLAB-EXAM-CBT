-- Use one protected attempt store for Self Practice, organisation quizzes, and competitions.
begin;

alter table public.learning_practice_attempts
  add column if not exists assessment_id uuid references public.learning_assessments(id) on delete set null,
  add column if not exists organisation_id uuid references public.learning_organisations(id) on delete set null,
  add column if not exists attempt_type text not null default 'self_practice',
  add column if not exists attempt_number integer not null default 1,
  add column if not exists access_code_id uuid references public.learning_access_codes(id) on delete set null;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='learning_practice_attempt_type_check' and conrelid='public.learning_practice_attempts'::regclass) then
    alter table public.learning_practice_attempts add constraint learning_practice_attempt_type_check check(attempt_type in ('self_practice','organisation_quiz','competition'));
  end if;
  if not exists(select 1 from pg_constraint where conname='learning_practice_attempt_assessment_number_check' and conrelid='public.learning_practice_attempts'::regclass) then
    alter table public.learning_practice_attempts add constraint learning_practice_attempt_assessment_number_check check(attempt_number between 1 and 100);
  end if;
  if not exists(select 1 from pg_constraint where conname='learning_practice_attempt_assessment_type_check' and conrelid='public.learning_practice_attempts'::regclass) then
    alter table public.learning_practice_attempts add constraint learning_practice_attempt_assessment_type_check check(
      (attempt_type='self_practice' and assessment_id is null) or (attempt_type in ('organisation_quiz','competition') and assessment_id is not null));
  end if;
end $$;

create index if not exists learning_practice_attempts_assessment_user_idx on public.learning_practice_attempts(assessment_id,user_id,attempt_number);
create index if not exists learning_practice_attempts_org_idx on public.learning_practice_attempts(organisation_id,user_id);

create or replace function public.start_organisation_assessment(p_assessment_id uuid,p_access_code text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare
  v_user uuid:=auth.uid(); a public.learning_assessments%rowtype; c public.learning_access_codes%rowtype;
  v_ids bigint[]; v_snapshot jsonb; v_attempt public.learning_practice_attempts%rowtype;
  v_number integer; v_redeem jsonb;
begin
  if v_user is null then return public._err('authentication_required','Sign in to start this assessment.'); end if;
  select * into a from public.learning_assessments where id=p_assessment_id and is_published;
  if not found then return public._err('assessment_unavailable','This assessment is not available.'); end if;
  if a.question_source<>'legacy_questions' then return public._err('assessment_source_unavailable','This question source is not enabled yet.'); end if;
  if a.starts_at is not null and now()<a.starts_at then return public._err('assessment_not_started','This assessment has not opened yet.'); end if;
  if a.ends_at is not null and now()>=a.ends_at then return public._err('assessment_closed','This assessment has closed.'); end if;
  if a.organisation_id is not null and not exists(select 1 from public.learning_organisations o where o.id=a.organisation_id and o.status='active') then
    return public._err('organisation_unavailable','The organisation is not active.');
  end if;
  if a.organisation_id is not null and not a.access_code_required and not exists(
    select 1 from public.learning_organisation_members m where m.organisation_id=a.organisation_id and m.user_id=v_user and m.status='active') then
    return public._err('organisation_membership_required','Join the organisation to take this assessment.');
  end if;
  if a.access_code_required then
    if nullif(trim(coalesce(p_access_code,'')),'') is null then return public._err('access_code_required','Enter the assessment access code.'); end if;
    select * into c from public.learning_access_codes where code_hash=encode(extensions.digest(upper(trim(p_access_code)),'sha256'),'hex')
      and scope_type='assessment' and assessment_id=a.id for update;
    if not found then return public._err('invalid_assessment_code','This code does not grant access to this assessment.'); end if;
    if c.revoked_at is not null then return public._err('code_revoked','This code has been revoked.'); end if;
    if not c.permanent and c.expires_at<=now() then return public._err('code_expired','This code has expired.'); end if;
    if c.redemption_count>=c.max_redemptions and not exists(select 1 from public.learning_access_code_redemptions r where r.access_code_id=c.id and r.user_id=v_user) then
      return public._err('code_fully_redeemed','This code has reached its redemption limit.');
    end if;
    v_redeem:=public.redeem_learning_access_code(p_access_code);
    if coalesce((v_redeem->>'ok')::boolean,false)=false then return v_redeem; end if;
    if not exists(select 1 from public.learning_entitlements e where e.user_id=v_user and e.entitlement_type='assessment' and e.assessment_id=a.id and e.status='active' and e.starts_at<=now() and (e.permanent or e.expires_at>now())) then
      return public._err('assessment_entitlement_missing','No active entitlement exists for this assessment.');
    end if;
  end if;
  select count(*)::integer+1 into v_number from public.learning_practice_attempts where user_id=v_user and assessment_id=a.id;
  if v_number>a.max_attempts then return public._err('attempt_limit_reached','You have used all attempts for this assessment.'); end if;
  select array_agg(q.id order by random()) into v_ids from(
    select id from public.questions where is_active and subject=any(a.subjects)
      and (coalesce(cardinality(a.categories),0)=0 or category=any(a.categories)) order by random() limit a.question_count
  ) q;
  if coalesce(cardinality(v_ids),0)<>a.question_count then return public._err('insufficient_questions','There are not enough active questions for this assessment.'); end if;
  select jsonb_agg(jsonb_build_object(
    'id',q.id,'subject',q.subject,'section',q.section,'category',q.category,'passage_id',q.passage_id,'passage_title',q.passage_title,'passage_text',q.passage_text,
    'question',q.question,'question_image_url',q.question_image_url,'question_image_alt',q.question_image_alt,
    'option_a',q.option_a,'option_a_image_url',q.option_a_image_url,'option_a_image_alt',q.option_a_image_alt,
    'option_b',q.option_b,'option_b_image_url',q.option_b_image_url,'option_b_image_alt',q.option_b_image_alt,
    'option_c',q.option_c,'option_c_image_url',q.option_c_image_url,'option_c_image_alt',q.option_c_image_alt,
    'option_d',q.option_d,'option_d_image_url',q.option_d_image_url,'option_d_image_alt',q.option_d_image_alt,
    'correct_answer',q.correct_answer,'explanation',q.explanation,'explanation_image_url',q.explanation_image_url,'explanation_image_alt',q.explanation_image_alt,'marks',q.marks
  ) order by array_position(v_ids,q.id)) into v_snapshot from public.questions q where q.id=any(v_ids);
  insert into public.learning_practice_attempts(user_id,assessment_id,organisation_id,attempt_type,attempt_number,access_code_id,selected_question_ids,question_snapshot,deadline_at)
  values(v_user,a.id,a.organisation_id,a.assessment_type,v_number,c.id,v_ids,v_snapshot,
    case when a.duration_seconds is null then null else now()+make_interval(secs=>a.duration_seconds) end) returning * into v_attempt;
  return jsonb_build_object('ok',true,'attempt_id',v_attempt.id,'attempt_token',v_attempt.attempt_token,'attempt_number',v_number,
    'status',v_attempt.status,'started_at',v_attempt.started_at,'deadline_at',v_attempt.deadline_at,'assessment_title',a.title,'questions',public._paper_json(v_ids));
end;
$function$;

create or replace function public.resume_organisation_assessment(p_attempt_id uuid,p_attempt_token uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare a public.learning_practice_attempts%rowtype;
begin
  if auth.uid() is null then return public._err('authentication_required','Sign in to resume this assessment.'); end if;
  select * into a from public.learning_practice_attempts where id=p_attempt_id and user_id=auth.uid() and attempt_type in('organisation_quiz','competition');
  if not found or a.attempt_token<>p_attempt_token then return public._err('invalid_attempt','Attempt not found.'); end if;
  if a.status<>'in_progress' then return jsonb_build_object('ok',false,'status',a.status,'message','This attempt is no longer active.'); end if;
  return jsonb_build_object('ok',true,'attempt_id',a.id,'attempt_token',a.attempt_token,'status',a.status,'started_at',a.started_at,
    'deadline_at',a.deadline_at,'answers',a.answers,'questions',public._paper_json(a.selected_question_ids));
end;
$function$;

create or replace function public.save_organisation_assessment_progress(p_attempt_id uuid,p_attempt_token uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare a public.learning_practice_attempts%rowtype; cleaned jsonb;
begin
  if auth.uid() is null then return public._err('authentication_required','Sign in to save this assessment.'); end if;
  if jsonb_typeof(coalesce(p_answers,'{}'::jsonb))<>'object' then return public._err('invalid_answers','Answers must be an object.'); end if;
  select * into a from public.learning_practice_attempts where id=p_attempt_id and user_id=auth.uid() and attempt_type in('organisation_quiz','competition') for update;
  if not found or a.attempt_token<>p_attempt_token then return public._err('invalid_attempt','Attempt not found.'); end if;
  if a.status<>'in_progress' then return public._err('attempt_closed','This attempt is no longer active.'); end if;
  if a.deadline_at is not null and now()>=a.deadline_at then return public._err('attempt_expired','Time has expired. Submit saved answers now.'); end if;
  select coalesce(jsonb_object_agg(e.key,to_jsonb(upper(e.value #>> '{}'))),'{}'::jsonb) into cleaned from jsonb_each(coalesce(p_answers,'{}'::jsonb)) e
    where e.key~'^[0-9]+$' and e.key::bigint=any(a.selected_question_ids) and upper(e.value #>> '{}') in('A','B','C','D');
  update public.learning_practice_attempts set answers=answers||cleaned,updated_at=now() where id=a.id;
  return jsonb_build_object('ok',true,'saved_at',now());
end;
$function$;

create or replace function public.submit_organisation_assessment(p_attempt_id uuid,p_attempt_token uuid,p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare a public.learning_practice_attempts%rowtype; cfg public.learning_assessments%rowtype; cleaned jsonb; s numeric; t numeric; items jsonb; release_results boolean;
begin
  if auth.uid() is null then return public._err('authentication_required','Sign in to submit this assessment.'); end if;
  if jsonb_typeof(coalesce(p_answers,'{}'::jsonb))<>'object' then return public._err('invalid_answers','Answers must be an object.'); end if;
  select * into a from public.learning_practice_attempts where id=p_attempt_id and user_id=auth.uid() and attempt_type in('organisation_quiz','competition') for update;
  if not found or a.attempt_token<>p_attempt_token then return public._err('invalid_attempt','Attempt not found.'); end if;
  select * into cfg from public.learning_assessments where id=a.assessment_id;
  if not found then return public._err('assessment_missing','Assessment configuration is unavailable.'); end if;
  if a.status not in('in_progress','submitted') then return public._err('attempt_closed','This attempt cannot be submitted.'); end if;
  if a.status='in_progress' then
    select coalesce(jsonb_object_agg(e.key,to_jsonb(upper(e.value #>> '{}'))),'{}'::jsonb) into cleaned from jsonb_each(coalesce(p_answers,'{}'::jsonb)) e
      where e.key~'^[0-9]+$' and e.key::bigint=any(a.selected_question_ids) and upper(e.value #>> '{}') in('A','B','C','D');
    a.answers:=a.answers||cleaned;
    select coalesce(sum(case when upper(coalesce(a.answers->>(item->>'id'),''))=upper(item->>'correct_answer') then (item->>'marks')::numeric else 0 end),0),
      coalesce(sum((item->>'marks')::numeric),0) into s,t from jsonb_array_elements(a.question_snapshot) as x(item);
    update public.learning_practice_attempts set answers=a.answers,status='submitted',score=s,total=t,
      auto_submitted=(deadline_at is not null and now()>=deadline_at),submitted_at=now(),updated_at=now() where id=a.id returning * into a;
  end if;
  release_results:=cfg.result_release='after_submit' or (cfg.result_release='after_close' and cfg.ends_at is not null and now()>=cfg.ends_at);
  if not release_results then return jsonb_build_object('ok',true,'status',a.status,'attempt_id',a.id,'results_available',false,
    'message',case when cfg.result_release='admin_only' then 'Submission recorded; results are held for administrators.' else 'Submission recorded; results will be available after the assessment closes.' end); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',item->>'id','subject',item->>'subject','type',item->>'section','text',item->>'question',
    'questionImageUrl',item->>'question_image_url','questionImageAlt',coalesce(item->>'question_image_alt',''),
    'options',jsonb_build_object('A',coalesce(item->>'option_a',''),'B',coalesce(item->>'option_b',''),'C',coalesce(item->>'option_c',''),'D',coalesce(item->>'option_d','')),
    'optionImages',jsonb_build_object('A',item->>'option_a_image_url','B',item->>'option_b_image_url','C',item->>'option_c_image_url','D',item->>'option_d_image_url'),
    'optionImageAlts',jsonb_build_object('A',coalesce(item->>'option_a_image_alt',''),'B',coalesce(item->>'option_b_image_alt',''),'C',coalesce(item->>'option_c_image_alt',''),'D',coalesce(item->>'option_d_image_alt','')),
    'correctAnswer',item->>'correct_answer','userAnswer',a.answers->>(item->>'id'),'isCorrect',upper(coalesce(a.answers->>(item->>'id'),''))=upper(item->>'correct_answer'),
    'explanation',coalesce(item->>'explanation',''),'explanationImageUrl',item->>'explanation_image_url','explanationImageAlt',coalesce(item->>'explanation_image_alt',''),'marks',(item->>'marks')::numeric
  ) order by ord),'[]'::jsonb) into items from jsonb_array_elements(a.question_snapshot) with ordinality as x(item,ord);
  return jsonb_build_object('ok',true,'status',a.status,'attempt_id',a.id,'results_available',true,'score',a.score,'total',a.total,
    'percentage',case when coalesce(a.total,0)>0 then round((a.score/a.total)*100,2) else 0 end,'auto_submitted',a.auto_submitted,'submitted_at',a.submitted_at,'items',items);
end;
$function$;

-- Guard the Self Practice endpoints against being used to bypass organised-assessment result-release rules.
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
  if auth.uid() is null or not exists(select 1 from public.learning_practice_attempts a where a.id=p_attempt_id and a.user_id=auth.uid() and a.attempt_token=p_attempt_token and a.attempt_type='self_practice') then
    return public._err('invalid_attempt','Attempt not found.');
  end if;
  return public.resume_self_practice_internal(p_attempt_id,p_attempt_token);
end;
$function$;

create or replace function public.save_self_practice_progress(p_attempt_id uuid,p_attempt_token uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
begin
  if auth.uid() is null or not exists(select 1 from public.learning_practice_attempts a where a.id=p_attempt_id and a.user_id=auth.uid() and a.attempt_token=p_attempt_token and a.attempt_type='self_practice') then
    return public._err('invalid_attempt','Attempt not found.');
  end if;
  return public.save_self_practice_progress_internal(p_attempt_id,p_attempt_token,p_answers);
end;
$function$;

create or replace function public.submit_self_practice(p_attempt_id uuid,p_attempt_token uuid,p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
begin
  if auth.uid() is null or not exists(select 1 from public.learning_practice_attempts a where a.id=p_attempt_id and a.user_id=auth.uid() and a.attempt_token=p_attempt_token and a.attempt_type='self_practice') then
    return public._err('invalid_attempt','Attempt not found.');
  end if;
  return public.submit_self_practice_internal(p_attempt_id,p_attempt_token,p_answers);
end;
$function$;

revoke all on function public.start_organisation_assessment(uuid,text) from public,anon;
grant execute on function public.start_organisation_assessment(uuid,text) to authenticated,service_role;
revoke all on function public.resume_organisation_assessment(uuid,uuid) from public,anon;
grant execute on function public.resume_organisation_assessment(uuid,uuid) to authenticated,service_role;
revoke all on function public.save_organisation_assessment_progress(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_organisation_assessment_progress(uuid,uuid,jsonb) to authenticated,service_role;
revoke all on function public.submit_organisation_assessment(uuid,uuid,jsonb) from public,anon;
grant execute on function public.submit_organisation_assessment(uuid,uuid,jsonb) to authenticated,service_role;
revoke all on function public.resume_self_practice(uuid,uuid) from public,anon;
grant execute on function public.resume_self_practice(uuid,uuid) to authenticated,service_role;
revoke all on function public.save_self_practice_progress(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_self_practice_progress(uuid,uuid,jsonb) to authenticated,service_role;
revoke all on function public.submit_self_practice(uuid,uuid,jsonb) from public,anon;
grant execute on function public.submit_self_practice(uuid,uuid,jsonb) to authenticated,service_role;

commit;
