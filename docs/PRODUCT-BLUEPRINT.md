# BrainLab Academy — Product Blueprint

**Status:** Working draft for founder review  
**Initial market:** Nigeria  
**Expansion ambition:** Africa, then wider international markets  
**Current product asset:** Existing Next.js/TypeScript CBT application with Supabase

## North star

BrainLab Academy is an intelligent learning ecosystem that helps people understand what they need to learn, find effective ways to learn it, learn with others, demonstrate what they know and continue progressing throughout their lives.

## Vision and mission

**Vision:** To become Africa's most trusted and empowering intelligent learning ecosystem, helping every learner access knowledge, develop their potential and build the skills needed for the future.

**Mission:** To make learning more accessible, personalized, collaborative and effective by combining quality educational content, intelligent technology, meaningful assessment and supportive learning communities.

These are proposed brand statements and remain subject to founder approval.

## Product principles

1. Learning before scores.
2. Accessible, mobile-first and low-bandwidth-aware experiences.
3. Personalization grounded in available evidence, with explainable recommendations.
4. Community designed for learning, not an unmoderated social feed.
5. Innovation that solves a demonstrated learner problem.
6. Privacy, assessment integrity and age-appropriate safeguarding.
7. Iteration based on evidence and learner feedback.
8. No claims of availability, accreditation, partnerships or outcomes without verification.

## Ecosystem model

- **Assess:** CBT practice, exam entry, timed sessions, submission, results and corrections where enabled.
- **Understand:** explanations and revision resources, using verified content where available.
- **Personalize:** progress summaries and next-step recommendations based on reliable learner data.
- **Connect:** moderated study groups and discussions after the safety and access model is approved.
- **Develop:** courses, practical projects and skills pathways in later phases.
- **Demonstrate:** learning portfolios and verified achievements only when assessment and verification processes exist.

The intended learner loop is: attempt practice → identify a topic to improve → study or ask for an explanation → practise again → review progress.

## Current-state guardrails

The remote `phase0-hardening` branch currently documents that its frontend hardening is incomplete and legacy direct-table calls remain in exam, result, access, candidate-login and admin workflows. The newer local security/brand changes have not been confirmed as published to GitHub. Do not treat this branch as release-ready.

Before merging or deploying:
- Reconcile this branch with the founder's local security-hardening changes.
- Review migrations against staging and production separately.
- Preserve existing attempts, results and answer records.
- Test candidate and admin permissions server-side.
- Verify all exam journeys against staging.
- Obtain explicit production deployment approval.

## Release boundaries

### Phase 0 — Audit and blueprint
Inventory routes, database access, auth, integrations, deployment, risks and test coverage. Confirm which flows are working and which are planned.

### Phase 1 — Public site foundation
Responsive landing page, brand navigation, About page, approved vision/mission, accurate CBT entry points, support links, metadata and accessibility.

### Phase 2 — CBT journey
Regression-tested access, instructions, timed exam, submission, results and corrections. Preserve existing behavior unless a reviewed change is approved.

### Phase 3 — AI and community prototypes
Document use cases, data access, evaluation, costs, moderation, privacy, safeguarding and abuse-reporting flows before production implementation.

### Phase 4 — Personalized learning
Progress profile, revision planning and recommendations based only on trustworthy assessment/activity data.

### Phase 5 — Regional expansion
Curriculum coverage, language/localization, low-bandwidth support, payment/support options and institutional workflows based on validated demand.

## Non-goals for the initial public-site release

- Rebuilding the CBT engine.
- Publishing fabricated testimonials, user counts, partnerships or success statistics.
- Exposing answer keys or student records.
- Presenting AI, community, courses or accounts as live before they exist.
- Making production schema, DNS, billing or deployment changes without approval.

## Acceptance criteria

- Public pages work on mobile and desktop and support keyboard navigation.
- Every advertised live action has a working destination.
- Planned capabilities are clearly labelled as planned/in development.
- The CBT entry route and existing workflows remain available.
- No private exam content or learner data is made public.
- Build/type checks and a documented staging regression checklist pass before release.
