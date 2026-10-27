// Master Types for BrainLab CBT Examination & Marking Engine

export type OptionLetter = "A" | "B" | "C" | "D" | "E";

export type ExamConversionFormula = "direct" | "english_90_to_100";

export type SectionConfig = {
  section: string;
  quota: number;
  marks_per_question: number;
  raw_total: number;
  passage_required?: boolean;
  reading_text_id?: string;
  matching_categories?: string[];
  description?: string;
};

export type TopicCoverageRule = {
  strategy: "maximise_distinct" | "weighted" | "even";
  min_per_topic?: number;
  max_per_topic?: number;
};

export type ReadingTextConfig = {
  active_text_id: string;
  active_title: string;
  question_quota: number;
  deferred_texts?: string[];
};

export type ExamBlueprint = {
  id: string;
  name: string;
  subject: string;
  total_questions: number;
  raw_max_marks: number;
  converted_max_marks: number;
  score_conversion_formula: ExamConversionFormula;
  sections_config: SectionConfig[];
  reading_text_config?: ReadingTextConfig;
  topic_coverage_rule?: TopicCoverageRule;
  is_active: boolean;
  version: number;
  created_at?: string;
  updated_at?: string;
};

export type HighYieldRule = {
  id: string;
  subject: string;
  blueprint_id?: string;
  topic: string;
  section?: string;
  quota: number;
  priority: number;
  min_questions: number;
  max_questions: number;
  is_active?: boolean;
  isActive?: boolean;
  notes?: string;
  created_at?: string;
};

export type EngineQuestion = {
  id: number;
  subject: string;
  section: string;
  category: string | null;
  topic?: string | null;
  subtopic?: string | null;
  passage_id?: string | null;
  passage_title?: string | null;
  passage_text?: string | null;
  reading_text_id?: string | null;
  question: string;
  question_image_url?: string | null;
  question_image_alt?: string | null;
  option_a: string | null;
  option_a_image_url?: string | null;
  option_a_image_alt?: string | null;
  option_b: string | null;
  option_b_image_url?: string | null;
  option_b_image_alt?: string | null;
  option_c: string | null;
  option_c_image_url?: string | null;
  option_c_image_alt?: string | null;
  option_d: string | null;
  option_d_image_url?: string | null;
  option_d_image_alt?: string | null;
  option_e?: string | null;
  option_e_image_url?: string | null;
  option_e_image_alt?: string | null;
  correct_answer?: OptionLetter | string;
  explanation?: string | null;
  explanation_image_url?: string | null;
  explanation_image_alt?: string | null;
  marks: number;
  difficulty?: string | null;
  is_active?: boolean;
  is_archived?: boolean;
  source_question_id?: string | null;
  verification_status?: string;
};

export type AttemptSnapshot = {
  session_id: string;
  blueprint_id: string;
  blueprint_version: number;
  paper_ids?: number[];
  paperIds?: number[];
  subjects: string[];
  questions_snapshot: EngineQuestion[];
  marking_rules: {
    conversion_formula: ExamConversionFormula;
    raw_max_marks: number;
    converted_max_marks: number;
    subject_blueprints: Record<
      string,
      {
        conversion_formula: ExamConversionFormula;
        raw_max_marks: number;
        converted_max_marks: number;
        total_questions: number;
      }
    >;
    question_marks: Record<number, number>;
  };
  created_at: string;
};

export type QuestionMarkDetail = {
  question_id: number;
  subject: string;
  user_answer: OptionLetter | string | null;
  correct_answer: OptionLetter | string;
  is_correct: boolean;
  raw_marks_awarded: number;
  raw_max_marks: number;
  explanation?: string | null;
};

export type SubjectMarkDetail = {
  subject: string;
  total_questions: number;
  answered_count: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  raw_score: number;
  raw_max_marks: number;
  converted_score: number;
  displayed_score: number; // upward-rounded whole number
  percentage: number;
  conversion_formula: ExamConversionFormula;
};

export type AuthoritativeMarkingResult = {
  raw_score: number;
  raw_max_marks: number;
  converted_score: number;
  displayed_score: number; // upward-rounded whole number (e.g. 78 for 77.5, 99 for 98.89)
  percentage: number;
  total_possible: number;
  subject_scores: Record<string, number>; // displayed scores per subject out of 100
  subject_details: Record<string, SubjectMarkDetail>;
  question_details: QuestionMarkDetail[];
};

export type DuplicateGroup = {
  hash: string;
  type: "exact" | "likely" | "potential";
  questions: EngineQuestion[];
  similarityScore: number;
  recommendedRetainId: number;
  reasons: string[];
};

export type DuplicateReviewRecord = {
  id: string;
  group_hash: string;
  duplicate_type: "exact" | "likely" | "potential";
  question_ids: number[];
  status: "pending" | "resolved_keep_both" | "resolved_archived" | "resolved_merged";
  retained_question_id?: number | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
  created_at?: string;
};
