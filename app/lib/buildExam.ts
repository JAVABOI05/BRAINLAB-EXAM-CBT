import { Question } from "./questions";

function shuffleArray<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function pickUpTo<T>(items: T[], count: number): T[] {
  return shuffleArray(items).slice(0, Math.min(count, items.length));
}

export function buildExam(
  allQuestions: Question[],
  chosenSubject: "Biology" | "Mathematics"
): Question[] {
  const englishComprehension = allQuestions.filter(
    (q) => q.subject === "English" && q.type === "comprehension"
  );

  const englishLiterature = allQuestions.filter(
    (q) => q.subject === "English" && q.type === "literature"
  );

  const englishObjective = allQuestions.filter(
    (q) => q.subject === "English" && q.type === "objective"
  );

  const chemistry = allQuestions.filter(
    (q) => q.subject === "Chemistry"
  );

  const physics = allQuestions.filter(
    (q) => q.subject === "Physics"
  );

  const elective = allQuestions.filter(
    (q) => q.subject === chosenSubject
  );

  const passageIds = Array.from(
    new Set(
      englishComprehension
        .map((q) => q.passageId)
        .filter(Boolean)
    )
  ) as string[];

  const selectedPassages = pickUpTo(passageIds, 2);

  const selectedComprehensionQuestions = selectedPassages.flatMap((passageId) =>
    pickUpTo(
      englishComprehension.filter((q) => q.passageId === passageId),
      5
    )
  );

  const selectedLiterature = pickUpTo(englishLiterature, 7);
  const selectedEnglishObjective = pickUpTo(englishObjective, 43);
  const selectedChemistry = pickUpTo(chemistry, 40);
  const selectedPhysics = pickUpTo(physics, 40);
  const selectedElective = pickUpTo(elective, 40);

  return [
    ...selectedComprehensionQuestions,
    ...selectedLiterature,
    ...selectedEnglishObjective,
    ...selectedChemistry,
    ...selectedPhysics,
    ...selectedElective,
  ];
}