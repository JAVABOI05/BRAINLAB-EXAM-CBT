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
| `/login` | CBT candidate entry | Preserved route for the existing candidate flow. |
| `/about` | Public About page | Contains proposed vision, mission and values; subject to founder approval. |

## Known administrative routes

- `/admin` — now redirects to `/admin/dashboard` so the legacy root settings UI is not rendered.
- `/admin/login`
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
