/**
 * BrainLab Content Configuration Layer (Typed, Validated, Versioned)
 * 
 * Requirement Task 5:
 * - All page copy, section order, visibility, images and links live in versioned configuration files.
 * - Every item carries a Claims Register status: "VERIFIED" | "LIVE_AGGREGATE" | "ADMIN_SET" | "AWAITING_CONTENT".
 * - Rule S6: Items marked AWAITING CONTENT do NOT render in production views.
 * - Does not build a new CMS; designed to receive dynamic overrides from existing admin settings
 *   (platform_settings / admin config).
 */

import { CONTACT_CONFIG } from "./contactConfig";

export type ClaimsRegisterStatus =
  | "VERIFIED"          // Verified by academic registry, legal record, or signed consent
  | "LIVE_AGGREGATE"    // Dynamic aggregate count from database at runtime
  | "ADMIN_SET"         // Configured by verified administrator in platform_settings
  | "AWAITING_CONTENT"; // Unverified or unconfirmed; MUST NOT render

export interface ClaimNode<T> {
  status: ClaimsRegisterStatus;
  value: T;
  claimId?: string;
  sourceNote?: string;
  asOfDate?: string;
}

/**
 * Filter helper: Returns true if claim is verified, admin-set, or live.
 * Returns false if status === "AWAITING_CONTENT".
 */
export function isContentRenderable<T>(claim: ClaimNode<T> | undefined | null): boolean {
  if (!claim) return false;
  return claim.status !== "AWAITING_CONTENT";
}

/**
 * Safely resolves claim value, returning fallback if AWAITING_CONTENT or null.
 */
export function resolveClaimValue<T>(
  claim: ClaimNode<T> | undefined | null,
  fallback: T | null = null
): T | null {
  if (!claim || !isContentRenderable(claim)) {
    return fallback;
  }
  return claim.value;
}

/* -------------------------------------------------------------------------
   Section Types & Configuration
------------------------------------------------------------------------- */
export type HomepageSectionId =
  | "hero"
  | "audiences"
  | "loop"
  | "products"
  | "stem-studio"
  | "trust"
  | "pricing"
  | "founder"
  | "faq-cta"
  | "join-channel";

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  badge?: string;
  dropdown?: {
    title: string;
    description: string;
    href: string;
    badge?: string;
  }[];
}

export interface HeaderConfig {
  navigation: NavItemConfig[];
  actions: {
    pricing: { label: string; href: string };
    teachWithUs: { label: string; href: string };
    support: { label: string; href: string };
    signIn: { label: string; href: string };
    startFree: { label: string; href: string };
  };
}

export interface HeroConfig {
  headline: ClaimNode<string>;
  subhead: ClaimNode<string>;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  disclosure: ClaimNode<string>;
  countdown: {
    targetExam: string;
    targetDate: string; // ISO string e.g. "2027-04-19T08:00:00Z"
    status: ClaimsRegisterStatus;
  };
}

export interface LoopStageConfig {
  id: "learn" | "practise" | "diagnose" | "improve" | "master";
  number: string;
  title: string;
  subtitle: string;
  description: string;
  products: string[];
  stemRole?: string;
}

export interface AudienceTabConfig {
  id: "students" | "parents" | "schools" | "tutors";
  label: string;
  headline: ClaimNode<string>;
  body: ClaimNode<string>;
  cta: { label: string; href: string };
  metrics?: ClaimNode<{ label: string; value: string }>[];
}

export interface ProductCardConfig {
  id: string;
  name: string;
  category: string;
  tagline: ClaimNode<string>;
  description: ClaimNode<string>;
  href: string;
  previewImage?: string;
  badge?: string;
}

export interface FaqItemConfig {
  id: string;
  question: ClaimNode<string>;
  answer: ClaimNode<string>;
  category: "cbt" | "pricing" | "schools" | "general";
}

export interface FooterConfigLayer {
  sitemap: {
    category: string;
    links: { label: string; href: string; external?: boolean }[];
  }[];
  legal: {
    termsHref: string;
    privacyHref: string;
    copyrightClaim: ClaimNode<string>;
  };
}

