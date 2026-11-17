# BrainLab Academy: UI System Rules & Baseline Tokens

This document serves as the **authoritative source of truth** for all frontend styling, component reuse, responsive behaviour, motion, accessibility standards, and visual review protocols across BrainLab Academy.

---

## 1. Core Principles & Source of Truth

1. **Source of Truth**: The existing BrainLab design system is the reference.
   - Core token references: [`app/globals.css`](app/globals.css), [`app/lib/tokens.ts`](app/lib/tokens.ts), [`app/dashboard/dashboard-dark.css`](app/dashboard/dashboard-dark.css), and [`app/exam/exam.css`](app/exam/exam.css).
   - Never invent or substitute colors, aliases, or spacing values. New tokens may be added, but only to the token files, never as one-off hex values in components.
   - Existing design is a reference, not permission to copy defects.
2. **Responsive Matrix**:
   - Primary test viewports: **375px** (compact mobile), **390px** (modern mobile), **768px** (tablet), and **1440px** (desktop).
   - **Mobile is the primary target**. Zero horizontal overflow (`overflow-x: clip` on `html` and `body`). No fixed-pixel widths on responsive containers.
   - Touch targets must be at least **44x44px** where practicable.
   - Timers, sticky bars, and banners must never cover question text or answer options.
3. **Accessibility (WCAG 2.1 AA)**:
   - Text contrast at least **4.5:1** for standard text, **3:1** for large text/headings and icons. Body and supporting text is never smaller than **12px**.
   - Visible keyboard focus ring (`bl-focus-ring`: `outline: 2px solid var(--bl-color-brand-primary); outline-offset: 2px`) on every interactive element.
   - Semantic headings (`<h1>`-`<h6>`) and landmarks (`<main id="main">`, `<header>`, `<footer>`, `<nav>`), labels on icon-only buttons (`aria-label`), native form elements. Anything clickable is a `<button>` or `<a>`, never a `<div onClick>`.
   - Strict `prefers-reduced-motion: reduce` compliance (see Section 5).
4. **Component Reuse**:
   - Always reuse existing shared components from `app/components/ui/` and `app/components/`.
   - Do not introduce external component libraries or styling frameworks without approval. This includes animation libraries (see Section 5.4).
   - Preserve existing dark/light mode behavior (`data-theme="dark"` / `.dark`).
5. **Scope & Protection**:
   - In UI-polish turns, do NOT touch authentication, payment handling, access gating, or database queries.
   - The approved access-model work (see directive) is the exception: its required removals/changes (upgrade banners, subscription screens, plan gating) are in scope and override rules about retaining existing UI.
   - Otherwise, do NOT delete or hide existing flows to make a layout fit.
   - **Visual-layer upgrades are explicitly in scope** for public marketing pages: colour arrangement, cards, illustration and graphics, and motion (Sections 5 and 6). Page structure, section order and user flow are not changed without approval.
   - Do NOT redesign working layouts merely because they differ from external conventions. Separate true defects from intentional design choices. Raising the visual quality of a section is not a layout redesign.

---

## 2. Verified Design Tokens

### 2.1 Color Roles (Light & Dark Theme)

