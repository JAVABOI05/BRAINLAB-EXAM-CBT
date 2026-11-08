/**
 * BrainLab Academy: Curated Public Sample Question Service
 *
 * Implements Layer B3 requirements:
 * 1. Isolated public sample questions (zero exposure of internal questions bank)
 * 2. One-question-at-a-time delivery
 * 3. Server-side answer verification without leaking answer keys to client bundles
 */

import { getSupabaseServerClient } from "../supabaseServer";

export interface SampleOption {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string;
}

export interface PublicSampleQuestion {
  id: string;
  subjectSlug: string;
  subjectName: string;
  topicContext: string;
  questionText: string;
  options: SampleOption[];
  difficulty: "easy" | "medium" | "hard";
  totalInSubject?: number;
}

export interface InternalSampleQuestionRecord {
  id: string;
  subject_slug: string;
  topic_context: string;
  question_text: string;
  options: SampleOption[];
  correct_letter: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  rule_title: string;
  difficulty: "easy" | "medium" | "hard";
  is_published: boolean;
  display_order: number;
}

export interface SampleVerificationResult {
  ok: boolean;
  isCorrect: boolean;
  correctLetter: "A" | "B" | "C" | "D" | "E";
  ruleTitle: string;
  explanation: string;
  selectedOption: string;
}

// Fallback high-yield curated bank for instant runtime availability
export const CURATED_STATIC_SAMPLE_POOL: InternalSampleQuestionRecord[] = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    subject_slug: "use-of-english",
    topic_context: "Lexis & Structure (Proximity Concord)",
    question_text: "Choose the option that best completes the sentence: 'Neither the principal nor the teachers _______ present at the valedictory service yesterday.'",
    options: [
      { letter: "A", text: "were" },
      { letter: "B", text: "was" },
      { letter: "C", text: "is" },
      { letter: "D", text: "are being" },
    ],
    correct_letter: "A",
    explanation: "Under the grammatical rule of proximity with correlative conjunctions ('neither... nor'), the finite verb agrees in number and tense with the subject nearest to it. 'Teachers' is plural and the event occurred in the past ('yesterday'), requiring the plural past verb 'were'.",
    rule_title: "Rule of Proximity",
    difficulty: "medium",
    is_published: true,
    display_order: 10,
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    subject_slug: "use-of-english",
    topic_context: "Vocabulary (Antonyms / Opposites)",
    question_text: "In the sentence: 'The politician made an ambiguous statement that misled the public', choose the word nearest in meaning to the OPPOSITE of 'ambiguous'.",
    options: [
      { letter: "A", text: "Complicated" },
      { letter: "B", text: "Explicit" },
      { letter: "C", text: "Dubious" },
      { letter: "D", text: "Hesitant" },
    ],
    correct_letter: "B",
    explanation: "'Ambiguous' means open to more than one interpretation or vague. Its direct antonym is 'explicit', which means stated clearly and in detail, leaving no room for doubt.",
    rule_title: "Antonym Context",
    difficulty: "easy",
    is_published: true,
    display_order: 20,
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    subject_slug: "use-of-english",
    topic_context: "Prepositions & Dependent Collocations",
    question_text: "Select the correct option to fill the gap: 'After a thorough probe, the bursar was exonerated _______ all fraudulent charges.'",
    options: [
      { letter: "A", text: "from" },
      { letter: "B", text: "of" },
      { letter: "C", text: "against" },
      { letter: "D", text: "with" },
    ],
    correct_letter: "A",
    explanation: "The standard English dependent preposition collocated with the verb 'exonerate' is 'from' (to exonerate someone from blame or charges).",
    rule_title: "Dependent Preposition",
    difficulty: "medium",
    is_published: true,
    display_order: 30,
  },
  {
    id: "00000000-0000-0000-0000-000000000104",
    subject_slug: "mathematics",
    topic_context: "Algebra & Quadratic Equations",
    question_text: "Find the value of k for which the quadratic equation 2x² - 8x + k = 0 has two equal real roots.",
    options: [
      { letter: "A", text: "4" },
      { letter: "B", text: "8" },
      { letter: "C", text: "16" },
      { letter: "D", text: "32" },
    ],
    correct_letter: "B",
    explanation: "A quadratic equation ax² + bx + c = 0 has equal real roots when its discriminant Δ = b² - 4ac = 0. Here, a = 2, b = -8, c = k. Thus: (-8)² - 4(2)(k) = 0 => 64 - 8k = 0 => 8k = 64 => k = 8.",
    rule_title: "Quadratic Discriminant Condition",
    difficulty: "medium",
    is_published: true,
    display_order: 40,
  },
  {
    id: "00000000-0000-0000-0000-000000000105",
    subject_slug: "physics",
    topic_context: "Mechanics (Uniform Acceleration)",
    question_text: "A motor vehicle travelling at an initial velocity of 20 m/s decelerates uniformly to rest in a distance of 50 m. Determine the magnitude of deceleration.",
    options: [
      { letter: "A", text: "2 m/s²" },
      { letter: "B", text: "4 m/s²" },
      { letter: "C", text: "5 m/s²" },
      { letter: "D", text: "10 m/s²" },
    ],
    correct_letter: "B",
    explanation: "Using third equation of linear motion: v² = u² + 2as. Here, initial velocity u = 20 m/s, final velocity v = 0, distance s = 50 m. 0 = (20)² + 2a(50) => 0 = 400 + 100a => 100a = -400 => a = -4 m/s². The magnitude of deceleration is 4 m/s².",
    rule_title: "Kinematics Equation v² = u² + 2as",
    difficulty: "medium",
    is_published: true,
    display_order: 50,
  },
  {
    id: "00000000-0000-0000-0000-000000000106",
    subject_slug: "chemistry",
    topic_context: "Atomic Structure & Periodicity",
    question_text: "An element X has an atomic number of 17. Which of the following representations represents its stable electronic configuration upon ion formation?",
    options: [
      { letter: "A", text: "2, 8, 7" },
      { letter: "B", text: "2, 8, 8" },
      { letter: "C", text: "2, 8, 6" },
      { letter: "D", text: "2, 8, 8, 1" },
    ],
    correct_letter: "B",
    explanation: "Atomic number 17 corresponds to Chlorine (Cl), with neutral electron configuration 2, 8, 7. It achieves octet stability by gaining one electron to form the chloride anion (Cl⁻), yielding the stable noble gas configuration of Argon: 2, 8, 8.",
    rule_title: "Octet Rule and Anion Formation",
    difficulty: "easy",
    is_published: true,
    display_order: 60,
  },
  {
    id: "00000000-0000-0000-0000-000000000107",
    subject_slug: "biology",
    topic_context: "Cellular Biology & Osmoregulation",
    question_text: "When red blood cells are placed in a hypotonic solution, they swell and eventually burst. This physiological process is termed:",
    options: [
      { letter: "A", text: "Plasmolysis" },
      { letter: "B", text: "Haemolysis" },
      { letter: "C", text: "Crenation" },
      { letter: "D", text: "Turgidity" },
    ],
    correct_letter: "B",
    explanation: "Animal cells lack a rigid cellulose cell wall. When immersed in a hypotonic solution, water moves into the cell via endosmosis, causing the cell membrane to stretch and lyse (haemolysis). In plant cells, this produces turgidity, while crenation occurs in hypertonic solutions.",
    rule_title: "Osmotic Lysis in Animal Cells",
    difficulty: "medium",
    is_published: true,
    display_order: 70,
  },
];

