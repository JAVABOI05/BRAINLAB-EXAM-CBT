# BrainLab CBT — Route Inventory

**Source:** Review branch `feature/brainlab-academy-upgrade`. This is an initial inventory, not a guarantee that every route is complete or production-safe.

## Known public/candidate routes

| Route | Observed purpose | Review notes |
|---|---|---|
| `/` | Public Academy landing page | Replaces the legacy CBT homepage on this branch. Future capabilities must remain labelled planned until implemented. |
| `/access` | Access-code entry | Review direct table calls and server-side validation before release. |
| `/exam` | Timed examination | Critical path; exam lifecycle now uses typed server RPC wrappers; full staging regression remains required. |
| `/result` | Result display/lookup | Uses `lookup_result(p_phone, p_code)`; must respect result-release settings and candidate ownership. |
| `/corrections` | Answer corrections | Checks live result-release setting and requires a server-provided result summary. |
| `/instructions` | Exam instructions | Confirm exact route and behavior in the complete route tree before release. |
| `/login` | CBT candidate entry | Preserved legacy route for the existing candidate flow. It is not yet linked to account-based attempt history. |
| `/account` | Shared sign-in/sign-up portal | Email/password, Google OAuth initiation, password reset; OAuth and email callback behavior still needs staging verification. |
| `/auth/callback` | Auth callback | Exchanges PKCE code and routes based on database-backed operator status. |
| `/auth/reset-password` | Password recovery | Updates password after recovery session verification. |
| `/dashboard` | Learner account landing page | Basic authenticated landing page; account-to-CBT history linking is not implemented. |
| `/api/auth/operator-gate` | Operator gate endpoint | Verifies Supabase Auth user and `is_admin()` before setting the private HttpOnly cookie. |
| `/about` | Public About page | Contains proposed vision, mission and values; subject to founder approval. |
| `/ai-learning` | AI learning companion overview | Explains intended future AI learning capability and safeguards; informational only, no AI tutor backend is implemented. |
| `/courses` | Courses and resources overview | Describes future learning pathways; no live catalogue, course delivery or certificate claims. |
| `/community` | Learning community overview | Describes planned moderated study groups; no live chat, member directory or messaging backend. |

## Known administrative routes

- `/admin` — now redirects to `/admin/dashboard` so the legacy root settings UI is not rendered.
- Private operator entry: a configured one-segment path supplied by server-only environment variables; no literal path is committed to the repository. Direct `/admin/login` access returns 404 unless the server-verified operator gate cookie has been issued after sign-in.
- `/admin/dashboard`
- `/admin/codes`
- `/admin/config`
- `/admin/questions`
- `/admin/questions/manage`
- `/admin/questions/edit/[id]`
- `/admin/results`
- `/admin/sessions`

The route list above is based on paths observed in the remote tree and may not be exhaustive. Verify with a recursive route inventory before merge.

## Route chrome rules

- Public marketing pages: shared brand header and footer.
- Candidate entry/support pages: shared header/footer where they do not interfere with the task.
- Active exam: distraction-free exam UI; do not show the marketing footer or duplicate the exam header.
- Admin pages: retain the existing admin interface and do not inject the public footer.
- Protected pages: do not expose private data in metadata, sitemap or robots-indexable content.

## Important reconciliation note

The route inventory is a working review document, not proof of security. Client-side redirects and localStorage checks are UX controls only. Database RLS and server-side authorization must enforce every protected read and mutation. The exam route has been moved to server RPCs, but the remaining admin routes and all mutation functions still need a route-by-route authorization audit and non-admin regression tests.

## Current release blockers

- Complete functional staging CBT regression tests, including result-release changes during an already-submitted attempt.
- Audit all `/admin/**` UI paths and database mutations for server-enforced authorization.
- Review staging Supabase security-advisor findings without applying unapproved grants or migrations.
- Reconcile this branch with the founder's local `feature/brand-ui-upgrade` changes without overwriting either working tree.
- Record rollback and deployment steps before any release.
- The founder must explicitly approve any merge or production deployment.
