begin;

select plan(20);

select ok(
  (select count(*) = 4
   from pg_class c
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public'
     and c.relname in ('access_permissions','access_roles','access_role_permissions','access_user_role_assignments')
     and c.relrowsecurity),
  'all four access-management tables have RLS enabled'
);

select ok(
  not has_table_privilege('anon','public.access_permissions','SELECT')
  and not has_table_privilege('anon','public.access_roles','SELECT')
  and not has_table_privilege('anon','public.access_role_permissions','SELECT')
  and not has_table_privilege('anon','public.access_user_role_assignments','SELECT'),
  'anonymous clients cannot read access-management tables directly'
);

select ok(
  not has_table_privilege('authenticated','public.access_permissions','SELECT')
  and not has_table_privilege('authenticated','public.access_roles','SELECT')
  and not has_table_privilege('authenticated','public.access_role_permissions','SELECT')
  and not has_table_privilege('authenticated','public.access_user_role_assignments','SELECT'),
  'authenticated clients must use the guarded RPC interface instead of direct table reads'
);

select ok(
  has_schema_privilege('authenticated','private','USAGE')
  and not has_schema_privilege('anon','private','USAGE'),
  'only authenticated callers receive usage on the non-exposed implementation schema'
);

select ok(
  (select count(*) = 10
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname like 'access_%'
     and not p.prosecdef),
  'all public access RPC endpoints are SECURITY INVOKER wrappers'
);

select ok(
  (select count(*) = 10
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='private' and p.proname like 'access_%_impl'
     and p.prosecdef
     and p.proconfig @> array['search_path=""']::text[]),
  'all private implementations are SECURITY DEFINER with an empty search_path'
);

select ok(
  has_function_privilege('authenticated','public.access_search_accounts(text)','EXECUTE')
  and has_function_privilege('authenticated','public.access_list_role_catalogue()','EXECUTE')
  and has_function_privilege('authenticated','public.access_create_custom_role(text,text,text[])','EXECUTE')
  and has_function_privilege('authenticated','public.access_assign_role(uuid,uuid,jsonb,timestamp with time zone)','EXECUTE'),
  'authenticated callers can invoke the required public access RPC wrappers'
);

select ok(
  not has_function_privilege('anon','public.access_search_accounts(text)','EXECUTE')
  and not has_function_privilege('anon','public.access_list_role_catalogue()','EXECUTE')
  and not has_function_privilege('anon','public.access_create_custom_role(text,text,text[])','EXECUTE')
  and not has_function_privilege('anon','public.access_assign_role(uuid,uuid,jsonb,timestamp with time zone)','EXECUTE'),
  'anonymous callers cannot invoke protected public access RPC wrappers'
);

select ok(
  has_function_privilege('authenticated','private.access_search_accounts_impl(text)','EXECUTE')
  and has_function_privilege('authenticated','private.access_assign_role_impl(uuid,uuid,jsonb,timestamp with time zone)','EXECUTE'),
  'authenticated callers have only the implementation grants required by the invoker wrappers'
);

select ok(
  not has_function_privilege('anon','private.access_search_accounts_impl(text)','EXECUTE')
  and not has_function_privilege('anon','private.access_assign_role_impl(uuid,uuid,jsonb,timestamp with time zone)','EXECUTE'),
  'anonymous callers cannot execute private access implementations'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname='public'
      and indexname='access_assignments_one_active_role_uidx'
      and indexdef ilike '%unique%'
      and indexdef ilike '%where (revoked_at IS NULL)%'
  ),
  'one active assignment per user and role is enforced without deleting revoked history'
);

select ok(
  exists (select 1 from pg_indexes where schemaname='public' and indexname='access_roles_name_ci_uidx'),
  'role names are unique without case sensitivity'
);

select ok(
  position('role_row.role_key=''super_admin'''
    in pg_get_functiondef('private.access_assign_role_impl(uuid,uuid,jsonb,timestamp with time zone)'::regprocedure)) > 0
  and position('Super Admin grants require the separate break-glass governance process'
    in pg_get_functiondef('private.access_assign_role_impl(uuid,uuid,jsonb,timestamp with time zone)'::regprocedure)) > 0,
  'Super Admin role assignment is blocked outside the break-glass process'
);

select ok(
  position('Super Admin role revocation requires the separate break-glass governance process'
    in pg_get_functiondef('private.access_revoke_role_impl(uuid,uuid)'::regprocedure)) > 0,
  'Super Admin role revocation is blocked outside the break-glass process'
);

select ok(
  not exists (
    select 1
    from pg_constraint c
    where c.conrelid='public.access_user_role_assignments'::regclass
      and c.contype='u'
      and (select array_agg(a.attname order by a.attname)
           from unnest(c.conkey) k(attnum)
           join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum)
          = array['role_id','user_id']::name[]
  ),
  'the old permanent user-role unique constraint is absent'
);

select ok(
  (select array_agg(rp.permission_key order by rp.permission_key)
   from public.access_role_permissions rp
   join public.access_roles r on r.id=rp.role_id
   where r.role_key='teacher')
  = array[
     'ai.content.manage','cbt.questions.delete','cbt.questions.manage','cbt.results.read',
     'learning.content.manage','question_bank.create','question_bank.edit_own',
     'question_bank.import_csv','question_bank.view','question_builder.use',
     'stem.resource.manage','stem.resource.view','student.support'
   ]::text[],
  'teacher permissions match the latest checked-in instructor authorization policy'
);

select ok(
  position('scoped_permissions' in pg_get_functiondef('private.access_get_session_context_impl()'::regprocedure)) > 0
  and position('where ap.resource_scope=''{}''::jsonb' in pg_get_functiondef('private.access_get_session_context_impl()'::regprocedure)) > 0
  and position('where resource_scope<>''{}''::jsonb' in pg_get_functiondef('private.access_get_session_context_impl()'::regprocedure)) > 0,
  'only unscoped grants become global permissions; scoped grants remain attached to their resource scope'
);

select ok(
  exists (select 1 from public.access_permissions where permission_key='exam.calendar.manage' and module_key='exam_calendar'),
  'the canonical permission catalogue includes the National Exam Calendar permission'
);

select ok(
  not exists (
    select 1
    from public.access_role_permissions rp
    join public.access_roles r on r.id=rp.role_id
    where r.role_key like 'custom:%'
      and rp.permission_key in ('admin.roles.manage','security.settings.manage')
  ),
  'custom roles cannot contain protected governance or root security permissions'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname like 'access_%'
      and p.prosecdef
  ),
  'no SECURITY DEFINER access-management function is exposed in the public schema'
);

select * from finish();

rollback;
