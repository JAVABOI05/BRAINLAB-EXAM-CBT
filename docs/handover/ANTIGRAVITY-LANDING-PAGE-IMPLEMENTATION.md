# Antigravity Handover — Premium BrainLab Landing Page

## Assignment

Continue the premium cinematic landing-page upgrade for BrainLab Academy. This is a focused homepage presentation project, not a whole-site redesign.

**Repository:** `JAVABOI05/BRAINLAB-EXAM-CBT`  
**Base:** `main`  
**Working branch:** `feature/premium-landing-page-foundation`  
**Production domain:** `https://www.brainlabacademy.com.ng`

## Approved creative direction

Combine:
- Apple-inspired editorial elegance and whitespace.
- Selective futuristic technology details.
- Premium educational innovation.
- BrainLab's established palette: Deep Navy `#0B1536`, Electric Blue `#1356E8`, Coral `#FF5238`, white and restrained slate neutrals.

The page should feel confident, refined, fast and genuinely useful—not like a generic SaaS template. Motion should support the story, never compete with it.

## Non-negotiable: preserve scroll-reveal

**Do not remove scroll-reveal animations.** Audit and standardise existing reveal behaviour, preserving useful scroll-triggered entrances and the CBT hero demo's viewport-triggered start. Scrolling may trigger presentation, but must never be required to load or expose content. Content must remain available to crawlers, keyboard users and assistive technology.

Respect `prefers-reduced-motion`. Avoid scroll-jacking, forced pinned sections, repeated observer work, layout shifts and hidden content that remains invisible if JavaScript fails.

## Repository findings already verified

1. Homepage route: `app/page.tsx`. It delegates to `app/HomePageClient.tsx`. Existing page metadata includes a title, description and canonical root URL. Preserve these unless there is a demonstrable reason to improve them.
2. Homepage composition in `app/HomePageClient.tsx` is already established. It includes, in order:
   - `HomeHero`
   - `HomeJoinChannel`
   - `HomeAudiences`
   - `HomeBrainLabLoop`
   - `HomeProductShowcase`
   - `HomeStemStudio`
   - `HomeTrustOutcomes`
   - `HomeUniversityTargetSocialProof`
   - `HomePricingTeaser`
   - `HomeFounderNote`
   - `HomeFaqCta`
   Preserve this architecture and its dynamic/conditional behaviour.
3. `HomeHero.tsx` contains the existing candidate pathway CTAs (`/cbt`, `/programmes/post-utme`, `/learn`), dynamic statistics, a CBT demonstration, and five STEM concept cards. Keep all destinations and working functionality.
4. `CBTHeroDemo.tsx` is an illustrative preview. It uses IntersectionObserver to start once when it enters the viewport; it does not register global keyboard listeners, start a real exam, save answers or submit an exam. It already has reduced-motion handling. Preserve these safety properties.
5. A concrete class-name mismatch was found and fixed on this branch: `HomeHero.tsx` referenced `styles.valueStatement`, while `HomeHero.module.css` defines `valueStatementReveal`. The branch now references `styles.valueStatementReveal`. Do not revert this fix.
6. `app/globals.css` already contains a BrainLab motion section with fade, fade-up, scale, stagger, hover and reduced-motion rules. Audit actual usage before adding another animation framework or duplicating global classes.
7. `HomeProductShowcase.tsx` already contains interactive AI Tutor, CBT and STEM logic-gate demonstrations. Preserve their state and behaviour. Improve presentation around them rather than replacing them with static screenshots.
8. `HomeBrainLabLoop.tsx` already has interactive learning stages and route mappings. Preserve its tab semantics, stage state and destinations.
9. Package manifest uses Next.js 15, React 19 and TypeScript. Do not upgrade dependencies or add animation packages without a compelling, documented need.

## Remaining implementation scope for Antigravity

### Phase A — Full visual audit and design plan
- Inspect every homepage component and its module/global CSS, including the audience, channel ribbon, STEM Studio, trust/outcomes, pricing, founder note and FAQ sections.
- Capture current desktop and mobile screenshots before changing anything.
- Map all current CTAs, dynamic data, conditional sections, animation triggers and responsive breakpoints.
- Identify visual inconsistencies, excessive density, repeated visual patterns and any reveal effects that are currently only load-triggered rather than scroll-triggered.
- Present a concise component-by-component plan before making broad structural changes.

