# Phase 2 — BACHS billing database repair (draft only)

**Status:** Review draft. Not a Supabase migration. Do not run against production.

**Scope:** Reconcile the missing subscription/payment schema with the live BrainLab database while preserving existing learner records and configuration. No paid Supabase branch was created. This work is on GitHub branch `chore/bachs-billing-db-repair-phase2`.

## Findings to resolve before writing an executable migration

1. The live database already contains `public.platform_configuration` and `public.exam_config`. Preserve both, including their rows and values.
2. The live migration ledger includes `20261024060427_restore_platform_configuration_dependency`, but does not list the expected subscription, payment/refund/coupon, or BACHS integration migration versions.
3. The repository migrations create subscription and payment tables with `payment_provider/provider = 'paystack'` defaults even though BrainLab uses BACHS.
4. The BACHS finalization function uses `ON CONFLICT (user_id)` for `user_subscriptions`, but the repository's table definition does not establish a matching unique constraint. Adding one blindly could fail or discard the intended subscription history model.
5. The existing coupon validation function accepts `p_user_id` and is executable by `anon`; it must not be trusted for a user-specific redemption decision unless the caller identity is validated. Coupon preview and redemption should be separate operations.
6. The existing payment finalization function checks an optional amount, but provider authenticity must be established in the server-side BACHS webhook/callback handler before calling it. Amount and currency must match exactly; a database function alone cannot verify a provider signature.

## Read-only preflight SQL

Run only in an isolated test database first. These statements inspect schema and duplicate candidates; they do not change data.

```sql
-- Objects already present
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'platform_configuration', 'exam_config',
    'subscription_plans', 'user_subscriptions',
    'payment_transactions', 'coupon_campaigns',
    'coupon_redemptions', 'refund_requests',
    'configuration_audit_logs'
  )
order by table_name;

-- Current subscription rows and possible duplicate user IDs
select user_id, count(*) as row_count
from public.user_subscriptions
group by user_id
having count(*) > 1
order by row_count desc;

-- Check existing payment-provider values before changing any defaults
select provider, status, count(*) as row_count
from public.payment_transactions
group by provider, status
order by provider, status;

-- Check existing plan IDs/prices; do not overwrite these values during repair
select id, name, price_kobo, currency, interval, is_active
from public.subscription_plans
order by display_order, id;

-- Check for duplicate payment references and idempotency keys
select reference, count(*) as row_count
from public.payment_transactions
group by reference
having count(*) > 1;

select idempotency_key, count(*) as row_count
from public.payment_transactions
where idempotency_key is not null
group by idempotency_key
having count(*) > 1;

-- Preserve and snapshot platform/exam configuration before any future DDL
select key, category, value, is_secret, updated_at
from public.platform_configuration
order by key;

select key, value
from public.exam_config
order by key;
```

## Required executable migration design

The final migration must be generated in the repository using the Supabase CLI after the CLI/local environment is available. It must:

- Use `CREATE TABLE IF NOT EXISTS` only where table shape has been verified; for existing tables, reconcile columns and constraints explicitly.
- Never drop or truncate questions, answers, results, sessions, exam configuration, platform configuration, or learner history.
- Preserve existing plan IDs and prices; seed defaults with `ON CONFLICT DO NOTHING`, never update existing values automatically.
- Use BACHS as the new-payment provider default. Do not rewrite historical provider values; retain existing provider references for auditability.
- Make idempotency keys unique only after the preflight proves there are no conflicting duplicates.
- Resolve the subscription model explicitly: either one current row per user with a separate immutable subscription-event history, or multiple subscription rows with application code updated to select/update the current row. Do not add `UNIQUE(user_id)` blindly.
- Ensure RLS is enabled on all exposed tables. Learners may read their own subscription/payment/refund rows; clients must not mark payments successful or edit prices, coupon counters, or subscription entitlements.
- Restrict payment fulfillment to a trusted server/service-role path after BACHS signature, amount, currency, and reference verification.
- Make coupon redemption atomic and idempotent; never trust a client-supplied user ID for authorization.
- Use stable policy names and check for existing policies before creating them, since the database already contains some objects from partial migrations.
- Be transactional where possible, fail safely on ambiguous existing data, and include a rollback/forward-repair plan.

## Acceptance tests before any production change

- Apply migrations from a clean local Supabase/Postgres environment.
- Apply the same repair to a disposable copy containing the current schema and representative data.
- Confirm row counts and checksums for learner/exam data remain unchanged.
- Confirm repeated migration/application is safe or intentionally fails with a clear preflight message.
- Verify learner A cannot read or alter learner B's billing rows.
- Verify clients cannot change transaction status, prices, or entitlements.
- Verify invalid BACHS signatures, wrong amount/currency, unknown references, and duplicate webhooks do not fulfill subscriptions.
- Verify valid BACHS payment fulfills exactly once and retries do not extend the subscription twice.
- Run Supabase security advisors and application CI before considering production deployment.

## Explicitly not done

- No SQL was executed to modify the production database.
- No Supabase branch was created.
- No subscription/payment table was created in production.
- No migration was applied and no deployment was triggered.
