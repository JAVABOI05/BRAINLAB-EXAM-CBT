# BrainLab Academy — Implementation Roadmap

This roadmap is a working plan, not authorization to deploy or change production systems.

## Workstream A — Repository and security reconciliation

- [ ] Compare local `feature/brand-ui-upgrade` changes with remote `phase0-hardening`.
- [ ] Confirm the complete security patch and migration files are available in the review branch.
- [ ] Inspect current Git status and confirm no secrets or local environment files are tracked.
- [ ] Confirm staging project/configuration is used for all integration tests.
- [ ] Document deployment target and rollback procedure.
- [ ] Do not merge the current remote hardening branch while its status file says it is incomplete.

## Workstream B — Public website

- [ ] Brand metadata, titles and descriptions.
- [ ] Responsive home page with clear CBT CTA.
- [ ] About page with founder-approved vision, mission and values.
- [ ] Shared header/footer for public and candidate-support pages.
- [ ] Hide marketing chrome during an active exam and in the admin area.
- [ ] Remove the floating Medic Phoenix attribution; do not reintroduce it unless the founder asks to include a credit in the footer.
- [ ] Preserve verified WhatsApp support/channel links; do not invent email or social accounts.
- [ ] Verify no links point to unimplemented routes.
- [ ] Add sitemap/robots only after the canonical production domain is approved/configured.

## Workstream C — CBT regression

Test only with a staging/test candidate:
1. Open the homepage and reach the existing CBT portal.
2. Submit candidate details and follow the configured access-code path.
3. Validate a valid/invalid code and confirm server-side rules.
4. Open instructions and begin a timed attempt.
5. Answer, change, flag and navigate questions.
6. Submit once; verify duplicate-submit handling and attempt history.
7. Confirm result visibility follows the configured release setting.
8. Confirm corrections/explanations remain protected until allowed.
9. Confirm an unrelated candidate cannot retrieve another candidate's result.
10. Confirm admin routes/functions reject non-admin users.
11. Test reload, network failure, timeout and mobile layout.

## Workstream D — Quality

- [ ] TypeScript and production build.
- [ ] ESLint or documented lint exceptions.
- [ ] Keyboard/focus and reduced-motion checks.
- [ ] Mobile viewport and no-horizontal-scroll checks.
- [ ] Metadata/social-preview review.
- [ ] No public indexing of protected routes/content.
- [ ] Record known limitations and test evidence.

## Approval gates

1. Audit findings and route inventory reviewed.
2. Sitemap and homepage wireframe reviewed.
3. Visual direction reviewed.
4. Public-site and CBT regression tests pass in staging.
5. Backup, rollback and deployment plan reviewed.
6. Explicit founder approval before production deployment.