### Phase B — Hero refinement
- Make the hero feel more editorial and premium while preserving the existing headline/config-driven content, candidate pathways, disclosure, dynamic statistics and CBT demo.
- Give the CBT demo the strongest visual focus without overwhelming the copy or pushing key CTAs below the fold.
- Review the five STEM concept cards: retain the educational value, but consider moving them into a more intentional supporting strip or the appropriate later section if they currently crowd the hero. Do not delete them without ensuring the information remains represented.
- Keep the hero immediately visible on initial load. No scroll dependency for headline, CTA or essential information.
- Keep the existing one-time reveal class fix.

### Phase C — Standardised scroll-reveal system
- Audit existing CSS classes, IntersectionObserver usage and any component-level reveal logic.
- Reuse/consolidate rather than duplicate. If a reusable reveal utility/component is introduced, ensure server-rendered content remains visible by default and enhancement is progressive.
- Suggested design defaults: 450–650ms fade-up, 16–28px movement, 70–120ms stagger, easing `cubic-bezier(0.16, 1, 0.3, 1)`; tune per section rather than applying mechanically.
- Default to reveal-once. Disconnect observers after reveal when appropriate.
- Avoid animating every paragraph or card independently. Reveal meaningful groups.
- Add robust reduced-motion behaviour and ensure no content is permanently hidden if observer support or JavaScript is unavailable.
- Preserve the CBT demo's once-only trigger and its reduced-motion completion state.

### Phase D — Scroll storytelling and product showcase
- Make the four brand pillars legible in the story: Practise, Understand, Connect, Progress.
- The existing five-step BrainLab Loop is a separate established pedagogical interaction; preserve it and avoid confusing it with the four brand pillars.
- Refine transitions between homepage sections so they feel like one cohesive narrative.
- Improve the product showcase for CBT Practice, Learning Hub, AI Learning, Challenge Arena and STEM Studio using genuine existing interface previews and working links.
- Do not invent capabilities or display misleading mock functionality.
- Avoid scroll-jacking and pinned storytelling that compromises mobile usability.

### Phase E — Supporting sections and conversion
- Refine STEM Studio, trust/outcomes, university/social proof, pricing, founder note and FAQ/CTA sections.
- Keep statistics and testimonials truthful and data-backed. Do not invent student counts, success rates, partnerships or endorsements.
- Preserve dynamic plan/checkout data and conditional visibility.
- Make the primary next step obvious without making the page feel like an aggressive sales funnel.

### Phase F — Responsive, accessibility and performance QA
- Verify desktop, laptop, tablet and narrow mobile widths.
- Check for horizontal overflow, clipped demos, unreadable typography, poor touch targets and mobile layout jumps.
- Check keyboard focus, semantic headings, accessible labels, contrast and reduced-motion mode.
- Check initial render, image/font loading, console errors, hydration and layout stability.
- Preserve SEO metadata, canonical URL, structured data, internal links and existing page architecture.

## Design quality bar

- Use deep navy as a deliberate anchor, not as a reason to make every section dark.
- Use electric blue for primary actions and interaction.
- Use coral selectively for memorable emphasis.
- Use restrained gradients, soft lighting and subtle depth.
- Use strong typographic hierarchy and generous whitespace.
- Keep surfaces, borders, shadows and corner radii consistent.
- Prefer authentic product UI over stock imagery.
- Limit continuous motion. The hero may have one signature demonstration; other motion should be quiet and purposeful.

## Safety and change control

- Continue only on `feature/premium-landing-page-foundation` or a new branch from it.
- Do not edit `main` directly.
- Do not modify Supabase, production data, authentication, subscriptions, payments, exam logic, global routing or unrelated pages.
- Do not remove working homepage sections, dynamic data or routes.
- Do not add dependencies unless justified.
- Do not merge or deploy to production.
- A preview deployment may be created only if it does not alter production configuration and is within available project limits. If deployment is blocked, report that accurately and provide local verification results.
- Do not claim visual, accessibility, typecheck or build verification unless actually run.

## Required completion report

Provide:
1. Summary of the visual changes.
2. Exact files changed.
3. Explanation of scroll-reveal implementation and confirmation that reveal behaviour was retained.
4. Desktop/mobile screenshots or preview URL.
5. TypeScript, build, relevant tests and accessibility/performance checks actually executed, with exact results.
6. Any known issues or deferred work.
7. Confirmation that no production deployment, merge, database change or unrelated system change was made.

**Definition of done:** A cohesive premium BrainLab landing page with a clear hero, refined product storytelling, consistent and accessible scroll-reveal motion, responsive layouts, preserved existing functionality, and verified build/test results.
