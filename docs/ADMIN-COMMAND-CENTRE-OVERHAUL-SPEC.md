# BrainLab Academy Admin Command Centre Overhaul
**Status:** Implementation specification / audit baseline  
**Prepared:** 2026-10-24  
**Target repository:** `JAVABOI05/BRAINLAB-EXAM-CBT`  
**Baseline:** `main` at the time this branch was created  
**Payment provider direction:** BACHS only; do not design new functionality around Paystack  
**Scope:** Admin navigation, dashboard, analytics, settings, permissions, operational monitoring and staged implementation

## 1. Executive decision

Reorganise the existing admin experience into a coherent **BrainLab Academy Administration & Operations Centre**. The primary dashboard should answer “what needs attention?” and provide verified platform metrics. Dedicated workspaces should handle management tasks. A central Settings workspace should own configuration rather than leaving important settings mixed into the dashboard.

This document is a mapping and delivery plan, not evidence that the proposed dashboard, analytics or navigation have already been implemented. Do not deploy or alter production data as part of the planning phase.

## 2. What the current source shows

The current `app/admin/dashboard/page.tsx` source has these characteristics:

- It is titled **CBT Control Center**, and the hero copy is primarily focused on exam administration.
- Its initial summary cards count Question Bank, Results and Access Codes; they do not form a whole-platform operational dashboard.
- It combines quick links for Codes, Results, Live Classroom and Pricing with a large Live Classroom promotional/host banner near the top.
- It contains inline exam settings (duration, calculator, leaderboard, result visibility and mock exam) as well as feature-flag state.
- It loads organisation choices and stores the selected organisation in `localStorage.admin_active_org_id`. The visible count queries shown in the dashboard do not apply that organisation selection, so the selector must not be presented as a functioning data scope until the queries and authorization enforce it.
- Several admin data reads and settings writes are performed directly through the browser Supabase client. UI permission checks are useful for presentation but are not a substitute for database RLS and server-side authorization.
- The current CSS in `app/admin/admin.css` uses a strong glass/blur treatment, large radii, gradients and shadows. The redesign should favour a clear information hierarchy, consistent spacing and more compact data-dense views.
- The source calls `adminHasPermission` for known permission keys. Navigation and pages must use the existing permission system and the server/database must enforce the same boundaries.

Related source reviewed:
- `app/admin/dashboard/page.tsx`
- `app/admin/admin.css`
- `app/lib/adminRoles.ts`
- `app/lib/platformConfig.ts`
- `docs/ADMIN-AND-CANDIDATE-ROUTE-AUDIT.md`
- Existing payment references surfaced in `app/lib/payments/`, `app/api/payments/`, `app/pricing/page.tsx`, and `app/faq/page.tsx`

The existing route/security audit documents serious database-policy and frontend/RPC contract concerns. Dashboard work must not be treated as permission to weaken those controls or to assume a passing build proves data security.

## 3. Target global layout

### Persistent primary navigation

1. Dashboard
2. Command Centre
3. Students & Users
4. Learning Hub
5. Examinations & CBT
6. AI Operations
7. Classes & Community
8. Finance & Payments (BACHS)
9. Analytics & Reports
10. Schools & Organisations
11. Security & Audit
12. Settings

The desktop shell should have a collapsible sidebar, top header, page title/breadcrumb, global search, notifications and current administrator menu. Mobile should use a compact header and accessible navigation drawer. Use BrainLab brand colours: navy `#0B1536`, blue `#1356E8`, coral `#FF5238`, with accessible text contrast. Do not remove working routes to make the sidebar shorter.

### Target route mapping

This table is the intended information architecture, not a claim that every target route already exists. Before implementing each route, map it to the existing page and preserve existing URL contracts wherever possible.

