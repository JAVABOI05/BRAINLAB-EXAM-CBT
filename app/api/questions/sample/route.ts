import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Query active questions from verified database subjects (Mathematics, English, Biology, Chemistry, Physics)
    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, subject, section, category, question, option_a, option_b, option_c, option_d, correct_answer, explanation"
      )
      .eq("is_active", true)
      .in("subject", ["Mathematics", "English", "Biology", "Chemistry", "Physics"])
      .limit(60);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ ok: false, fallback: true });
    }

    // Pick 1-2 random questions per subject
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
      options: Array<{ letter: "A" | "B" | "C" | "D"; text: string }>;
      correctLetter: "A" | "B" | "C" | "D";
      explanation: string;
    }> = [];

    for (const [subj, qList] of Object.entries(bySubject)) {
      // Shuffle and take up to 2
      const shuffled = [...qList].sort(() => 0.5 - Math.random()).slice(0, 2);
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
          ],
          correctLetter: q.correct_answer as "A" | "B" | "C" | "D",
          explanation: q.explanation || `The correct option is (${q.correct_answer}).`,
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
