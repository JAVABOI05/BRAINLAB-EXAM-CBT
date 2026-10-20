-- ============================================================================
-- Migration: 20261020060000_platform_configuration_and_subscriptions.sql
-- Description: Central Admin-Controlled Configuration, Dynamic Pricing, and Subscriptions
-- ============================================================================

begin;

-- ============================================================================
-- 1. Platform Configuration Table (Key-Value Business Policies)
-- ============================================================================
create table if not exists public.platform_configuration (
  key text primary key,
  category text not null check (category in ('billing', 'features', 'ai', 'refunds', 'competitions', 'notifications', 'general')),
  value jsonb not null,
  description text,
  is_secret boolean default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_configuration enable row level security;

-- Public can read non-secret configurations
create policy platform_configuration_public_read on public.platform_configuration
  for select
  using (not is_secret);

-- Only authorized administrators can manage configurations
create policy platform_configuration_admin_all on public.platform_configuration
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin')
    )
  );

-- ============================================================================
-- 2. Subscription Plans Table (Dynamic Pricing & Entitlements)
-- ============================================================================
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  description text,
  price_kobo bigint not null default 0 check (price_kobo >= 0),
  currency text not null default 'NGN',
  interval text not null default 'monthly' check (interval in ('monthly', 'yearly')),
  features jsonb not null default '[]'::jsonb,
  entitlements jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

-- Public read for active subscription plans
create policy subscription_plans_public_read on public.subscription_plans
  for select
  using (is_active);

-- Admin management for subscription plans
create policy subscription_plans_admin_all on public.subscription_plans
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin')
    )
  );

-- ============================================================================
-- 3. User Subscriptions Table (Active Learner Subscriptions)
-- ============================================================================
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled', 'expired', 'trialing')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  payment_provider text default 'paystack',
  provider_subscription_id text,
  provider_customer_id text,
  price_paid_kobo bigint not null default 0,
  currency text not null default 'NGN',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_subscriptions_user on public.user_subscriptions(user_id, status);
create index if not exists idx_user_subscriptions_plan on public.user_subscriptions(plan_id);

alter table public.user_subscriptions enable row level security;

-- Learner can read their own subscription records
create policy user_subscriptions_select_own on public.user_subscriptions
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admin_users a where a.id = auth.uid())
  );

-- ============================================================================
-- 4. Configuration Audit Logs Table
-- ============================================================================
create table if not exists public.configuration_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text,
  entity_type text not null check (entity_type in ('config', 'plan', 'coupon', 'competition', 'refund')),
  entity_id text not null,
  action text not null check (action in ('created', 'updated', 'published', 'reverted')),
  previous_value jsonb,
  new_value jsonb,
  change_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_config_audit_entity on public.configuration_audit_logs(entity_type, entity_id);

alter table public.configuration_audit_logs enable row level security;

-- Admin read for audit logs
create policy configuration_audit_logs_admin_select on public.configuration_audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin')
    )
  );

-- ============================================================================
-- 5. Seed Initial Configurable Business Data (Editable by Admins)
-- ============================================================================

-- Seed Business Configuration
insert into public.platform_configuration (key, category, value, description)
values
  ('refund_window_hours', 'refunds', '24'::jsonb, 'Time window in hours within which students can request a refund.'),
  ('payment_gateway_mode', 'billing', '"test"'::jsonb, 'Payment gateway mode (strictly test until authorized).'),
  ('ai_daily_free_quota', 'ai', '10'::jsonb, 'Number of free AI study queries allowed per day for free tier.'),
  ('ai_premium_monthly_quota', 'ai', '500'::jsonb, 'Monthly AI study questions included in Premium plan.'),
  ('maintenance_mode', 'general', 'false'::jsonb, 'Global platform maintenance toggle.')
on conflict (key) do nothing;

