import { supabase } from "./supabase";

export interface SpacedReviewCard {
  id: string;
  questionId: string;
  subject: string;
  category: string;
  questionText?: string;
  options?: Record<string, string>;
  correctAnswer?: string;
  repetitionCount: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
  isMastered: boolean;
}

const LOCAL_STORAGE_SPACED_KEY = "brainlab_spaced_reviews_v1";

export async function getDueSpacedReviews(): Promise<SpacedReviewCard[]> {
  const today = new Date().toISOString().split("T")[0];
  let localCards: SpacedReviewCard[] = [];

  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_SPACED_KEY) : null;
    if (raw) {
      localCards = JSON.parse(raw);
    }
  } catch {}

  const dueLocal = localCards.filter((c) => !c.isMastered && c.dueDate <= today);

  try {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (!sessionData?.session?.user?.id) {
      return dueLocal;
    }

    const { data, error } = await supabase
      .from("learner_spaced_reviews")
      .select("id, question_id, subject, category, repetition_count, interval_days, ease_factor, due_date, is_mastered")
      .lte("due_date", today)
      .eq("is_mastered", false)
      .limit(20);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r) => ({
        id: r.id,
        questionId: r.question_id,
        subject: r.subject,
        category: r.category,
        repetitionCount: r.repetition_count,
        intervalDays: r.interval_days,
        easeFactor: Number(r.ease_factor),
        dueDate: r.due_date,
        isMastered: r.is_mastered,
      }));
    }
  } catch {}

  return dueLocal;
}

/**
 * Enqueues a missed question from an exam or practice session into the learner's spaced repetition deck.
 */
export async function enqueueMissedQuestion(item: {
  questionId: string | number;
  subject: string;
  category: string;
  questionText?: string;
  options?: Record<string, string>;
  correctAnswer?: string;
}): Promise<void> {
  const qId = String(item.questionId).trim();
  const today = new Date().toISOString().split("T")[0];

  // 1. Mirror in local storage
  let localCards: SpacedReviewCard[] = [];
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_SPACED_KEY) : null;
    if (raw) localCards = JSON.parse(raw);
  } catch {}

  const exists = localCards.some((c) => c.questionId === qId);
  if (!exists) {
    const newCard: SpacedReviewCard = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      questionId: qId,
      subject: item.subject,
      category: item.category || "General",
      questionText: item.questionText,
      options: item.options,
      correctAnswer: item.correctAnswer,
      repetitionCount: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      dueDate: today,
      isMastered: false,
    };
    localCards.unshift(newCard);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_SPACED_KEY, JSON.stringify(localCards));
      } catch {}
    }
  }

  // 2. Persist in Supabase
  try {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (sessionData?.session?.user?.id) {
      await supabase.from("learner_spaced_reviews").upsert(
        {
          user_id: sessionData.session.user.id,
          question_id: qId,
          subject: item.subject,
          category: item.category || "General",
          repetition_count: 0,
          interval_days: 1,
          ease_factor: 2.5,
          due_date: today,
          is_mastered: false,
        },
        { onConflict: "user_id,question_id" }
      );
    }
  } catch {}
}

/**
 * Rates a card review (1 = Hard, 2 = Good, 3 = Easy) applying the SM-2 spaced repetition calculation.
 */
export async function rateCardReview(cardId: string, rating: 1 | 2 | 3): Promise<{ nextIntervalDays: number; isMastered: boolean }> {
  let localCards: SpacedReviewCard[] = [];
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_SPACED_KEY) : null;
    if (raw) localCards = JSON.parse(raw);
  } catch {}

  const card = localCards.find((c) => c.id === cardId || c.questionId === cardId);
  let newInterval = 1;
  let newReps = 0;
  let newEase = card?.easeFactor ?? 2.5;
  let isMastered = false;

  if (rating === 1) {
    // Hard: repeat tomorrow
    newInterval = 1;
    newReps = 0;
    newEase = Math.max(1.3, newEase - 0.2);
  } else if (rating === 2) {
    // Good: progress standard SM-2 intervals
    newReps = (card?.repetitionCount ?? 0) + 1;
    if (newReps === 1) newInterval = 1;
    else if (newReps === 2) newInterval = 3;
    else newInterval = Math.round((card?.intervalDays ?? 1) * newEase);
    isMastered = newInterval >= 21;
  } else {
    // Easy: accelerate interval
    newReps = (card?.repetitionCount ?? 0) + 1;
    if (newReps === 1) newInterval = 3;
    else if (newReps === 2) newInterval = 7;
    else newInterval = Math.round((card?.intervalDays ?? 1) * newEase * 1.3);
    newEase = Math.min(3.0, newEase + 0.15);
    isMastered = newInterval >= 21;
  }

  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + newInterval);
  const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

  if (card) {
    card.repetitionCount = newReps;
    card.intervalDays = newInterval;
    card.easeFactor = Number(newEase.toFixed(2));
    card.dueDate = nextDueDateStr;
    card.isMastered = isMastered;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_SPACED_KEY, JSON.stringify(localCards));
      } catch {}
    }
  }

  // Persist to Supabase if UUID
  try {
    if (!cardId.startsWith("local_")) {
      await supabase.rpc("complete_spaced_review_card", {
        p_review_id: cardId,
        p_rating: rating,
      });
    }
  } catch {}

  return { nextIntervalDays: newInterval, isMastered };
}
