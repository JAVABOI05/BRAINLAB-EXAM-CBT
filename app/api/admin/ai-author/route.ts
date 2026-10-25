import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "../../../lib/supabaseServer";
import { getAIPlatformConfig } from "../../../lib/platformConfig";

export const dynamic = "force-dynamic";

async function executeAICompletion(systemPrompt: string, userMessage: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQAPIKEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY;
  const aiConfig = await getAIPlatformConfig().catch(() => null);

  const configuredProvider = aiConfig?.provider;
  const provider = (configuredProvider === "gemini" && geminiKey)
    ? "gemini"
    : (configuredProvider === "groq" && groqKey)
    ? "groq"
    : groqKey
    ? "groq"
    : geminiKey
    ? "gemini"
    : null;

  if (!provider) {
    throw new Error("No AI provider credentials configured on server.");
  }

  if (provider === "groq" && groqKey) {
    const model = aiConfig?.groq_model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  if (provider === "gemini" && geminiKey) {
    const model = aiConfig?.gemini_model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2500 },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("")
        .trim() || ""
    );
  }

  throw new Error("Unable to establish connection to AI gateway.");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Check admin or tutor authorization
    const supabase = getSupabaseServerClient();
    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    let isAuthorized = Boolean(
      adminRecord && ["super_admin", "platform_admin", "ai_learning_admin", "content_reviewer", "teacher"].includes(adminRecord.role)
    );

    if (!isAuthorized) {
      // Check if user is an assigned subject tutor
      const { data: tutorMembership } = await supabase
        .from("learning_subject_memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("membership_role", "tutor")
        .limit(1)
        .maybeSingle();

      if (tutorMembership) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "forbidden", message: "Admin or Tutor access required." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { mode } = body;

    // 1. CONTEXTUAL WRITING EDIT
    if (mode === "contextual_edit") {
      const { selectedText, action, instruction, studentLevel } = body;
      if (!selectedText) {
        return NextResponse.json({ ok: false, error: "No text selected for editing." }, { status: 400 });
      }

      const systemPrompt = `You are BrainLab Academy's expert educational content authoring assistant.
Your task is to refine, transform, or improve educational study notes for West African & Nigerian secondary/tertiary students (WAEC/JAMB/UTME/Undergraduate level: ${studentLevel || "JAMB/UTME"}).
Strict rules:
- Return ONLY the replacement text or requested output. Do not include conversational filler like "Here is your text" or "Sure!".
- Preserve mathematical formulas using standard KaTeX notation ($...$ or $$...$$).
- Preserve markdown structure (headings, bold, lists).
- Ensure pedagogical precision, clarity, and engagement.`;

      let userPrompt = "";
      switch (action) {
        case "rephrase":
          userPrompt = `Rephrase this passage to be clearer, more engaging, and easier for students to retain:\n\n${selectedText}`;
          break;
        case "expand":
          userPrompt = `Expand this explanation with deeper conceptual clarity, a concrete real-world example, and exam relevance:\n\n${selectedText}`;
          break;
        case "simplify":
          userPrompt = `Simplify this passage so that a struggling student can grasp the concept quickly without losing technical accuracy:\n\n${selectedText}`;
          break;
        case "grammar":
          userPrompt = `Correct all spelling, grammatical, punctuation, and typographical issues in this passage while preserving its natural voice:\n\n${selectedText}`;
          break;
        case "bullets":
          userPrompt = `Convert this section into well-structured, clear markdown bullet points highlighting key points:\n\n${selectedText}`;
          break;
        case "table":
          userPrompt = `Convert this comparison or structured data into a clean, well-formatted markdown table with clear column headers:\n\n${selectedText}`;
          break;
        case "shorten":
          userPrompt = `Condense this passage into a punchy, high-yield summary preserving all critical facts and definitions:\n\n${selectedText}`;
          break;
        case "definitions":
          userPrompt = `Extract or formulate clear, formal definitions and intuitive analogies for the key terms in this passage:\n\n${selectedText}`;
          break;
        case "key_takeaways":
          userPrompt = `Generate a 'Key Exam Takeaways' callout box with 3-4 bullet points highlighting the most testable concepts:\n\n${selectedText}`;
          break;
        case "continue_writing":
          userPrompt = `Continue writing smoothly and logically from where this text ends:\n\n${selectedText}`;
          break;
        case "custom":
          userPrompt = `Apply the following authoring instruction to this text:\nInstruction: ${instruction || "Improve clarity"}\n\nText:\n${selectedText}`;
          break;
        default:
          userPrompt = `Improve this educational text for clarity and exam preparation:\n\n${selectedText}`;
      }

      const result = await executeAICompletion(systemPrompt, userPrompt);
      return NextResponse.json({ ok: true, outputText: result, action });
    }

    // 2. GUIDED LESSON BUILDER
    if (mode === "generate_lesson") {
      const { subject, topic, level, objectives, depth, teachingStyle } = body;
      const systemPrompt = `You are a curriculum developer for BrainLab Academy.
Generate a comprehensive, ready-to-teach educational study note formatted in clean Markdown.
Format your response as valid JSON matching this schema:
{
  "title": string,
  "summary": string,
  "estimated_read_time_mins": number,
  "markdown_content": string,
  "key_takeaways": string[],
  "definitions": [{"term": string, "meaning": string}]
}
Output ONLY the raw JSON object. Do not wrap in markdown code blocks like \`\`\`json.`;

      const userPrompt = `Subject: ${subject || "General Science"}
Topic: ${topic || "Core Topic"}
Target Student Level: ${level || "UTME/JAMB"}
Syllabus Objectives: ${objectives || "Comprehensive understanding of core principles"}
Desired Depth: ${depth || "Detailed with exam examples"}
Style: ${teachingStyle || "Direct, encouraging, exam-oriented"}

Generate a full lesson with Introduction, Clear Explanations, KaTeX formulas where relevant, Worked Examples, Common Pitfalls, and Summary.`;

      const raw = await executeAICompletion(systemPrompt, userPrompt);
      let parsed: any;
      try {
        const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          title: `${topic} Study Note`,
          summary: `Comprehensive study guide on ${topic}.`,
          estimated_read_time_mins: 6,
          markdown_content: raw,
          key_takeaways: [],
          definitions: [],
        };
      }

      return NextResponse.json({ ok: true, lesson: parsed });
    }

    // 3. AI ASSESSMENT GENERATOR (MCQs)
    if (mode === "generate_mcqs") {
      const { sourceText, count = 4, difficulty = "medium", subject, topic } = body;
      const systemPrompt = `You are an expert examination psychometrician for BrainLab Academy (JAMB, WAEC, NECO standard).
Create ${count} multiple-choice questions rigorously grounded in the provided reference text.
Each question MUST have:
1. Clear, unambiguous question prompt.
2. Exactly 4 options labeled A, B, C, D.
3. Only ONE indisputably correct answer.
4. Comprehensive explanation for why the correct answer is right.
5. Plausible distractor explanations explaining why other options are incorrect traps.
Respond ONLY with a valid JSON array of question objects:
[
  {
    "id": "q1",
    "question": "...",
    "options": [
      {"id": "A", "text": "..."},
      {"id": "B", "text": "..."},
      {"id": "C", "text": "..."},
      {"id": "D", "text": "..."}
    ],
    "correct_option_id": "A",
    "explanation": "...",
    "distractor_explanations": {
      "B": "...",
      "C": "...",
      "D": "..."
    }
  }
]
Output ONLY raw JSON.`;

      const userPrompt = `Subject: ${subject || "General"}
Topic: ${topic || "Reference Topic"}
Difficulty: ${difficulty}
Reference Source Text:
${(sourceText || "").slice(0, 8000)}`;

      const raw = await executeAICompletion(systemPrompt, userPrompt);
      let questions: any[] = [];
      try {
        const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        questions = JSON.parse(clean);
      } catch {
        return NextResponse.json({ ok: false, error: "AI produced invalid question structure. Please retry." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, questions });
    }

    // 4. AI QUALITY REVIEWER
    if (mode === "quality_review") {
      const { items, topicTitle, subjectName } = body;
      const systemPrompt = `You are an educational quality assurance auditor for BrainLab Academy.
Review the provided topic content items for:
1. Grammar, spelling, and readability issues.
2. Conceptual ambiguities or factual contradictions.
3. Missing alternative text on images.
4. Missing explanations on MCQ checkpoints.
5. Inconsistent terminology.
Return a valid JSON array of actionable findings:
[
  {
    "id": "f1",
    "category": "grammar" | "clarity" | "accessibility" | "pedagogy" | "completeness",
    "severity": "high" | "medium" | "low",
    "itemTitle": string,
    "issue": string,
    "suggestion": string
  }
]
Output ONLY raw JSON. If no issues found, return an empty array [].`;

      const userPrompt = `Topic: ${topicTitle} (${subjectName})
Content Items to Review:
${JSON.stringify(items, null, 2).slice(0, 10000)}`;

      const raw = await executeAICompletion(systemPrompt, userPrompt);
      let findings: any[] = [];
      try {
        const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        findings = JSON.parse(clean);
      } catch {
        findings = [];
      }

      return NextResponse.json({ ok: true, findings });
    }

    // 5. CONTENT TRANSFORMATION
    if (mode === "transform_content") {
      const { sourceMarkdown, targetType, topicTitle } = body;
      let systemPrompt = "You are an educational content transformer for BrainLab Academy.";
      let userPrompt = "";

      if (targetType === "audio_script") {
        systemPrompt += " Generate an engaging spoken audio lecture script with natural tone, rhetorical questions, and clear emphasis markers for a voice narrator.";
        userPrompt = `Transform this note for ${topicTitle} into a 3-minute spoken audio script:\n\n${sourceMarkdown}`;
      } else if (targetType === "summary_sheet") {
        systemPrompt += " Format a concise one-page revision summary sheet with bulleted formula lists, definitions, and high-yield exam takeaways in Markdown.";
        userPrompt = `Transform this note into a high-yield revision summary sheet:\n\n${sourceMarkdown}`;
      } else if (targetType === "flashcards") {
        systemPrompt += " Generate 6-10 question/answer flashcards formatted as a Markdown list of **Front:** / **Back:** cards.";
        userPrompt = `Extract key flashcard pairs from this note:\n\n${sourceMarkdown}`;
      }

      const result = await executeAICompletion(systemPrompt, userPrompt);
      return NextResponse.json({ ok: true, outputText: result, targetType });
    }

    return NextResponse.json({ ok: false, error: "Invalid mode specified" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "AI Authoring failed" },
      { status: 500 }
    );
  }
}
