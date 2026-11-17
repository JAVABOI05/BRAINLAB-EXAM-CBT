# BrainLab QR / Result Verification Repair

## Scope note
The repository search found this QR component used on the CBT result-slip page (`app/result/page.tsx`). It did not find a separate student identity-card QR implementation. This repair therefore fixes the result-slip QR flow; if a different student ID card contains another QR generator, that is a separate code path and needs its own identifier/source audit.

## Root cause confirmed
The QR printed on the CBT result slip in `app/result/page.tsx` hard-coded the production domain while using `summary.result_id`. The supplied UUID exists in the staging `public.results` table and does not exist in production. It is a result UUID, not a certificate UUID. The existing public page only called `verify_certificate(text)`, which in the base migration searched the certificate ledger and did not resolve result UUIDs.

The production database also lacks `public.learning_certificates` and `public.verify_certificate(text)`. This makes certificate lookup unavailable in production. The page previously collapsed RPC/database errors into a false "not found" result.

## Repair prepared
- QR destinations now use the current app origin, so staging/preview results do not point to production and production results use the live domain.
- No placeholder `mock-result` QR is emitted when a result ID is absent.
- QR images and their fallback are clickable links to the same verification URL.
- The verification page first checks UUIDs against a new release-gated `verify_exam_result(text)` RPC, then falls back to certificate lookup.
- Verification service/database failures are shown as service-unavailable, not as a false "not found".
- The displayed verification URL uses the current domain and exact identifier.
- The additive migration does not require or expose the certificate ledger. It checks the global `settings.show_results` flag, accepts only UUIDs, requires linked sessions to be in a final status, and returns only public result-slip fields.

## Exact supplied identifier
`77f09905-9dce-41cb-8812-299d2b1fcd79` exists in staging `public.results.id`; its linked session is submitted. It does not exist in production `public.results` or `public.exam_sessions`. The result row remains in staging; no student or result data was copied into production.

## Deployment boundary
The new migration is applied to staging only. Production database and deployment remain unchanged pending explicit production approval. The live URL will not verify this staging-only UUID until a corresponding result is legitimately created in production or a production verification migration is approved and deployed. Do not copy this staging result into production as a workaround.
