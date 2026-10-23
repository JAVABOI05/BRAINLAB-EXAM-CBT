"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface SampleOption {
  letter: "A" | "B" | "C" | "D";
  text: string;
}

interface QuestionItem {
  id: string;
  subject: string;
  examContext: string;
  question: string;
  options: SampleOption[];
  correctLetter: "A" | "B" | "C" | "D";
  explanation: string;
}

// Verified questions strictly for subjects currently in the BrainLab database:
// Mathematics, English Language, Physics, Chemistry, Biology (NO Economics).
const VERIFIED_FALLBACK_POOL: QuestionItem[] = [
  {
    id: "math-1",
    subject: "Mathematics",
    examContext: "JAMB UTME / WAEC Algebra",
    question: "If log₁₀(x) + log₁₀(x - 3) = 1, find the positive value of x.",
    options: [
      { letter: "A", text: "2" },
      { letter: "B", text: "5" },
      { letter: "C", text: "10" },
      { letter: "D", text: "3" },
    ],
    correctLetter: "B",
    explanation:
      "Using logarithm laws: log₁₀[x(x - 3)] = 1, which implies x(x - 3) = 10¹ = 10. Rearranging gives the quadratic equation x² - 3x - 10 = 0. Factoring yields (x - 5)(x + 2) = 0. Since the logarithm argument must be strictly positive, x = 5.",
  },
  {
    id: "math-2",
    subject: "Mathematics",
    examContext: "JAMB UTME Quadratic Equations",
    question: "If 2x² - 8x + 6 = 0, find the roots of the equation.",
    options: [
      { letter: "A", text: "x = 1 or x = 3" },
      { letter: "B", text: "x = -1 or x = -3" },
      { letter: "C", text: "x = 2 or x = 4" },
      { letter: "D", text: "x = 0 or x = 3" },
    ],
    correctLetter: "A",
    explanation:
      "Dividing the entire equation by 2 yields x² - 4x + 3 = 0. Factoring gives (x - 1)(x - 3) = 0, which means x = 1 or x = 3.",
  },
  {
    id: "eng-1",
    subject: "English Language",
    examContext: "UTME Lexis & Structure (Concord)",
    question:
      "Choose the option that best completes the sentence: 'Neither the principal nor the teachers _______ present at the valedictory service yesterday.'",
    options: [
      { letter: "A", text: "were" },
      { letter: "B", text: "was" },
      { letter: "C", text: "is" },
      { letter: "D", text: "are being" },
    ],
    correctLetter: "A",
    explanation:
      "Under the grammatical rule of proximity with correlative conjunctions ('neither... nor'), the verb agrees with the closer subject. 'Teachers' is plural and the event occurred in the past ('yesterday'), requiring the plural past verb 'were'.",
  },
  {
    id: "eng-2",
    subject: "English Language",
    examContext: "WAEC Antonyms (Opposites)",
    question:
      "In the sentence: 'The politician made an ambiguous statement that misled the public', choose the word nearest in meaning to the OPPOSITE of 'ambiguous'.",
    options: [
      { letter: "A", text: "Complicated" },
      { letter: "B", text: "Explicit" },
      { letter: "C", text: "Dubious" },
      { letter: "D", text: "Hesitant" },
    ],
    correctLetter: "B",
    explanation:
      "'Ambiguous' means open to more than one interpretation or vague. Its direct opposite (antonym) is 'explicit' (clear, precise, and leaving no room for doubt).",
  },
  {
    id: "bio-1",
    subject: "Biology",
    examContext: "JAMB UTME / WAEC Cell Biology",
    question:
      "Which cellular organelle is primarily responsible for synthesizing adenosine triphosphate (ATP) during aerobic respiration?",
    options: [
      { letter: "A", text: "Ribosome" },
      { letter: "B", text: "Mitochondrion" },
      { letter: "C", text: "Endoplasmic reticulum" },
      { letter: "D", text: "Golgi apparatus" },
    ],
    correctLetter: "B",
    explanation:
      "Mitochondria are the powerhouses of eukaryotic cells. The Krebs cycle occurs in the mitochondrial matrix and oxidative phosphorylation occurs across the cristae, generating ATP through aerobic cellular respiration.",
  },
  {
    id: "bio-2",
    subject: "Biology",
    examContext: "JAMB UTME Genetics",
    question:
      "In Mendelian monohybrid inheritance, what is the phenotypic ratio in the F₂ generation of a cross between two heterozygous parents?",
    options: [
      { letter: "A", text: "1:2:1" },
      { letter: "B", text: "3:1" },
      { letter: "C", text: "9:3:3:1" },
      { letter: "D", text: "2:1" },
    ],
    correctLetter: "B",
    explanation:
      "A cross between two heterozygous parents (Aa × Aa) yields offspring with genotypes 1 AA : 2 Aa : 1 aa. Because dominant allele 'A' masks recessive 'a', the phenotypic ratio is 3 dominant : 1 recessive.",
  },
  {
    id: "phy-1",
    subject: "Physics",
    examContext: "JAMB UTME Mechanics",
    question:
      "A body of mass 4 kg is moving with a uniform velocity of 15 m/s. What is its kinetic energy?",
    options: [
      { letter: "A", text: "60 J" },
      { letter: "B", text: "300 J" },
      { letter: "C", text: "450 J" },
      { letter: "D", text: "900 J" },
    ],
    correctLetter: "C",
    explanation:
      "Kinetic energy is given by K.E. = ½mv². Substituting mass m = 4 kg and velocity v = 15 m/s: K.E. = ½ × 4 × (15)² = 2 × 225 = 450 Joules.",
  },
  {
    id: "phy-2",
    subject: "Physics",
    examContext: "WAEC SSCE Kinematics",
    question:
      "A car accelerates uniformly from rest at 2.5 m/s² for 8 seconds. What is the final velocity attained?",
    options: [
      { letter: "A", text: "10 m/s" },
      { letter: "B", text: "16 m/s" },
      { letter: "C", text: "20 m/s" },
      { letter: "D", text: "25 m/s" },
    ],
    correctLetter: "C",
    explanation:
      "Using the first equation of motion: v = u + at. With initial velocity u = 0, acceleration a = 2.5 m/s², and time t = 8 s: v = 0 + (2.5)(8) = 20 m/s.",
  },
  {
    id: "chem-1",
    subject: "Chemistry",
    examContext: "JAMB UTME / WAEC Electrolysis",
    question:
      "Which gas is liberated at the cathode during the electrolysis of dilute tetraoxosulphate(VI) acid using platinum electrodes?",
    options: [
      { letter: "A", text: "Oxygen" },
      { letter: "B", text: "Hydrogen" },
      { letter: "C", text: "Sulphur(IV) oxide" },
      { letter: "D", text: "Chlorine" },
    ],
    correctLetter: "B",
    explanation:
      "In the electrolysis of dilute H₂SO₄, hydrogen ions (H⁺) migrate to the negative electrode (cathode) where they gain electrons to form hydrogen gas (2H⁺ + 2e⁻ → H₂).",
  },
  {
    id: "chem-2",
    subject: "Chemistry",
    examContext: "WAEC SSCE Chemical Bonding",
    question:
      "Which of the following compounds exhibits predominantly electrovalent (ionic) bonding?",
    options: [
      { letter: "A", text: "Methane (CH₄)" },
      { letter: "B", text: "Sodium Chloride (NaCl)" },
      { letter: "C", text: "Water (H₂O)" },
      { letter: "D", text: "Carbon Dioxide (CO₂)" },
    ],
    correctLetter: "B",
    explanation:
      "NaCl is formed by complete electron transfer between highly electropositive sodium (metal) and electronegative chlorine (non-metal), creating strong electrostatic attractions between Na⁺ and Cl⁻ ions.",
  },
];

