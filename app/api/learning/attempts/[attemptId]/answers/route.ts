import { NextRequest } from "next/server";
import { getLearningServiceContext, noStoreJson, sanitizeOptions } from "../../../../../lib/learningServer";

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

  let body: unknown;
  try { body = await request.json(); } catch { return noStoreJson({ error: "Invalid request body." }, 400); }
  if (!body || typeof body !== "object") return noStoreJson({ error: "Invalid answer." }, 400);
  const payload = body as { questionId?: unknown; selectedAnswer?: unknown };
  if (typeof payload.questionId !== "string" || typeof payload.selectedAnswer !== "string" || payload.selectedAnswer.length > 100) {
    return noStoreJson({ error: "Choose one of the available answers." }, 400);
  }

  const { service, user } = auth;
  const { data: attempt, error: attemptError } = await service
    .from("learning_test_attempts")
    .select("id,status,deadline_at")
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (attemptError || !attempt) return noStoreJson({ error: "This attempt could not be found." }, 404);
  if (attempt.status !== "in_progress") return noStoreJson({ error: "This assessment is no longer accepting answers." }, 409);
  if (attempt.deadline_at && new Date(attempt.deadline_at).getTime() <= Date.now()) {
    return noStoreJson({ error: "The time limit has ended. Submit the answers already saved by the server." }, 409);
  }

  const { data: question, error: questionError } = await service
    .from("learning_test_attempt_questions")
    .select("question_id,question_version,question_type,options_snapshot")
    .eq("attempt_id", attemptId)
    .eq("question_id", payload.questionId)
    .maybeSingle();
  if (questionError || !question) return noStoreJson({ error: "That question was not part of this attempt." }, 400);

  const options = sanitizeOptions(question.options_snapshot);
  if (!options || !options.some((option) => option.id === payload.selectedAnswer)) {
    return noStoreJson({ error: "That answer is not one of the available choices." }, 400);
  }

  const { error: saveError } = await service.from("learning_test_answers").upsert({
    attempt_id: attemptId,
    question_id: question.question_id,
    question_version: question.question_version,
    selected_answer: payload.selectedAnswer,
    is_correct: null,
  }, { onConflict: "attempt_id,question_id" });
  if (saveError) return noStoreJson({ error: "Your answer could not be saved. Keep the local recovery copy and try again." }, 500);

  return noStoreJson({ saved: true, questionId: question.question_id });
}
