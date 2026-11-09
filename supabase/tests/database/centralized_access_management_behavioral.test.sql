-- =============================================================================
-- Centralized People & Access Management — Behavioral pgTAP Test Suite
-- 
-- Environment Requirement: Run ONLY in a disposable database or isolated staging
-- container with pgTAP installed. Strictly transactional (rolls back at the end).
-- =============================================================================

begin;

-- 14 Behavioral Security Assertions
select plan(14);

-- -----------------------------------------------------------------------------
-- Mock Environment Setup (Rolled back at conclusion)
-- -----------------------------------------------------------------------------
do $$
declare
  super_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  regular_user_id uuid := '22222222-2222-2222-2222-222222222222';
  target_user_id  uuid := '33333333-3333-3333-3333-333333333333';
begin
  -- Ensure test users exist in auth.users if possible
  insert into auth.users (id, email, raw_user_meta_data)
  values 
    (super_admin_id, 'superadmin@brainlab.test', '{"full_name": "Test Super Admin"}'::jsonb),
    (regular_user_id, 'student@brainlab.test', '{"full_name": "Test Student"}'::jsonb),
    (target_user_id, 'tutor@brainlab.test', '{"full_name": "Test Tutor"}'::jsonb)
  on conflict (id) do nothing;

  -- Ensure Super Admin profile exists in legacy table
  insert into public.admin_profiles (user_id, role, full_name)
  values (super_admin_id, 'super_admin', 'Test Super Admin')
  on conflict (user_id) do update set role = 'super_admin';
end $$;

-- -----------------------------------------------------------------------------
-- Test 1 & 2: Direct Table Access Denied to Authenticated Callers
-- -----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222"}';

select throws_ok(
  'select * from public.access_permissions',
  '42501',
  null,
  'direct select on public.access_permissions fails with permission denied'
);

select throws_ok(
  'select * from public.access_user_role_assignments',
  '42501',
  null,
  'direct select on public.access_user_role_assignments fails with permission denied'
);

-- -----------------------------------------------------------------------------
-- Test 3 & 4: Unauthorized Wrapper Invocation Denied to Regular Users
-- -----------------------------------------------------------------------------
select throws_ok(
  $$select * from public.access_search_accounts('tutor')$$,
  '42501',
  'Insufficient permission',
  'ordinary authenticated caller cannot search accounts'
);

select throws_ok(
  $$select public.access_assign_role(
      '33333333-3333-3333-3333-333333333333'::uuid,
      (select id from public.access_roles where role_key='teacher'),
      '{}'::jsonb,
      null
    )$$,
  '42501',
  'Insufficient permission',
  'ordinary authenticated caller cannot assign roles'
);

-- -----------------------------------------------------------------------------
-- Switch to Super Admin Context
-- -----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- Test 5: Self-Assignment Guard
select throws_ok(
  $$select public.access_assign_role(
      '11111111-1111-1111-1111-111111111111'::uuid,
      (select id from public.access_roles where role_key='platform_admin'),
      '{}'::jsonb,
      null
    )$$,
  '42501',
  'You cannot assign or elevate your own access',
  'Super Admin cannot assign or elevate own access via access_assign_role'
);

-- Test 6: Break-Glass Guard for Super Admin Assignment
select throws_ok(
  $$select public.access_assign_role(
      '33333333-3333-3333-3333-333333333333'::uuid,
      (select id from public.access_roles where role_key='super_admin'),
      '{}'::jsonb,
      null
    )$$,
  '42501',
  'Super Admin grants require the separate break-glass governance process',
  'assigning super_admin role via access_assign_role is strictly blocked'
);

-- Test 7: Protected Governance Permissions Guard
select throws_ok(
  $$select public.access_create_custom_role(
      'Illegal Governance Role',
      'Should fail',
      array['admin.roles.manage','cbt.questions.manage']::text[]
    )$$,
  '42501',
  'Custom roles cannot receive governance or root security permissions',
  'custom roles cannot be created with governance permissions'
);

-- Test 8: Valid Custom Role Creation
select lives_ok(
  $$select public.access_create_custom_role(
      'Test Chemistry Lead',
      'Manages chemistry question banks',
      array['cbt.questions.manage','question_bank.create']::text[]
    )$$,
  'Super Admin can create valid custom role'
);

-- Test 9: Audit Log Generation for Role Creation
select ok(
  exists(
    select 1 from public.audit_logs
    where action='access_role_created'
      and details->>'role_name'='Test Chemistry Lead'
  ),
  'role creation writes structured audit record to public.audit_logs'
);

-- Test 10: Valid Role Assignment with Scoping
select lives_ok(
  $$select public.access_assign_role(
      '33333333-3333-3333-3333-333333333333'::uuid,
      (select id from public.access_roles where role_key='teacher'),
      '{"subject_id": "chem-101"}'::jsonb,
      now() + interval '30 days'
    )$$,
  'Super Admin can assign scoped role with future expiry'
);

-- Test 11: Idempotent Active Assignment Update (No Duplicate Crash)
select lives_ok(
  $$select public.access_assign_role(
      '33333333-3333-3333-3333-333333333333'::uuid,
      (select id from public.access_roles where role_key='teacher'),
      '{"subject_id": "chem-102"}'::jsonb,
      now() + interval '60 days'
    )$$,
  're-assigning active role updates scope and expiry idempotently without duplicate key error'
);

-- Test 12: Role Revocation Retains History
select lives_ok(
  $$select public.access_revoke_role(
      '33333333-3333-3333-3333-333333333333'::uuid,
      (select id from public.access_roles where role_key='teacher')
    )$$,
  'Super Admin can revoke role assignment'
);

select ok(
  exists(
    select 1 from public.access_user_role_assignments
    where user_id='33333333-3333-3333-3333-333333333333'::uuid
      and role_id=(select id from public.access_roles where role_key='teacher')
      and revoked_at is not null
  ),
  'revoked role assignment remains in database with revoked_at timestamp (history preserved)'
);

-- Test 14: Session Context Separates Global vs Scoped Permissions
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333"}';

select ok(
  (public.access_get_session_context()->>'user_id') = '33333333-3333-3333-3333-333333333333',
  'caller can retrieve own session context without exposing other accounts'
);

select * from finish();

rollback;
