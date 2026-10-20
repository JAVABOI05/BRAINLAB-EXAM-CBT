import { NextRequest } from "next/server";
import { getLearningServiceContext, noStoreJson } from "../../../../../lib/learningServer";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ attemptId: string }> }
) {
  const auth = await getLearningServiceContext(request);
  if (!auth.ok) return noStoreJson({ error: auth.message }, auth.status);

  const { attemptId } = await context.params;
  if (!UUID_PATTERN.test(attemptId)) {
    return noStoreJson({ error: "This attempt could not be found." }, 404);
  }

  let body: unknown;
  try { body = await request.json(); } catch { return noStoreJson({ error: "Invalid request body." }, 400); }
  if (!body || typeof body !== "object") return noStoreJson({ error: "Invalid answer." }, 400);

  const payload = body as { questionId?: unknown; selectedAnswer?: unknown };
  if (
    typeof payload.questionId !== "string" ||
    !UUID_PATTERN.test(payload.questionId) ||
    typeof payload.selectedAnswer !== "string" ||
    payload.selectedAnswer.length === 0 ||
    payload.selectedAnswer.length > 100
  ) {
    return noStoreJson({ error: "Choose one of the available answers." }, 400);
  }

  // The database function locks the attempt row and re-checks ownership, status,
  // deadline, question membership and option validity in the same transaction as
  // the upsert. The submit function takes the same lock before grading.
  const { data, error } = await auth.service.rpc("save_learning_attempt_answer", {
    p_attempt_id: attemptId,
    p_student_id: auth.user.id,
    p_question_id: payload.questionId,
    p_selected_answer: payload.selectedAnswer,
  });

  if (error) {
    if (error.code === "P0002") return noStoreJson({ error: "This attempt could not be found." }, 404);
    if (error.code === "55000") return noStoreJson({ error: "This assessment is no longer accepting answers. Reload to view its status." }, 409);
    if (error.code === "22023" || error.code === "22P02") return noStoreJson({ error: "That question or answer is not valid for this attempt." }, 400);
    return noStoreJson({ error: "Your answer could not be saved. Keep the local recovery copy and try again." }, 500);
  }

  return noStoreJson(data ?? { saved: true, questionId: payload.questionId });
}
