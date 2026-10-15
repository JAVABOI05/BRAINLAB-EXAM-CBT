# Phase 0 hardening upgrade — work in progress

**Do not merge or deploy this branch yet.**

This branch currently contains only the initial frontend scaffolding:
- Supabase client reads public URL/key from environment variables.
- Admin login uses Supabase Auth and checks the `is_admin` / `is_super_admin` RPCs.
- Typed client wrappers for the Phase 0 exam RPCs.
- `.env.example` documenting the required public environment variables.

## Remaining before this can be tested
1. Port the rest of `frontend/phase0-frontend.patch` into the repository. The current exam, result, access, candidate login, and admin pages still contain legacy direct-table calls.
2. Add and review the Phase 0 SQL migration files against the live production schema and staging schema. Do not execute Stage B/cleanup on production until the complete frontend is deployed and verified.
3. Confirm the staging Auth admin identity, MFA, environment variables, and Vercel preview configuration.
4. Run TypeScript, ESLint, production build, and the full manual exam/admin test checklist against staging.
5. Confirm rollback steps and then request explicit production deployment approval.

## Database observations to reconcile
The production project currently has legacy open policies and a legacy `trigger_insert_result` trigger. The production data audit also found 43 results without a session link and 7,580 answer rows with NULL question snapshot text. These must be handled carefully; do not delete or rewrite these records blindly.

Staging already has candidate-facing RPC functions and locked-down direct table privileges, but security-advisor findings remain. Review each finding in context rather than revoking all function access, because some anonymous RPC access is required for candidates.

No database schema or production data has been changed by this branch work.
