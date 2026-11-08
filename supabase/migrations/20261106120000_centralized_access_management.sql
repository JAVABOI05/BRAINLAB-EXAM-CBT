-- Centralized People & Access Management Centre
-- Additive compatibility migration. Review and apply only through the approved staging migration workflow.
begin;

create table if not exists public.access_permissions (
  permission_key text primary key,
  module_key text not null,
  label text not null,
  description text not null default '',
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.access_roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  name text not null,
  description text not null default '',
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_roles_system_key check (is_system = false or role_key !~ '^custom:')
);

create table if not exists public.access_role_permissions (
  role_id uuid not null references public.access_roles(id) on delete cascade,
  permission_key text not null references public.access_permissions(permission_key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists public.access_user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.access_roles(id) on delete restrict,
  resource_scope jsonb not null default '{}'::jsonb,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  constraint access_assignment_scope_object check (jsonb_typeof(resource_scope) = 'object')
);

create index if not exists access_assignments_user_active_idx
  on public.access_user_role_assignments(user_id, expires_at)
  where revoked_at is null;
-- Keep one current assignment per user/role while retaining revoked history rows.
create unique index if not exists access_assignments_one_active_role_uidx
  on public.access_user_role_assignments(user_id, role_id)
  where revoked_at is null;
create index if not exists access_role_permissions_key_idx
  on public.access_role_permissions(permission_key);

-- The catalogue is explicit: a permission key never becomes valid merely because a role name contains "admin".
insert into public.access_permissions(permission_key,module_key,label,description,is_sensitive) values
('admin.roles.manage','governance','Manage roles','Create roles and assign platform access',true),
('security.settings.manage','governance','Manage security','Change platform security settings',true),
('cbt.questions.manage','cbt','Manage questions','Create and edit examination questions',false),
('cbt.questions.delete','cbt','Delete questions','Delete examination questions',true),
('cbt.answers.read','cbt','View answers','Read answer keys',false),
('cbt.answers.manage','cbt','Manage answers','Edit answer keys',true),
('cbt.results.read','cbt','View results','Read examination results',false),
('cbt.results.create','cbt','Create results','Create result records',false),
('cbt.results.manage','cbt','Manage results','Edit result records',true),
('cbt.results.delete','cbt','Delete results','Delete result records',true),
('cbt.sessions.read','cbt','View sessions','Read examination sessions',false),
('cbt.sessions.create','cbt','Create sessions','Create examination sessions',false),
('cbt.sessions.manage','cbt','Manage sessions','Manage examination sessions',true),
('cbt.sessions.delete','cbt','Delete sessions','Delete examination sessions',true),
('cbt.codes.manage','cbt','Manage access codes','Create and manage access codes',true),
('cbt.codes.delete','cbt','Delete access codes','Delete access codes',true),
('cbt.config.read','cbt','View exam settings','Read examination configuration',false),
('cbt.config.manage','cbt','Manage exam settings','Change examination configuration',true),
('cbt.config.delete','cbt','Delete exam settings','Delete examination configuration',true),
('ai.content.manage','ai_learning','Manage AI content','Manage AI learning content',false),
('learning.content.manage','learning','Manage learning content','Create and edit learning resources',false),
('ai.quality.review','ai_learning','Review AI quality','Review AI-generated learning content',false),
('analytics.ai.read','analytics','View AI analytics','Read AI usage analytics',false),
('community.moderate','community','Moderate community','Moderate community content and reports',false),
('student.support','students','Student support','Access approved student support tools',false),
('analytics.read','analytics','View analytics','Read platform analytics',false),
('institution.reports.read','institutions','View institution reports','Read institutional reports',false),
('institution.manage','institutions','Manage institutions','Manage institution records',true),
('learning.content.review','learning','Review learning content','Review and approve learning resources',false),
('finance.billing.manage','finance','Manage billing','Manage billing and subscription operations',true),
('audit.logs.read','governance','View audit logs','Read security and administrative audit logs',false),
('audit.logs.write','governance','Write audit logs','Append audit events',true),
('competition.view','arena','View competitions','View competition operations',false),
('competition.create','arena','Create competitions','Create competitions',false),
('competition.edit_own','arena','Edit own competitions','Edit owned competitions',false),
('competition.edit_assigned','arena','Edit assigned competitions','Edit assigned competitions',false),
('competition.publish','arena','Publish competitions','Publish competitions',true),
('competition.schedule','arena','Schedule competitions','Schedule competitions',false),
('competition.cancel','arena','Cancel competitions','Cancel competitions',true),
('competition.manage_participants','arena','Manage participants','Manage competition participants',false),
('competition.view_results','arena','View competition results','Read competition results',false),
('competition.publish_results','arena','Publish results','Publish competition results',true),
('competition.correct_results','arena','Correct results','Correct competition results',true),
('competition.disqualify_participant','arena','Disqualify participants','Disqualify competition participants',true),
('competition.manage_rounds','arena','Manage rounds','Manage competition rounds',false),
('competition.manage_rewards','arena','Manage rewards','Manage competition rewards',true),
('competition.approve_rewards','arena','Approve rewards','Approve competition rewards',true),
('question_bank.create','question_bank','Create question banks','Create question banks',false),
('question_bank.view','question_bank','View question banks','View permitted question banks',false),
('question_bank.edit_own','question_bank','Edit own question banks','Edit owned question banks',false),
('question_bank.edit_assigned','question_bank','Edit assigned question banks','Edit assigned question banks',false),
('question_bank.delete_own','question_bank','Delete own question banks','Delete owned question banks',true),
('question_bank.delete_assigned','question_bank','Delete assigned question banks','Delete assigned question banks',true),
('question_bank.import_csv','question_bank','Import questions','Import question bank data',false),
('question_bank.export','question_bank','Export questions','Export question bank data',false),
('question_bank.publish','question_bank','Publish question banks','Publish question banks',true),
('question_bank.moderate','question_bank','Moderate question banks','Moderate submitted question banks',false),
('question_builder.use','question_bank','Use question builder','Use the question builder',false),
('question_bank.link_main_bank','question_bank','Link main question bank','Link to the main question bank',true),
('competition.manage_roles','arena','Manage competition roles','Manage competition-scoped roles',true),
('competition.view_audit_logs','arena','View competition audit logs','Read competition audit events',false),
('stem.resource.view','stem','View STEM resources','View STEM Studio resources',false),
('stem.resource.manage','stem','Manage STEM resources','Create and edit STEM resources',false),
('stem.resource.publish','stem','Publish STEM resources','Publish STEM resources',true),
('stem.resource.review','stem','Review STEM resources','Review STEM resources',false),
('stem.experiments.grade','stem','Grade STEM experiments','Grade submitted STEM experiments',false)
on conflict (permission_key) do update set
  module_key=excluded.module_key,label=excluded.label,description=excluded.description,is_sensitive=excluded.is_sensitive;

-- Fixed system roles. Existing role keys remain stable for compatibility.
insert into public.access_roles(role_key,name,description,is_system) values
('super_admin','Super Admin','Platform governance and security ownership.',true),
('platform_admin','Platform Administrator','Broad platform operations.',true),
('cbt_admin','CBT & Examination Administrator','Examination operations and question bank administration.',true),
('ai_learning_admin','AI & Learning Administrator','AI and learning content operations.',true),
('community_moderator','Community & Student Support Moderator','Community moderation and learner support.',true),
('analytics_admin','Analytics Administrator','Approved analytics and reporting.',true),
('school_admin','School Administrator','Institution-scoped management.',true),
('teacher','Teacher / Instructor','Academic content and assigned teaching work.',true),
('content_reviewer','Content Reviewer','Review learning and STEM content.',true),
('finance_admin','Finance Administrator','Billing and subscription operations.',true),
('read_only_auditor','Read-only Auditor','Audit and aggregate reporting.',true),
('competition_admin','Competition Administrator','Competition operations within assigned scope.',true),
('competition_moderator','Competition Moderator','Competition moderation.',true),
('competition_host','Tutor / Competition Host','Hosted quizzes and academic authoring.',true)
on conflict (role_key) do update set name=excluded.name,description=excluded.description,is_system=true;

-- Seed role grants from the currently effective permission policy (including the Nov 6 instructor update).
with grants(role_key, permission_key) as (
  select 'super_admin', permission_key from public.access_permissions
  union all select 'platform_admin', unnest(array[
    'cbt.questions.manage','cbt.questions.delete','cbt.answers.read','cbt.answers.manage',
    'cbt.results.read','cbt.results.create','cbt.results.manage','cbt.results.delete',
    'cbt.sessions.read','cbt.sessions.create','cbt.sessions.manage','cbt.sessions.delete',
    'cbt.codes.manage','cbt.codes.delete','cbt.config.read','cbt.config.manage','cbt.config.delete',
    'ai.content.manage','learning.content.manage','ai.quality.review','analytics.ai.read',
    'community.moderate','student.support','analytics.read','institution.reports.read',
    'institution.manage','learning.content.review','finance.billing.manage','audit.logs.read','audit.logs.write',
  ]::text[])
  union all select 'cbt_admin', unnest(array[
    'cbt.questions.manage','cbt.answers.read','cbt.results.read',
    'cbt.sessions.read','cbt.sessions.manage','cbt.codes.manage','cbt.config.read',
    'cbt.config.manage','audit.logs.write'  ]::text[])
  union all select 'ai_learning_admin', unnest(array[
    'ai.content.manage','learning.content.manage','ai.quality.review','analytics.ai.read',
    'stem.resource.view','stem.resource.manage'
  ]::text[])
  -- Match the existing admin_has_permission() policy exactly for current teachers.
  union all select 'teacher', unnest(array[
    'learning.content.manage','student.support'
  ]::text[])
  union all select 'competition_host', unnest(array[
    'competition.view','competition.create','competition.edit_own',
    'competition.manage_participants','competition.view_results',
    'question_bank.view','question_bank.create','question_bank.edit_own','question_builder.use'
  ]::text[])
  union all select 'competition_moderator', unnest(array[
    'competition.view','competition.manage_participants','competition.view_results',
    'competition.disqualify_participant','competition.view_audit_logs'
  ]::text[])
  union all select 'community_moderator', unnest(array['community.moderate','student.support']::text[])
  union all select 'analytics_admin', unnest(array[
    'analytics.read','analytics.ai.read','cbt.sessions.read','institution.reports.read','audit.logs.read'
  ]::text[])
  union all select 'school_admin', unnest(array[
    'institution.manage','institution.reports.read','student.support'
  ]::text[])
  union all select 'content_reviewer', unnest(array[
    'learning.content.review','ai.quality.review','stem.resource.review'
  ]::text[])
  union all select 'finance_admin', 'finance.billing.manage'
  union all select 'read_only_auditor', unnest(array['audit.logs.read','analytics.read']::text[])
  union all select 'competition_admin', unnest(array[
    'competition.view','competition.create','competition.edit_assigned','competition.publish',
    'competition.schedule','competition.cancel','competition.manage_participants',
    'competition.view_results','competition.publish_results','competition.correct_results',
    'competition.disqualify_participant','competition.manage_rounds','competition.manage_rewards',
    'question_bank.view','question_bank.edit_assigned','question_bank.moderate'
  ]::text[])
)
insert into public.access_role_permissions(role_id,permission_key)
select r.id,g.permission_key from grants g join public.access_roles r on r.role_key=g.role_key
on conflict do nothing;

-- Backfill every current administrator without removing the legacy profile row.
insert into public.access_user_role_assignments(user_id,role_id,assigned_at)
select ap.user_id,r.id,coalesce(ap.created_at,now())
from public.admin_profiles ap join public.access_roles r on r.role_key=ap.role
on conflict (user_id,role_id) do nothing;

-- Super Admin is the only authority for directory lookup and role management.
create or replace function public.access_search_accounts(search_text text)
returns table(user_id uuid,email text,display_name text,has_staff_access boolean)
language plpgsql stable security definer
set search_path=''
as $function$
begin
  if not exists (
    select 1 from public.admin_profiles ap
    where ap.user_id=auth.uid() and ap.role='super_admin'
  ) then
    raise exception 'Insufficient permission' using errcode='42501';
  end if;
  if length(trim(coalesce(search_text,''))) < 2 or length(trim(search_text)) > 120 then
    return;
  end if;
  return query
  select u.id,u.email,
    coalesce(nullif(u.raw_user_meta_data->>'full_name',''),
             nullif(u.raw_user_meta_data->>'name',''),
             nullif(tp.name,''),split_part(coalesce(u.email,''),'@',1)) as display_name,
    exists(select 1 from public.access_user_role_assignments a
      where a.user_id=u.id and a.revoked_at is null
        and (a.expires_at is null or a.expires_at>now())) as has_staff_access
  from auth.users u
  left join lateral (
    select p.name from public.tutor_profiles p
    where p.user_id=u.id
    order by p.updated_at desc,p.created_at desc,p.id desc
    limit 1
  ) tp on true
  where u.email ilike '%'||trim(search_text)||'%'
     or coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',tp.name,'') ilike '%'||trim(search_text)||'%'
  order by 3
  limit 25;
end;
$function$;

create or replace function public.access_list_role_catalogue()
returns table(id uuid,role_key text,name text,description text,is_system boolean,is_active boolean,permissions text[])
language sql stable security definer
set search_path=''
as $function$
  select r.id,r.role_key,r.name,r.description,r.is_system,r.is_active,
    coalesce(array_agg(rp.permission_key order by rp.permission_key)
      filter(where rp.permission_key is not null),'{}'::text[])
  from public.access_roles r
  left join public.access_role_permissions rp on rp.role_id=r.id
  where exists (
    select 1 from public.admin_profiles ap
    where ap.user_id=auth.uid() and ap.role='super_admin'
  )
  group by r.id
  order by r.is_system desc,r.name;
$function$;

create or replace function public.access_create_custom_role(
  role_name text, role_description text, permission_keys text[]
) returns uuid
language plpgsql security definer
set search_path=''
as $function$
declare new_id uuid;
begin
  if not exists (
    select 1 from public.admin_profiles ap
    where ap.user_id=auth.uid() and ap.role='super_admin'
  ) then raise exception 'Insufficient permission' using errcode='42501'; end if;
  if length(trim(coalesce(role_name,'')))<2 or length(role_name)>80 then
    raise exception 'Role name must be between 2 and 80 characters' using errcode='22023';
  end if;
  if coalesce(cardinality(permission_keys),0)=0 then
    raise exception 'Select at least one permission' using errcode='22023';
  end if;
  if permission_keys && array['admin.roles.manage','security.settings.manage']::text[] then
    raise exception 'Custom roles cannot receive governance or root security permissions' using errcode='42501';
  end if;
  if exists(select 1 from unnest(permission_keys) p where not exists(
    select 1 from public.access_permissions ap where ap.permission_key=p)) then
    raise exception 'Unknown permission key' using errcode='22023';
  end if;
  insert into public.access_roles(role_key,name,description,is_system,created_by)
  values('custom:'||gen_random_uuid()::text,trim(role_name),coalesce(role_description,''),false,auth.uid())
  returning id into new_id;
  insert into public.access_role_permissions(role_id,permission_key)
  select new_id,p from (select distinct unnest(permission_keys) p) q;
  insert into public.audit_logs(admin_email,action,target_table,target_id,details)
  select coalesce(u.email,'unknown'),'access_role_created','access_roles',new_id::text,
    jsonb_build_object('role_name',trim(role_name),'permission_count',cardinality(permission_keys))
  from auth.users u where u.id=auth.uid();
  return new_id;
end;
$function$;

create or replace function public.access_assign_role(
  target_user_id uuid, target_role_id uuid, resource_scope jsonb default '{}'::jsonb, expires_at timestamptz default null
) returns void
language plpgsql security definer
set search_path=''
as $function$
declare role_row public.access_roles%rowtype; target_email text;
begin
  if not exists (
    select 1 from public.admin_profiles ap
    where ap.user_id=auth.uid() and ap.role='super_admin'
  ) then raise exception 'Insufficient permission' using errcode='42501'; end if;
  if target_user_id is null or target_user_id=auth.uid() then
    raise exception 'You cannot assign or elevate your own access' using errcode='42501';
  end if;
  select * into role_row from public.access_roles where id=target_role_id and is_active;
  if not found then raise exception 'Role not found or inactive' using errcode='22023'; end if;
  if role_row.role_key='super_admin' then
    raise exception 'Super Admin grants require the separate break-glass governance process' using errcode='42501';
  end if;
  if exists(select 1 from public.access_role_permissions rp where rp.role_id=target_role_id
    and rp.permission_key in ('admin.roles.manage','security.settings.manage')) then
    raise exception 'This role contains protected governance permissions' using errcode='42501';
  end if;
  if jsonb_typeof(coalesce(resource_scope,'{}'::jsonb))<>'object' then
    raise exception 'Resource scope must be a JSON object' using errcode='22023';
  end if;
  if expires_at is not null and expires_at<=now() then
    raise exception 'Expiry must be in the future' using errcode='22023';
  end if;
  if not exists(select 1 from auth.users where id=target_user_id) then
    raise exception 'User account not found' using errcode='22023';
  end if;
  insert into public.access_user_role_assignments(user_id,role_id,resource_scope,assigned_by,expires_at,revoked_at,revoked_by)
  values(target_user_id,target_role_id,coalesce(resource_scope,'{}'::jsonb),auth.uid(),expires_at,null,null)
  on conflict(user_id,role_id) where revoked_at is null do update
    set resource_scope=excluded.resource_scope,assigned_by=auth.uid(),
        assigned_at=now(),expires_at=excluded.expires_at;
  select email into target_email from auth.users where id=target_user_id;
  insert into public.audit_logs(admin_email,action,target_table,target_id,details)
  select coalesce(u.email,'unknown'),'access_role_assigned','access_user_role_assignments',target_user_id::text,
    jsonb_build_object('role_key',role_row.role_key,'target_email',target_email,'scope',resource_scope,'expires_at',expires_at)
  from auth.users u where u.id=auth.uid();
end;
$function$;

create or replace function public.access_revoke_role(target_user_id uuid,target_role_id uuid)
returns void language plpgsql security definer
set search_path=''
as $function$
begin
  if not exists (
    select 1 from public.admin_profiles ap
    where ap.user_id=auth.uid() and ap.role='super_admin'
  ) then raise exception 'Insufficient permission' using errcode='42501'; end if;
  if target_user_id=auth.uid() then raise exception 'You cannot revoke your own access here' using errcode='42501'; end if;
  update public.access_user_role_assignments set revoked_at=now(),revoked_by=auth.uid()
  where user_id=target_user_id and role_id=target_role_id and revoked_at is null;
  if found then
    insert into public.audit_logs(admin_email,action,target_table,target_id,details)
    select coalesce(u.email,'unknown'),'access_role_revoked','access_user_role_assignments',target_user_id::text,
      jsonb_build_object('role_id',target_role_id)
    from auth.users u where u.id=auth.uid();
  end if;
end;
$function$;

-- IMPORTANT: This phase deliberately does NOT replace get_admin_role() or admin_has_permission().
-- Existing routes, API handlers, and RLS policies still consume the legacy single-role contract.
-- The new access catalogue is staged additively; permission-resolution cutover is a separate
-- migration after the application compatibility layer and route/RLS audit are complete.

commit;
