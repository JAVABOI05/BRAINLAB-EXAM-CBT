-- BrainLab Academy access, organisation assessments, and authenticated self-practice foundation.
begin;

create table if not exists public.learning_organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active','suspended','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.learning_organisation_members (
  organisation_id uuid not null references public.learning_organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'learner' check (member_role in ('owner','admin','teacher','learner')),
  status text not null default 'active' check (status in ('active','suspended','removed')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (organisation_id,user_id)
);
create table if not exists public.learning_assessments (
  id uuid primary key default gen_random_uuid(),
  assessment_type text not null check (assessment_type in ('organisation_quiz','competition')),
  title text not null check (length(trim(title)) between 2 and 255),
  description text,
  organisation_id uuid references public.learning_organisations(id) on delete cascade,
  question_source text not null default 'legacy_questions' check (question_source in ('legacy_questions','learning_test_questions')),
  subjects text[] not null default '{}',
  categories text[] not null default '{}',
  question_count integer not null default 20 check (question_count between 1 and 500),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 60 and 28800),
  max_attempts integer not null default 1 check (max_attempts between 1 and 100),
  starts_at timestamptz,
  ends_at timestamptz,
  access_code_required boolean not null default false,
  result_release text not null default 'after_submit' check (result_release in ('after_submit','after_close','admin_only')),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (assessment_type <> 'organisation_quiz' or organisation_id is not null)
);
create table if not exists public.learning_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_type text not null check (entitlement_type in ('membership','assessment','resource','organisation')),
  membership_type text,
  resource_key text,
  organisation_id uuid references public.learning_organisations(id) on delete cascade,
  assessment_id uuid references public.learning_assessments(id) on delete cascade,
  max_questions integer not null default 50 check (max_questions between 1 and 500),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  permanent boolean not null default false,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((permanent and expires_at is null) or (not permanent and expires_at is not null)),
  check (entitlement_type <> 'membership' or membership_type is not null),
  check (entitlement_type <> 'assessment' or assessment_id is not null),
  check (entitlement_type <> 'resource' or resource_key is not null),
  check (entitlement_type <> 'organisation' or organisation_id is not null)
);
create table if not exists public.learning_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  scope_type text not null check (scope_type in ('membership','assessment','resource','organisation')),
  membership_type text,
  resource_key text,
  organisation_id uuid references public.learning_organisations(id) on delete cascade,
  assessment_id uuid references public.learning_assessments(id) on delete cascade,
  max_questions integer not null default 50 check (max_questions between 1 and 500),
  permanent boolean not null default false,
  expires_at timestamptz,
  max_redemptions integer not null default 1 check (max_redemptions between 1 and 100000),
  redemption_count integer not null default 0 check (redemption_count between 0 and max_redemptions),
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((permanent and expires_at is null) or (not permanent and expires_at is not null)),
  check (scope_type <> 'membership' or membership_type is not null),
  check (scope_type <> 'assessment' or assessment_id is not null),
  check (scope_type <> 'resource' or resource_key is not null),
  check (scope_type <> 'organisation' or organisation_id is not null)
);
create table if not exists public.learning_access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  access_code_id uuid not null references public.learning_access_codes(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_id uuid references public.learning_entitlements(id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (access_code_id,user_id)
);
create table if not exists public.learning_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_token uuid not null default gen_random_uuid(),
  selected_question_ids bigint[] not null check (cardinality(selected_question_ids) between 1 and 500),
  question_snapshot jsonb not null check (jsonb_typeof(question_snapshot) = 'array'),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  status text not null default 'in_progress' check (status in ('in_progress','submitted','expired','abandoned')),
  score numeric,
  total numeric,
  auto_submitted boolean not null default false,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_org_members_user_idx on public.learning_organisation_members(user_id,status);
create index if not exists learning_assessments_org_idx on public.learning_assessments(organisation_id,is_published);
create index if not exists learning_entitlements_user_status_idx on public.learning_entitlements(user_id,status,expires_at);
create index if not exists learning_access_codes_scope_idx on public.learning_access_codes(scope_type,organisation_id,assessment_id);
create index if not exists learning_practice_attempts_user_idx on public.learning_practice_attempts(user_id,started_at desc);

alter table public.learning_organisations enable row level security;
alter table public.learning_organisation_members enable row level security;
alter table public.learning_assessments enable row level security;
alter table public.learning_entitlements enable row level security;
alter table public.learning_access_codes enable row level security;
alter table public.learning_access_code_redemptions enable row level security;
alter table public.learning_practice_attempts enable row level security;

create or replace function public.learning_can_manage_organisation(p_organisation_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $function$
  select coalesce(public.get_admin_role() in ('super_admin','platform_admin'), false)
    or exists (select 1 from public.learning_organisation_members m
      where m.organisation_id = p_organisation_id and m.user_id = auth.uid()
        and m.status = 'active' and m.member_role in ('owner','admin'));
$function$;
revoke all on function public.learning_can_manage_organisation(uuid) from public, anon;
grant execute on function public.learning_can_manage_organisation(uuid) to authenticated, service_role;

drop policy if exists learning_organisations_read_scoped on public.learning_organisations;
create policy learning_organisations_read_scoped on public.learning_organisations for select to authenticated
using (public.learning_can_manage_all() or exists (select 1 from public.learning_organisation_members m where m.organisation_id=id and m.user_id=auth.uid() and m.status='active'));
drop policy if exists learning_organisations_insert_admin on public.learning_organisations;
create policy learning_organisations_insert_admin on public.learning_organisations for insert to authenticated with check (public.learning_can_manage_all());
drop policy if exists learning_organisations_update_scoped on public.learning_organisations;
create policy learning_organisations_update_scoped on public.learning_organisations for update to authenticated using (public.learning_can_manage_organisation(id)) with check (public.learning_can_manage_organisation(id));
drop policy if exists learning_organisations_delete_admin on public.learning_organisations;
create policy learning_organisations_delete_admin on public.learning_organisations for delete to authenticated using (public.learning_can_manage_all());

drop policy if exists learning_org_members_read_scoped on public.learning_organisation_members;
create policy learning_org_members_read_scoped on public.learning_organisation_members for select to authenticated using (user_id=auth.uid() or public.learning_can_manage_organisation(organisation_id));
drop policy if exists learning_org_members_manage_scoped on public.learning_organisation_members;
create policy learning_org_members_manage_scoped on public.learning_organisation_members for all to authenticated using (public.learning_can_manage_organisation(organisation_id)) with check (public.learning_can_manage_organisation(organisation_id));

drop policy if exists learning_assessments_read_published_scoped on public.learning_assessments;
create policy learning_assessments_read_published_scoped on public.learning_assessments for select to authenticated using (
  public.learning_can_manage_all()
  or (is_published and (organisation_id is null or exists (select 1 from public.learning_organisation_members m where m.organisation_id=learning_assessments.organisation_id and m.user_id=auth.uid() and m.status='active')))
  or (organisation_id is not null and public.learning_can_manage_organisation(organisation_id))
);
drop policy if exists learning_assessments_manage_scoped on public.learning_assessments;
create policy learning_assessments_manage_scoped on public.learning_assessments for all to authenticated using (
  public.learning_can_manage_all() or (organisation_id is not null and public.learning_can_manage_organisation(organisation_id))
) with check (public.learning_can_manage_all() or (organisation_id is not null and public.learning_can_manage_organisation(organisation_id)));

drop policy if exists learning_entitlements_read_own_or_admin on public.learning_entitlements;
create policy learning_entitlements_read_own_or_admin on public.learning_entitlements for select to authenticated using (user_id=auth.uid() or public.learning_can_manage_all());
drop policy if exists learning_entitlements_manage_admin on public.learning_entitlements;
create policy learning_entitlements_manage_admin on public.learning_entitlements for all to authenticated using (public.learning_can_manage_all()) with check (public.learning_can_manage_all());

drop policy if exists learning_access_codes_manage_scoped on public.learning_access_codes;
create policy learning_access_codes_manage_scoped on public.learning_access_codes for all to authenticated using (
  public.learning_can_manage_all()
  or (scope_type='assessment' and public.admin_has_permission('cbt.codes.manage'))
  or (scope_type='organisation' and organisation_id is not null and public.learning_can_manage_organisation(organisation_id))
) with check (
  public.learning_can_manage_all()
  or (scope_type='assessment' and public.admin_has_permission('cbt.codes.manage'))
  or (scope_type='organisation' and organisation_id is not null and public.learning_can_manage_organisation(organisation_id))
);
drop policy if exists learning_code_redemptions_read_own on public.learning_access_code_redemptions;
create policy learning_code_redemptions_read_own on public.learning_access_code_redemptions for select to authenticated using (user_id=auth.uid());

revoke all on public.learning_practice_attempts from public, anon, authenticated;
grant all on public.learning_practice_attempts to service_role;

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
      and (coalesce(cardinality(p_categories),0)=0 or category=any(p_categories)) order by random() limit p_question_count
  ) q;
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

create or replace function public.resume_self_practice(p_attempt_id uuid,p_attempt_token uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $function$
declare a public.learning_practice_attempts%rowtype;
begin
  if auth.uid() is null then return public._err('authentication_required','Sign in to resume practice.'); end if;
  select * into a from public.learning_practice_attempts where id=p_attempt_id and user_id=auth.uid();
  if not found or a.attempt_token<>p_attempt_token then return public._err('invalid_attempt','Attempt not found.'); end if;
  if a.status<>'in_progress' then return jsonb_build_object('ok',false,'status',a.status,'message','This attempt is no longer active.'); end if;
  if a.deadline_at is not null and now()>=a.deadline_at then update public.learning_practice_attempts set status='expired',updated_at=now() where id=a.id; return jsonb_build_object('ok',false,'status','expired','message','The time limit has expired.'); end if;
  return jsonb_build_object('ok',true,'attempt_id',a.id,'attempt_token',a.attempt_token,'status',a.status,'started_at',a.started_at,'deadline_at',a.deadline_at,'answers',a.answers,'questions',public._paper_json(a.selected_question_ids));
end;
$function$;

create or replace function public.save_self_practice_progress(p_attempt_id uuid,p_attempt_token uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $function$
declare a public.learning_practice_attempts%rowtype; v_clean jsonb;
begin
  if auth.uid() is null then return public._err('authentication_required','Sign in to save practice.'); end if;
  if jsonb_typeof(coalesce(p_answers,'{}'::jsonb))<>'object' then return public._err('invalid_answers','Answers must be an object.'); end if;
  select * into a from public.learning_practice_attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found or a.attempt_token<>p_attempt_token then return public._err('invalid_attempt','Attempt not found.'); end if;
  if a.status<>'in_progress' then return public._err('attempt_closed','This attempt is no longer active.'); end if;
  if a.deadline_at is not null and now()>=a.deadline_at then update public.learning_practice_attempts set status='expired',updated_at=now() where id=a.id; return public._err('attempt_expired','The time limit has expired.'); end if;
  select coalesce(jsonb_object_agg(e.key,to_jsonb(upper(e.value #>> '{}'))),'{}'::jsonb) into v_clean
  from jsonb_each(coalesce(p_answers,'{}'::jsonb)) e where e.key ~ '^[0-9]+$' and e.key::bigint=any(a.selected_question_ids) and upper(e.value #>> '{}') in ('A','B','C','D');
  update public.learning_practice_attempts set answers=answers||v_clean,updated_at=now() where id=a.id;
  return jsonb_build_object('ok',true,'saved_at',now(),'answer_count',(select count(*) from jsonb_object_keys(v_clean)));
end;
$function$;

create or replace function public.submit_self_practice(p_attempt_id uuid,p_attempt_token uuid,p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $function$
declare a public.learning_practice_attempts%rowtype; v_clean jsonb; v_score numeric; v_total numeric; v_items jsonb;
begin
  if auth.uid() is null then return public._err('authentication_required','Sign in to submit practice.'); end if;
  select * into a from public.learning_practice_attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found or a.attempt_token<>p_attempt_token then return public._err('invalid_attempt','Attempt not found.'); end if;
  if a.status not in ('in_progress','submitted') then return public._err('attempt_closed','This attempt cannot be submitted.'); end if;
  if a.status='in_progress' then
    select coalesce(jsonb_object_agg(e.key,to_jsonb(upper(e.value #>> '{}'))),'{}'::jsonb) into v_clean
    from jsonb_each(coalesce(p_answers,'{}'::jsonb)) e where e.key ~ '^[0-9]+$' and e.key::bigint=any(a.selected_question_ids) and upper(e.value #>> '{}') in ('A','B','C','D');
    a.answers:=a.answers||v_clean;
    select coalesce(sum(case when upper(coalesce(a.answers->>(item->>'id'),''))=upper(item->>'correct_answer') then (item->>'marks')::numeric else 0 end),0),
           coalesce(sum((item->>'marks')::numeric),0)
    into v_score,v_total from jsonb_array_elements(a.question_snapshot) as x(item);
    update public.learning_practice_attempts set answers=a.answers,status='submitted',score=v_score,total=v_total,
      auto_submitted=(deadline_at is not null and now()>=deadline_at),submitted_at=now(),updated_at=now() where id=a.id returning * into a;
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

revoke all on function public.start_self_practice(text[],integer,integer,text[]) from public,anon;
grant execute on function public.start_self_practice(text[],integer,integer,text[]) to authenticated,service_role;
revoke all on function public.resume_self_practice(uuid,uuid) from public,anon;
grant execute on function public.resume_self_practice(uuid,uuid) to authenticated,service_role;
revoke all on function public.save_self_practice_progress(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_self_practice_progress(uuid,uuid,jsonb) to authenticated,service_role;
revoke all on function public.submit_self_practice(uuid,uuid,jsonb) from public,anon;
grant execute on function public.submit_self_practice(uuid,uuid,jsonb) to authenticated,service_role;
commit;
