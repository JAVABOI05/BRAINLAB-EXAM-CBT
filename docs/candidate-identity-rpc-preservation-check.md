# Candidate identity RPC preservation check

Date: 27 November 2026. Read-only staging verification.

The live staging RPC `public.start_organisation_assessment(uuid,text)` was checked immediately before drafting the v2 wrapper:

- Owner: `postgres`
- Security definer: true
- Pinned search path: `public, pg_temp`
- Current EXECUTE grants: `postgres`, `service_role`, `authenticated`
- No explicit catalog dependencies were returned by the inspected `pg_depend` query.

This supports the draft's rename-and-wrap strategy: the original function object is retained under an internal name, its API-role EXECUTE grants are revoked, and new wrappers are created as SECURITY DEFINER functions. The compatibility wrapper preserves the original two-argument RPC for assessments whose identity configuration remains NULL. The v2 wrapper calls the same preserved implementation and writes candidate identity before the outer transaction commits.

Important: the absence of catalog dependencies does not prove there are no dynamic SQL or PL/pgSQL name-based callers. The source tree and all database routines must still be searched before applying the migration.

No database writes were made. The SQL remains a draft under `docs/sql/`; it has not been generated as a Supabase migration, executed, or tested on a clone.
