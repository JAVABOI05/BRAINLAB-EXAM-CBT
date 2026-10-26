export type OptionKey = "A" | "B" | "C" | "D" | "E";

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
  options: Record<"A" | "B" | "C" | "D", string> & Partial<Record<"E", string>>;
  correctAnswer: OptionKey;
  explanation: string;
  marks: number;
};