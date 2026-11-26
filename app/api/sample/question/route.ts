import { NextRequest, NextResponse } from "next/server";
import { getNextSampleQuestion } from "@/app/lib/services/sampleQuestionService";
import { checkRateLimit } from "@/app/lib/abuseProtection";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip") ||
      "127.0.0.1";

    // Rate limiting: 40 sample questions per 10 minutes per IP
    const rateCheck = checkRateLimit(`sample_question:${ip}`, 40, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Rate limit exceeded for sample questions. Please wait a moment before requesting more.",
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSeconds) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") || "use-of-english";
    const excludeParam = searchParams.get("exclude") || "";
    const excludeIds = excludeParam ? excludeParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const question = await getNextSampleQuestion(subject, excludeIds);

    if (!question) {
      return NextResponse.json(
        { ok: false, error: "No sample questions available for this subject." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      question,
    });
  } catch (error) {
    console.error("[CBT Sample Question API Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to retrieve sample question. Please try again." },
      { status: 500 }
    );
  }
}