const SUBJECT_NAME_MAP: Record<string, string> = {
  "use-of-english": "Use of English",
  "english": "Use of English",
  "mathematics": "Mathematics",
  "physics": "Physics",
  "chemistry": "Chemistry",
  "biology": "Biology",
  "economics": "Economics",
  "government": "Government",
  "literature": "Literature in English",
};

/**
 * Fetch one published sample question by subject, optionally excluding IDs.
 * Strictly hides correct_letter and explanation from the returned object.
 */
export async function getNextSampleQuestion(
  subjectSlug: string = "use-of-english",
  excludeIds: string[] = []
): Promise<PublicSampleQuestion | null> {
  const normSlug = (subjectSlug || "use-of-english").trim().toLowerCase();

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("curated_sample_questions")
      .select("id, subject_slug, topic_context, question_text, options, difficulty, display_order")
      .eq("is_published", true)
      .eq("subject_slug", normSlug)
      .order("display_order", { ascending: true });

    if (!error && data && data.length > 0) {
      const available = data.filter((row) => !excludeIds.includes(row.id));
      const chosen = available.length > 0 ? available[0] : data[0];

      return {
        id: chosen.id,
        subjectSlug: chosen.subject_slug,
        subjectName: SUBJECT_NAME_MAP[chosen.subject_slug] || "Use of English",
        topicContext: chosen.topic_context,
        questionText: chosen.question_text,
        options: chosen.options as SampleOption[],
        difficulty: chosen.difficulty as "easy" | "medium" | "hard",
        totalInSubject: data.length,
      };
    }
  } catch {
    // Graceful fallback to static pool
  }

  // Fallback to static pool
  const pool = CURATED_STATIC_SAMPLE_POOL.filter((q) => q.is_published && q.subject_slug === normSlug);
  const candidatePool = pool.length > 0 ? pool : CURATED_STATIC_SAMPLE_POOL;
  const available = candidatePool.filter((q) => !excludeIds.includes(q.id));
  const chosen = available.length > 0 ? available[0] : candidatePool[0];

  if (!chosen) return null;

  return {
    id: chosen.id,
    subjectSlug: chosen.subject_slug,
    subjectName: SUBJECT_NAME_MAP[chosen.subject_slug] || "Use of English",
    topicContext: chosen.topic_context,
    questionText: chosen.question_text,
    options: chosen.options,
    difficulty: chosen.difficulty,
    totalInSubject: candidatePool.length,
  };
}

/**
 * Verify applicant's answer server-side.
 * Returns confirmation, correct letter, rule title, and step-by-step explanation.
 */
export async function verifySampleAnswer(
  questionId: string,
  selectedOption: string
): Promise<SampleVerificationResult | null> {
  if (!questionId || !selectedOption) return null;

  const cleanOption = selectedOption.trim().toUpperCase() as "A" | "B" | "C" | "D" | "E";

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("curated_sample_questions")
      .select("id, correct_letter, explanation, rule_title")
      .eq("id", questionId)
      .eq("is_published", true)
      .single();

    if (!error && data) {
      const isCorrect = data.correct_letter === cleanOption;
      return {
        ok: true,
        isCorrect,
        correctLetter: data.correct_letter as "A" | "B" | "C" | "D" | "E",
        ruleTitle: data.rule_title,
        explanation: data.explanation,
        selectedOption: cleanOption,
      };
    }
  } catch {
    // Fallback to static pool
  }

  // Fallback static pool lookup
  const match = CURATED_STATIC_SAMPLE_POOL.find((q) => q.id === questionId);
  if (!match) return null;

  const isCorrect = match.correct_letter === cleanOption;
  return {
    ok: true,
    isCorrect,
    correctLetter: match.correct_letter,
    ruleTitle: match.rule_title,
    explanation: match.explanation,
    selectedOption: cleanOption,
  };
}
