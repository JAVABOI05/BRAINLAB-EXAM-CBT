-- Provide a safe Self Practice catalogue and validate submitted answer payloads.
begin;

create or replace function public.get_self_practice_catalog()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $function$
declare v_limit integer := 50; v_subjects jsonb;
begin
  if auth.uid() is null then return public._err('authentication_required','Sign in to view Self Practice options.'); end if;
  select coalesce(max(e.max_questions),50) into v_limit from public.learning_entitlements e
  where e.user_id=auth.uid() and e.entitlement_type='membership' and e.status='active'
    and e.starts_at<=now() and (e.permanent or e.expires_at>now());
  select coalesce(jsonb_agg(jsonb_build_object('name',x.subject,'question_count',x.question_count,'categories',x.categories) order by x.subject),'[]'::jsonb)
  into v_subjects from (
    select q.subject,count(*)::integer as question_count,
      coalesce(array_agg(distinct q.category) filter (where q.category is not null),'{}'::text[]) as categories
    from public.questions q where q.is_active=true group by q.subject
  ) x;
  return jsonb_build_object('ok',true,'max_questions',v_limit,'subjects',v_subjects);
end;
$function$;
revoke all on function public.get_self_practice_catalog() from public,anon;
grant execute on function public.get_self_practice_catalog() to authenticated,service_role;

create or replace function public.submit_self_practice(p_attempt_id uuid,p_attempt_token uuid,p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $function$
declare a public.learning_practice_attempts%rowtype; v_clean jsonb; v_score numeric; v_total numeric; v_items jsonb;
begin
  if auth.uid() is null then return public._err('authentication_required','Sign in to submit practice.'); end if;
  if jsonb_typeof(coalesce(p_answers,'{}'::jsonb))<>'object' then return public._err('invalid_answers','Answers must be an object.'); end if;
  select * into a from public.learning_practice_attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found or a.attempt_token<>p_attempt_token then return public._err('invalid_attempt','Attempt not found.'); end if;
  if a.status not in ('in_progress','submitted') then return public._err('attempt_closed','This attempt cannot be submitted.'); end if;
  if a.status='in_progress' then
    select coalesce(jsonb_object_agg(e.key,to_jsonb(upper(e.value #>> '{}'))),'{}'::jsonb) into v_clean
    from jsonb_each(coalesce(p_answers,'{}'::jsonb)) e where e.key ~ '^[0-9]+$' and e.key::bigint=any(a.selected_question_ids) and upper(e.value #>> '{}') in ('A','B','C','D');
    a.answers:=a.answers||v_clean;
    select coalesce(sum(case when upper(coalesce(a.answers->>(item->>'id'),''))=upper(item->>'correct_answer') then (item->>'marks')::numeric else 0 end),0),
      coalesce(sum((item->>'marks')::numeric),0) into v_score,v_total from jsonb_array_elements(a.question_snapshot) as x(item);
    update public.learning_practice_attempts set answers=a.answers,status='submitted',score=v_score,total=v_total,
      auto_submitted=(deadline_at is not null and now()>=deadline_at),submitted_at=now(),updated_at=now()
      where id=a.id returning * into a;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',item->>'id','subject',item->>'subject','type',item->>'section','text',item->>'question',
    'questionImageUrl',item->>'question_image_url','questionImageAlt',coalesce(item->>'question_image_alt',''),
    'options',jsonb_build_object('A',coalesce(item->>'option_a',''),'B',coalesce(item->>'option_b',''),'C',coalesce(item->>'option_c',''),'D',coalesce(item->>'option_d','')),
    'optionImages',jsonb_build_object('A',item->>'option_a_image_url','B',item->>'option_b_image_url','C',item->>'option_c_image_url','D',item->>'option_d_image_url'),
    'optionImageAlts',jsonb_build_object('A',coalesce(item->>'option_a_image_alt',''),'B',coalesce(item->>'option_b_image_alt',''),'C',coalesce(item->>'option_c_image_alt',''),'D',coalesce(item->>'option_d_image_alt','')),
    'correctAnswer',item->>'correct_answer','userAnswer',a.answers->>(item->>'id'),
    'isCorrect',upper(coalesce(a.answers->>(item->>'id'),''))=upper(item->>'correct_answer'),
    'explanation',coalesce(item->>'explanation',''),'explanationImageUrl',item->>'explanation_image_url',
    'explanationImageAlt',coalesce(item->>'explanation_image_alt',''),'marks',(item->>'marks')::numeric
  ) order by ord),'[]'::jsonb) into v_items from jsonb_array_elements(a.question_snapshot) with ordinality as x(item,ord);
  return jsonb_build_object('ok',true,'status',a.status,'attempt_id',a.id,'score',a.score,'total',a.total,
    'percentage',case when coalesce(a.total,0)>0 then round((a.score/a.total)*100,2) else 0 end,
    'auto_submitted',a.auto_submitted,'submitted_at',a.submitted_at,'items',v_items);
end;
$function$;
revoke all on function public.submit_self_practice(uuid,uuid,jsonb) from public,anon;
grant execute on function public.submit_self_practice(uuid,uuid,jsonb) to authenticated,service_role;

commit;