| Token Name | Light Mode Value | Dark Mode Value (`data-theme="dark"`) | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| `--bl-color-canvas` | `#f8fafc` | `#070d18` | Base page background / canvas |
| `--bl-color-surface` | `#ffffff` | `#0d1727` | Standard card / modal container |
| `--bl-color-surface-raised` | `#f1f5f9` | `#132137` | Elevated cards, dropdown menus |
| `--bl-color-surface-subtle` | `#f8fafc` | `#192940` | Subtle background highlights |
| `--bl-color-surface-sunken` | `#e2e8f0` | `#050910` | Inset wells, code blocks, input fills |
| `--bl-color-border` | `#e2e8f0` | `#2a3b53` | Default element & card borders |
| `--bl-color-border-subtle` | `#f1f5f9` | `#1e293b` | Divider lines & table borders |
| `--bl-color-border-strong` | `#cbd5e1` | `#3b4d66` | Form inputs & active boundaries |
| `--bl-color-text-primary` | `#0b1536` | `#edf4ff` | Primary headlines, body text (Contrast > 16:1) |
| `--bl-color-text-secondary` | `#334155` | `#cbd5e1` | Secondary descriptions, subheads (Contrast > 9:1) |
| `--bl-color-text-muted` | `#64748b` | `#94a3b8` | Captions, metadata, placeholders (Contrast > 4.5:1) |
| `--bl-color-text-faint` | `#94a3b8` | `#64748b` | Disabled hints, subtle timestamps |
| `--bl-color-text-inverse` | `#ffffff` | `#0b1536` | Inverted text on solid brand fills |
| `--bl-color-brand-primary` | `#1356e8` | `#3b82f6` | Primary action buttons, active tabs, links |
| `--bl-color-brand-primary-hover` | `#0f44bc` | `#60a5fa` | Primary hover state |
| `--bl-color-brand-navy` | `#0b1536` | `#0b1536` | Deep institutional navy brand color |
| `--bl-color-brand-coral` | `#ff5238` | `#ff6b55` | Accent alerts, attention CTAs, countdowns |
| `--bl-color-brand-coral-hover` | `#e04028` | `#ff8572` | Accent hover state |
| `--bl-color-brand-channel` | `#25d366` | `#25d366` | WhatsApp Community Green |
| `--bl-color-brand-channel-hover` | `#20ba5a` | `#22c55e` | WhatsApp button hover state |
| `--bl-color-success` | `#15803d` | `#22c55e` | Success states, correct answer markers |
| `--bl-color-success-bg` | `#dcfce7` | `#052e16` | Success notification / badge backgrounds |
| `--bl-color-warning` | `#b45309` | `#fbbf24` | Review flagged questions, warnings |
| `--bl-color-warning-bg` | `#fef3c7` | `#451a03` | Warning badge / alert backgrounds |
| `--bl-color-error` | `#dc2626` | `#f87171` | Validation errors, incorrect answers |
| `--bl-color-error-bg` | `#fee2e2` | `#450a0a` | Error banner backgrounds |
| `--bl-color-info` | `#0284c7` | `#38bdf8` | Diagnostic hints, explanatory callouts |
| `--bl-color-info-bg` | `#e0f2fe` | `#082f49` | Diagnostic callout backgrounds |

### 2.2 Typography Scale

- **System Font Stack (0 KB Font Budget)**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Heading Scale**:
  - `h1`: `text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight` (leading: 1.08)
  - `h2`: `text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight`
  - `h3`: `text-xl sm:text-2xl font-bold tracking-tight`
  - `h4`: `text-lg sm:text-xl font-semibold`
  - `h5`: `text-base sm:text-lg font-semibold`
  - `h6`: `text-sm sm:text-base font-semibold`
- **Body & Prose**:
  - `lead`: `text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed`
  - `body`: `text-base text-slate-700 dark:text-slate-200 leading-relaxed`
  - `small`: `text-sm text-slate-500 dark:text-slate-400`
  - `caption`: `text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider`
  - `exam-question-text`: `font-size: 1.15rem; line-height: 1.9; font-weight: 600`

### 2.3 Radii, Elevation & Motion

- **Border Radii**:
  - `xs`: `rounded` (4px)
  - `sm`: `rounded-lg` (8px)
  - `md`: `rounded-xl` (12px)
  - `lg`: `rounded-2xl` (16px)
  - `xl`: `rounded-3xl` (24px)
  - `full`: `rounded-full` (9999px)
- **Elevation / Shadows**:
  - `sm`: `shadow-sm`
  - `md`: `shadow-md`
  - `lg`: `shadow-lg`
  - `xl`: `shadow-xl`
  - `card`: `border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0D1727] shadow-sm hover:shadow-md transition-shadow`
  - `bl-focus-ring`: `outline: 2px solid var(--bl-color-brand-primary) !important; outline-offset: 2px !important;`
- **Motion Durations & Curves**:
  - Fast: `180ms cubic-bezier(0.16, 1, 0.3, 1)`
  - Normal: `240ms cubic-bezier(0.16, 1, 0.3, 1)`
  - Slow: `360ms cubic-bezier(0.16, 1, 0.3, 1)`
  - Expressive (entrances and scroll-reveal only): `600ms cubic-bezier(0.16, 1, 0.3, 1)`
  - Reduced Motion Override: all durations `0.01ms !important`, iterations `1 !important`.

---

## 3. Shared Component Registry

