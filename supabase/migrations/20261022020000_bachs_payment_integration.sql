-- ============================================================================
-- Migration: Bachs Payment Gateway Integration & Enhanced Idempotency
-- Version: 20261022020000
-- Description:
--   Supports Bachs alongside existing payment providers with dedicated
--   provider-reference lookups, multi-provider idempotency, and audit verification.
-- ============================================================================

-- 1. Index provider_reference for fast webhook & callback lookups
create index if not exists idx_payment_transactions_provider_ref 
  on public.payment_transactions(provider_reference);

-- 2. Composite index on provider and reference
create index if not exists idx_payment_transactions_provider_status 
  on public.payment_transactions(provider, status);

-- 3. Atomic Database Function for Idempotent Payment Fulfillment
create or replace function public.finalize_successful_payment(
  p_reference text,
  p_provider text,
  p_provider_reference text,
  p_paid_at timestamptz,
  p_verified_amount_kobo bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx record;
  v_plan record;
  v_period_end timestamptz;
  v_interval text;
begin
  -- 1. Lock and retrieve the payment transaction record
  select * into v_tx
  from public.payment_transactions
  where reference = p_reference
  for update;

  if not found then
    -- Try matching via provider_reference if passed
    if p_provider_reference is not null then
      select * into v_tx
      from public.payment_transactions
      where provider_reference = p_provider_reference
      for update;
    end if;
  end if;

  if v_tx.id is null then
    return jsonb_build_object('ok', false, 'error', 'transaction_not_found', 'message', 'Payment record not found');
  end if;

  -- 2. Idempotency Check: if already successful, exit gracefully
  if v_tx.status = 'success' then
    return jsonb_build_object(
      'ok', true,
      'already_processed', true,
      'reference', v_tx.reference,
      'plan_id', v_tx.plan_id,
      'user_id', v_tx.user_id
    );
  end if;

  -- 3. Optional Amount Integrity Check
  if p_verified_amount_kobo is not null and p_verified_amount_kobo > 0 and v_tx.amount_kobo > 0 then
    if abs(p_verified_amount_kobo - v_tx.amount_kobo) > 10 then
      update public.payment_transactions
      set metadata = jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{amount_warning}',
        jsonb_build_object('verified_kobo', p_verified_amount_kobo, 'recorded_kobo', v_tx.amount_kobo)
      ),
      updated_at = now()
      where id = v_tx.id;

      return jsonb_build_object('ok', false, 'error', 'amount_mismatch', 'message', 'Verified amount does not match recorded order');
    end if;
  end if;

  -- 4. Mark Transaction Success
  update public.payment_transactions
  set status = 'success',
      provider = coalesce(p_provider, v_tx.provider),
      provider_reference = coalesce(p_provider_reference, v_tx.provider_reference),
      paid_at = coalesce(p_paid_at, now()),
      updated_at = now()
  where id = v_tx.id;

  -- 5. Process Coupon Campaign Counter if applicable
  if v_tx.coupon_id is not null and v_tx.user_id is not null then
    insert into public.coupon_redemptions (
      coupon_id, user_id, transaction_id, discount_applied_kobo, redeemed_at
    ) values (
      v_tx.coupon_id, v_tx.user_id, v_tx.id, v_tx.discount_kobo, coalesce(p_paid_at, now())
    )
    on conflict (coupon_id, user_id) do nothing;

    update public.coupon_campaigns
    set current_redemptions = coalesce(current_redemptions, 0) + 1,
        updated_at = now()
    where id = v_tx.coupon_id;
  end if;

  -- 6. Activate or Extend Learner Subscription
  if v_tx.user_id is not null and v_tx.plan_id is not null then
    select * into v_plan
    from public.subscription_plans
    where id = v_tx.plan_id;

    v_interval := coalesce(v_plan.interval, 'monthly');
    if v_interval = 'yearly' then
      v_period_end := coalesce(p_paid_at, now()) + interval '365 days';
    else
      v_period_end := coalesce(p_paid_at, now()) + interval '30 days';
    end if;

    insert into public.user_subscriptions (
      user_id, plan_id, status, current_period_start, current_period_end,
      payment_provider, price_paid_kobo, currency, provider_subscription_id,
      updated_at
    ) values (
      v_tx.user_id,
      v_tx.plan_id,
      'active',
      coalesce(p_paid_at, now()),
      v_period_end,
      coalesce(p_provider, v_tx.provider, 'bachs'),
      v_tx.amount_kobo,
      v_tx.currency,
      v_tx.reference,
      now()
    )
    on conflict (user_id) do update
    set plan_id = excluded.plan_id,
        status = 'active',
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        payment_provider = excluded.payment_provider,
        price_paid_kobo = excluded.price_paid_kobo,
        currency = excluded.currency,
        provider_subscription_id = excluded.provider_subscription_id,
        updated_at = now();

    -- Configuration & Audit log
    insert into public.configuration_audit_logs (
      admin_email, entity_type, entity_id, action, new_value, change_reason
    ) values (
      v_tx.customer_email,
      'plan',
      v_tx.plan_id,
      'updated',
      jsonb_build_object(
        'event', 'subscription_activated',
        'provider', coalesce(p_provider, v_tx.provider),
        'reference', v_tx.reference,
        'paid_at', coalesce(p_paid_at, now())
      ),
      'Idempotent subscription activation via ' || coalesce(p_provider, v_tx.provider)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'reference', v_tx.reference,
    'plan_id', v_tx.plan_id,
    'status', 'success',
    'provider', coalesce(p_provider, v_tx.provider)
  );
end;
$$;

-- Grant execute to authenticated and service_role
grant execute on function public.finalize_successful_payment(text, text, text, timestamptz, bigint) to service_role;