| Workspace | Suggested route | Primary contents |
|---|---|---|
| Dashboard | `/admin/dashboard` | KPI summary, trends, alerts, tasks and quick actions |
| Command Centre | `/admin/command-centre` | Operational alerts, service health, recent incidents |
| Students & Users | `/admin/students` | Directory, search, profiles, enrolment and support |
| Learning Hub | `/admin/learning` | Subjects, topics, lessons, content studio and media |
| Examinations & CBT | Existing CBT routes | Questions, exams, codes, sessions, results and corrections |
| AI Operations | `/admin/ai-operations` | AI volume, provider reliability, quota and cost telemetry |
| Classes & Community | Existing classroom/community routes | Classes, attendance, moderation and interactions |
| Finance & Payments | `/admin/finance` | BACHS-backed transactions, payment state and reconciliation |
| Analytics & Reports | `/admin/analytics` | Aggregate learning, engagement, traffic and reports |
| Schools & Organisations | Existing school/org routes | Organisation directory, scoped administration and reports |
| Security & Audit | Existing audit/roles routes | Permissions, security events and audit trail |
| Settings | `/admin/settings` | Grouped configuration sections |

Existing routes explicitly seen in the audit/source include `/admin/codes`, `/admin/results`, `/admin/classroom`, `/admin/pricing`, `/admin/config`, `/admin/questions`, `/admin/questions/manage`, `/admin/sessions` and `/admin/schools`. Confirm all route destinations from the repository before changing navigation. Do not invent links to pages that have not been built.

## 4. Dashboard specification

### Global controls
- Date range with explicit timezone and comparison period.
- Organisation filter only for roles permitted to view that organisation; the filter must apply to every relevant query and be enforced server-side.
- Refresh/last-updated indicator with clear distinction between real-time and delayed data.
- Optional saved widget layout and hide/reorder controls after the core dashboard is stable.
- Export only when the current role is allowed to export the underlying data.

### First row: core KPI cards
Show only metrics with a documented definition and connected source:
- Active learners (DAU/WAU/MAU as separate definitions).
- New registrations in the selected period.
- Learning sessions or lesson completions.
- CBT attempts and completion rate.
- AI requests and failure rate.
- BACHS-confirmed payment volume/count, only when verified transaction data is connected.
- Critical unresolved alerts.

Do not hard-code values. Use loading skeletons, explicit “No data yet” states and a visible unavailable state when the source is not connected. Never show a fabricated zero when a query failed.

### Main dashboard sections
1. **Engagement trend:** registrations and active learners, with a drill-down to authorised student records.
2. **Learning performance:** lesson starts/completions, subject/topic engagement and CBT trends.
3. **AI reliability:** request volume, errors, provider fallback and token/cost metrics only when telemetry supports them.
4. **Finance snapshot:** BACHS payment statuses, failed confirmations and reconciliation exceptions.
5. **System health:** recent API/application errors, webhook failures and unresolved incidents.
6. **Action queue:** content awaiting review, support/moderation items, failed jobs and alerts that require action.
7. **Recent activity:** privacy-safe audit/activity entries, filtered by permissions.

## 5. Central Settings workspace

Settings should be a permanent item near the bottom of the sidebar, with its own secondary navigation and settings search. Keep only a small number of safe, high-frequency controls on the dashboard; move configuration forms into Settings.

Proposed sections:
- General & Branding: platform name, logos, brand, timezone, contact details and currency.
- Accounts & Authentication: registration, sign-in, recovery and session policies.
- Roles & Permissions: admin roles, permission grants and access review.
- Students & Enrolment: profile requirements, onboarding and enrolment rules.
- Learning & Content: academic structure, publishing, media and upload limits.
- CBT & Examinations: duration, scoring, randomisation, code policy and result release.
- AI & Providers: configured models, quotas, rate limits, fallback and budget thresholds.
- Payments & Billing: BACHS configuration status, payment policy, plans and billing rules.
- Classes & Community: classroom defaults, messaging and moderation.
- Notifications & Email: sender identity, templates, delivery status and preferences.
- Integrations & API: Supabase/analytics/BACHS integrations and webhook status.
- SEO & Website: metadata, canonical URLs, sitemap, robots and structured data.
- Security & Privacy: retention, exports, security alerts and audit policy.
- Appearance & Navigation: light/dark mode, sidebar, density and widget preferences.
- System & Maintenance: maintenance notice, service diagnostics and background task status.

Only expose controls that correspond to implemented functionality. Each setting needs schema validation, permission checks, save/error feedback, auditability for sensitive changes, and server/database enforcement. Never return secrets to the browser; show masked status and rotation instructions instead.

## 6. BACHS-only payment direction

