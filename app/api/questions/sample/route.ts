import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

// Core high-demand UTME / WAEC examination subjects with English as universal compulsory subject
const CORE_SUBJECTS = ["English", "Mathematics", "Biology", "Chemistry", "Physics"] as const;

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Query active questions partitioned by subject in parallel so no subject gets starved by DB insertion order
    const subjectBatches = await Promise.all(
      CORE_SUBJECTS.map(async (subj) => {
        const { data, error } = await supabase
          .from("questions")
          .select(
            "id, subject, section, category, question, option_a, option_b, option_c, option_d, correct_answer, explanation"
          )
          .eq("is_active", true)
          .eq("subject", subj)
          .limit(15);

        if (error || !data) {
          return { subject: subj, items: [] };
        }
        return { subject: subj, items: data };
      })
    );

    const sampled: Array<{
      id: string;
      subject: string;
      examContext: string;
      question: string;
      options: Array<{ letter: "A" | "B" | "C" | "D"; text: string }>;
      correctLetter: "A" | "B" | "C" | "D";
      explanation: string;
    }> = [];

    // Process each subject in prioritized order (English first as universal compulsory subject)
    for (const batch of subjectBatches) {
      if (!batch.items || batch.items.length === 0) continue;

      // Randomly pick up to 5 verified questions per subject for a diverse preview pool
      const shuffled = [...batch.items].sort(() => 0.5 - Math.random()).slice(0, 5);
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
          explanation:
            q.explanation ||
            `Option (${q.correct_answer}) is the verified correct answer under standard curriculum guidelines.`,
        });
      }
    }

    if (sampled.length === 0) {
      return NextResponse.json({ ok: false, fallback: true });
    }

    return NextResponse.json({
      ok: true,
      questions: sampled,
    });
  } catch {
    return NextResponse.json({ ok: false, fallback: true });
  }
}

