-- ============================================================================
-- Migration: 20261020070000_payments_refunds_and_coupons.sql
-- Description: Payment Transactions, 24-Hour Refund System, and Promo Coupons
-- ============================================================================

begin;

-- ============================================================================
-- 1. Coupon Campaigns Table
-- ============================================================================
create table if not exists public.coupon_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  min_spend_kobo bigint not null default 0,
  max_redemptions integer not null default 100,
  current_redemptions integer not null default 0 check (current_redemptions >= 0),
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coupon_campaigns_code on public.coupon_campaigns(code);
alter table public.coupon_campaigns enable row level security;

-- Public read for active non-expired coupons to validate at checkout
DROP POLICY IF EXISTS "coupon_campaigns_public_validate" ON public.coupon_campaigns;
create policy coupon_campaigns_public_validate on public.coupon_campaigns
  for select
  using (
    is_active 
    and (expires_at is null or expires_at > now())
    and starts_at <= now()
  );

-- Admins full access
DROP POLICY IF EXISTS "coupon_campaigns_admin_all" ON public.coupon_campaigns;
create policy coupon_campaigns_admin_all on public.coupon_campaigns
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'finance_admin')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'finance_admin')
    )
  );

-- ============================================================================
-- 2. Payment Transactions Table
-- ============================================================================
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  plan_id text references public.subscription_plans(id),
  customer_email text not null,
  amount_kobo bigint not null check (amount_kobo >= 0),
  currency text not null default 'NGN',
  provider text not null default 'paystack',
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'refunded', 'abandoned')),
  provider_reference text,
  coupon_id uuid references public.coupon_campaigns(id) on delete set null,
  discount_kobo bigint not null default 0,
  idempotency_key text,
  metadata jsonb default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_transactions_user on public.payment_transactions(user_id, status);
create index if not exists idx_payment_transactions_ref on public.payment_transactions(reference);
create index if not exists idx_payment_transactions_idempotency on public.payment_transactions(idempotency_key);

alter table public.payment_transactions enable row level security;

-- Authenticated users can view their own transactions
DROP POLICY IF EXISTS "payment_transactions_user_select" ON public.payment_transactions;
create policy payment_transactions_user_select on public.payment_transactions
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admin_users a where a.id = auth.uid())
  );

-- Admin full access
DROP POLICY IF EXISTS "payment_transactions_admin_all" ON public.payment_transactions;
create policy payment_transactions_admin_all on public.payment_transactions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'finance_admin')
    )
  );

-- ============================================================================
-- 3. Coupon Redemptions Table
-- ============================================================================
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupon_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.payment_transactions(id) on delete set null,
  discount_applied_kobo bigint not null default 0,
  redeemed_at timestamptz not null default now(),
  constraint uq_coupon_user unique(coupon_id, user_id)
);

create index if not exists idx_coupon_redemptions_user on public.coupon_redemptions(user_id);
alter table public.coupon_redemptions enable row level security;

DROP POLICY IF EXISTS "coupon_redemptions_user_select" ON public.coupon_redemptions;
create policy coupon_redemptions_user_select on public.coupon_redemptions
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admin_users a where a.id = auth.uid())
  );

-- ============================================================================
-- 4. Refund Requests Table (24-Hour Policy Window)
-- ============================================================================
create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.payment_transactions(id) on delete cascade,
  plan_id text references public.subscription_plans(id),
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  rejection_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_refund_requests_user on public.refund_requests(user_id, status);
create index if not exists idx_refund_requests_tx on public.refund_requests(transaction_id);

alter table public.refund_requests enable row level security;

-- Learner can select and insert their own refund requests
DROP POLICY IF EXISTS "refund_requests_user_select" ON public.refund_requests;
create policy refund_requests_user_select on public.refund_requests
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admin_users a where a.id = auth.uid())
  );

DROP POLICY IF EXISTS "refund_requests_user_insert" ON public.refund_requests;
create policy refund_requests_user_insert on public.refund_requests
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admin full access
DROP POLICY IF EXISTS "refund_requests_admin_all" ON public.refund_requests;
create policy refund_requests_admin_all on public.refund_requests
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'finance_admin')
    )
  );

