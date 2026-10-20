/**
 * BrainLab AI Text Sanitizer
 * Strips raw markdown syntax (#, *, **, backticks) and limits length
 * to ensure clean, readable, pedagogical plain text for students.
 */

/**
 * Repairs double-encoded UTF-8 strings (mojibake) commonly introduced by
 * Windows-1252 / CP1252 imports into UTF-8 columns.
 */
export function repairMojibake(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/â€"/g, "—")
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\x9d/g, '"')
    .replace(/â€\x9c/g, '"')
    .replace(/â€¢/g, "•")
    .replace(/â€¦/g, "…")
    .replace(/ï¿½/g, "—");
}

export function cleanAIResponse(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  const repaired = repairMojibake(raw);

  return (
    repaired
      // Replace arithmetic multiplication * with proper multiplication symbol ×
      .replace(/\s\*\s/g, " × ")
      // Remove markdown heading hashes: e.g. # Title, ## Subtitle, ### Header
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold-italic asterisks: ***text*** -> text
      .replace(/\*{3}([^*]+)\*{3}/g, "$1")
      // Remove bold asterisks: **text** -> text
      .replace(/\*{2}([^*]+)\*{2}/g, "$1")
      // Remove italic asterisks: *text* -> text
      .replace(/\*([^*\n]+)\*/g, "$1")
      // Convert list bullet asterisks: * item -> • item
      .replace(/^\s*\*\s+/gm, "• ")
      // Strip any remaining stray asterisks
      .replace(/\*/g, "")
      // Strip any remaining markdown heading/hash marks
      .replace(/#/g, "")
      // Strip code fences and inline backticks
      .replace(/```[a-zA-Z]*\n?/g, "")
      .replace(/`/g, "")
      // Normalize excessive line breaks (max 2 consecutive newlines)
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Maximum character limits for candidate inputs to prevent token abuse,
 * excessive prompt injection, or huge cost spikes.
 */
export const MAX_CANDIDATE_INPUT_CHARS = 300;
export const MAX_AI_OUTPUT_TOKENS = 350;

/**
 * Strips trailing source-metadata tags like "— Set 16", "– Set 7", or "- Set 24"
 * from question stems, while strictly preserving legitimate math/science set terminology
 * (e.g., "The empty set is...", "given the set of integers").
 * Also repairs any double-encoded UTF-8 artifacts.
 */
export function cleanQuestionText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const repaired = repairMojibake(raw);
  return repaired.replace(/\s*[–—\-]\s*Set\s*\d+\s*$/i, "").trim();
}

/**
 * Removes generic distractor-elimination boilerplate from original answer key notes,
 * keeping only genuine pedagogical explanations.
 */
export function cleanAnswerKeyNote(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const repaired = repairMojibake(raw);
  return repaired
    .replace(/\s*This harder rebuild expects careful elimination of distractors before calculation or recall\.?/gi, "")
    .replace(/\s*Advanced JAMB-standard note: treat close options carefully, check formula setup, and eliminate distractors that fail on valency, mechanism, trend, or stoichiometric ratio\.?/gi, "")
    .trim();
}
