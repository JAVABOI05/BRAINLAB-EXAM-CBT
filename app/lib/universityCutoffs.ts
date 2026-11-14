/**
 * universityCutoffs.ts
 * Shared source of truth for university cut-off scores.
 * Derived from HomeUniversityTargetSocialProof.tsx UNIVERSITIES array.
 * Scores are the minimum aggregate UTME score (out of 400) for merit consideration.
 *
 * Keep in sync with HomeUniversityTargetSocialProof.tsx whenever universities are added/changed.
 */

export interface UniversityCutoff {
  /** Short abbreviation used in UI (e.g. "UNILAG") */
  shortName: string;
  /** Full institution name */
  fullName: string;
  /** Minimum merit-consideration score out of 400 */
  cutoffScore: number;
  /** Display label shown to candidates (e.g. "290+ Target") */
  displayLabel: string;
}

/**
 * Map keyed by the university `id` field (lowercase slug).
 * This is the canonical cut-off registry for the BrainLab Margin Engine.
 */
export const UNIVERSITY_CUTOFFS: Record<string, UniversityCutoff> = {
  unilag: {
    shortName: "UNILAG",
    fullName: "University of Lagos",
    cutoffScore: 290,
    displayLabel: "290+ Target",
  },
  ui: {
    shortName: "UI",
    fullName: "University of Ibadan",
    cutoffScore: 285,
    displayLabel: "285+ Target",
  },
  oau: {
    shortName: "OAU",
    fullName: "Obafemi Awolowo University",
    cutoffScore: 280,
    displayLabel: "280+ Target",
  },
  unn: {
    shortName: "UNN",
    fullName: "University of Nigeria, Nsukka",
    cutoffScore: 285,
    displayLabel: "285+ Target",
  },
  abu: {
    shortName: "ABU",
    fullName: "Ahmadu Bello University",
    cutoffScore: 270,
    displayLabel: "270+ Target",
  },
  uniben: {
    shortName: "UNIBEN",
    fullName: "University of Benin",
    cutoffScore: 275,
    displayLabel: "275+ Target",
  },
  unilorin: {
    shortName: "UNILORIN",
    fullName: "University of Ilorin",
    cutoffScore: 280,
    displayLabel: "280+ Target",
  },
  futa: {
    shortName: "FUTA",
    fullName: "Fed. University of Technology Akure",
    cutoffScore: 270,
    displayLabel: "270+ Target",
  },
  covenant: {
    shortName: "COVENANT",
    fullName: "Covenant University",
    cutoffScore: 280,
    displayLabel: "280+ Target",
  },
};

/**
 * Resolve a dream school name (from user metadata) to a numeric cutoff.
 *
 * Accepts:
 *  - An `id` slug (e.g. "unilag")
 *  - A short name (e.g. "UNILAG")
 *  - A full name (e.g. "University of Lagos")
 *
 * Returns `null` if the school is not found in the registry.
 */
export function resolveCutoffScore(dreamSchool: string): UniversityCutoff | null {
  if (!dreamSchool) return null;
  const normalised = dreamSchool.trim().toLowerCase();

  // 1. Direct slug match
  if (UNIVERSITY_CUTOFFS[normalised]) {
    return UNIVERSITY_CUTOFFS[normalised];
  }

  // 2. Short name or full name match (case-insensitive)
  for (const entry of Object.values(UNIVERSITY_CUTOFFS)) {
    if (
      entry.shortName.toLowerCase() === normalised ||
      entry.fullName.toLowerCase() === normalised
    ) {
      return entry;
    }
  }

  // 3. Partial / contains match (best-effort for wizard-stored strings like
  //    "University of Lagos (UNILAG)")
  for (const entry of Object.values(UNIVERSITY_CUTOFFS)) {
    if (
      normalised.includes(entry.shortName.toLowerCase()) ||
      normalised.includes(entry.fullName.toLowerCase()) ||
      entry.fullName.toLowerCase().includes(normalised) ||
      entry.shortName.toLowerCase().includes(normalised)
    ) {
      return entry;
    }
  }

  return null;
}
