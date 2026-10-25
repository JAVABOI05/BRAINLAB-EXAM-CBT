"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import LearningStreakCard from "../components/LearningStreakCard";
import { supabase } from "../lib/supabase";
import {
  recordLearningActivity,
  getUserGamificationProfile,
  type UserGamificationProfile,
} from "../lib/gamification";

type OptionKey = "A" | "B" | "C" | "D";

interface ChallengeQuestion {
  id: string;
  subject: string;
  question: string;
  options: Record<OptionKey, string>;
  correctAnswer: OptionKey;
  explanation: string;
}

interface ChallengeMode {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  durationSeconds: number;
  xpMultiplier: number;
  questionCount: number;
  subjects: string[];
}

const CHALLENGE_MODES: ChallengeMode[] = [
  {
    id: "daily_blitz",
    title: "Daily 5-Minute Blitz",
    subtitle: "10 high-yield questions across all major subjects. Defend your streak with 2x XP multiplier!",
    icon: "⚡",
    badge: "2× XP BONUS",
    durationSeconds: 300,
    xpMultiplier: 2.0,
    questionCount: 10,
    subjects: ["Mathematics", "English", "Biology", "Chemistry", "Physics", "Economics"],
  },
  {
    id: "math_sprint",
    title: "Mathematics Speed Run",
    subtitle: "Algebra, calculus, logarithms, and geometry fast drills.",
    icon: "📐",
    badge: "1.5× XP",
    durationSeconds: 360,
    xpMultiplier: 1.5,
    questionCount: 10,
    subjects: ["Mathematics"],
  },
  {
    id: "english_sprint",
    title: "English Lexis & Structure",
    subtitle: "Grammar concord, antonyms, synonyms, and idiom master sprint.",
    icon: "📖",
    badge: "1.5× XP",
    durationSeconds: 300,
    xpMultiplier: 1.5,
    questionCount: 10,
    subjects: ["English"],
  },
  {
    id: "science_sprint",
    title: "Science Triple Threat",
    subtitle: "Rapid-fire questions blending Biology, Chemistry, and Physics.",
    icon: "🔬",
    badge: "1.5× XP",
    durationSeconds: 360,
    xpMultiplier: 1.5,
    questionCount: 10,
    subjects: ["Biology", "Chemistry", "Physics"],
  },
  {
    id: "arts_commercial_sprint",
    title: "Commercial & Social Sciences",
    subtitle: "Economics, Government, and Commerce key exam concepts.",
    icon: "🏛️",
    badge: "1.5× XP",
    durationSeconds: 300,
    xpMultiplier: 1.5,
    questionCount: 10,
    subjects: ["Economics", "Government"],
  },
];