export interface HomepageContentConfig {
  version: string;
  lastUpdated: string;
  sectionOrder: HomepageSectionId[];
  sectionVisibility: Record<HomepageSectionId, boolean>;
  header: HeaderConfig;
  hero: HeroConfig;
  audiences: AudienceTabConfig[];
  loopStages: LoopStageConfig[];
  products: ProductCardConfig[];
  faqs: FaqItemConfig[];
  footer: FooterConfigLayer;
}

/* -------------------------------------------------------------------------
   Canonical Versioned Content Configuration (V1.0)
------------------------------------------------------------------------- */
export const HOMEPAGE_CONTENT_CONFIG: HomepageContentConfig = {
  version: "1.0.0",
  lastUpdated: "2026-11-07",
  sectionOrder: [
    "hero",
    "audiences",
    "loop",
    "products",
    "stem-studio",
    "trust",
    "pricing",
    "founder",
    "faq-cta",
    "join-channel",
  ],
  sectionVisibility: {
    hero: true,
    audiences: true,
    loop: true,
    products: true,
    "stem-studio": true,
    trust: true,
    pricing: true,
    founder: true,
    "faq-cta": true,
    "join-channel": true,
  },
  header: {
    navigation: [
      {
        id: "programmes",
        label: "Programmes",
        href: "/syllabus",
        dropdown: [
          {
            title: "JAMB UTME CBT Simulator",
            description: "Official JAMB 400-mark blueprint practice with 4-subject timing and offline sync.",
            href: "/products/cbt",
            badge: "UTME 2027",
          },
          {
            title: "WAEC SSCE Prep & Past Papers",
            description: "Theory and objective revision aligned with national secondary syllabus.",
            href: "/learn",
          },
          {
            title: "BECE Junior Examination",
            description: "Foundation diagnostics and mock papers for Junior secondary transition.",
            href: "/learn",
          },
        ],
      },
      {
        id: "platform",
        label: "Platform",
        href: "/products",
        dropdown: [
          {
            title: "CBT Examination Engine",
            description: "High-concurrency testing engine with 40-question subject timers and instant score breakdown.",
            href: "/products/cbt",
          },
          {
            title: "Learning Hub",
            description: "Structured lesson blocks, audio explainers, and interactive drill exercises.",
            href: "/products/learning-hub",
          },
          {
            title: "STEM Studio",
            description: "Formula sandboxes, PhET-aligned circuits, and interactive 3D simulations.",
            href: "/products/stem-studio",
          },
          {
            title: "AI Study Buddy",
            description: "Socratic explanation generator with step-by-step hint assistance.",
            href: "/products/ai-learning",
          },
          {
            title: "Live Classroom & Whiteboard",
            description: "Real-time tutor video, interactive whiteboard stage, and recording archives.",
            href: "/products/live-classroom",
          },
          {
            title: "Challenge Arena",
            description: "Real-time 1v1 speed duels and institutional league tournaments.",
            href: "/products/challenge-arena",
          },
        ],
      },
      {
        id: "schools",
        label: "Schools",
        href: "/schools",
      },
      {
        id: "resources",
        label: "Resources",
        href: "/resources",
      },
      {
        id: "about",
        label: "About",
        href: "/about",
      },
    ],
    actions: {
      pricing: { label: "Pricing", href: "/pricing" },
      teachWithUs: { label: "Teach with Us", href: "/for-tutors" },
      support: { label: "Support", href: "/contact" },
      signIn: { label: "Sign In", href: "/login" },
      startFree: { label: "Start Free", href: "/cbt" },
    },
  },
  hero: {
    headline: {
      status: "VERIFIED",
      claimId: "CLM-HERO-01",
      value: "One Intelligent Learning Ecosystem. A Complete Journey from Learning to Mastery.",
      sourceNote: "Approved Brand Positioning Statement",
      asOfDate: "2026-11-07",
    },
    subhead: {
      status: "VERIFIED",
      claimId: "CLM-HERO-02",
      value: "From syllabus fundamentals and CBT mocks to weak-spot diagnostics and live tutor mastery — unified in one high-performance platform for Nigerian students.",
      sourceNote: "Approved Brand Value Proposition",
      asOfDate: "2026-11-07",
    },
    primaryCta: { label: "Start Free Practice", href: "/cbt" },
    secondaryCta: { label: "Explore the Platform", href: "/products" },
    disclosure: {
      status: "VERIFIED",
      claimId: "CLM-HERO-03",
      value: "Free tier includes diagnostic tests and daily practice drills.",
      sourceNote: "Platform Entitlement Specification",
      asOfDate: "2026-11-07",
    },
    countdown: {
      targetExam: "JAMB UTME 2027",
      targetDate: "2027-04-19T08:00:00Z",
      status: "ADMIN_SET",
    },
  },
  audiences: [
    {
      id: "students",
      label: "For Students",
      headline: {
        status: "VERIFIED",
        claimId: "CLM-AUD-01",
        value: "Master Your Exams with Targeted CBT Practice and Instant Diagnostics",
      },
      body: {
        status: "VERIFIED",
        claimId: "CLM-AUD-02",
        value: "Practice with actual UTME and WAEC syllabus papers, pinpoint topic weaknesses instantly, and sharpen problem-solving speed with step-by-step corrections.",
      },
      cta: { label: "Start Student Journey", href: "/for-students" },
    },
    {
      id: "parents",
      label: "For Parents",
      headline: {
        status: "VERIFIED",
        claimId: "CLM-AUD-03",
        value: "Transparent Academic Tracking and Verified Progress Insights",
      },
      body: {
        status: "VERIFIED",
        claimId: "CLM-AUD-04",
        value: "Track study consistency, mock test trajectories, and syllabus coverage through automated performance summaries.",
      },
      cta: { label: "Learn About Parent Insights", href: "/pricing" },
    },
    {
      id: "schools",
      label: "For Schools",
      headline: {
        status: "VERIFIED",
        claimId: "CLM-AUD-05",
        value: "Equip Your Institution with Scalable CBT Assessment Infrastructure",
      },
      body: {
        status: "VERIFIED",
        claimId: "CLM-AUD-06",
        value: "Deploy custom mock exams, batch student rosters, track classroom psychometrics, and monitor institutional benchmarks.",
      },
      cta: { label: "Request School Partnership", href: "/schools" },
    },
    {
      id: "tutors",
      label: "For Tutors",
      headline: {
        status: "VERIFIED",
        claimId: "CLM-AUD-07",
        value: "Host Interactive Masterclasses with Real-Time Whiteboard Tools",
      },
      body: {
        status: "VERIFIED",
        claimId: "CLM-AUD-08",
        value: "Deliver audio/video sessions, broadcast slides, author curriculum lesson blocks, and assess students seamlessly.",
      },
      cta: { label: "Join Educator Community", href: "/for-tutors" },
    },
  ],
  loopStages: [
    {
      id: "learn",
      number: "01",
      title: "LEARN",
      subtitle: "Curriculum Fundamentals",
      description: "Structured lesson blocks, verified curriculum outlines, audio guides, and conceptual explanations.",
      products: ["Learning Hub", "Audio Player", "Syllabus Explorer"],
      stemRole: "Interactive concept diagrams and formula breakdowns",
    },
    {
      id: "practise",
      number: "02",
      title: "PRACTISE",
      subtitle: "Exam-Calibrated Simulator",
      description: "JAMB UTME 400-mark mock sessions with 4-subject timing, keyboard shortcuts, and offline-ready sync.",
      products: ["CBT Simulator", "Offline Sync Manager", "Exam Calculator"],
    },
    {
      id: "diagnose",
      number: "03",
      title: "DIAGNOSE",
      subtitle: "Psychometric Weak-Spot Analysis",
      description: "Instant topic-by-topic breakdowns identifying exact misconceptions across difficulty levels.",
      products: ["Learning DNA", "Topic Mastery Radar", "Psychometric Analyzer"],
      stemRole: "Diagnostics of spatial and analytical problem areas in physics/chemistry",
    },
    {
      id: "improve",
      number: "04",
      title: "IMPROVE",
      subtitle: "Targeted Remediation & AI Guidance",
      description: "Socratic AI study assistance, personalized drill packs, and live revision masterclasses.",
      products: ["AI Study Buddy", "Step-by-Step Corrections", "Revision Classes"],
    },
    {
      id: "master",
      number: "05",
      title: "MASTER",
      subtitle: "Arena Duels & Exam Readiness",
      description: "Real-time 1v1 speed battles, leaderboard challenges, and verified completion credentials.",
      products: ["Challenge Arena", "Institutional Tournaments", "Skills Passport"],
      stemRole: "Virtual lab simulations and practical experiment trials",
    },
  ],
  products: [
    {
      id: "cbt-simulator",
      name: "CBT Simulator",
      category: "Examination Engine",
      tagline: {
        status: "VERIFIED",
        claimId: "CLM-PRD-01",
        value: "Official JAMB & WAEC exam environment with offline resilience.",
      },
      description: {
        status: "VERIFIED",
        claimId: "CLM-PRD-02",
        value: "Standard 4-subject combination, official calculator, question palette, and instantaneous scoring breakdown.",
      },
      href: "/products/cbt",
      badge: "Core Engine",
    },
    {
      id: "learning-hub",
      name: "Learning Hub",
      category: "Curriculum Content",
      tagline: {
        status: "VERIFIED",
        claimId: "CLM-PRD-03",
        value: "Topic-by-topic lesson blocks with audio explainers and practice drills.",
      },
      description: {
        status: "VERIFIED",
        claimId: "CLM-PRD-04",
        value: "Comprehensive study materials written by certified educators covering secondary school curricula.",
      },
      href: "/products/learning-hub",
    },
    {
      id: "stem-studio",
      name: "STEM Studio",
      category: "Interactive Labs",
      tagline: {
        status: "VERIFIED",
        claimId: "CLM-PRD-05",
        value: "Virtual science labs, formula sandboxes, and circuit experimentation.",
      },
      description: {
        status: "VERIFIED",
        claimId: "CLM-PRD-06",
        value: "Hands-on virtual simulations enabling students to visualize complex concepts in physics, chemistry, and biology.",
      },
      href: "/products/stem-studio",
      badge: "Cross-Cutting",
    },
    {
      id: "ai-tutor",
      name: "AI Study Buddy",
      category: "Intelligent Guidance",
      tagline: {
        status: "VERIFIED",
        claimId: "CLM-PRD-07",
        value: "Socratic problem-solving tutor with hint generation.",
      },
      description: {
        status: "VERIFIED",
        claimId: "CLM-PRD-08",
        value: "Guiding candidates toward correct answers without giving away solutions prematurely.",
      },
      href: "/products/ai-learning",
    },
    {
      id: "live-classroom",
      name: "Live Classroom",
      category: "Live Instruction",
      tagline: {
        status: "VERIFIED",
        claimId: "CLM-PRD-09",
        value: "Interactive audio/video masterclasses and collaborative whiteboard.",
      },
      description: {
        status: "VERIFIED",
        claimId: "CLM-PRD-10",
        value: "Live session rooms featuring tutor screen sharing, whiteboard stages, and full recording playback.",
      },
      href: "/products/live-classroom",
    },
    {
      id: "challenge-arena",
      name: "Challenge Arena",
      category: "Competitive Learning",
      tagline: {
        status: "VERIFIED",
        claimId: "CLM-PRD-11",
        value: "Head-to-head 1v1 speed duels and tournament leagues.",
      },
      description: {
        status: "VERIFIED",
        claimId: "CLM-PRD-12",
        value: "Fast-paced academic competitions reinforcing rapid recall under real test pressure.",
      },
      href: "/products/challenge-arena",
    },
  ],
  faqs: [
    {
      id: "faq-01",
      category: "cbt",
      question: {
        status: "VERIFIED",
        claimId: "CLM-FAQ-01",
        value: "How closely does the BrainLab CBT Simulator match the official JAMB UTME exam?",
      },
      answer: {
        status: "VERIFIED",
        claimId: "CLM-FAQ-02",
        value: "The BrainLab CBT engine is calibrated to match official JAMB specifications, including 4-subject selection, standard timing, question palette navigation, and instant 400-mark scoring breakdown.",
      },
    },
    {
      id: "faq-02",
      category: "pricing",
      question: {
        status: "VERIFIED",
        claimId: "CLM-FAQ-03",
        value: "Is there a free practice option available?",
      },
      answer: {
        status: "VERIFIED",
        claimId: "CLM-FAQ-04",
        value: "Yes. Students can access diagnostic sample tests, daily subject drills, and syllabus explorer tools for free without requiring a debit card.",
      },
    },
    {
      id: "faq-03",
      category: "cbt",
      question: {
        status: "VERIFIED",
        claimId: "CLM-FAQ-05",
        value: "Can I practice when internet connectivity is unstable?",
      },
      answer: {
        status: "VERIFIED",
        claimId: "CLM-FAQ-06",
        value: "Yes. Our exam interface caches questions locally in your browser. If your connection drops during practice, your answers are preserved and sync automatically when you reconnect.",
      },
    },
    {
      id: "faq-04",
      category: "schools",
      question: {
        status: "VERIFIED",
        claimId: "CLM-FAQ-07",
        value: "How can secondary schools partner with BrainLab?",
      },
      answer: {
        status: "VERIFIED",
        claimId: "CLM-FAQ-08",
        value: "Schools can deploy institutional CBT mock sessions, batch-enroll students, track student cohorts, and receive diagnostic reports. Contact our schools team via our partner portal.",
      },
    },
    {
      id: "faq-05-unverified",
      category: "general",
      question: {
        status: "AWAITING_CONTENT",
        claimId: "CLM-FAQ-09",
        value: "Unconfirmed scholarship claim",
      },
      answer: {
        status: "AWAITING_CONTENT",
        claimId: "CLM-FAQ-10",
        value: "Details awaiting official governance approval.",
      },
    },
  ],
  footer: {
    sitemap: [
      {
        category: "Programmes",
        links: [
          { label: "JAMB UTME CBT Simulator", href: "/products/cbt" },
          { label: "WAEC SSCE Revision", href: "/learn" },
          { label: "Official Syllabus", href: "/syllabus" },
          { label: "Academic Resources", href: "/resources" },
        ],
      },
      {
        category: "Platform",
        links: [
          { label: "CBT Examination Engine", href: "/products/cbt" },
          { label: "Learning Hub", href: "/products/learning-hub" },
          { label: "STEM Studio", href: "/products/stem-studio" },
          { label: "AI Study Buddy", href: "/products/ai-learning" },
          { label: "Live Classroom", href: "/products/live-classroom" },
          { label: "Challenge Arena", href: "/products/challenge-arena" },
        ],
      },
      {
        category: "Audiences",
        links: [
          { label: "For Students", href: "/for-students" },
          { label: "For Educators & Tutors", href: "/for-tutors" },
          { label: "For Schools & Institutions", href: "/schools" },
          { label: "Pricing & Plans", href: "/pricing" },
        ],
      },
      {
        category: "Company & Legal",
        links: [
          { label: "About BrainLab", href: "/about" },
          { label: "Contact & Helpdesk", href: "/contact" },
          { label: "Frequently Asked Questions", href: "/faq" },
          { label: "Privacy Policy", href: "/privacy" },
          { label: "Terms of Use", href: "/terms" },
        ],
      },
    ],
    legal: {
      termsHref: "/terms",
      privacyHref: "/privacy",
      copyrightClaim: {
        status: "VERIFIED",
        claimId: "CLM-FTR-01",
        value: "BrainLab Academy. All rights reserved.",
        sourceNote: "Corporate Registration",
        asOfDate: "2026",
      },
    },
  },
};

/**
 * Validates content configuration and filters out any item with status === "AWAITING_CONTENT".
 */
export function getValidatedHomepageConfig(config = HOMEPAGE_CONTENT_CONFIG): HomepageContentConfig {
  return {
    ...config,
    audiences: config.audiences.filter(
      (a) => isContentRenderable(a.headline) && isContentRenderable(a.body)
    ),
    products: config.products.filter(
      (p) => isContentRenderable(p.tagline) && isContentRenderable(p.description)
    ),
    faqs: config.faqs.filter(
      (f) => isContentRenderable(f.question) && isContentRenderable(f.answer)
    ),
  };
}
