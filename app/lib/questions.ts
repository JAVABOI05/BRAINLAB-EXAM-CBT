export type OptionKey = "A" | "B" | "C" | "D";

export type QuestionType = "objective" | "comprehension" | "literature";

export type Subject =
  | "English"
  | "Chemistry"
  | "Physics"
  | "Biology"
  | "Mathematics";

export type Question = {
  id: string;
  subject: Subject;
  type: QuestionType;
  passageId?: string;
  passageTitle?: string;
  passageText?: string;
  text: string;
  options: Record<OptionKey, string>;
  correctAnswer: OptionKey;
  explanation: string;
  marks: number;
};