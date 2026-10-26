import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Query active questions from verified database subjects
    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, subject, section, category, question, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation"
      )
      .eq("is_active", true)
      .in("subject", ["Mathematics", "English", "Biology", "Chemistry", "Physics"])
      .limit(150);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ ok: false, fallback: true });
    }

    // Group questions by subject
    const bySubject: Record<string, typeof data> = {};
    for (const q of data) {
      if (!bySubject[q.subject]) bySubject[q.subject] = [];
      bySubject[q.subject].push(q);
    }

    const sampled: Array<{
      id: string;
      subject: string;
      examContext: string;
      question: string;
      options: Array<{ letter: "A" | "B" | "C" | "D" | "E"; text: string }>;
      correctLetter: "A" | "B" | "C" | "D" | "E";
      explanation: string;
    }> = [];

    for (const [subj, qList] of Object.entries(bySubject)) {
      // Take up to 5 verified questions per subject for a rich preview experience
      const shuffled = [...qList].sort(() => 0.5 - Math.random()).slice(0, 5);
      for (const q of shuffled) {
        sampled.push({
          id: `db-${q.id}`,
          subject: q.subject,
          examContext: `JAMB UTME / WAEC ${q.category || q.subject}`,
          question: q.question,
          options: [
            { letter: "A", text: q.option_a },
            { letter: "B", text: q.option_b },
            { letter: "C", text: q.option_c },
            { letter: "D", text: q.option_d },
            ...(q.option_e ? [{ letter: "E" as const, text: q.option_e }] : []),
          ],
          correctLetter: q.correct_answer as "A" | "B" | "C" | "D" | "E",
          explanation: q.explanation || `Option (${q.correct_answer}) is the verified correct answer under standard curriculum guidelines.`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      questions: sampled.sort(() => 0.5 - Math.random()),
    });
  } catch {
    return NextResponse.json({ ok: false, fallback: true });
  }
}
