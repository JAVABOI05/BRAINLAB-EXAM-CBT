import { NextRequest, NextResponse } from "next/server";
import { getCachedExplanation, computeQuestionFingerprint } from "@/app/lib/explanationCache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const questionId = searchParams.get("question_id")?.trim();

  if (!questionId) {
    return NextResponse.json({ error: "question_id is required" }, { status: 400 });
  }

  // Prevent accessing explanations if client indicates active exam
  const examActive = searchParams.get("exam_active");
  if (examActive === "true" || examActive === "1") {
    return NextResponse.json(
      { error: "Explanations are strictly unavailable during an active exam attempt." },
      { status: 403 }
    );
  }

  try {
    const cached = await getCachedExplanation(questionId);
    if (cached) {
      return NextResponse.json({
        cached: true,
        explanation: cached.explanation,
        model: cached.model,
        cachedAt: cached.cachedAt,
        verified: cached.verified,
      });
    }

    return NextResponse.json({ cached: false });
  } catch (error) {
    console.error("[api/ai/explanation] Error:", error);
    return NextResponse.json({ cached: false, error: "Lookup failed" }, { status: 500 });
  }
}