const QUESTION_BANK: ChallengeQuestion[] = [
  // Mathematics
  {
    id: "m1",
    subject: "Mathematics",
    question: "If log₁₀ 2 = 0.3010 and log₁₀ 3 = 0.4771, find the value of log₁₀ 18.",
    options: {
      A: "1.2552",
      B: "0.9542",
      C: "1.0791",
      D: "1.4771",
    },
    correctAnswer: "A",
    explanation: "log₁₀ 18 = log₁₀ (2 × 3²) = log₁₀ 2 + 2(log₁₀ 3) = 0.3010 + 2(0.4771) = 0.3010 + 0.9542 = 1.2552.",
  },
  {
    id: "m2",
    subject: "Mathematics",
    question: "Differentiate y = (3x² - 2)⁴ with respect to x.",
    options: {
      A: "24x(3x² - 2)³",
      B: "12x(3x² - 2)³",
      C: "4(3x² - 2)³",
      D: "24(3x² - 2)³",
    },
    correctAnswer: "A",
    explanation: "Using the chain rule: dy/dx = 4(3x² - 2)³ · d/dx(3x² - 2) = 4(3x² - 2)³ · (6x) = 24x(3x² - 2)³.",
  },
  {
    id: "m3",
    subject: "Mathematics",
    question: "A bag contains 5 red balls and 7 black balls. If two balls are drawn at random without replacement, find the probability that both are red.",
    options: {
      A: "5/33",
      B: "25/144",
      C: "7/22",
      D: "35/132",
    },
    correctAnswer: "A",
    explanation: "P(both red) = (5/12) × (4/11) = 20/132 = 5/33.",
  },
  {
    id: "m4",
    subject: "Mathematics",
    question: "Find the sum to infinity of the geometric progression: 1, 1/3, 1/9, 1/27, ...",
    options: {
      A: "3/2",
      B: "2/3",
      C: "4/3",
      D: "3/4",
    },
    correctAnswer: "A",
    explanation: "First term a = 1, common ratio r = 1/3. Sum to infinity S_∞ = a / (1 - r) = 1 / (1 - 1/3) = 1 / (2/3) = 3/2.",
  },

  // English Language
  {
    id: "e1",
    subject: "English",
    question: "Choose the word nearest in meaning to the italicized word: 'The politician's argument was completely TENABLE and backed by verifiable census records.'",
    options: {
      A: "Defensible",
      B: "Fragile",
      C: "Ambiguous",
      D: "Dubious",
    },
    correctAnswer: "A",
    explanation: "'Tenable' describes an argument, position, or theory that is justifiable, defensible, and able to be maintained against attack or objection.",
  },
  {
    id: "e2",
    subject: "English",
    question: "Select the option that correctly completes the sentence: 'Neither the principal nor the teachers _____ in attendance at the emergency briefing yesterday.'",
    options: {
      A: "were",
      B: "was",
      C: "is",
      D: "are",
    },
    correctAnswer: "A",
    explanation: "Under the rule of proximity for 'neither... nor', when subjects differ in number, the verb agrees with the closer subject. 'Teachers' is plural and the event occurred yesterday (past), so 'were' is correct.",
  },
  {
    id: "e3",
    subject: "English",
    question: "Choose the word opposite in meaning (antonym) to the capitalized word: 'The company entered a period of ACUTE financial instability.'",
    options: {
      A: "Mild",
      B: "Severe",
      C: "Sudden",
      D: "Crucial",
    },
    correctAnswer: "A",
    explanation: "'Acute' denotes intense, severe, or sharply experienced distress. Its direct antonym is 'mild' or 'slight'.",
  },
  {
    id: "e4",
    subject: "English",
    question: "Choose the option that best explains the idiom: 'The new manager refused to BEAT ABOUT THE BUSH during the meeting.'",
    options: {
      A: "Speak directly and honestly about the main problem",
      B: "Avoid talking about unpleasant truths",
      C: "Waste company resources unnecessarily",
      D: "Arrive late to scheduled discussions",
    },
    correctAnswer: "A",
    explanation: "To 'beat about the bush' means to discuss a matter without coming directly to the point. Refusing to beat about the bush means addressing the issue directly and plainly.",
  },

  // Biology
  {
    id: "b1",
    subject: "Biology",
    question: "Which of the following cellular organelles is primarily responsible for ATP synthesis during cellular respiration?",
    options: {
      A: "Mitochondria",
      B: "Ribosome",
      C: "Golgi apparatus",
      D: "Endoplasmic reticulum",
    },
    correctAnswer: "A",
    explanation: "Mitochondria are the powerhouses of eukaryotic cells, executing the Krebs cycle and oxidative phosphorylation to synthesize ATP.",
  },
  {
    id: "b2",
    subject: "Biology",
    question: "In human circulatory physiology, which blood vessel carries oxygenated blood from the lungs back to the left atrium of the heart?",
    options: {
      A: "Pulmonary vein",
      B: "Pulmonary artery",
      C: "Vena cava",
      D: "Aorta",
    },
    correctAnswer: "A",
    explanation: "The pulmonary veins are unique among veins because they transport freshly oxygenated blood from the alveolar capillary beds of the lungs into the left atrium.",
  },
  {
    id: "b3",
    subject: "Biology",
    question: "A cross between a homozygous red-flowered plant (RR) and a homozygous white-flowered plant (rr) produces pink flowers in all F₁ offspring. This genetic phenomenon illustrates:",
    options: {
      A: "Incomplete dominance",
      B: "Co-dominance",
      C: "Epistasis",
      D: "Sex-linked inheritance",
    },
    correctAnswer: "A",
    explanation: "Incomplete dominance occurs when neither allele is completely dominant, resulting in a heterozygous phenotype that is an intermediate blend (pink) of the two homozygous traits.",
  },

  // Chemistry
  {
    id: "c1",
    subject: "Chemistry",
    question: "What volume of hydrogen gas is liberated at s.t.p. when 2.4 g of magnesium reacts completely with excess dilute hydrochloric acid? (Mg = 24, Molar volume at s.t.p. = 22.4 dm³)",
    options: {
      A: "2.24 dm³",
      B: "1.12 dm³",
      C: "4.48 dm³",
      D: "22.4 dm³",
    },
    correctAnswer: "A",
    explanation: "Reaction: Mg + 2HCl → MgCl₂ + H₂. Moles of Mg = 2.4g / 24g/mol = 0.1 mol. Since mole ratio Mg:H₂ is 1:1, 0.1 mol of H₂ is produced. Volume = 0.1 mol × 22.4 dm³/mol = 2.24 dm³.",
  },
  {
    id: "c2",
    subject: "Chemistry",
    question: "Which of the following electronic configurations represents a transition element in the periodic table?",
    options: {
      A: "1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁵ 4s¹",
      B: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s²",
      C: "1s² 2s² 2p⁶ 3s² 3p⁴",
      D: "1s² 2s² 2p⁶ 3s² 3p⁶ 3d¹⁰ 4s² 4p²",
    },
    correctAnswer: "A",
    explanation: "Configuration 1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁵ 4s¹ represents Chromium (Cr, atomic number 24), a d-block transition element with half-filled stable 3d and 4s subshells.",
  },
  {
    id: "c3",
    subject: "Chemistry",
    question: "According to Le Chatelier's principle, what will happen to the equilibrium 2SO₂(g) + O₂(g) ⇌ 2SO₃(g) (ΔH = -197 kJ) if the pressure is increased at constant temperature?",
    options: {
      A: "Equilibrium shifts to the right (forward reaction favored)",
      B: "Equilibrium shifts to the left (backward reaction favored)",
      C: "Equilibrium remains unaffected",
      D: "Reaction rate drops to zero",
    },
    correctAnswer: "A",
    explanation: "An increase in pressure favors the side with fewer moles of gas. The reactants have 3 moles (2 + 1) while the product has 2 moles. Thus, equilibrium shifts forward to yield more SO₃.",
  },

  // Physics
  {
    id: "p1",
    subject: "Physics",
    question: "An object is dropped from rest from the top of a cliff 80 meters high. Calculate the time it takes to strike the ground below. (Take g = 10 m/s² and ignore air resistance)",
    options: {
      A: "4.0 seconds",
      B: "2.8 seconds",
      C: "8.0 seconds",
      D: "16.0 seconds",
    },
    correctAnswer: "A",
    explanation: "Using s = ut + ½gt² with initial velocity u = 0: 80 = 0 + ½(10)t² => 80 = 5t² => t² = 16 => t = 4.0 seconds.",
  },
  {
    id: "p2",
    subject: "Physics",
    question: "A step-down transformer has 1200 turns in its primary coil and 120 turns in its secondary coil. If an alternating voltage of 240 V is applied to the primary, what is the output voltage from the secondary coil?",
    options: {
      A: "24 V",
      B: "12 V",
      C: "2400 V",
      D: "48 V",
    },
    correctAnswer: "A",
    explanation: "Transformer formula: V_s / V_p = N_s / N_p => V_s = 240 × (120 / 1200) = 240 × 0.1 = 24 V.",
  },

  // Economics & Government
  {
    id: "ec1",
    subject: "Economics",
    question: "When the percentage change in quantity demanded is exactly equal to the percentage change in price, elasticity of demand is described as:",
    options: {
      A: "Unitary elastic (Ed = 1)",
      B: "Perfectively elastic (Ed = ∞)",
      C: "Inelastic (Ed < 1)",
      D: "Perfectively inelastic (Ed = 0)",
    },
    correctAnswer: "A",
    explanation: "Unitary elasticity occurs when price elasticity of demand |Ed| = 1, meaning that any percentage shift in price produces a proportional change in quantity demanded.",
  },
  {
    id: "g1",
    subject: "Government",
    question: "The doctrine of separation of powers, designed to prevent tyranny by dividing governmental powers between the executive, legislature, and judiciary, was formulated systematically by:",
    options: {
      A: "Baron de Montesquieu",
      B: "John Locke",
      C: "Jean-Jacques Rousseau",
      D: "Thomas Hobbes",
    },
    correctAnswer: "A",
    explanation: "Baron de Montesquieu expounded the modern doctrine of separation of powers in his 1748 masterpiece 'The Spirit of the Laws' (De l'esprit des lois).",
  },
];

