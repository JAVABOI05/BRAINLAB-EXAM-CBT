"use client";

import { useState } from "react";
import Link from "next/link";

interface SampleOption {
  letter: "A" | "B" | "C" | "D";
  text: string;
}

interface QuestionItem {
  id: string;
  topicContext: string;
  question: string;
  options: SampleOption[];
  correctLetter: "A" | "B" | "C" | "D";
  explanation: string;
  ruleTitle: string;
}

// 10 Universal Non-Passage JAMB UTME Use of English Questions
const UNIVERSAL_ENGLISH_POOL: QuestionItem[] = [
  {
    id: "eng-concord-1",
    topicContext: "Lexis & Structure (Proximity Concord)",
    question: "Choose the option that best completes the sentence: 'Neither the principal nor the teachers _______ present at the valedictory service yesterday.'",
    options: [
      { letter: "A", text: "were" },
      { letter: "B", text: "was" },
      { letter: "C", text: "is" },
      { letter: "D", text: "are being" },
    ],
    correctLetter: "A",
    ruleTitle: "Rule of Proximity",
    explanation: "Under the grammatical rule of proximity with correlative conjunctions ('neither... nor'), the finite verb agrees in number and tense with the subject nearest to it. 'Teachers' is plural and the event occurred in the past ('yesterday'), requiring the plural past verb 'were'.",
  },
  {
    id: "eng-antonym-1",
    topicContext: "Vocabulary (Antonyms / Opposites)",
    question: "In the sentence: 'The politician made an ambiguous statement that misled the public', choose the word nearest in meaning to the OPPOSITE of 'ambiguous'.",
    options: [
      { letter: "A", text: "Complicated" },
      { letter: "B", text: "Explicit" },
      { letter: "C", text: "Dubious" },
      { letter: "D", text: "Hesitant" },
    ],
    correctLetter: "B",
    ruleTitle: "Antonym Context",
    explanation: "'Ambiguous' means open to more than one interpretation or vague. Its direct antonym is 'explicit', which means stated clearly and in detail, leaving no room for doubt.",
  },
  {
    id: "eng-prep-1",
    topicContext: "Prepositions & Dependent Collocations",
    question: "Select the correct option to fill the gap: 'After a thorough probe, the bursar was exonerated _______ all fraudulent charges.'",
    options: [
      { letter: "A", text: "from" },
      { letter: "B", text: "of" },
      { letter: "C", text: "against" },
      { letter: "D", text: "with" },
    ],
    correctLetter: "A",
    ruleTitle: "Dependent Preposition",
    explanation: "The standard English dependent preposition collocated with the verb 'exonerate' is 'from' (to exonerate someone from blame or charges).",
  },
  {
    id: "eng-tag-1",
    topicContext: "Grammar (Question Tags)",
    question: "Choose the correct question tag: 'You seldom visit your grandparents during vacations, _______?'",
    options: [
      { letter: "A", text: "don't you" },
      { letter: "B", text: "do you" },
      { letter: "C", text: "aren't you" },
      { letter: "D", text: "didn't you" },
    ],
    correctLetter: "B",
    ruleTitle: "Negative Adverbial Tag",
    explanation: "Adverbs such as 'seldom', 'rarely', 'hardly', and 'scarcely' make the statement grammatically negative. Negative statements require an affirmative question tag with the auxiliary 'do': 'do you?'.",
  },
  {
    id: "eng-synonym-1",
    topicContext: "Vocabulary (Synonyms / Nearest in Meaning)",
    question: "In the sentence: 'The defense attorney presented a plausible explanation for the client's absence', choose the word NEAREST IN MEANING to 'plausible'.",
    options: [
      { letter: "A", text: "Believable" },
      { letter: "B", text: "Complicated" },
      { letter: "C", text: "False" },
      { letter: "D", text: "Unacceptable" },
    ],
    correctLetter: "A",
    ruleTitle: "Synonym Context",
    explanation: "'Plausible' describes an argument, explanation, or statement that seems reasonable, credible, or believable.",
  },
  {
    id: "eng-subjunctive-1",
    topicContext: "Advanced Syntax (Mandative Subjunctive)",
    question: "Select the option that best completes the sentence: 'The disciplinary committee recommended that the suspended student _______ before resumption.'",
    options: [
      { letter: "A", text: "apologizes" },
      { letter: "B", text: "apologize" },
      { letter: "C", text: "apologized" },
      { letter: "D", text: "should have apologized" },
    ],
    correctLetter: "B",
    ruleTitle: "Mandative Subjunctive",
    explanation: "Verbs of recommendation, demand, or insistence (demand, recommend, insist that...) take the mandative subjunctive mood, which requires the bare base infinitive ('apologize') regardless of the third-person singular subject.",
  },
  {
    id: "eng-stress-1",
    topicContext: "Oral Forms (Primary Syllabic Stress)",
    question: "Which syllable carries the primary stress in the word 'PHOTOGRAPHY'?",
    options: [
      { letter: "A", text: "First syllable (PHO-)" },
      { letter: "B", text: "Second syllable (-TOG-)" },
      { letter: "C", text: "Third syllable (-RA-)" },
      { letter: "D", text: "Fourth syllable (-phy)" },
    ],
    correctLetter: "B",
    ruleTitle: "Suffix Stress Pattern",
    explanation: "In polysyllabic words ending with the suffix '-graphy', primary stress consistently falls on the antepenultimate (third from the end) syllable: pho-TOG-ra-phy.",
  },
  {
    id: "eng-idiom-1",
    topicContext: "Idiomatic Expressions",
    question: "Interpret the idiom: 'When the crisis worsened, the director decided to bite the bullet.' This means the director decided to _______.",
    options: [
      { letter: "A", text: "resign from office immediately" },
      { letter: "B", text: "face an inevitable, difficult situation with courage" },
      { letter: "C", text: "engage in a violent argument" },
      { letter: "D", text: "blame his subordinates for the problem" },
    ],
    correctLetter: "B",
    ruleTitle: "Idiomatic Meaning",
    explanation: "To 'bite the bullet' is a recognized idiom meaning to accept an inevitable, painful, or difficult situation with determination and fortitude.",
  },
  {
    id: "eng-concord-2",
    topicContext: "Lexis & Structure (Parenthetical Concord)",
    question: "Select the best option: 'The governor, accompanied by his commissioners, _______ arriving at the summit shortly.'",
    options: [
      { letter: "A", text: "is" },
      { letter: "B", text: "are" },
      { letter: "C", text: "were" },
      { letter: "D", text: "have been" },
    ],
    correctLetter: "A",
    ruleTitle: "Parenthetical Phrase Rule",
    explanation: "Parenthetical expressions introduced by 'accompanied by', 'as well as', 'together with', or 'in addition to' do not alter the number of the actual subject. 'The governor' is singular, so the singular verb 'is' is correct.",
  },
  {
    id: "eng-vowel-1",
    topicContext: "Oral Forms (Vowel Sound Identification)",
    question: "Identify the word that contains the SAME vowel sound as the one represented in the underlined letters in 'pl<u>ea</u>se' /i:/:",
    options: [
      { letter: "A", text: "Key" },
      { letter: "B", text: "Great" },
      { letter: "C", text: "Plait" },
      { letter: "D", text: "Bread" },
    ],
    correctLetter: "A",
    ruleTitle: "Long Vowel /i:/",
    explanation: "'Please' contains the long front close vowel /i:/. Among the options, 'Key' /ki:/ shares this exact sound, whereas 'Great' has /eɪ/, 'Plait' has /æ/, and 'Bread' has /e/.",
  },
];

