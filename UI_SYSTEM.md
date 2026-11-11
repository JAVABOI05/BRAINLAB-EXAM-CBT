# BrainLab Academy: UI System Rules & Baseline Tokens

This document serves as the **authoritative source of truth** for all frontend styling, component reuse, responsive behaviour, accessibility standards, and visual review protocols across BrainLab Academy.

---

## 1. Core Principles & Source of Truth

1. **Source of Truth**: The existing BrainLab design system is the reference.
   - Core token references: [`app/globals.css`](file:///C:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/globals.css), [`app/lib/tokens.ts`](file:///C:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/lib/tokens.ts), [`app/dashboard/dashboard-dark.css`](file:///C:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/dashboard/dashboard-dark.css), and [`app/exam/exam.css`](file:///C:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/exam/exam.css).
   - Never invent or substitute colors, aliases, or spacing values.
   - Existing design is a reference, not permission to copy defects.
2. **Responsive Matrix**:
   - Primary test viewports: **375px** (compact mobile), **390px** (modern mobile), **768px** (tablet), and **1440px** (desktop).
   - **Mobile is the primary target**. Zero horizontal overflow (`overflow-x: clip` on `html` and `body`). No fixed-pixel widths on responsive containers.
   - Touch targets must be at least **44x44px** where practicable.
   - Timers, sticky bars, and banners must never cover question text or answer options.
3. **Accessibility (WCAG 2.1 AA)**:
   - Text contrast at least **4.5:1** for standard text, **3:1** for large text/headings and icons.
   - Visible keyboard focus ring (`bl-focus-ring`: `outline: 2px solid var(--bl-color-brand-primary); outline-offset: 2px`) on every interactive element.
   - Semantic headings (`<h1>`-`<h6>`) and landmarks (`<main id="main">`, `<header>`, `<footer>`, `<nav>`), labels on icon-only buttons (`aria-label`), native form elements.
   - Strict `prefers-reduced-motion: reduce` compliance (animation/transition duration neutralized to 0.01ms).
4. **Component Reuse**:
   - Always reuse existing shared components from `app/components/ui/` and `app/components/`.
   - Do not introduce external component libraries or styling frameworks without approval.
   - Preserve existing dark/light mode behavior (`data-theme="dark"` / `.dark`).
5. **Scope & Protection**:
   - In UI-polish turns, do NOT touch authentication, payment handling, access gating, or database queries.
   - The approved access-model work (see directive) is the exception: its required removals/changes (upgrade banners, subscription screens, plan gating) are in scope and override rules about retaining existing UI.
   - Otherwise, do NOT delete or hide existing flows to make a layout fit.
   - Do NOT redesign working layouts simply because they differ from external conventions. Separate true defects from intentional design choices.

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

### Category B: Intentional Design Choices (Preserved as Specification)
1. **System Font Stack (No Web Fonts)**: Using `-apple-system, BlinkMacSystemFont, "Segoe UI"` is an intentional performance design to maintain 0 KB font payload and achieve instantaneous First Contentful Paint.
2. **Deep Navy Brand Identity (`#0B1536`)**: High-contrast, dark-navy theme headers and hero elements provide the institutional, authoritative aesthetic suitable for official examination preparation.
3. **Fullscreen Immersive Exam Shell (`/exam`)**: Deliberately suppresses `<BrandHeader>`, `<BrandFooter>`, and global chrome to reproduce authentic JAMB CBT test center lockdown conditions.
4. **Keyboard-First 8-Key Layout (A, B, C, D, P, N, S, R)**: Direct keyboard bindings emulate actual UTME terminal hardware for rapid candidate answering without mouse dependency.
5. **Conditional Suppression of Unverified Claims (Rule S6)**: Suppressing outcome sections until verified testimonial consent is stored in the database is an intentional regulatory and trust protection rule.