export default function ChallengeArenaPage() {
  const [profile, setProfile] = useState<UserGamificationProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<ChallengeMode>(CHALLENGE_MODES[0]);
  const [activeSession, setActiveSession] = useState<boolean>(false);
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, OptionKey>>({});
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [scoreData, setScoreData] = useState<{
    correctCount: number;
    total: number;
    percentage: number;
    timeSpent: number;
    xpEarned: number;
    streakDays: number;
    newBadges: string[];
  } | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeChallengeRef = useRef<() => Promise<void>>(async () => {});

  // Load user session and gamification stats
  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      const { data: auth } = await supabase.auth.getUser();
      if (!mounted) return;
      if (auth.user) {
        setUserId(auth.user.id);
        const p = await getUserGamificationProfile(auth.user.id);
        if (mounted && p) setProfile(p);
      }
    }
    void loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  // Timer countdown. Completion is handled separately after timeLeft reaches zero.
  useEffect(() => {
    if (!activeSession || isFinished || timeLeft <= 0) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [activeSession, isFinished, timeLeft > 0]);

  useEffect(() => {
    if (!activeSession || isFinished || timeLeft !== 0) return;
    const timeoutId = window.setTimeout(() => {
      void completeChallengeRef.current();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeSession, isFinished, timeLeft]);
  const handleStartChallenge = (mode: ChallengeMode) => {
    setSelectedMode(mode);
    // Filter questions based on mode subjects
    const filtered = QUESTION_BANK.filter((q) =>
      mode.subjects.includes(q.subject)
    );
    // Shuffle and pick desired count
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const finalSet = shuffled.slice(0, mode.questionCount);
    // Fallback if not enough questions in subject
    const selected = finalSet.length >= 5 ? finalSet : QUESTION_BANK.slice(0, mode.questionCount);

    setQuestions(selected);
    setCurrentIndex(0);
    setUserAnswers({});
    setTimeLeft(mode.durationSeconds);
    setIsFinished(false);
    setScoreData(null);
    setActiveSession(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectOption = (questionId: string, option: OptionKey) => {
    if (isFinished) return;
    setUserAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  useEffect(() => {
    completeChallengeRef.current = handleCompleteChallenge;
  }, [handleCompleteChallenge]);

  const handleCompleteChallenge = useCallback(async () => {
    if (isFinished || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    let correctCount = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const total = questions.length;
    const percentage = Math.round((correctCount / total) * 100);
    const timeSpent = selectedMode.durationSeconds - timeLeft;

    // Base XP calculation: 10 XP per correct question
    // Scaled by mode multiplier and extra bonus for high score
    let baseXP = correctCount * 10;
    if (percentage >= 80) baseXP += 50; // Excellence bonus
    const xpEarned = Math.round(baseXP * selectedMode.xpMultiplier);

    let streakDays = profile?.current_streak_days ?? 1;
    let newBadges: string[] = [];

    // Award substantive gamification activity if signed in
    if (userId) {
      try {
        const challengeRef = `arena_${selectedMode.id}_${Date.now()}`;
        const activityRes = await recordLearningActivity(
          "quiz_complete",
          challengeRef,
          percentage
        );
        if (activityRes.ok) {
          if (activityRes.streak_days) streakDays = activityRes.streak_days;
          if (activityRes.new_badges) newBadges = activityRes.new_badges;
        }
        // Refresh profile stats
        const updatedProfile = await getUserGamificationProfile(userId);
        if (updatedProfile) setProfile(updatedProfile);
      } catch {}
    } else {
      // Local fallback for anonymous practice
      const localStreak = parseInt(localStorage.getItem("brainlab_streak_count") || "0", 10) + 1;
      streakDays = localStreak;
      localStorage.setItem("brainlab_streak_count", String(localStreak));
      localStorage.setItem("brainlab_last_active_date", new Date().toISOString().split("T")[0]);
    }

    setScoreData({
      correctCount,
      total,
      percentage,
      timeSpent,
      xpEarned,
      streakDays,
      newBadges,
    });

    setIsFinished(true);
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isFinished, submitting, questions, userAnswers, selectedMode, timeLeft, userId, profile]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Arena Breadcrumb & Header - Only shown in lobby view */}
        {!activeSession && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Link href="/dashboard" className="hover:text-blue-600 dark:hover:text-cyan-400">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-slate-900 dark:text-slate-200">Challenge Arena</span>
              </nav>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white flex items-center gap-2.5">
                <span>⚡ Challenge Arena</span>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-3 py-0.5 text-xs font-black text-amber-800 dark:text-amber-300">
                  DAILY SPRINT &amp; XP
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/learning/achievements"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-sm transition hover:bg-amber-100 dark:hover:bg-amber-900/40"
              >
                <span>🔥</span>
                <span>Streak &amp; Badges</span>
              </Link>
              <Link
                href="/cbt"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#012153] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-900"
              >
                <span>📝</span>
                <span>Full CBT Exam</span>
              </Link>
            </div>
          </div>
        )}

        {/* LOBBY VIEW */}
        {!activeSession && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Embedded Learning Streak Card with Reminder */}
            <section aria-label="Learning Streak Status">
              <LearningStreakCard
                currentStreak={profile?.current_streak_days ?? 0}
                longestStreak={profile?.longest_streak_days ?? 0}
                lastActiveDate={profile?.last_activity_date}
                compact={false}
              />
            </section>

            {/* Daily Sprint Banner */}
            <section className="relative overflow-hidden rounded-3xl border border-blue-600/30 bg-gradient-to-r from-[#00112b] via-[#012153] to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
              <div className="relative z-10 max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-1 text-xs font-black tracking-wide text-amber-300 uppercase">
                  ⚡ 5-Minute Daily Challenge
                </span>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  Ignite Your Learning Flame Today
                </h2>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  Spend 5 minutes answering 10 fast-paced questions. Complete the challenge to double your XP, extend your streak, and unlock academic badges!
                </p>
                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleStartChallenge(CHALLENGE_MODES[0])}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition-all duration-150 active:scale-95"
                  >
                    <span>⚡ Start Daily 5-Min Blitz</span>
                    <span className="text-xs bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-extrabold">
                      2× XP
                    </span>
                  </button>
                  <span className="text-xs text-slate-300">
                    ⏱️ 300 seconds · 10 questions · Immediate corrections
                  </span>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-10 opacity-15 text-[180px] select-none pointer-events-none" aria-hidden="true">
                ⚡
              </div>
            </section>

            {/* Subject Specific Challenge Tracks */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    🎯 Practice Challenge Modes
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Target specific disciplines in rapid 10-question micro-quizzes.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {CHALLENGE_MODES.slice(1).map((mode) => (
                  <div
                    key={mode.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-2xl">
                          {mode.icon}
                        </span>
                        <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[11px] font-black text-blue-800 dark:text-blue-300">
                          {mode.badge}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {mode.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {mode.subtitle}
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>⏱️ {mode.durationSeconds / 60} mins</span>
                        <span>•</span>
                        <span>📋 {mode.questionCount} Questions</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartChallenge(mode)}
                      className="mt-5 w-full rounded-xl bg-slate-100 hover:bg-[#012153] hover:text-white dark:bg-slate-800 dark:hover:bg-blue-700 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all duration-150 active:scale-95"
                    >
                      Start Challenge →
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ACTIVE TEST SESSION */}
        {activeSession && !isFinished && questions.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Countdown Bar */}
            <div className="sticky top-2 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 shadow-md flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">{selectedMode.icon}</span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedMode.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Question {currentIndex + 1} of {questions.length}
                  </p>
                </div>
              </div>

              {/* Timer indicator */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black tracking-wider ${
                    timeLeft < 60
                      ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <span>⏱️</span>
                  <span>{formatTime(timeLeft)}</span>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm("Submit your challenge now?")) {
                      void handleCompleteChallenge();
                    }
                  }}
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black text-white transition active:scale-95 shadow-sm"
                >
                  {submitting ? "Submitting..." : "Submit Sprint"}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Current Question Card */}
            {questions[currentIndex] && (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-300">
                    {questions[currentIndex].subject}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {Object.keys(userAnswers).length} of {questions.length} Answered
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                  {questions[currentIndex].question}
                </h3>

                {/* Options List */}
                <div className="space-y-3">
                  {(["A", "B", "C", "D"] as OptionKey[]).map((optKey) => {
                    const isSelected = userAnswers[questions[currentIndex].id] === optKey;
                    return (
                      <button
                        key={optKey}
                        onClick={() => handleSelectOption(questions[currentIndex].id, optKey)}
                        className={`w-full flex items-start gap-3.5 p-4 rounded-2xl text-left border transition-all duration-150 active:scale-[0.99] ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:border-blue-500 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black transition ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {optKey}
                        </span>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 pt-0.5">
                          {questions[currentIndex].options[optKey]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Question Navigation Controls */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    ← Previous
                  </button>

                  <div className="flex gap-1.5">
                    {questions.map((q, idx) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                          currentIndex === idx
                            ? "bg-[#012153] text-white ring-2 ring-blue-500"
                            : userAnswers[q.id]
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  {currentIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition active:scale-95"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleCompleteChallenge()}
                      disabled={submitting}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-black text-white transition active:scale-95 shadow-sm"
                    >
                      {submitting ? "Finishing..." : "Finish Challenge"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESULTS & REVIEW VIEW */}
        {isFinished && scoreData && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Celebration Scorecard */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className="bg-gradient-to-r from-[#00112b] via-[#012153] to-blue-900 p-6 sm:p-8 text-white text-center space-y-4">
                <span className="text-4xl" aria-hidden="true">
                  {scoreData.percentage >= 80 ? "🏆" : scoreData.percentage >= 50 ? "🎉" : "💪"}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black">
                  {scoreData.percentage >= 80
                    ? "Magnificent Sprint!"
                    : scoreData.percentage >= 50
                    ? "Well Done, Challenger!"
                    : "Good Effort, Keep Practicing!"}
                </h2>
                <div className="flex items-center justify-center gap-6 pt-2">
                  <div className="text-center">
                    <p className="text-3xl sm:text-4xl font-black text-amber-400">
                      {scoreData.correctCount} / {scoreData.total}
                    </p>
                    <p className="text-xs uppercase font-extrabold text-slate-300">Score ({scoreData.percentage}%)</p>
                  </div>
                  <div className="h-10 w-px bg-white/20" />
                  <div className="text-center">
                    <p className="text-3xl sm:text-4xl font-black text-emerald-400">
                      +{scoreData.xpEarned}
                    </p>
                    <p className="text-xs uppercase font-extrabold text-slate-300">XP Earned</p>
                  </div>
                  <div className="h-10 w-px bg-white/20" />
                  <div className="text-center">
                    <p className="text-3xl sm:text-4xl font-black text-orange-400 flex items-center justify-center gap-1">
                      <span>🔥</span>
                      <span>{scoreData.streakDays}</span>
                    </p>
                    <p className="text-xs uppercase font-extrabold text-slate-300">Day Streak</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 max-w-md mx-auto pt-2">
                  Completed in {Math.floor(scoreData.timeSpent / 60)}m {scoreData.timeSpent % 60}s · Multiplier {selectedMode.xpMultiplier}× applied!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setIsFinished(false);
                    setActiveSession(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-xl bg-[#012153] hover:bg-blue-900 px-5 py-3 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                >
                  ⚡ Take Another Challenge
                </button>
                <Link
                  href="/learning/achievements"
                  className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-5 py-3 text-xs font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100 transition active:scale-95"
                >
                  🏅 View Badges &amp; Streak Hub →
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>

            {/* Comprehensive Question Review */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📝 Solution Explanations &amp; Review</span>
              </h3>

              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const studentAnswer = userAnswers[q.id];
                  const isCorrect = studentAnswer === q.correctAnswer;
                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Question {idx + 1} ({q.subject})
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                            isCorrect
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                          }`}
                        >
                          {isCorrect ? "✓ Correct" : "✗ Review Needed"}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {q.question}
                      </h4>

                      <div className="grid gap-2 sm:grid-cols-2 pt-2">
                        {(["A", "B", "C", "D"] as OptionKey[]).map((opt) => {
                          const isKeyCorrect = opt === q.correctAnswer;
                          const isStudentSelected = opt === studentAnswer;
                          return (
                            <div
                              key={opt}
                              className={`p-3 rounded-xl border text-xs sm:text-sm font-medium ${
                                isKeyCorrect
                                  ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold"
                                  : isStudentSelected && !isCorrect
                                  ? "border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200"
                                  : "border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <span className="font-black mr-1.5">{opt}.</span>
                              <span>{q.options[opt]}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      <div className="mt-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 p-3.5 text-xs sm:text-sm text-blue-950 dark:text-blue-200">
                        <span className="font-black block text-blue-800 dark:text-cyan-400 mb-1">
                          💡 Solution Note:
                        </span>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
