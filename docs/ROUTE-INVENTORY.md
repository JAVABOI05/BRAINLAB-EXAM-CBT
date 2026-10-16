# BrainLab CBT — Route Inventory

**Source:** Current remote `phase0-hardening` repository tree. This is an initial inventory, not a guarantee that every route is complete or production-safe.

## Known public/candidate routes

| Route | Observed purpose | Review notes |
|---|---|---|
| `/` | Legacy CBT portal/home | Existing candidate entry, support links, result lookup and leaderboard. Replaced by the public Academy landing page on this branch. |
| `/access` | Access-code entry | Review direct table calls and server-side validation before release. |
| `/exam` | Timed examination | Critical path; do not redesign logic as part of a visual-only change. |
| `/result` | Result display/lookup | Must respect result-release settings and candidate ownership. |
| `/corrections` | Answer corrections | Must not reveal answer keys/explanations before release is permitted. |
| `/instructions` | Exam instructions | Confirm exact route and behavior in the complete route tree before release. |
| `/login` | Preserved CBT candidate entry route | Created on this branch from the former homepage; uses the public-settings RPC, but the complete exam flow still needs security reconciliation and staging regression. |
| `/about` | Implemented public About page | Contains the proposed vision, mission and values; subject to founder approval. |

## Known administrative routes

- `/admin`
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

The remote `phase0-hardening` status file explicitly says the branch is not ready to merge/deploy and that legacy direct-table calls remain. The route inventory must be reconciled with the local security patch and actual staging behavior before release.