-- ============================================================================
-- 5. RPC: Atomic Coupon Validation & Redemption
-- ============================================================================
create or replace function public.validate_and_apply_coupon(
  p_code text,
  p_user_id uuid,
  p_amount_kobo bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon record;
  v_already_redeemed boolean;
  v_discount_kobo bigint := 0;
  v_final_amount_kobo bigint;
begin
  select * into v_coupon
  from coupon_campaigns
  where upper(code) = upper(trim(p_code))
    and is_active = true
    and starts_at <= now()
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code', 'message', 'This promo coupon is invalid or has expired.');
  end if;

  if v_coupon.current_redemptions >= v_coupon.max_redemptions then
    return jsonb_build_object('ok', false, 'error', 'quota_exceeded', 'message', 'This promo coupon has reached its maximum redemptions limit.');
  end if;

  if p_amount_kobo < v_coupon.min_spend_kobo then
    return jsonb_build_object('ok', false, 'error', 'min_spend_not_met', 'message', format('This coupon requires a minimum spend of ₦%s.', (v_coupon.min_spend_kobo / 100)::text));
  end if;

  -- Check if user already used it
  select exists(
    select 1 from coupon_redemptions
    where coupon_id = v_coupon.id
      and user_id = p_user_id
  ) into v_already_redeemed;

  if v_already_redeemed then
    return jsonb_build_object('ok', false, 'error', 'already_redeemed', 'message', 'You have already redeemed this promo coupon.');
  end if;

  -- Calculate discount
  if v_coupon.discount_type = 'percentage' then
    v_discount_kobo := round((p_amount_kobo * v_coupon.discount_value) / 100.0);
  else
    v_discount_kobo := round(v_coupon.discount_value * 100.0);
  end if;

  if v_discount_kobo > p_amount_kobo then
    v_discount_kobo := p_amount_kobo;
  end if;

  v_final_amount_kobo := p_amount_kobo - v_discount_kobo;

  return jsonb_build_object(
    'ok', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'name', v_coupon.name,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'original_amount_kobo', p_amount_kobo,
    'discount_kobo', v_discount_kobo,
    'final_amount_kobo', v_final_amount_kobo
  );
end;
$$;

grant execute on function public.validate_and_apply_coupon(text, uuid, bigint) to anon, authenticated;

-- ============================================================================
-- 6. RPC: Submit Refund Request with 24-Hour Strict Check
-- ============================================================================
create or replace function public.submit_refund_request(
  p_transaction_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_tx record;
  v_existing record;
  v_hours_since_payment numeric;
  v_refund_id uuid;
begin
  if v_caller_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'You must be signed in to request a refund.');
  end if;

  -- Verify transaction exists and belongs to caller
  select * into v_tx
  from payment_transactions
  where id = p_transaction_id
    and user_id = v_caller_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Payment transaction not found or does not belong to your account.');
  end if;

  if v_tx.status != 'success' then
    return jsonb_build_object('ok', false, 'error', 'invalid_status', 'message', 'Only successful payments can be submitted for refund.');
  end if;

  -- Check existing refund request
  select * into v_existing
  from refund_requests
  where transaction_id = p_transaction_id
  limit 1;

  if found then
    return jsonb_build_object('ok', false, 'error', 'already_requested', 'message', format('A refund request for this transaction is already %s.', v_existing.status));
  end if;

  -- 24-hour rule calculation
  v_hours_since_payment := extract(epoch from (now() - coalesce(v_tx.paid_at, v_tx.created_at))) / 3600.0;

  if v_hours_since_payment > 24.0 then
    return jsonb_build_object(
      'ok', false, 
      'error', 'refund_window_expired', 
      'message', 'Refund requests must be submitted within 24 hours of payment. This payment is outside the eligible window.'
    );
  end if;

  insert into refund_requests (
    user_id,
    transaction_id,
    plan_id,
    amount_kobo,
    currency,
    reason,
    status
  ) values (
    v_caller_id,
    v_tx.id,
    v_tx.plan_id,
    v_tx.amount_kobo,
    v_tx.currency,
    trim(p_reason),
    'pending'
  ) returning id into v_refund_id;

  return jsonb_build_object(
    'ok', true,
    'refund_id', v_refund_id,
    'message', 'Your refund request has been submitted successfully and is queued for finance review.'
  );
end;
$$;

grant execute on function public.submit_refund_request(uuid, text) to authenticated;

-- ============================================================================
-- 7. Seed Initial Launch Promo Coupon
-- ============================================================================
insert into public.coupon_campaigns (
  code,
  name,
  description,
  discount_type,
  discount_value,
  min_spend_kobo,
  max_redemptions,
  current_redemptions,
  is_active,
  expires_at
) values (
  'BRAINLAUNCH20',
  'BrainLab Launch Celebration',
  'Get 20% off any subscription tier during our official launch celebration.',
  'percentage',
  20,
  100000, -- min spend ₦1,000
  500,
  0,
  true,
  now() + interval '90 days'
) on conflict (code) do nothing;

commit;
