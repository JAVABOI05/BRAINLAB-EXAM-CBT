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

// Comprehensive verified pool covering core high-frequency UTME/WAEC topics across 5 subjects
const VERIFIED_FALLBACK_POOL: QuestionItem[] = [
  // --- MATHEMATICS ---
  {
    id: "math-base-1",
    subject: "Mathematics",
    examContext: "JAMB UTME / WAEC Number Bases",
    question: "Convert the decimal number 117₁₀ to a base 3 numeral.",
    options: [
      { letter: "A", text: "11100₃" },
      { letter: "B", text: "11010₃" },
      { letter: "C", text: "10110₃" },
      { letter: "D", text: "11200₃" },
    ],
    correctLetter: "A",
    explanation:
      "Successive division by 3: 117 ÷ 3 = 39 rem 0; 39 ÷ 3 = 13 rem 0; 13 ÷ 3 = 4 rem 1; 4 ÷ 3 = 1 rem 1; 1 ÷ 3 = 0 rem 1. Reading remainders from bottom to top gives 11100₃. Verification: (1×81) + (1×27) + (1×9) + (0×3) + 0 = 81 + 27 + 9 = 117.",
  },
  {
    id: "math-log-1",
    subject: "Mathematics",
    examContext: "JAMB UTME / WAEC Logarithms",
    question: "If log₁₀(x) + log₁₀(x - 3) = 1, find the positive value of x.",
    options: [
      { letter: "A", text: "2" },
      { letter: "B", text: "5" },
      { letter: "C", text: "10" },
      { letter: "D", text: "3" },
    ],
    correctLetter: "B",
    explanation:
      "Using the product rule: log₁₀[x(x - 3)] = 1 ⟹ x(x - 3) = 10¹ = 10. Expanding gives x² - 3x - 10 = 0. Factoring: (x - 5)(x + 2) = 0. Since the logarithm of a non-positive number is undefined, x must be positive, hence x = 5.",
  },
  {
    id: "math-quad-1",
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
      "Dividing through by 2 gives x² - 4x + 3 = 0. Factoring yields (x - 1)(x - 3) = 0, which gives x = 1 or x = 3.",
  },
  {
    id: "math-trig-1",
    subject: "Mathematics",
    examContext: "WAEC / UTME Trigonometry",
    question: "If tan θ = 3/4 and θ is an acute angle, evaluate cos θ.",
    options: [
      { letter: "A", text: "3/5" },
      { letter: "B", text: "4/5" },
      { letter: "C", text: "5/4" },
      { letter: "D", text: "4/3" },
    ],
    correctLetter: "B",
    explanation:
      "In a right-angled triangle, opposite = 3 and adjacent = 4. By Pythagoras' theorem, hypotenuse = √(3² + 4²) = √25 = 5. Therefore, cos θ = adjacent / hypotenuse = 4/5.",
  },
  {
    id: "math-series-1",
    subject: "Mathematics",
    examContext: "JAMB UTME Sequences & Series",
    question: "Find the sum to infinity of the geometric progression: 1/2, 1/4, 1/8, ...",
    options: [
      { letter: "A", text: "1/2" },
      { letter: "B", text: "1" },
      { letter: "C", text: "2" },
      { letter: "D", text: "3/4" },
    ],
    correctLetter: "B",
    explanation:
      "First term a = 1/2, common ratio r = (1/4)/(1/2) = 1/2. For |r| < 1, sum to infinity S_∞ = a / (1 - r) = (1/2) / (1 - 1/2) = (1/2) / (1/2) = 1.",
  },

  // --- ENGLISH LANGUAGE ---
  {
    id: "eng-concord-1",
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
    id: "eng-antonym-1",
    subject: "English Language",
    examContext: "WAEC Antonyms (Opposites in Meaning)",
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
      "'Ambiguous' means open to more than one interpretation or vague. Its direct opposite (antonym) is 'explicit' (clear, precise, leaving no room for confusion).",
  },
  {
    id: "eng-prep-1",
    subject: "English Language",
    examContext: "UTME Prepositions & Collocations",
    question: "Select the correct option to fill the gap: 'After a thorough probe, the bursar was exonerated _______ all fraudulent charges.'",
    options: [
      { letter: "A", text: "from" },
      { letter: "B", text: "of" },
      { letter: "C", text: "against" },
      { letter: "D", text: "with" },
    ],
    correctLetter: "A",
    explanation:
      "The standard English preposition collocated with the verb 'exonerate' is 'from' (to exonerate someone from blame or charges).",
  },
  {
    id: "eng-stress-1",
    subject: "English Language",
    examContext: "JAMB UTME Oral Forms (Stress Patterns)",
    question: "Which syllable carries the primary stress in the word 'PHOTOGRAPHY'?",
    options: [
      { letter: "A", text: "First syllable (PHO-)" },
      { letter: "B", text: "Second syllable (-TOG-)" },
      { letter: "C", text: "Third syllable (-RA-)" },
      { letter: "D", text: "Fourth syllable (-phy)" },
    ],
    correctLetter: "B",
    explanation:
      "In four-syllable nouns ending with the suffix '-graphy', primary stress naturally falls on the antepenultimate (second) syllable: pho-TOG-ra-phy.",
  },

  // --- PHYSICS ---
  {
    id: "phy-ke-1",
    subject: "Physics",
    examContext: "JAMB UTME Mechanics & Work",
    question: "A body of mass 4 kg moves with a uniform velocity of 15 m/s. What is its kinetic energy?",
    options: [
      { letter: "A", text: "60 J" },
      { letter: "B", text: "300 J" },
      { letter: "C", text: "450 J" },
      { letter: "D", text: "900 J" },
    ],
    correctLetter: "C",
    explanation:
      "Kinetic energy K.E. = ½mv². Substituting m = 4 kg and v = 15 m/s: K.E. = ½ × 4 × (15)² = 2 × 225 = 450 Joules.",
  },
  {
    id: "phy-kin-1",
    subject: "Physics",
    examContext: "WAEC SSCE Kinematics",
    question: "A car accelerates uniformly from rest at 2.5 m/s² for 8 seconds. What is the final velocity attained?",
    options: [
      { letter: "A", text: "10 m/s" },
      { letter: "B", text: "16 m/s" },
      { letter: "C", text: "20 m/s" },
      { letter: "D", text: "25 m/s" },
    ],
    correctLetter: "C",
    explanation:
      "Using the first equation of motion v = u + at, with initial velocity u = 0, acceleration a = 2.5 m/s², and time t = 8 s: v = 0 + (2.5)(8) = 20 m/s.",
  },
  {
    id: "phy-optics-1",
    subject: "Physics",
    examContext: "JAMB UTME Geometrical Optics",
    question: "Light travels from dense glass (n = 1.5) toward an air boundary. What is the critical angle for total internal reflection?",
    options: [
      { letter: "A", text: "41.8°" },
      { letter: "B", text: "48.6°" },
      { letter: "C", text: "30.0°" },
      { letter: "D", text: "60.0°" },
    ],
    correctLetter: "A",
    explanation:
      "The critical angle C satisfies sin C = 1/n = 1/1.5 = 0.6667. Taking the arcsine: C = sin⁻¹(0.6667) ≈ 41.8°.",
  },
  {
    id: "phy-circ-1",
    subject: "Physics",
    examContext: "WAEC SSCE Current Electricity",
    question: "Three 6 Ω resistors are connected in parallel. What is the equivalent resistance of the network?",
    options: [
      { letter: "A", text: "18 Ω" },
      { letter: "B", text: "2 Ω" },
      { letter: "C", text: "3 Ω" },
      { letter: "D", text: "0.5 Ω" },
    ],
    correctLetter: "B",
    explanation:
      "For parallel identical resistors, R_eq = R / N = 6 Ω / 3 = 2 Ω. Alternatively: 1/R_eq = 1/6 + 1/6 + 1/6 = 3/6 = 1/2 ⟹ R_eq = 2 Ω.",
  },

  // --- CHEMISTRY ---
  {
    id: "chem-elec-1",
    subject: "Chemistry",
    examContext: "JAMB UTME / WAEC Electrolysis",
    question: "Which gas is liberated at the cathode during the electrolysis of dilute tetraoxosulphate(VI) acid using platinum electrodes?",
    options: [
      { letter: "A", text: "Oxygen" },
      { letter: "B", text: "Hydrogen" },
      { letter: "C", text: "Sulphur(IV) oxide" },
      { letter: "D", text: "Chlorine" },
    ],
    correctLetter: "B",
    explanation:
      "In the electrolysis of dilute H₂SO₄, hydrogen ions (H⁺) migrate to the negative cathode where they are reduced by gaining electrons: 2H⁺ + 2e⁻ → H₂ (gas).",
  },
  {
    id: "chem-bond-1",
    subject: "Chemistry",
    examContext: "WAEC SSCE Chemical Bonding",
    question: "Which of the following compounds exhibits predominantly electrovalent (ionic) bonding?",
    options: [
      { letter: "A", text: "Methane (CH₄)" },
      { letter: "B", text: "Sodium Chloride (NaCl)" },
      { letter: "C", text: "Water (H₂O)" },
      { letter: "D", text: "Carbon Dioxide (CO₂)" },
    ],
    correctLetter: "B",
    explanation:
      "NaCl is formed by complete valence electron transfer from metallic sodium to non-metallic chlorine, forming a crystal lattice held by strong ionic electrostatic attractions.",
  },
  {
    id: "chem-stoich-1",
    subject: "Chemistry",
    examContext: "JAMB UTME Stoichiometry & Gases",
    question: "What volume of oxygen at s.t.p. is required for complete combustion of 4.4 g of propane (C₃H₈)? [C=12, H=1, Molar volume = 22.4 dm³]",
    options: [
      { letter: "A", text: "11.2 dm³" },
      { letter: "B", text: "2.24 dm³" },
      { letter: "C", text: "5.6 dm³" },
      { letter: "D", text: "22.4 dm³" },
    ],
    correctLetter: "A",
    explanation:
      "Reaction: C₃H₈ + 5O₂ → 3CO₂ + 4H₂O. Moles of C₃H₈ = 4.4 / 44 = 0.1 mol. From mole ratio, moles of O₂ required = 5 × 0.1 = 0.5 mol. Volume at s.t.p. = 0.5 × 22.4 dm³ = 11.2 dm³.",
  },

  // --- BIOLOGY ---
  {
    id: "bio-cell-1",
    subject: "Biology",
    examContext: "JAMB UTME / WAEC Cell Biology",
    question: "Which cellular organelle is primarily responsible for synthesizing adenosine triphosphate (ATP) during aerobic cellular respiration?",
    options: [
      { letter: "A", text: "Ribosome" },
      { letter: "B", text: "Mitochondrion" },
      { letter: "C", text: "Endoplasmic reticulum" },
      { letter: "D", text: "Golgi apparatus" },
    ],
    correctLetter: "B",
    explanation:
      "Mitochondria are the respiratory powerhouses of eukaryotic cells. The Krebs cycle and electron transport phosphorylation occur within them, generating cellular ATP.",
  },
  {
    id: "bio-gen-1",
    subject: "Biology",
    examContext: "JAMB UTME Genetics & Heredity",
    question: "In Mendelian monohybrid inheritance, what is the phenotypic ratio in the F₂ generation of a cross between two heterozygous parents?",
    options: [
      { letter: "A", text: "1:2:1" },
      { letter: "B", text: "3:1" },
      { letter: "C", text: "9:3:3:1" },
      { letter: "D", text: "2:1" },
    ],
    correctLetter: "B",
    explanation:
      "Crossing two heterozygous individuals (Aa × Aa) yields genotypes 1 AA : 2 Aa : 1 aa. Because dominant allele A masks recessive a, the observable phenotypic ratio is 3 dominant : 1 recessive.",
  },
  {
    id: "bio-blood-1",
    subject: "Biology",
    examContext: "WAEC SSCE Human Genetics",
    question: "A heterozygous blood group A father marries a heterozygous blood group B mother. What blood groups can appear in their offspring?",
    options: [
      { letter: "A", text: "A, B, AB, and O" },
      { letter: "B", text: "AB only" },
      { letter: "C", text: "A and B only" },
      { letter: "D", text: "AB and O only" },
    ],
    correctLetter: "A",
    explanation:
      "Father genotype I^A i and mother genotype I^B i cross to yield: I^A I^B (AB), I^A i (A), I^B i (B), and i i (O). All four ABO blood types are possible.",
  },
];

