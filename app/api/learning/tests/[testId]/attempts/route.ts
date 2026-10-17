import { NextRequest } from "next/server";
import { getLearningServiceContext, noStoreJson, safeMediaUrl, sanitizeOptions } from "../../../../../lib/learningServer";

type QuestionRow = {
  id: string;
  question_type: "mcq" | "true_false";
  prompt: string;
  image_url: string | null;
  options: unknown;
  correct_answer: string;
  explanation: string | null;
  order_index: number;
  version: number;
};

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function publicQuestion(row: {
  question_id: string;
  question_version: number;
  question_type: "mcq" | "true_false";
  prompt_snapshot: string;
  image_url_snapshot: string | null;
  options_snapshot: unknown;
}) {
  return {
    id: row.question_id,
    version: row.question_version,
    questionType: row.question_type,
    prompt: row.prompt_snapshot,
    imageUrl: safeMediaUrl(row.image_url_snapshot),
    options: sanitizeOptions(row.options_snapshot) ?? [],
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ testId: string }> }
) {
  const auth = await getLearningServiceContext(request);
  if (!auth.ok) return noStoreJson({ error: auth.message }, auth.status);

  const { testId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testId)) {
    return noStoreJson({ error: "That assessment could not be found." }, 404);
  }

  const { service, user } = auth;
  const { data: test, error: testError } = await service
    .from("learning_topic_tests")
    .select("id,topic_id,title,instructions,question_limit,time_limit_mins,pass_percentage,shuffle_questions,is_published")
    .eq("id", testId)
    .maybeSingle();
  if (testError || !test || test.is_published !== true) {
    return noStoreJson({ error: "This assessment is not available." }, 404);
  }

  const { data: topic } = await service
    .from("learning_topics")
    .select("id,subject_id,is_published")
    .eq("id", test.topic_id)
    .maybeSingle();
  if (!topic || topic.is_published !== true) return noStoreJson({ error: "This assessment is not available." }, 404);

  const { data: subject } = await service
    .from("learning_subjects")
    .select("id,is_published")
    .eq("id", topic.subject_id)
    .maybeSingle();
  if (!subject || subject.is_published !== true) return noStoreJson({ error: "This assessment is not available." }, 404);

  const now = Date.now();
  const { data: activeAttempt, error: activeError } = await service
    .from("learning_test_attempts")
    .select("id,started_at,deadline_at")
    .eq("student_id", user.id)
    .eq("test_id", testId)
    .eq("status", "in_progress")
    .maybeSingle();
  if (activeError) return noStoreJson({ error: "We could not check your current attempt." }, 500);

  let attemptId: string | null = null;
  let startedAt: string | null = null;
  let deadlineAt: string | null = null;
  let questionRows: ReturnType<typeof publicQuestion>[] = [];

  if (activeAttempt && activeAttempt.deadline_at && new Date(activeAttempt.deadline_at).getTime() <= now) {
    await service.from("learning_test_attempts")
      .update({ status: "abandoned" })
      .eq("id", activeAttempt.id)
      .eq("student_id", user.id)
      .eq("status", "in_progress");
  } else if (activeAttempt) {
    const { data: snapshots, error: snapshotError } = await service
      .from("learning_test_attempt_questions")
      .select("question_id,question_version,question_type,prompt_snapshot,image_url_snapshot,options_snapshot")
      .eq("attempt_id", activeAttempt.id);
    if (snapshotError || !snapshots) return noStoreJson({ error: "We could not restore your current attempt." }, 500);
    const orderedIds = Array.isArray(snapshots) ? snapshots : [];
    const { data: attemptDetail } = await service
      .from("learning_test_attempts")
      .select("question_order")
      .eq("id", activeAttempt.id)
      .single();
    const order = Array.isArray(attemptDetail?.question_order) ? attemptDetail.question_order as { question_id: string }[] : [];
    const byId = new Map(orderedIds.map((row) => [row.question_id, row]));
    questionRows = order.map((item) => byId.get(item.question_id)).filter(Boolean).map((row) => publicQuestion(row!));
    attemptId = activeAttempt.id;
    startedAt = activeAttempt.started_at;
    deadlineAt = activeAttempt.deadline_at;
  }

  if (!attemptId) {
    const { data: pool, error: poolError } = await service
      .from("learning_test_questions")
      .select("id,question_type,prompt,image_url,options,correct_answer,explanation,order_index,version")
      .eq("test_id", testId)
      .order("order_index", { ascending: true });
    if (poolError || !pool) return noStoreJson({ error: "We could not load the question pool." }, 500);
    if (pool.length < test.question_limit) {
      return noStoreJson({ error: "This assessment is not ready yet. Its question pool is smaller than the configured question count." }, 409);
    }

    let selected = test.shuffle_questions ? shuffled(pool as QuestionRow[]) : [...pool as QuestionRow[]];
    selected = selected.slice(0, test.question_limit);
    const prepared: {
      question_id: string;
      question_version: number;
      question_type: "mcq" | "true_false";
      prompt_snapshot: string;
      image_url_snapshot: string | null;
      options_snapshot: { id: string; text: string }[];
      correct_answer_snapshot: string;
      explanation_snapshot: string | null;
    }[] = [];

    for (const question of selected) {
      let options: { id: string; text: string }[] | null;
      if (question.question_type === "true_false") {
        options = [{ id: "true", text: "True" }, { id: "false", text: "False" }];
        if (!["true", "false"].includes(question.correct_answer.toLowerCase())) {
          return noStoreJson({ error: "This assessment contains an invalid True/False answer key." }, 422);
        }
      } else {
        options = sanitizeOptions(question.options);
        if (!options || !options.some((option) => option.id === question.correct_answer)) {
          return noStoreJson({ error: "This assessment contains an invalid multiple-choice question." }, 422);
        }
      }
      prepared.push({
        question_id: question.id,
        question_version: question.version,
        question_type: question.question_type,
        prompt_snapshot: question.prompt,
        image_url_snapshot: safeMediaUrl(question.image_url),
        options_snapshot: options,
        correct_answer_snapshot: question.question_type === "true_false" ? question.correct_answer.toLowerCase() : question.correct_answer,
        explanation_snapshot: question.explanation,
      });
    }

    const started = new Date();
    const deadline = test.time_limit_mins ? new Date(started.getTime() + test.time_limit_mins * 60_000) : null;
    const { data: createdAttempt, error: createError } = await service
      .from("learning_test_attempts")
      .insert({
        student_id: user.id,
        test_id: testId,
        status: "in_progress",
        question_order: prepared.map((row) => ({ question_id: row.question_id, question_version: row.question_version })),
        total_questions: prepared.length,
        pass_percentage_snapshot: test.pass_percentage,
        started_at: started.toISOString(),
        deadline_at: deadline?.toISOString() ?? null,
      })
      .select("id,started_at,deadline_at")
      .single();

    if (createError || !createdAttempt) {
      if (createError?.code === "23505") return noStoreJson({ error: "An attempt was started in another tab. Reload to resume it." }, 409);
      return noStoreJson({ error: "We could not start this assessment." }, 500);
    }

    const snapshotsToInsert = prepared.map((row) => ({ ...row, attempt_id: createdAttempt.id }));
    const { error: insertSnapshotError } = await service.from("learning_test_attempt_questions").insert(snapshotsToInsert);
    if (insertSnapshotError) {
      await service.from("learning_test_attempts").delete().eq("id", createdAttempt.id);
      return noStoreJson({ error: "We could not prepare the assessment questions." }, 500);
    }

    attemptId = createdAttempt.id;
    startedAt = createdAttempt.started_at;
    deadlineAt = createdAttempt.deadline_at;
    questionRows = prepared.map((row) => publicQuestion({
      question_id: row.question_id,
      question_version: row.question_version,
      question_type: row.question_type,
      prompt_snapshot: row.prompt_snapshot,
      image_url_snapshot: row.image_url_snapshot,
      options_snapshot: row.options_snapshot,
    }));
  }

  if (questionRows.length === 0) return noStoreJson({ error: "This attempt has no available questions. Please contact your tutor." }, 409);

  // Return only the student's own saved selections, never answer keys. This lets
  // a resumed attempt render consistently across devices and after local storage
  // has been cleared; local recovery data can still be merged by the client.
  const { data: savedAnswers, error: savedAnswersError } = await service
    .from("learning_test_answers")
    .select("question_id,selected_answer")
    .eq("attempt_id", attemptId);
  if (savedAnswersError || !savedAnswers) {
    return noStoreJson({ error: "We could not restore your saved answers." }, 500);
  }
  const answers = Object.fromEntries(savedAnswers.map((answer) => [answer.question_id, answer.selected_answer]));

  return noStoreJson({
    attemptId,
    answers,
    test: {
      id: test.id,
      title: test.title,
      instructions: test.instructions,
      questionCount: questionRows.length,
      timeLimitMins: test.time_limit_mins,
      passPercentage: test.pass_percentage,
    },
    startedAt,
    deadlineAt,
    questions: questionRows,
  });
}
