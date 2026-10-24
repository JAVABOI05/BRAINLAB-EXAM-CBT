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


## Validation update (read-only production inspection + repository code review)

Date: 2026-10-24

### Confirmed live schema facts

- The live database has `public.platform_configuration` and `public.exam_config`; their current columns and constraints were inspected read-only.
- The live migration ledger contains the Learning Hub migrations and `20261024060427_restore_platform_configuration_dependency`, but does not contain the expected subscription, payment/refund/coupon, or BACHS migration versions.
- The inspected live schema returned no columns for `subscription_plans`, `user_subscriptions`, `payment_transactions`, `coupon_campaigns`, `coupon_redemptions`, `refund_requests`, or `configuration_audit_logs`. Treat those billing tables as absent in production unless a fresh check proves otherwise.
- No DDL or data changes were executed during this inspection.

### Additional application-level blockers discovered

These should be fixed and tested alongside the migration; a schema-only patch would not be sufficient.

1. **Entitlement field mismatch:** `app/api/ai-tutor/route.ts` queries `subscription_plans.feature_entitlements`, while the repository migration defines `subscription_plans.entitlements`. The chosen canonical column and all consumers must be reconciled before rollout.
2. **Missing subscription conflict target:** the payment webhook and verification routes upsert `user_subscriptions` with `onConflict: "user_id"`, but the migration's table definition does not declare a matching unique constraint. Do not simply add the constraint without deciding how to preserve subscription history and checking duplicates.
3. **Payment verification doesn't validate returned amount/currency:** `app/api/payments/verify/route.ts` checks provider success but does not compare the provider's `amountKobo` and `currency` to the stored transaction before marking it successful.
4. **Potential unsafe simulation path:** `app/lib/payments/bachsProvider.ts` returns a simulated successful verification when the BACHS API key is absent. This must be hard-disabled in production; missing live credentials should fail closed, never fulfill a paid subscription.
5. **Webhook fields are not mandatory:** `app/api/payments/bachs/webhook/route.ts` validates amount/currency only when those fields are present. A successful event must be backed by a valid signature and authoritative provider verification, with exact transaction reference, amount, and currency checks.
6. **Non-atomic fulfillment:** the webhook directly marks a transaction successful, increments coupon counters, and upserts subscription records in separate calls; several write errors are not checked. Retries or partial failures can produce a paid transaction without access, duplicate coupon counts, or inconsistent subscription state. Use a single trusted, idempotent server-side fulfillment path.
7. **Legacy Paystack paths remain:** payment initialization still resolves providers dynamically, and shared webhook/environment settings mention Paystack. BACHS should be the configured default; do not delete historical Paystack records or provider code without a separately reviewed compatibility decision.
8. **Coupon identity boundary:** `validate_and_apply_coupon` accepts a caller-provided `p_user_id` and is granted to `anon` and `authenticated`. Authorization-sensitive redemption must derive the user from `auth.uid()` or be restricted to a trusted server-side role. Coupon preview should not consume a redemption.
9. **Schema defaults alone are not enough:** old migration seeds include hard-coded pricing/config defaults. The repair must preserve live plan/config values and must not seed or overwrite values until the intended billing model is reconciled.

### Phase 2 gate

**Not ready for an executable production migration.** First create an isolated local Supabase environment (Supabase CLI + Docker or another disposable Postgres environment), apply the repository migrations from a clean baseline, and add integration tests for the above payment and entitlement failure cases. Then test an additive reconciliation migration against a disposable copy of the live schema.

Production remains unchanged. No paid Supabase branch was created, and no deployment was triggered.


### Local test harness readiness check

A repository configuration check found:

- `package.json` currently exposes `dev`, `build`, `start`, and `lint` scripts, but no test script.
- `supabase/config.toml` was not present at the expected path on `main`.
- No standard `.github/workflows/ci.yml` or `.github/workflows/ci.yaml` was present at those paths.
- Therefore, this session cannot claim that local Supabase migrations, payment integration tests, or CI have passed. The isolated test harness must be added or established before the migration is considered executable.

### Next implementation sequence

1. Add a local Supabase test configuration and repeatable migration test workflow on this repair branch, without linking it to production.
2. Add payment unit/integration tests covering missing BACHS credentials, signature failure, absent amount/currency, amount/currency mismatch, duplicate webhook, and partial fulfillment.
3. Fix the application verification/fulfillment path to fail closed and use one idempotent database fulfillment operation.
4. Create the additive schema migration only after choosing the subscription-history model and canonical entitlement field.
5. Run clean-baseline and representative-existing-schema tests, lint/build, and security review. Only then open a review PR; do not merge or apply to production automatically.