export default function InteractiveSampleQuestion() {
  const [questionPool, setQuestionPool] = useState<QuestionItem[]>(VERIFIED_FALLBACK_POOL);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  // Attempt to fetch fresh sample questions from live database (only verified subjects)
  useEffect(() => {
    let active = true;
    fetch("/api/questions/sample")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.ok && Array.isArray(data.questions) && data.questions.length > 0) {
          // Merge live questions with our verified pool
          setQuestionPool(data.questions);
        }
      })
      .catch(() => {
        // Safe fallback to verified local questions
      });

    return () => {
      active = false;
    };
  }, []);

  // Filter pool by subject
  const filteredQuestions = useMemo(() => {
    if (activeSubjectFilter === "All") return questionPool;
    return questionPool.filter((q) => q.subject.toLowerCase() === activeSubjectFilter.toLowerCase());
  }, [questionPool, activeSubjectFilter]);

  // Ensure currentIndex stays within bounds when filter changes
  useEffect(() => {
    setCurrentIndex(0);
    setSelectedLetter(null);
    setShowFeedback(false);
  }, [activeSubjectFilter]);

  // Get distinct subjects available
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    questionPool.forEach((q) => set.add(q.subject));
    return Array.from(set).sort();
  }, [questionPool]);

  const currentQuestion = filteredQuestions[currentIndex] || filteredQuestions[0] || VERIFIED_FALLBACK_POOL[0];

  const handleSelect = (letter: "A" | "B" | "C" | "D") => {
    setSelectedLetter(letter);
    setShowFeedback(true);
  };

  const handleReset = () => {
    setSelectedLetter(null);
    setShowFeedback(false);
  };

  const handleNextRandom = () => {
    setIsShuffling(true);
    let nextIdx = (currentIndex + 1) % filteredQuestions.length;
    if (filteredQuestions.length > 2) {
      const remainingIndices = filteredQuestions.map((_, i) => i).filter((i) => i !== currentIndex);
      nextIdx = remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
    }
    setTimeout(() => {
      setCurrentIndex(nextIdx);
      setSelectedLetter(null);
      setShowFeedback(false);
      setIsShuffling(false);
    }, 150);
  };

  const isCorrect = selectedLetter === currentQuestion.correctLetter;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-blue-950/5 sm:p-8 dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* Subject Filter Selector Pills */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 pb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
          Subject:
        </span>
        <button
          type="button"
          onClick={() => setActiveSubjectFilter("All")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
            activeSubjectFilter === "All"
              ? "bg-[#012153] text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          All
        </button>
        {availableSubjects.map((subj) => (
          <button
            key={subj}
            type="button"
            onClick={() => setActiveSubjectFilter(subj)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
              activeSubjectFilter.toLowerCase() === subj.toLowerCase()
                ? "bg-[#012153] text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {/* Question Header & Context */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:text-cyan-300">
            {currentQuestion.subject}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {currentQuestion.examContext}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {currentIndex + 1} of {filteredQuestions.length}
          </span>
          <button
            type="button"
            onClick={handleNextRandom}
            title="Randomly change question"
            disabled={isShuffling || filteredQuestions.length <= 1}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-0.5 text-xs font-bold text-blue-700 dark:text-cyan-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            <span>Next Random</span>
            <span aria-hidden="true" className={isShuffling ? "animate-spin" : ""}>
              🔀
            </span>
          </button>
        </div>
      </div>

      {/* Question Stem */}
      <div className="mt-5">
        <p
          className={`text-base font-extrabold leading-snug text-slate-900 dark:text-white sm:text-lg transition-opacity duration-150 ${
            isShuffling ? "opacity-30" : "opacity-100"
          }`}
        >
          {currentQuestion.question}
        </p>
      </div>

      {/* Interactive Options */}
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {currentQuestion.options.map((opt) => {
          const isSelected = selectedLetter === opt.letter;
          const isOptCorrect = opt.letter === currentQuestion.correctLetter;

          let btnClasses =
            "relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ";

          if (!showFeedback) {
            btnClasses += isSelected
              ? "border-blue-600 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm "
              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 ";
          } else {
            if (isOptCorrect) {
              btnClasses +=
                "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30 ";
            } else if (isSelected && !isCorrect) {
              btnClasses +=
                "border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ";
            } else {
              btnClasses +=
                "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 opacity-60 text-slate-500 dark:text-slate-400 ";
            }
          }

          return (
            <button
              key={opt.letter}
              type="button"
              onClick={() => handleSelect(opt.letter)}
              disabled={showFeedback}
              className={btnClasses}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-colors ${
                  showFeedback && isOptCorrect
                    ? "bg-emerald-600 text-white"
                    : showFeedback && isSelected && !isCorrect
                    ? "bg-rose-600 text-white"
                    : isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {opt.letter}
              </span>
              <span className="pt-0.5 text-xs sm:text-sm font-bold leading-relaxed">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* Explanatory Solution Feedback */}
      {showFeedback && (
        <div
          className={`mt-6 rounded-2xl p-5 border text-xs sm:text-sm transition-all duration-300 ${
            isCorrect
              ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-800/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200"
              : "border-blue-200 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100"
          }`}
        >
          <div className="flex items-center justify-between gap-3 font-extrabold pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{isCorrect ? "✅ Correct!" : "💡 Solution Breakdown:"}</span>
              <span className="rounded bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 text-xs font-black">
                Key: ({currentQuestion.correctLetter})
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline font-semibold"
            >
              Try Again
            </button>
          </div>
          <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
            {currentQuestion.explanation}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Try more questions in the complete CBT exam suite.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNextRandom}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
              >
                Next Question →
              </button>
              <Link
                href="/cbt"
                className="rounded-xl bg-[#012153] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-900 transition active:scale-95 shadow-xs"
              >
                Start CBT Practice
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
