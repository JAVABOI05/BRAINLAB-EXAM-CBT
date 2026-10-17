import { NextRequest } from "next/server";
import { getLearningServiceContext, noStoreJson, safeMediaUrl, sanitizeOptions } from "../../../../../lib/learningServer";

type Snapshot = {
  question_id: string;
  question_version: number;
  question_type: "mcq" | "true_false";
  prompt_snapshot: string;
  image_url_snapshot: string | null;
  options_snapshot: unknown;
  correct_answer_snapshot: string;
  explanation_snapshot: string | null;
};

type SavedAnswer = { question_id: string; selected_answer: string; is_correct: boolean | null };

function buildReview(snapshots: Snapshot[], answers: SavedAnswer[]) {
  const answerByQuestion = new Map(answers.map((answer) => [answer.question_id, answer]));
  return snapshots.map((question) => {
    const answer = answerByQuestion.get(question.question_id);
    const options = sanitizeOptions(question.options_snapshot) ?? [];
    const correctAnswer = question.correct_answer_snapshot;
    const isCorrect = Boolean(answer && answer.selected_answer === correctAnswer);
    return {
      questionId: question.question_id,
      prompt: question.prompt_snapshot,
      questionType: question.question_type,
      imageUrl: safeMediaUrl(question.image_url_snapshot),
      options,
      selectedAnswer: answer?.selected_answer ?? null,
      correctAnswer,
      isCorrect,
      explanation: question.explanation_snapshot,
    };
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ attemptId: string }> }
) {
  const auth = await getLearningServiceContext(request);
  if (!auth.ok) return noStoreJson({ error: auth.message }, auth.status);

  const { attemptId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
    return noStoreJson({ error: "This attempt could not be found." }, 404);
  }

  const { service, user } = auth;
  const { data: attempt, error: attemptError } = await service
    .from("learning_test_attempts")
    .select("id,test_id,status,deadline_at,score,total_questions,pass_percentage_snapshot,percentage,passed,started_at,submitted_at")
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (attemptError || !attempt) return noStoreJson({ error: "This attempt could not be found." }, 404);

  const { data: test, error: testError } = await service
    .from("learning_topic_tests")
    .select("id,title,pass_percentage")
    .eq("id", attempt.test_id)
    .maybeSingle();
  if (testError || !test) return noStoreJson({ error: "Assessment details could not be loaded." }, 500);

  const { data: snapshots, error: snapshotError } = await service
    .from("learning_test_attempt_questions")
    .select("question_id,question_version,question_type,prompt_snapshot,image_url_snapshot,options_snapshot,correct_answer_snapshot,explanation_snapshot")
    .eq("attempt_id", attemptId);
  if (snapshotError || !snapshots || snapshots.length === 0) {
    return noStoreJson({ error: "The saved question set could not be loaded." }, 500);
  }
  const { data: savedAnswers, error: answersError } = await service
    .from("learning_test_answers")
    .select("question_id,selected_answer,is_correct")
    .eq("attempt_id", attemptId);
  if (answersError || !savedAnswers) return noStoreJson({ error: "Saved answers could not be loaded." }, 500);

  // Question order is stored on the attempt. Keep results in the exact delivered order.
  const { data: attemptOrder } = await service
    .from("learning_test_attempts")
    .select("question_order")
    .eq("id", attemptId)
    .single();
  const order = Array.isArray(attemptOrder?.question_order)
    ? attemptOrder.question_order as { question_id: string }[]
    : [];
  const snapshotById = new Map((snapshots as Snapshot[]).map((row) => [row.question_id, row]));
  const ordered = order.map((entry) => snapshotById.get(entry.question_id)).filter(Boolean) as Snapshot[];
  if (ordered.length !== snapshots.length) return noStoreJson({ error: "The question order is inconsistent. Please contact support." }, 500);

  if (attempt.status === "in_progress") {
    const expired = Boolean(attempt.deadline_at && new Date(attempt.deadline_at).getTime() <= Date.now());
    const answerById = new Map((savedAnswers as SavedAnswer[]).map((answer) => [answer.question_id, answer]));
    const gradedAnswers = ordered.map((question) => {
      const answer = answerById.get(question.question_id);
      return {
        question_id: question.question_id,
        is_correct: Boolean(answer && answer.selected_answer === question.correct_answer_snapshot),
      };
    });

    for (const answer of gradedAnswers) {
      const { error: gradeError } = await service.from("learning_test_answers")
        .update({ is_correct: answer.is_correct })
        .eq("attempt_id", attemptId)
        .eq("question_id", answer.question_id);
      if (gradeError) return noStoreJson({ error: "We could not finalize your answers. Please try submitting again." }, 500);
    }

    const score = gradedAnswers.filter((answer) => answer.is_correct).length;
    const totalQuestions = ordered.length;
    const percentage = Math.round((score / totalQuestions) * 10000) / 100;
    const passPercentage = Number(attempt.pass_percentage_snapshot);
    const passed = percentage >= passPercentage;
    const finalizedAt = new Date().toISOString();
    const nextStatus = expired ? "expired" : "submitted";

    const { data: finalized, error: finalizeError } = await service
      .from("learning_test_attempts")
      .update({
        status: nextStatus,
        score,
        total_questions: totalQuestions,
        percentage,
        passed,
        submitted_at: finalizedAt,
      })
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .eq("status", "in_progress")
      .select("id,status")
      .maybeSingle();

    if (finalizeError) return noStoreJson({ error: "The result could not be finalized. Please try again." }, 500);
    if (!finalized) return noStoreJson({ error: "This attempt has already been submitted. Reload to view its result." }, 409);

    const { data: finalAnswers, error: finalAnswersError } = await service
      .from("learning_test_answers")
      .select("question_id,selected_answer,is_correct")
      .eq("attempt_id", attemptId);
    if (finalAnswersError || !finalAnswers) return noStoreJson({ error: "Your result was saved, but the review could not be loaded." }, 500);

    return noStoreJson({
      attemptId,
      status: nextStatus,
      title: test.title,
      score,
      totalQuestions,
      percentage,
      passed,
      passPercentage,
      startedAt: attempt.started_at,
      submittedAt: finalizedAt,
      review: buildReview(ordered, finalAnswers as SavedAnswer[]),
    });
  }

  if (attempt.status !== "submitted" && attempt.status !== "expired") {
    return noStoreJson({ error: "This assessment cannot be reviewed in its current state." }, 409);
  }

  const review = buildReview(ordered, savedAnswers as SavedAnswer[]);
  const score = Number(attempt.score ?? review.filter((row) => row.isCorrect).length);
  const totalQuestions = Number(attempt.total_questions ?? ordered.length);
  const percentage = Number(attempt.percentage ?? (Math.round((score / Math.max(1, totalQuestions)) * 10000) / 100));
  const passed = Boolean(attempt.passed);
  const passPercentage = Number(attempt.pass_percentage_snapshot ?? test.pass_percentage);

  return noStoreJson({
    attemptId,
    status: attempt.status,
    title: test.title,
    score,
    totalQuestions,
    percentage,
    passed,
    passPercentage,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    review,
  });
}
