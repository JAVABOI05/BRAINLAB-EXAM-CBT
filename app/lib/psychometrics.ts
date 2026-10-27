// BRAINLAB ACADEMY CBT - EMPIRICAL PSYCHOMETRIC DIFFICULTY ANALYTICS
// Reference: Section 14 Roadmap of Formal Difficulty Calculation Model
// "Future versions may incorporate empirical difficulty estimates derived from student performance data.
// Such estimates must be maintained separately from the existing Easy, Medium, and Hard question-bank classifications."

export type EmpiricalDifficultyBand = "easy" | "medium" | "hard";

export interface QuestionPsychometricRecord {
  question_id: string | number;
  subject: string;
  topic?: string | null;
  bank_classification: "easy" | "medium" | "hard";
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  facility_index: number; // p-value: 0.0 to 1.0 (proportion of correct responses)
  discrimination_index?: number; // D: -1.0 to +1.0 (discrimination between high & low performers)
  empirical_band: EmpiricalDifficultyBand;
  drift_detected: boolean; // True if empirical band diverges from static bank classification
  sample_size_confidence: "low" | "moderate" | "high"; // low < 20 attempts, mod 20-100, high > 100
  last_calibrated_at: string;
}

export interface SubjectPsychometricSummary {
  subject: string;
  total_questions_calibrated: number;
  average_facility_index: number;
  agreement_rate_percentage: number; // Percentage where bank classification matches empirical difficulty
  drifted_questions_count: number;
  distribution: {
    empirically_easy: number;
    empirically_medium: number;
    empirically_hard: number;
  };
}

/**
 * Calculates the classical psychometric Item Facility Index (p-value):
 * p = (Correct Responses) / (Total Attempts)
 *
 * Interpretation:
 * - p >= 0.70: Empirically Easy (70% or more candidates answered correctly)
 * - 0.35 <= p < 0.70: Empirically Medium (typical discrimination zone)
 * - p < 0.35: Empirically Hard (fewer than 35% answered correctly)
 */
export function calculateFacilityIndex(correctCount: number, totalAttempts: number): number {
  if (totalAttempts <= 0) return 0.5; // Neutral default
  const p = correctCount / totalAttempts;
  return Math.round(Math.min(1.0, Math.max(0.0, p)) * 1000) / 1000;
}

/**
 * Categorises a question into an empirical difficulty band from its p-value.
 */
export function deriveEmpiricalBand(facilityIndex: number): EmpiricalDifficultyBand {
  if (facilityIndex >= 0.7) return "easy";
  if (facilityIndex < 0.35) return "hard";
  return "medium";
}

/**
 * Determines sample size statistical reliability:
 * - < 20 attempts: Low confidence (preliminary pilot)
 * - 20 - 99 attempts: Moderate confidence
 * - 100+ attempts: High confidence (statistically reliable)
 */
export function evaluateSampleSizeConfidence(attempts: number): "low" | "moderate" | "high" {
  if (attempts >= 100) return "high";
  if (attempts >= 20) return "moderate";
  return "low";
}

/**
 * Builds a complete psychometric record for an item, keeping empirical estimates
 * strictly decoupled from the bank classification.
 */
export function computeItemPsychometrics(params: {
  questionId: string | number;
  subject: string;
  topic?: string | null;
  bankClassification: "easy" | "medium" | "hard";
  totalAttempts: number;
  correctAttempts: number;
  highScorersCorrect?: number; // Upper 27% cohort correct count
  lowScorersCorrect?: number; // Lower 27% cohort correct count
  cohortSampleSize?: number; // Size of upper/lower 27% cohort
}): QuestionPsychometricRecord {
  const {
    questionId,
    subject,
    topic,
    bankClassification,
    totalAttempts,
    correctAttempts,
    highScorersCorrect,
    lowScorersCorrect,
    cohortSampleSize,
  } = params;

  const facilityIndex = calculateFacilityIndex(correctAttempts, totalAttempts);
  const empiricalBand = deriveEmpiricalBand(facilityIndex);
  const confidence = evaluateSampleSizeConfidence(totalAttempts);

  // Compute Discrimination Index (D = (R_u - R_l) / N_cohort) if cohort data provided
  let discriminationIndex: number | undefined;
  if (
    cohortSampleSize &&
    cohortSampleSize > 0 &&
    highScorersCorrect !== undefined &&
    lowScorersCorrect !== undefined
  ) {
    const d = (highScorersCorrect - lowScorersCorrect) / cohortSampleSize;
    discriminationIndex = Math.round(Math.min(1.0, Math.max(-1.0, d)) * 100) / 100;
  }

  // Detect difficulty drift (empirical divergence from author classification)
  // Drift is flagged only if sample size has at least moderate confidence (>= 20 attempts)
  const isDrift = confidence !== "low" && empiricalBand !== bankClassification;

  return {
    question_id: questionId,
    subject,
    topic: topic || null,
    bank_classification: bankClassification,
    total_attempts: totalAttempts,
    correct_attempts: correctAttempts,
    incorrect_attempts: Math.max(0, totalAttempts - correctAttempts),
    facility_index: facilityIndex,
    discrimination_index: discriminationIndex,
    empirical_band: empiricalBand,
    drift_detected: isDrift,
    sample_size_confidence: confidence,
    last_calibrated_at: new Date().toISOString(),
  };
}

/**
 * Generates aggregated psychometric summary for a subject or topic.
 */
export function summarizeSubjectPsychometrics(
  records: QuestionPsychometricRecord[]
): SubjectPsychometricSummary {
  if (records.length === 0) {
    return {
      subject: "Unknown",
      total_questions_calibrated: 0,
      average_facility_index: 0.5,
      agreement_rate_percentage: 100,
      drifted_questions_count: 0,
      distribution: { empirically_easy: 0, empirically_medium: 0, empirically_hard: 0 },
    };
  }

  const subject = records[0].subject || "General";
  let totalFacility = 0;
  let matches = 0;
  let drifts = 0;
  const dist = { empirically_easy: 0, empirically_medium: 0, empirically_hard: 0 };

  for (const r of records) {
    totalFacility += r.facility_index;
    if (r.empirical_band === "easy") dist.empirically_easy++;
    else if (r.empirical_band === "hard") dist.empirically_hard++;
    else dist.empirically_medium++;

    if (r.empirical_band === r.bank_classification) {
      matches++;
    }
    if (r.drift_detected) {
      drifts++;
    }
  }

  return {
    subject,
    total_questions_calibrated: records.length,
    average_facility_index: Math.round((totalFacility / records.length) * 1000) / 1000,
    agreement_rate_percentage: Math.round((matches / records.length) * 100),
    drifted_questions_count: drifts,
    distribution: dist,
  };
}