| Component Path | Component Name | Role & Usage |
| :--- | :--- | :--- |
| `app/components/ui/Button.tsx` | `<Button>` | Primary, secondary, outline, ghost, coral, and channel action triggers with 44px+ touch heights |
| `app/components/ui/Card.tsx` | `<Card>` | Standard, raised, outlined, interactive, and sunken card containers |
| `app/components/ui/Badge.tsx` | `<Badge>` | Status indicators (brand, neutral, success, warning, error, coral, channel) with optional status dot |
| `app/components/ui/Heading.tsx` | `<Heading>` | Semantic heading wrapper (h1–h6) enforcing token typography |
| `app/components/ui/Accordion.tsx` | `<Accordion>` | Accessible collapsible disclosure sections (FAQs, syllabus details) |
| `app/components/ui/Tabs.tsx` | `<Tabs>` | Accessible tab navigation with keyboard arrow controls |
| `app/components/ui/Modal.tsx` | `<Modal>` | Dialog overlay with focus trapping, escape key listener, and backdrop blur |
| `app/components/SiteChrome.tsx` | `<SiteChrome>` | Root layout shell switcher: Public Marketing, Student Portal, Admin, Instructor, Immersive Exam |
| `app/components/BrandHeader.tsx` | `<BrandHeader>` | Public desktop navbar, mega-menu, direct CBT link, and accessible mobile drawer |
| `app/components/BrandFooter.tsx` | `<BrandFooter>` | Public footer with regulatory compliance, exam syllabus links, and contact channels |
| `app/dashboard/StudentPortalShell.tsx`| `<StudentPortalShell>`| Authenticated student sidebar navigation, active presence, and learning progress |
| `app/components/FloatingCalculator.tsx` | `<FloatingCalculator>`| Official 8-key UTME simulation desk calculator |
| `app/components/LearnerThemeProvider.tsx`| `<LearnerThemeProvider>`| Dark/light mode persistence synchronised with `data-theme` on document root |
| `app/components/OfflineSyncManager.tsx` | `<OfflineSyncManager>` | PWA IndexedDB cache and background sync manager |

---

## 4. Discrepancy Classification

### Category A: True Defects (To be reported, resolved upon approval)
1. **Low contrast on secondary badges in dark mode**: Certain arbitrary Tailwind classes (e.g. `text-slate-400` over `bg-slate-800` in nested subcomponents) drop below 4.5:1 in non-tokenized areas.
2. **Interactive touch targets < 44px**: Small button variants (`sm`) in tertiary header pills or pagination controls measure `min-h-[38px]`. On touch devices (< 768px), these should expand to 44px minimum tap targets.
3. **Sticky banner stacking on ultra-compact mobile (375px)**: When multiple announcements or status toasts fire simultaneously above sticky navigation, content offset needs strict verification so primary question cards are never obscured.
4. **Non-semantic interactive elements**: Clickable `<div>`s with no keyboard access or role.
5. **Unverified or fabricated claims in marketing visuals** (see Section 6.3).

### Category B: Intentional Design Choices (Preserved as Specification)
1. **System Font Stack (No Web Fonts)**: Using `-apple-system, BlinkMacSystemFont, "Segoe UI"` is an intentional performance design to maintain 0 KB font payload and achieve instantaneous First Contentful Paint. A single self-hosted display font (via `next/font`) for marketing headings may be proposed, but needs approval and must be shown not to hurt LCP.
2. **Deep Navy Brand Identity (`#0B1536`)**: High-contrast, dark-navy theme headers and hero elements provide the institutional, authoritative aesthetic suitable for official examination preparation.
3. **Fullscreen Immersive Exam Shell (`/exam`)**: Deliberately suppresses `<BrandHeader>`, `<BrandFooter>`, and global chrome to reproduce authentic JAMB CBT test center lockdown conditions. **No decorative motion inside `/exam`.**
4. **Keyboard-First 8-Key Layout (A, B, C, D, P, N, S, R)**: Direct keyboard bindings emulate actual UTME terminal hardware for rapid candidate answering without mouse dependency.
5. **Conditional Suppression of Unverified Claims (Rule S6)**: Suppressing outcome sections until verified testimonial consent is stored in the database is an intentional regulatory and trust protection rule.

---

## 5. Motion Standards (Approved)

Motion is encouraged on public marketing pages and the student portal where it improves clarity, feedback or delight. It is a craft tool, not decoration for its own sake.