export default function InteractiveSampleQuestion() {
  const [questionPool, setQuestionPool] = useState<QuestionItem[]>(VERIFIED_FALLBACK_POOL);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  // Fetch verified active questions from database, cleanly falling back to comprehensive pool
  useEffect(() => {
    let active = true;
    fetch("/api/questions/sample")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.ok && Array.isArray(data.questions) && data.questions.length >= 5) {
          setQuestionPool(data.questions);
        }
      })
      .catch(() => {
        // Safe fallback to our verified pool
      });

    return () => {
      active = false;
    };
  }, []);

  // Filter questions by active subject tab
  const filteredQuestions = useMemo(() => {
    if (activeSubjectFilter === "All") return questionPool;
    return questionPool.filter((q) => q.subject.toLowerCase() === activeSubjectFilter.toLowerCase());
  }, [questionPool, activeSubjectFilter]);

  // Distinct subjects available in the active pool
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

  const handleNext = () => {
    if (filteredQuestions.length <= 1) return;
    setIsShuffling(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
      setSelectedLetter(null);
      setShowFeedback(false);
      setIsShuffling(false);
    }, 120);
  };

  const handlePrevious = () => {
    if (filteredQuestions.length <= 1) return;
    setIsShuffling(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);
      setSelectedLetter(null);
      setShowFeedback(false);
      setIsShuffling(false);
    }, 120);
  };

  const handleShuffle = () => {
    if (filteredQuestions.length <= 1) return;
    setIsShuffling(true);
    const poolWithoutCurrent = filteredQuestions.map((_, i) => i).filter((i) => i !== currentIndex);
    const randomIdx = poolWithoutCurrent[Math.floor(Math.random() * poolWithoutCurrent.length)];
    setTimeout(() => {
      setCurrentIndex(randomIdx !== undefined ? randomIdx : (currentIndex + 1) % filteredQuestions.length);
      setSelectedLetter(null);
      setShowFeedback(false);
      setIsShuffling(false);
    }, 120);
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
          onClick={() => {
            setActiveSubjectFilter("All");
            setCurrentIndex(0);
            setSelectedLetter(null);
            setShowFeedback(false);
          }}
          className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
            activeSubjectFilter === "All"
              ? "bg-[#012153] text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          All Subjects ({questionPool.length})
        </button>
        {availableSubjects.map((subj) => (
          <button
            key={subj}
            type="button"
            onClick={() => {
              setActiveSubjectFilter(subj);
              setCurrentIndex(0);
              setSelectedLetter(null);
              setShowFeedback(false);
            }}
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

      {/* Question Header & Stepper Controls */}
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
            Question {currentIndex + 1} of {filteredQuestions.length}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isShuffling || filteredQuestions.length <= 1}
              aria-label="Previous question"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40"
            >
              ←
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isShuffling || filteredQuestions.length <= 1}
              aria-label="Next question"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40"
            >
              →
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              title="Shuffle question"
              disabled={isShuffling || filteredQuestions.length <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-cyan-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 disabled:opacity-40"
            >
              <span aria-hidden="true" className={isShuffling ? "animate-spin" : ""}>🔀</span>
            </button>
          </div>
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

      {/* Interactive Options Grid */}
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {currentQuestion.options.map((opt) => {
          const isSelected = selectedLetter === opt.letter;
          const isAnswer = opt.letter === currentQuestion.correctLetter;

          let btnClass = "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800";

          if (showFeedback) {
            if (isAnswer) {
              btnClass = "border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200 font-extrabold ring-1 ring-emerald-500";
            } else if (isSelected && !isAnswer) {
              btnClass = "border-red-400 bg-red-50 text-red-950 dark:border-red-500 dark:bg-red-950/40 dark:text-red-200 font-extrabold";
            } else {
              btnClass = "border-slate-200 bg-slate-50/20 text-slate-400 dark:border-slate-800 dark:text-slate-600 opacity-60";
            }
          }

          return (
            <button
              key={opt.letter}
              type="button"
              disabled={showFeedback}
              onClick={() => handleSelect(opt.letter)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left text-xs sm:text-sm font-semibold transition active:scale-98 ${btnClass}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white dark:bg-slate-700 font-black text-slate-700 dark:text-slate-200 text-xs shadow-2xs">
                {opt.letter}
              </span>
              <span className="flex-1 min-w-0">{opt.text}</span>
              {showFeedback && isAnswer && (
                <span className="text-emerald-600 dark:text-emerald-400 font-black">✓</span>
              )}
              {showFeedback && isSelected && !isAnswer && (
                <span className="text-red-500 font-black">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Answer Explanation & Feedback Card */}
      {showFeedback && (
        <div
          className={`mt-5 rounded-2xl border p-4.5 transition animate-in fade-in duration-200 ${
            isCorrect
              ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-950/30"
              : "border-amber-200 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/30"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-black/5 dark:border-white/5">
            <span
              className={`text-xs font-black uppercase tracking-wider ${
                isCorrect ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"
              }`}
            >
              {isCorrect ? "✓ Well Done! Correct Answer" : `Incorrect · Correct: Option (${currentQuestion.correctLetter})`}
            </span>

            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline"
            >
              Try Again
            </button>
          </div>

          <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
            {currentQuestion.explanation}
          </p>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-black/5 dark:border-white/5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Exam tip: Practise full timed sessions to build speed and accuracy.
            </span>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#012153] hover:bg-blue-900 px-3 py-1.5 text-xs font-bold text-white transition active:scale-95"
            >
              Launch CBT Exam →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
