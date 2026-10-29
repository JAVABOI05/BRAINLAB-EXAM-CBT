-- Personalized question rotation for registered candidates across full mocks and Learning Hub assessments.
begin;

create table if not exists public.question_exposure_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  surface text not null check (surface in ('full_mock','self_practice','organisation_quiz','competition')),
  attempt_id uuid not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  exposure_count integer not null default 1 check (exposure_count > 0),
  primary key (user_id, question_id, surface, attempt_id)
);
create index if not exists question_exposure_user_question_idx on public.question_exposure_history(user_id, question_id);
create index if not exists question_exposure_user_surface_seen_idx on public.question_exposure_history(user_id, surface, last_seen_at desc);
alter table public.question_exposure_history enable row level security;
revoke all on public.question_exposure_history from public, anon, authenticated;
grant select, insert, update, delete on public.question_exposure_history to service_role;

create or replace function public.record_learning_attempt_question_exposure()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_surface text;
begin
  v_surface := case
    when new.attempt_type='self_practice' then 'self_practice'
    when new.attempt_type='competition' then 'competition'
    else 'organisation_quiz'
  end;
  insert into public.question_exposure_history(user_id,question_id,surface,attempt_id)
  select new.user_id, qid, v_surface, new.id
  from unnest(new.selected_question_ids) as qid
  on conflict (user_id,question_id,surface,attempt_id) do nothing;
  return new;
end;
$function$;
drop trigger if exists learning_attempt_question_exposure on public.learning_practice_attempts;
create trigger learning_attempt_question_exposure
after insert on public.learning_practice_attempts
for each row execute function public.record_learning_attempt_question_exposure();

create or replace function public.start_self_practice(p_subjects text[],p_question_count integer,p_duration_seconds integer default null,p_categories text[] default '{}')
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  v_user uuid := auth.uid(); v_limit integer := 50; v_ids bigint[]; v_snapshot jsonb;
  v_attempt public.learning_practice_attempts%rowtype; v_subjects text[];
begin
  if v_user is null then return public._err('authentication_required','Sign in to start Self Practice.'); end if;
  v_subjects := array(select distinct trim(s) from unnest(coalesce(p_subjects,'{}'::text[])) s where trim(s)<>'');
  if coalesce(cardinality(v_subjects),0)<1 or p_question_count is null or p_question_count<1 or p_question_count>500 then
    return public._err('invalid_practice_setup','Choose at least one subject and a valid question count.');
  end if;
  if p_duration_seconds is not null and p_duration_seconds not between 60 and 28800 then return public._err('invalid_duration','Duration must be between one minute and eight hours.'); end if;
  select coalesce(max(e.max_questions),50) into v_limit from public.learning_entitlements e
  where e.user_id=v_user and e.entitlement_type='membership' and e.status='active' and e.starts_at<=now() and (e.permanent or e.expires_at>now());
  if p_question_count>v_limit then return public._err('question_limit_exceeded',format('Your current access allows up to %s questions per practice attempt.',v_limit)); end if;
  select array_agg(q.id order by random()) into v_ids from (
    select id from public.questions where is_active=true and subject=any(v_subjects)
      and (coalesce(cardinality(p_categories),0)=0 or category=any(p_categories))
      and not exists (select 1 from public.question_exposure_history h where h.user_id=v_user and h.question_id=public.questions.id)
    order by random() limit p_question_count
  ) q;
  if coalesce(cardinality(v_ids),0)<p_question_count then
    select array_agg(q.id order by random()) into v_ids from (
      select id from public.questions where is_active=true and subject=any(v_subjects)
        and (coalesce(cardinality(p_categories),0)=0 or category=any(p_categories))
      order by random() limit p_question_count
    ) q;
  end if;
  if coalesce(cardinality(v_ids),0)<>p_question_count then
    return public._err('insufficient_questions',format('Only %s matching questions are available. Choose fewer questions or more subjects.',coalesce(cardinality(v_ids),0)));
  end if;
  select jsonb_agg(jsonb_build_object(
    'id',q.id,'subject',q.subject,'section',q.section,'category',q.category,'passage_id',q.passage_id,'passage_title',q.passage_title,'passage_text',q.passage_text,
    'question',q.question,'question_image_url',q.question_image_url,'question_image_alt',q.question_image_alt,
    'option_a',q.option_a,'option_a_image_url',q.option_a_image_url,'option_a_image_alt',q.option_a_image_alt,
    'option_b',q.option_b,'option_b_image_url',q.option_b_image_url,'option_b_image_alt',q.option_b_image_alt,
    'option_c',q.option_c,'option_c_image_url',q.option_c_image_url,'option_c_image_alt',q.option_c_image_alt,
    'option_d',q.option_d,'option_d_image_url',q.option_d_image_url,'option_d_image_alt',q.option_d_image_alt,
    'correct_answer',q.correct_answer,'explanation',q.explanation,'explanation_image_url',q.explanation_image_url,'explanation_image_alt',q.explanation_image_alt,'marks',q.marks
  ) order by array_position(v_ids,q.id)) into v_snapshot from public.questions q where q.id=any(v_ids);
  insert into public.learning_practice_attempts(user_id,selected_question_ids,question_snapshot,deadline_at)
  values(v_user,v_ids,v_snapshot,case when p_duration_seconds is null then null else now()+make_interval(secs=>p_duration_seconds) end) returning * into v_attempt;
  return jsonb_build_object('ok',true,'attempt_id',v_attempt.id,'attempt_token',v_attempt.attempt_token,'status',v_attempt.status,'started_at',v_attempt.started_at,'deadline_at',v_attempt.deadline_at,'questions',public._paper_json(v_ids));
end;
$function$;

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
      and (coalesce(cardinality(a.categories),0)=0 or category=any(a.categories))
      and not exists (select 1 from public.question_exposure_history h where h.user_id=v_user and h.question_id=public.questions.id)
    order by random() limit a.question_count
  ) q;
  if coalesce(cardinality(v_ids),0)<a.question_count then
    select array_agg(q.id order by random()) into v_ids from(
      select id from public.questions where is_active and subject=any(a.subjects)
        and (coalesce(cardinality(a.categories),0)=0 or category=any(a.categories))
      order by random() limit a.question_count
    ) q;
  end if;
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

commit;
