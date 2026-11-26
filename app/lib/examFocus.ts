/**
 * BrainLab Academy: Seasonal Examination Focus Engine
 * Directive Section 6: Examination Priorities & Seasonal Focus Control
 * 
 * Provides dynamic examination hierarchy and seasonal focus presets
 * configurable by Super Admin without code changes or redeployment.
 */

import { getPlatformConfig } from "./platformConfig";

export type ExamCategoryKey = "UTME" | "POST_UTME" | "WAEC" | "NECO" | "OTHER";

export interface ExamCategoryMeta {
  key: ExamCategoryKey;
  title: string;
  shortLabel: string;
  description: string;
  badge: string;
  href: string;
  color: string;
}

export const EXAM_CATEGORIES_REGISTRY: Record<ExamCategoryKey, ExamCategoryMeta> = {
  UTME: {
    key: "UTME",
    title: "JAMB UTME Accelerator",
    shortLabel: "JAMB / UTME",
    description: "Official JAMB 400-mark blueprint CBT mock exams with standard past questions and 8-key navigation.",
    badge: "Primary Focus",
    href: "/products/cbt",
    color: "from-blue-600 to-indigo-700",
  },
  POST_UTME: {
    key: "POST_UTME",
    title: "University Post-UTME Screening Suite",
    shortLabel: "Post-UTME",
    description: "High-yield past questions and mock drills for UNILAG, UI, OAU, UNIBEN, ABU, FUTO and federal universities.",
    badge: "University Admission",
    href: "/products/cbt",
    color: "from-cyan-600 to-blue-700",
  },
  WAEC: {
    key: "WAEC",
    title: "WAEC SSCE Senior School Prep",
    shortLabel: "WAEC SSCE",
    description: "Full national senior secondary syllabus notes, objective drills, and essay theory questions.",
    badge: "Senior Secondary",
    href: "/learn",
    color: "from-emerald-600 to-teal-700",
  },
  NECO: {
    key: "NECO",
    title: "NECO National Senior Certificate",
    shortLabel: "NECO SSCE",
    description: "Comprehensive curriculum coverage and past examination revisions for June/July and Nov/Dec sittings.",
    badge: "National Certificate",
    href: "/learn",
    color: "from-amber-600 to-orange-700",
  },
  OTHER: {
    key: "OTHER",
    title: "Junior Secondary & Specialized Exams",
    shortLabel: "Other Examinations",
    description: "BECE Junior transitions, NABTEB technical, and Nursing School entrance screening banks.",
    badge: "Additional Prep",
    href: "/learn",
    color: "from-purple-600 to-violet-700",
  },
};

export interface ScheduledExamPreset {
  id: string;
  name: string;
  start_date: string; // ISO string
  end_date: string;   // ISO string
  priority_order: ExamCategoryKey[];
  banner_headline?: string;
  banner_message?: string;
}

export interface SeasonalExamFocusConfig {
  active_mode: "automatic_schedule" | "manual_override";
  manual_priority_order: ExamCategoryKey[];
  scheduled_presets: ScheduledExamPreset[];
  last_updated_at?: string;
  last_updated_by?: string;
}

export const DEFAULT_SEASONAL_FOCUS_CONFIG: SeasonalExamFocusConfig = {
  active_mode: "automatic_schedule",
  // Default hierarchy in strict compliance with Directive Section 6:
  // 1. UTME/JAMB -> 2. Post-UTME -> 3. WAEC -> 4. NECO -> 5. Other
  manual_priority_order: ["UTME", "POST_UTME", "WAEC", "NECO", "OTHER"],
  scheduled_presets: [
    {
      id: "utme_season",
      name: "UTME / JAMB Intensive Sprint",
      start_date: "2026-11-01T00:00:00Z",
      end_date: "2027-04-30T23:59:59Z",
      priority_order: ["UTME", "POST_UTME", "WAEC", "NECO", "OTHER"],
      banner_headline: "⚡ 2027 JAMB UTME Accelerated Readiness Sprint",
      banner_message: "Complete 4-subject CBT mocks, real 8-key timing, and step-by-step topic mastery.",
    },
    {
      id: "post_utme_season",
      name: "Post-UTME University Screening Season",
      start_date: "2027-05-01T00:00:00Z",
      end_date: "2027-08-31T23:59:59Z",
      priority_order: ["POST_UTME", "UTME", "WAEC", "NECO", "OTHER"],
      banner_headline: "🏛️ Federal & State University Post-UTME Screening",
      banner_message: "Practice institutional screening questions for UNILAG, UI, OAU, UNIBEN, and top universities.",
    },
    {
      id: "waec_neco_season",
      name: "WAEC & NECO Senior School Season",
      start_date: "2027-09-01T00:00:00Z",
      end_date: "2027-10-31T23:59:59Z",
      priority_order: ["WAEC", "NECO", "UTME", "POST_UTME", "OTHER"],
      banner_headline: "📚 National Senior School Certificate Examinations",
      banner_message: "Complete WAEC and NECO syllabus notes, past questions, and formula sheets.",
    },
  ],
};

/**
 * Resolves the active ordered examination categories based on current timestamp
 * and Super Admin configuration.
 */
export async function getEffectiveExamFocus(): Promise<{
  categories: ExamCategoryMeta[];
  activePreset: ScheduledExamPreset | null;
  mode: "automatic_schedule" | "manual_override";
}> {
  const config = await getPlatformConfig<SeasonalExamFocusConfig>(
    "seasonal_exam_focus",
    DEFAULT_SEASONAL_FOCUS_CONFIG
  );

  const nowIso = new Date().toISOString();
  let activeOrder = config.manual_priority_order || DEFAULT_SEASONAL_FOCUS_CONFIG.manual_priority_order;
  let matchingPreset: ScheduledExamPreset | null = null;

  if (config.active_mode === "automatic_schedule" && Array.isArray(config.scheduled_presets)) {
    const matched = config.scheduled_presets.find(
      (p) => p.start_date <= nowIso && p.end_date >= nowIso
    );
    if (matched && Array.isArray(matched.priority_order) && matched.priority_order.length > 0) {
      activeOrder = matched.priority_order;
      matchingPreset = matched;
    }
  }

  // Ensure all categories are present even if omitted in a custom preset
  const allKeys: ExamCategoryKey[] = ["UTME", "POST_UTME", "WAEC", "NECO", "OTHER"];
  const finalKeys = [
    ...activeOrder,
    ...allKeys.filter((k) => !activeOrder.includes(k)),
  ];

  const categories = finalKeys.map((key) => EXAM_CATEGORIES_REGISTRY[key] || EXAM_CATEGORIES_REGISTRY.OTHER);

  return {
    categories,
    activePreset: matchingPreset,
    mode: config.active_mode,
  };
}
