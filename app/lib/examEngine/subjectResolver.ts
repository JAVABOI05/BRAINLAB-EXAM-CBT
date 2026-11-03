// BrainLab CBT Master Subject Combination Resolver
// Authoritatively enforces authentic JAMB UTME subject rules:
// 1. English Language is always compulsory Slot 1 (60 questions).
// 2. Slots 2, 3, and 4 are 3 distinct academic electives (40 questions each).
// 3. Exam preset labels (e.g., "UTME Standard", "Speed Mock") are strictly filtered out and never treated as subjects.
// 4. Biological / Medical candidates (selecting Biology) are provided with Chemistry and Physics (Chemistry is never omitted, Math is not forced).
// 5. Engineering / Physical Science candidates (selecting Mathematics) are provided with Physics and Chemistry.

export const NON_ACADEMIC_SUBJECT_PRESETS = new Set([
  "utme standard",
  "utme standard mock",
  "utme_4_subjects",
  "utme_standard",
  "utme standard drill",
  "utme mock",
  "utme",
  "speed mock",
  "speed_sprint",
  "specialist drill",
  "open-cbt",
  "mock",
  "standard mock",
  "mock exam",
  "cbt",
  "cbt drill",
  "general",
  "all subjects",
  "default",
]);

export const CANONICAL_SUBJECT_NAMES: Record<string, string> = {
  english: "English",
  "english language": "English",
  mathematics: "Mathematics",
  maths: "Mathematics",
  math: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  government: "Government",
  "literature in english": "Literature in English",
  literature: "Literature in English",
  economics: "Economics",
  commerce: "Commerce",
  "christian religious studies": "Christian Religious Studies",
  crs: "Christian Religious Studies",
  crk: "Christian Religious Studies",
};

export function isAcademicSubject(name?: string | null): boolean {
  if (!name || typeof name !== "string") return false;
  const clean = name.trim().toLowerCase();
  if (!clean || clean.length < 2) return false;
  if (NON_ACADEMIC_SUBJECT_PRESETS.has(clean)) return false;
  return true;
}

export function normalizeSubjectName(name: string): string {
  const clean = String(name || "").trim();
  const lower = clean.toLowerCase();
  if (CANONICAL_SUBJECT_NAMES[lower]) {
    return CANONICAL_SUBJECT_NAMES[lower];
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function resolveUtme4Subjects(options: {
  candidateSubjects?: (string | null | undefined)[];
  primaryElective?: string | null;
  preconfiguredSubject?: string | null;
}): string[] {
  const { candidateSubjects, primaryElective, preconfiguredSubject } = options;

  // 1. Collect candidate electives
  const rawPool: string[] = [];

  if (Array.isArray(candidateSubjects)) {
    for (const s of candidateSubjects) {
      if (s && typeof s === "string" && isAcademicSubject(s)) {
        rawPool.push(normalizeSubjectName(s));
      }
    }
  }

  // If candidate explicitly provided an elective or single subject
  if (primaryElective && isAcademicSubject(primaryElective)) {
    rawPool.push(normalizeSubjectName(primaryElective));
  }

  // Preconfigured subject from voucher/PIN if it's an actual academic subject
  if (preconfiguredSubject && isAcademicSubject(preconfiguredSubject)) {
    rawPool.push(normalizeSubjectName(preconfiguredSubject));
  }

  // 2. Filter out English from electives (Slot 1 is always English)
  const electives: string[] = [];
  for (const s of rawPool) {
    if (s.toLowerCase() === "english" || s.toLowerCase() === "english language") {
      continue;
    }
    if (!electives.includes(s)) {
      electives.push(s);
    }
  }

  // 3. Check for specific department track if fewer than 3 electives provided
  const hasBiology = electives.some((s) => s.toLowerCase() === "biology");
  const hasMath = electives.some((s) => s.toLowerCase() === "mathematics");
  const hasLitOrGov = electives.some((s) =>
    ["literature in english", "government", "christian religious studies"].includes(s.toLowerCase())
  );
  const hasEconOrComm = electives.some((s) =>
    ["economics", "commerce"].includes(s.toLowerCase())
  );

  let fillerOrder: string[];
  if (hasBiology && !hasMath) {
    // Medical / Biological Sciences track:
    // MUST contain English, Biology, Chemistry, Physics.
    // Chemistry is compulsory for Medicine, Pharmacy, Nursing, Biochemistry, etc.
    // Mathematics should NOT be forced.
    fillerOrder = ["Biology", "Chemistry", "Physics", "Mathematics"];
  } else if (hasLitOrGov) {
    // Arts / Humanities track
    fillerOrder = ["Literature in English", "Government", "Christian Religious Studies", "Economics"];
  } else if (hasEconOrComm) {
    // Commercial / Social Sciences track
    fillerOrder = ["Mathematics", "Economics", "Commerce", "Government"];
  } else {
    // Engineering / Physical Sciences track
    fillerOrder = ["Mathematics", "Physics", "Chemistry", "Biology"];
  }

  for (const filler of fillerOrder) {
    if (electives.length >= 3) break;
    const norm = normalizeSubjectName(filler);
    if (!electives.includes(norm)) {
      electives.push(norm);
    }
  }

  // Fallback to guarantee exactly 3 electives
  const universalFallbacks = ["Mathematics", "Physics", "Chemistry", "Biology"];
  for (const fallback of universalFallbacks) {
    if (electives.length >= 3) break;
    const norm = normalizeSubjectName(fallback);
    if (!electives.includes(norm)) {
      electives.push(norm);
    }
  }

  return ["English", electives[0], electives[1], electives[2]];
}
