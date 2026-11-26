/**
 * universityCutoffs.ts
 * Shared source of truth for university cut-off scores.
 * Derived from HomeUniversityTargetSocialProof.tsx UNIVERSITIES array.
 * Scores are the minimum aggregate UTME score (out of 400) for merit consideration.
 *
 * Keep in sync with HomeUniversityTargetSocialProof.tsx whenever universities are added/changed.
 */

import { getInstitutionByName, getCourseByName } from "@/app/lib/nigerianInstitutions";

export interface UniversityCutoff {
  /** Short abbreviation used in UI (e.g. "UNILAG") */
  shortName: string;
  /** Full institution name */
  fullName: string;
  /** Minimum merit-consideration score out of 400 */
  cutoffScore: number;
  /** Display label shown to candidates (e.g. "290+ Target") */
  displayLabel: string;
  /** Specific course target if provided */
  courseName?: string;
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
export function resolveCutoffScore(dreamSchool: string, targetCourse?: string): UniversityCutoff | null {
  if (!dreamSchool) return null;
  const normalised = dreamSchool.trim().toLowerCase();

  let resolvedBase: UniversityCutoff | null = null;

  // 1. Direct slug match
  if (UNIVERSITY_CUTOFFS[normalised]) {
    resolvedBase = { ...UNIVERSITY_CUTOFFS[normalised] };
  } else {
    // 2. Short name or full name match (case-insensitive)
    for (const entry of Object.values(UNIVERSITY_CUTOFFS)) {
      if (
        entry.shortName.toLowerCase() === normalised ||
        entry.fullName.toLowerCase() === normalised
      ) {
        resolvedBase = { ...entry };
        break;
      }
    }

    // 3. Partial / contains match in top 9
    if (!resolvedBase) {
      for (const entry of Object.values(UNIVERSITY_CUTOFFS)) {
        if (
          normalised.includes(entry.shortName.toLowerCase()) ||
          normalised.includes(entry.fullName.toLowerCase()) ||
          entry.fullName.toLowerCase().includes(normalised) ||
          entry.shortName.toLowerCase().includes(normalised)
        ) {
          resolvedBase = { ...entry };
          break;
        }
      }
    }

    // 4. Dynamic match against full 500+ Nigerian tertiary institutions database
    if (!resolvedBase) {
      const foundInst = getInstitutionByName(dreamSchool);
      if (foundInst) {
        let baseCutoff = 200;
        if (foundInst.category === "Federal") {
          baseCutoff = foundInst.type === "university" ? 220 : 150;
        } else if (foundInst.category === "State") {
          baseCutoff = foundInst.type === "university" ? 190 : 140;
        } else {
          baseCutoff = foundInst.type === "university" ? 170 : 130;
        }

        resolvedBase = {
          shortName: foundInst.acronym || foundInst.name.split(" ")[0],
          fullName: foundInst.name,
          cutoffScore: baseCutoff,
          displayLabel: `${baseCutoff}+ Target`,
        };
      }
    }
  }

  if (!resolvedBase) return null;

  // If a specific course is provided, calibrate the merit cutoff for high-demand programmes
  if (targetCourse && targetCourse.trim()) {
    const courseObj = getCourseByName(targetCourse);
    let courseCutoff = resolvedBase.cutoffScore;

    if (courseObj) {
      courseCutoff = Math.max(courseCutoff, courseObj.typicalCutoff);
    } else {
      const cLower = targetCourse.toLowerCase();
      if (cLower.includes("medicine") || cLower.includes("surgery")) {
        courseCutoff = Math.max(courseCutoff, 285);
      } else if (cLower.includes("law") || cLower.includes("pharmacy") || cLower.includes("nursing")) {
        courseCutoff = Math.max(courseCutoff, 260);
      } else if (cLower.includes("computer") || cLower.includes("engineering") || cLower.includes("software")) {
        courseCutoff = Math.max(courseCutoff, 240);
      }
    }

    resolvedBase.cutoffScore = courseCutoff;
    resolvedBase.displayLabel = `${courseCutoff}+ Target`;
    resolvedBase.courseName = courseObj?.name || targetCourse.trim();
  }

  return resolvedBase;
}