The owner has confirmed BACHS is the payment provider in use. Treat BACHS as the only active payment provider for product UI and future finance dashboard design.

Repository search found BACHS implementation references in:
- `app/lib/payments/bachsProvider.ts`
- `app/api/payments/bachs/webhook/route.ts`
- `app/api/payments/webhook/route.ts`
- `supabase/migrations/20261022020000_bachs_payment_integration.sql`

Repository search also surfaced Paystack selection/copy in `app/pricing/page.tsx`, `app/lib/payments/types.ts`, `app/lib/payments/index.ts`, `app/api/payments/initialize/route.ts`, `app/faq/page.tsx` and `app/knowledge-base/page.tsx`. Before removing any provider code, inspect references, migrations, stored transaction values and production configuration. Do not do a blind global text replacement. Separate:
1. Removing Paystack as a selectable checkout option and removing inaccurate public copy.
2. Safely retiring unused Paystack provider code, if confirmed unused.
3. Preserving historical transactions and provider references needed for audit/reconciliation.

The finance workspace should report BACHS transaction states using the server-verified transaction record and webhook verification path. A client-side return/redirect is not proof of payment. Reconcile provider references, idempotency, webhook signature validation, duplicate events, failed events and payment-to-user/order mapping before displaying “confirmed” or “settled”.

Do not promise BACHS features (such as settlement reports or refunds) until the currently integrated BACHS API and contract are verified.

## 7. Analytics and data contracts

Create a small, documented analytics data layer rather than issuing unrelated ad-hoc queries in every widget. Each metric should specify:
- Name and business definition.
- Source table/event/API.
- Time field and timezone.
- Whether it is exact, estimated, delayed or unavailable.
- Required permission and organisation scope.
- Aggregation method and duplicate handling.
- Retention and privacy considerations.
- Loading, empty and failure behaviour.

Candidate sources to inventory:
- Existing Supabase profile, organisation, lesson, assessment, session and result data.
- Instrumented AI request logs and provider-reported usage.
- BACHS verified transaction and webhook records.
- Connected Google Analytics/Search Console data for public-site traffic.
- Vercel/application telemetry for technical health.
- Class/community records where those features are actually implemented.

Do not infer website visitors from authenticated-user rows. Do not infer AI cost from token counts without a model-specific price and timestamped pricing assumptions. Clearly distinguish provider-reported charges from estimates. Distinguish gross confirmed payments, refunds, fees and settlements; do not label gross collections as profit.

## 8. Permissions and security boundaries

Use the existing role system in `app/lib/adminRoles.ts` as the starting point. Existing roles include super admin, platform admin, CBT admin, AI/learning admin, community moderator, analytics admin, school admin, teacher, content reviewer, finance admin and read-only auditor.

Required boundaries:
- Analytics roles receive aggregate reporting only unless a specific permission grants record-level access.
- Finance views are restricted to authorised finance/platform roles.
- School administrators are organisation-scoped.
- Teachers see only assigned classes/learners and permitted reports.
- Content reviewers can review content without automatically receiving results or finance access.
- Read-only auditors cannot mutate records.
- Role and security-setting changes are restricted to authorised administrators.
- All sensitive reads, exports and mutations must be protected by RLS and/or server-side authorization. Hiding a button is not authorization.
- Browser storage is presentation state only, never a source of trusted role or access decisions.
- Test anonymous, ordinary authenticated, wrong-role, cross-organisation and authorised access paths.

The existing `docs/ADMIN-AND-CANDIDATE-ROUTE-AUDIT.md` documents serious production RLS/grant and frontend/RPC contract concerns. These are release blockers to be handled as a separate, carefully staged security workstream. Do not bundle risky blanket policy changes into a visual dashboard redesign.

## 9. Visual and accessibility direction

- Brand: deep navy `#0B1536`, electric blue `#1356E8`, coral `#FF5238`.
- Prefer solid, readable surfaces with restrained shadows and modest radii over heavy glassmorphism and oversized gradients.
- Use compact cards for KPIs; reserve large hero treatment for one page-level message, not multiple competing banners.
- Use tables with server-side pagination, filtering and sorting for large datasets.
- Provide keyboard focus states, semantic headings, labelled controls, accessible contrast and responsive navigation.
- Provide consistent loading, empty, permission-denied, unavailable and retry states.
- Use light/dark mode only if it can be applied consistently and tested across admin routes.