export default function InteractiveSampleQuestion() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const currentQuestion = UNIVERSAL_ENGLISH_POOL[currentIndex] || UNIVERSAL_ENGLISH_POOL[0];

  const handleSelect = (letter: "A" | "B" | "C" | "D") => {
    setSelectedLetter(letter);
    setShowFeedback(true);
  };

  const handleNext = () => {
    setIsShuffling(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % UNIVERSAL_ENGLISH_POOL.length);
      setSelectedLetter(null);
      setShowFeedback(false);
      setIsShuffling(false);
    }, 100);
  };

  const handlePrevious = () => {
    setIsShuffling(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + UNIVERSAL_ENGLISH_POOL.length) % UNIVERSAL_ENGLISH_POOL.length);
      setSelectedLetter(null);
      setShowFeedback(false);
      setIsShuffling(false);
    }, 100);
  };

  const handleShuffle = () => {
    setIsShuffling(true);
    const poolWithoutCurrent = UNIVERSAL_ENGLISH_POOL.map((_, i) => i).filter((i) => i !== currentIndex);
    const randomIdx = poolWithoutCurrent[Math.floor(Math.random() * poolWithoutCurrent.length)];
    setTimeout(() => {
      setCurrentIndex(randomIdx !== undefined ? randomIdx : (currentIndex + 1) % UNIVERSAL_ENGLISH_POOL.length);
      setSelectedLetter(null);
      setShowFeedback(false);
      setIsShuffling(false);
    }, 100);
  };

  const isCorrect = selectedLetter === currentQuestion.correctLetter;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xl shadow-blue-950/5 transition-colors">
      {/* Universal Subject Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-900 text-xs font-black">
            ENG
          </span>
          <div>
            <p className="text-xs font-black text-slate-900">
              Universal Compulsory Subject · Use of English
            </p>
            <p className="text-[10px] text-slate-500">
              {currentQuestion.topicContext}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
          <span>Question {currentIndex + 1} of {UNIVERSAL_ENGLISH_POOL.length}</span>
        </div>
      </div>

      {/* Question Body */}
      <div className={`transition-opacity duration-150 ${isShuffling ? "opacity-40" : "opacity-100"}`}>
        <p className="text-sm sm:text-base font-semibold leading-relaxed text-slate-900">
          {currentQuestion.question}
        </p>

        {/* Options Grid */}
        <div className="mt-4 space-y-2">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedLetter === option.letter;
            const isAnswerLetter = option.letter === currentQuestion.correctLetter;

            let buttonStyle = "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-blue-300 hover:bg-blue-50/40";
            let badgeStyle = "bg-white text-slate-700 border-slate-200";

            if (showFeedback) {
              if (isAnswerLetter) {
                buttonStyle = "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold ring-1 ring-emerald-400";
                badgeStyle = "bg-emerald-600 text-white border-emerald-600";
              } else if (isSelected && !isCorrect) {
                buttonStyle = "border-rose-400 bg-rose-50/80 text-rose-950 ring-1 ring-rose-400";
                badgeStyle = "bg-rose-600 text-white border-rose-600";
              } else {
                buttonStyle = "border-slate-200 bg-slate-50/30 text-slate-400 opacity-60";
              }
            } else if (isSelected) {
              buttonStyle = "border-blue-600 bg-blue-50 text-blue-950 font-bold ring-1 ring-blue-500";
              badgeStyle = "bg-blue-600 text-white border-blue-600";
            }

            return (
              <button
                key={option.letter}
                type="button"
                onClick={() => handleSelect(option.letter)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-xs sm:text-sm transition-all duration-150 active:scale-[0.99] ${buttonStyle}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${badgeStyle}`}
                >
                  {option.letter}
                </span>
                <span className="flex-1">{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instant Feedback & Worked Rule Explanation */}
      {showFeedback && (
        <div
          className={`mt-4 rounded-2xl border p-4 text-xs transition-all ${
            isCorrect
              ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
              : "border-amber-200 bg-amber-50/90 text-amber-950"
          }`}
        >
          <div className="flex items-center justify-between font-black">
            <span className="flex items-center gap-1.5">
              {isCorrect ? (
                <>
                  <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Correct Answer: Option {currentQuestion.correctLetter}</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Incorrect. Correct Option is {currentQuestion.correctLetter}</span>
                </>
              )}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              {currentQuestion.ruleTitle}
            </span>
          </div>

          <p className="mt-2 text-slate-700 leading-relaxed">
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {/* Sandbox Navigation Controls */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={handlePrevious}
          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
        >
          ← Previous
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShuffle}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
            title="Random question"
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-xl bg-[#012153] hover:bg-blue-900 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition"
          >
            Next Question →
          </button>
        </div>
      </div>
    </div>
  );
}
