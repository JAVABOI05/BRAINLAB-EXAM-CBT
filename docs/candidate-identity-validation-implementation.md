# Candidate identity validation layer

Date: 27 November 2026.

## Implemented on the repair branch

- Added `app/lib/candidateIdentity.ts` with strict version-1 policy validation and candidate-value normalization.
- Supported fields: full name, candidate number, phone, email.
- Supported modes: hidden, optional, required.
- Rejects unknown policy keys, unknown candidate fields, hidden-field submissions, missing required values, malformed values, and overlong values.
- Normalizes whitespace, lowercases email, and converts blank optional values to null.
- Phone numbers must be supplied in international format; the validator does not guess a country code.
- Added `scripts/test-candidate-identity-validation.ts` covering policy shape, normalization, required fields, hidden/unknown keys, malformed email/phone, and length limits.
- Added `test:candidate-identity` to package scripts and the `verify` chain.

## Deliberate non-integration

The admin API and candidate runner are not yet wired to this module. The current staging database does not have the proposed `candidate_identity_config` column or the v2 start RPC. Wiring UI/API before the migration would create a broken configuration path or encourage trusting client-side validation.

The database must independently enforce the same policy. This TypeScript module is a defense-in-depth validator and a reusable contract, not a replacement for PostgreSQL validation.

## Verification status

The test script has been added to the repository but has not been executed in this environment. Typecheck and full CI are also unverified. No database writes, deployment, merge, or production changes were made.