## 10. Delivery phases and acceptance criteria

### Phase 0 — Inventory and safety baseline
- Inventory all `app/admin/**` routes, shared components, permission keys and existing configuration screens.
- Map current routes to target navigation.
- Inventory analytics-capable data sources and BACHS payment lifecycle.
- Document missing data/events and do not invent metrics.
- Record baseline build/lint/test status and identify the exact branch/commit.

**Accept when:** every existing admin route has a disposition (keep, map, consolidate or retire) and no existing feature is silently dropped.

### Phase 1 — Admin shell and dashboard structure
- Implement responsive shell and permission-aware navigation.
- Keep existing URLs working.
- Reorganise dashboard hierarchy; remove the oversized classroom banner from the primary overview and represent classroom activity as a normal workspace/widget.
- Add central Settings navigation and move inline configuration in a controlled manner, without deleting the old working settings path until migration is verified.

**Accept when:** all roles see only permitted navigation; direct URL access is still guarded; desktop/mobile navigation and sign-out work; no route loops or broken destinations.

### Phase 2 — Core verified metrics and search
- Add documented metric definitions and source-backed student, learning and CBT summaries.
- Add global search with role-aware searchable entities.
- Apply organisation scope correctly.
- Add drill-downs and empty/error/loading states.

**Accept when:** each displayed metric can be traced to a verified source and a documented definition; search cannot reveal out-of-scope records.

### Phase 3 — Command Centre and technical health
- Add application errors, integration health and operational alerts using available telemetry.
- Instrument AI requests and BACHS webhook processing where absent.
- Ensure alert acknowledgement and audit logging are reliable.

**Accept when:** failures are observable without leaking credentials or sensitive learner data, and alert counts distinguish current failures from historical events.

### Phase 4 — AI and BACHS finance workspaces
- Implement AI usage/quality views and BACHS-backed finance views.
- Validate provider event verification, idempotency and reconciliation.
- Remove Paystack as a user-facing selection only after reviewing historical and live dependencies.

**Accept when:** no unverified browser redirect is counted as payment success; duplicate webhook events do not duplicate financial effects; totals reconcile to stored provider references.

### Phase 5 — Advanced analytics and release
- Add traffic integrations, retention/cohort reports, saved views and scheduled exports if supported.
- Run responsive, performance, permission, accessibility and regression tests.
- Open a review PR and deploy only after CI passes and explicit approval.

**Accept when:** exact final commit passes the repository's required CI checks, critical permission tests pass, existing CBT/lesson workflows remain functional, and production release/rollback are documented.

## 11. Required regression checks

- Admin direct access with no valid session is denied.
- Normal student cannot access admin pages or APIs.
- Role-specific navigation and APIs agree.
- Cross-organisation data is denied.
- CBT question selection, answer persistence, submission, results and corrections work end to end.
- Results hidden/released rules are respected.
- Settings writes are denied to roles without manage permission.
- BACHS checkout, webhook signature, duplicate webhook, failed webhook and transaction reconciliation behave safely.
- Search and exports do not leak restricted data.
- Empty/error states do not silently display misleading zeros.
- No secrets appear in client bundles, logs or rendered UI.
- Build, lint and tests pass for the exact review commit.

## 12. Explicit non-goals for the first release

- No fabricated live statistics or simulated production data.
- No broad database grants/RLS changes bundled with UI work.
- No automatic production database migration or deployment without review.
- No unverified payment-provider capabilities.
- No blind deletion of historical Paystack transaction records/code before dependency review.
- No AI natural-language admin agent until permissions, query boundaries and audit logging are proven.

## 13. First implementation slice

Start with **Phase 0 plus Phase 1**:
1. Complete route/permission inventory.
2. Implement the shared admin shell.
3. Reorganise the current dashboard into a true platform overview.
4. Add Settings as a permanent navigation destination while preserving existing settings functionality.
5. Do not add fake charts or unconnected metrics.
6. Run lint/build and existing relevant tests, fix failures, and open a review PR.
7. Do not merge to production or run production migrations as part of this first slice.
