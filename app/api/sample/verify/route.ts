import { NextRequest, NextResponse } from "next/server";
import { verifySampleAnswer } from "@/app/lib/services/sampleQuestionService";
import { checkRateLimit, isHoneypotTriggered } from "@/app/lib/abuseProtection";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip") ||
      "127.0.0.1";

    // Rate limiting: 40 checks per 10 minutes per IP
    const rateCheck = checkRateLimit(`sample_verify:${ip}`, 40, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Verification rate limit exceeded. Please wait a moment.",
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    // Honeypot check
    if (isHoneypotTriggered(body.honeypot)) {
      return NextResponse.json({
        ok: true,
        isCorrect: false,
        correctLetter: "A",
        ruleTitle: "Submission Guard",
        explanation: "Automated submission detected.",
        selectedOption: "",
      });
    }

    const { questionId, selectedOption } = body;
    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing required field: questionId." },
        { status: 400 }
      );
    }

    if (!selectedOption || typeof selectedOption !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing required field: selectedOption." },
        { status: 400 }
      );
    }

    const cleanOption = selectedOption.trim().toUpperCase();
    if (!["A", "B", "C", "D", "E"].includes(cleanOption)) {
      return NextResponse.json(
        { ok: false, error: "Invalid option selected. Must be A, B, C, D, or E." },
        { status: 400 }
      );
    }

    const result = await verifySampleAnswer(questionId, cleanOption);
    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Question not found or expired." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CBT Sample Verify API Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error during verification." },
      { status: 500 }
    );
  }
}
