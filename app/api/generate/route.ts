import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/app/lib/gemini";
import { saveAIGeneration } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: { prompt?: unknown; model?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body. Please provide a JSON object with a 'prompt' property." },
        { status: 400 }
      );
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json(
        { error: "The 'prompt' field is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const requestedModel =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : undefined;

    // 1. Call Gemini via Google AI Studio
    const { text, model } = await generateGeminiContent(prompt, {
      model: requestedModel,
    });

    // 2. Save prompt and response to Supabase
    let dbData: unknown = null;
    let savedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await saveAIGeneration({
        prompt,
        response: text,
        model,
      });

      if (error) {
        supabaseError = error.message;
        console.warn("[app/api/generate] Supabase save warning:", error.message);
      } else {
        dbData = data;
        savedToSupabase = true;
      }
    } catch (saveErr) {
      const msg = saveErr instanceof Error ? saveErr.message : String(saveErr);
      supabaseError = msg;
      console.warn("[app/api/generate] Supabase client error:", msg);
    }

    // 3. Return the generated result and Supabase status
    return NextResponse.json(
      {
        success: true,
        prompt,
        response: text,
        model,
        savedToSupabase,
        data: dbData,
        supabaseError,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("[app/api/generate] Generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const prompt = searchParams.get("prompt")?.trim();

  if (!prompt) {
    return NextResponse.json({
      status: "ready",
      message:
        "BrainLab AI Generation API is online. Send a POST request with { \"prompt\": \"your text\" } or GET with ?prompt=...",
    });
  }

  try {
    const { text, model } = await generateGeminiContent(prompt);

    let dbData: unknown = null;
    let savedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await saveAIGeneration({
        prompt,
        response: text,
        model,
      });

      if (error) {
        supabaseError = error.message;
      } else {
        dbData = data;
        savedToSupabase = true;
      }
    } catch (saveErr) {
      supabaseError = saveErr instanceof Error ? saveErr.message : String(saveErr);
    }

    return NextResponse.json({
      success: true,
      prompt,
      response: text,
      model,
      savedToSupabase,
      data: dbData,
      supabaseError,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
