# BrainLab Academy

BrainLab Academy is evolving from an existing CBT application toward a connected learning ecosystem. The first release focuses on a clear public website and reliable access to the current CBT experience. AI learning, study groups, advanced personalization and courses must remain clearly marked as planned until implemented and tested.

## Current technology

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Supabase client integration

Verify the current source and deployment configuration before making architectural assumptions.

## Local development

1. Install Node.js 22 or a compatible supported version.
2. Install dependencies with `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the correct development/staging project values. Never put a service-role key in client code or a `NEXT_PUBLIC_` variable.
5. Set `NEXT_PUBLIC_SITE_URL` to the approved canonical URL when it is known.
6. Run `npm run dev`; use `npm run build` before proposing a release.

Do not copy production secrets into issue reports, commits or chat. Use staging for verification.

## Product documentation

- [Product blueprint](docs/PRODUCT-BLUEPRINT.md)
- [Implementation roadmap and release gates](docs/IMPLEMENTATION-ROADMAP.md)
- [Known route inventory](docs/ROUTE-INVENTORY.md)
- [Phase 0 hardening status](PHASE0-UPGRADE-STATUS.md)

## Current upgrade branch

The public-site work is being prepared on `feature/brainlab-academy-upgrade`. It includes an updated public landing page, About page, shared public header/footer, a preserved CBT portal entry at `/login`, and a build workflow.

**This branch is not approved for production.** The remote Phase 0 status notes that security hardening is incomplete and legacy direct-table calls remain. Reconcile the branch with the founder's newer local security changes before merging. Do not run production migrations, deploy, or change production data without explicit approval.

## Product integrity

- Keep the existing CBT engine and student records.
- Keep answer keys and protected learner data server-side.
- Verify permissions on the server.
- Do not advertise AI, community, courses, registration or credentials as live unless they actually are.
- Do not fabricate testimonials, usage numbers, partnerships or accreditation.
- Keep the active exam distraction-free and the admin area separate from public marketing chrome.