-- Seed Dynamic Subscription Plans (Values are configurable defaults)
insert into public.subscription_plans (id, name, description, price_kobo, currency, interval, features, entitlements, display_order)
values
  (
    'free',
    'Free Learner',
    'Essential CBT exam preparation and basic practice.',
    0,
    'NGN',
    'monthly',
    '["Full CBT examination portal", "Standard Self Practice", "10 AI Tutor queries per day", "Public leaderboards"]'::jsonb,
    '{"cbt_unlimited": true, "ai_daily_quota": 10, "competitions_included": false, "offline_saving": true}'::jsonb,
    1
  ),
  (
    'premium',
    'Premium Study',
    'Enhanced practice with step-by-step AI explanations and full topic mastery.',
    150000,
    'NGN',
    'monthly',
    '["Everything in Free", "500 AI Tutor explanations per month", "Topic weakness auto-retry loop", "Detailed subject analytics", "Priority email support"]'::jsonb,
    '{"cbt_unlimited": true, "ai_monthly_quota": 500, "competitions_included": true, "advanced_analytics": true}'::jsonb,
    2
  ),
  (
    'plus',
    'BrainLab Plus',
    'Unlimited AI tutoring, school competition entry, and digital certificate verification.',
    300000,
    'NGN',
    'monthly',
    '["Everything in Premium", "1,500 AI Tutor explanations per month", "Official Competition & Quiz access", "Verified Digital Certificates", "Personalized study planner sync"]'::jsonb,
    '{"cbt_unlimited": true, "ai_monthly_quota": 1500, "competitions_included": true, "certificates_issued": true}'::jsonb,
    3
  ),
  (
    'pro',
    'BrainLab Pro',
    'Complete master academy access with 1-on-1 AI coaching, premium question banks, and institution badges.',
    500000,
    'NGN',
    'monthly',
    '["Everything in Plus", "Unlimited AI study missions", "All national & school competitions included", "Lifetime verified credential portfolio", "VIP 24/7 priority support"]'::jsonb,
    '{"cbt_unlimited": true, "ai_unlimited": true, "competitions_included": true, "certificates_issued": true, "vip_support": true}'::jsonb,
    4
  )
on conflict (id) do nothing;

-- ============================================================================
-- 6. RPC: Public get_published_plans
-- Returns all active published plans ordered by display_order
-- ============================================================================
create or replace function public.get_published_plans()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plans jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'description', description,
      'price_kobo', price_kobo,
      'price_naira', round(price_kobo / 100.0, 2),
      'currency', currency,
      'interval', interval,
      'features', features,
      'entitlements', entitlements,
      'display_order', display_order
    ) order by display_order asc
  )
  into v_plans
  from public.subscription_plans
  where is_active = true;

  return coalesce(v_plans, '[]'::jsonb);
end;
$$;

grant execute on function public.get_published_plans() to anon, authenticated;

-- ============================================================================
-- 7. RPC: Admin update_subscription_plan
-- Updates a plan and logs the change to configuration_audit_logs
-- ============================================================================
create or replace function public.admin_update_subscription_plan(
  p_plan_id text,
  p_name text,
  p_description text,
  p_price_kobo bigint,
  p_features jsonb,
  p_entitlements jsonb,
  p_is_active boolean,
  p_change_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_admin public.admin_users%rowtype;
  v_old public.subscription_plans%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Sign in required.');
  end if;

  select * into v_admin from public.admin_users where id = v_user;
  if not found or v_admin.role not in ('super_admin', 'platform_admin') then
    return jsonb_build_object('ok', false, 'error', 'forbidden', 'message', 'Only Super or Platform Administrators can modify subscription plans.');
  end if;

  select * into v_old from public.subscription_plans where id = p_plan_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Plan not found.');
  end if;

  if p_price_kobo < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_price', 'message', 'Plan price cannot be negative.');
  end if;

  -- Update plan
  update public.subscription_plans
  set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    price_kobo = p_price_kobo,
    features = coalesce(p_features, features),
    entitlements = coalesce(p_entitlements, entitlements),
    is_active = p_is_active,
    updated_at = now()
  where id = p_plan_id;

  -- Record audit log
  insert into public.configuration_audit_logs (
    admin_id, admin_email, entity_type, entity_id, action,
    previous_value, new_value, change_reason
  )
  values (
    v_user, v_admin.email, 'plan', p_plan_id, 'updated',
    to_jsonb(v_old),
    jsonb_build_object(
      'id', p_plan_id, 'name', p_name, 'price_kobo', p_price_kobo,
      'is_active', p_is_active, 'features', p_features, 'entitlements', p_entitlements
    ),
    p_change_reason
  );

  return jsonb_build_object('ok', true, 'message', 'Plan updated and audited successfully.');
end;
$$;

revoke execute on function public.admin_update_subscription_plan from anon, public;
grant execute on function public.admin_update_subscription_plan to authenticated, service_role;

commit;