### 5.1 Approved motion patterns
- **Scroll-reveal**: sections and cards fade and rise 12-24px into place once, on first entry into view, with a short stagger (60-90ms between siblings).
- **Hover and press feedback**: cards lift 2-4px with a shadow change; buttons scale to 0.97 on press.
- **Ambient accents**: slow float or gentle drift on hero graphics only (one or two elements at most).
- **Illustrative animation**: SVG stroke-draw underlines, progress rings and bars that fill once, step-by-step diagrams such as the BrainLab Loop.
- **Number count-up**: only for verified, live values supplied by data. Never animate a hardcoded figure.
- **Page and state transitions**: tab changes, accordion open/close, drawer and modal in/out.

### 5.2 Rules
1. Animate **`transform` and `opacity` only**. Never animate `width`, `height`, `top`, `left` or other layout-affecting properties.
2. Use the duration and curve tokens in Section 2.3. Expressive (600ms) is for entrances only.
3. **Zero layout shift**: elements reserve their final space before animating (CLS 0).
4. **Reduced motion**: under `prefers-reduced-motion: reduce` every animation collapses to its end state with no movement. Content must never be hidden waiting for an animation, so initial hidden states apply only when JavaScript is running and motion is allowed.
5. No infinite or looping animation except the ambient accents in 5.1, which must be slow (8s or longer) and pause when the tab is hidden.
6. Motion never covers or delays access to primary actions. A CTA is clickable at first paint.
7. Nothing in `/exam`, timers, or question and answer areas animates for decoration.

### 5.3 Implementation
- CSS first: keyframes and transitions defined in `app/globals.css` under `bl-` prefixed classes (for example `bl-reveal`, `bl-float`, `bl-stagger-*`), reusing the existing `animate-bl-*` utilities where present.
- Scroll-reveal uses a single shared `IntersectionObserver` hook or component, so there is no per-section observer code.
- Interactive pieces are small client components. The page shell and static sections stay server components.

### 5.4 Libraries
No animation library (for example Framer Motion or GSAP) is added without approval. If one is proposed, it must come with the bundle-size cost and a measured justification.

---

## 6. Visual Craft Standards (Approved)

The target is a professional, world-class marketing presence in the spirit of Brilliant and Khan Academy: confident, human, clear. The aim is quality of craft, not copying their layouts.

### 6.1 Colour and rhythm
1. Marketing pages **alternate dark and light bands** to create rhythm. The hero may stay deep navy; supporting sections (Loop, audiences, pricing, FAQ) may use the light canvas.
2. **Tokens only**. No raw hex or arbitrary Tailwind palette colours (purple, amber, rose and so on) in components. Subject colour-coding must map to token-based accents.
3. **One accent per view**: brand coral is the single attention accent, used for the primary CTA and the countdown. Brand blue is for interaction. Avoid rainbow card sets.
4. The WhatsApp channel keeps `--bl-color-brand-channel`.

### 6.2 Cards, graphics and illustration
1. Cards use the shared `<Card>` and `<Badge>` components and the radii and elevation tokens.
2. Prefer purposeful graphics (real product UI, diagrams, subject illustrations in one consistent style) over decorative blurred blobs. Decorative backgrounds stay subtle and cheap to render (no stacked large blurs).
3. Images and graphics are optimised (`next/image` or inline SVG), with explicit dimensions and meaningful `alt` text.

### 6.3 Truth in visuals (Rule S7 extension)
1. Marketing visuals must not contain fabricated claims. This covers fake rankings, scores, user counts, testimonials, student names or avatars, dates and "verified" or "official" badges that are not backed by approved data.
2. Any illustrative mock (a sample question, a sample timer) is clearly labelled as a sample and carries no statistics.
3. All figures come from live data or approved content config (`HOMEPAGE_CONTENT_CONFIG` and its claim resolver). No hardcoded numbers.
4. No developer or placeholder copy is ever visible to users.

### 6.4 CTA hierarchy
One filled primary CTA per view. Secondary actions are outlined, and tertiary actions are text links. Exam promotion follows the configured priority (UTME/JAMB first, then Post-UTME, then WAEC/NECO and others).

### 6.5 Performance budget for visual upgrades
- LCP and CLS must not regress against the current production baseline, and any change that regresses them is revised before merge.
- Static sections remain server components. Only interactive islands are client components.
- Visual changes are verified on the four viewports in Section 1 (Playwright) and checked with axe-core before merge.
