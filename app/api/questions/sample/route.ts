import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Discover all distinct subjects currently having active questions in the database
    const { data: subjectRows } = await supabase
      .from("questions")
      .select("subject")
      .eq("is_active", true);

    const subjectSet = new Set<string>();
    if (subjectRows) {
      for (const row of subjectRows) {
        if (row.subject?.trim()) {
          subjectSet.add(row.subject.trim());
        }
      }
    }

    // Default to core subjects if DB is empty or unpopulated
    const discoveredSubjects = Array.from(subjectSet);
    const candidateSubjects = discoveredSubjects.length > 0
      ? discoveredSubjects
      : ["English", "Mathematics", "Physics", "Chemistry", "Biology"];

    // Prioritize English and Mathematics upfront
    const sortedSubjects = [...candidateSubjects].sort((a, b) => {
      const pA = a.toLowerCase().includes("english") ? -2 : a.toLowerCase().includes("mathematics") ? -1 : 0;
      const pB = b.toLowerCase().includes("english") ? -2 : b.toLowerCase().includes("mathematics") ? -1 : 0;
      return pA - pB || a.localeCompare(b);
    });

    const subjectBatches = await Promise.all(
      sortedSubjects.map(async (subj) => {
        const { data, error } = await supabase
          .from("questions")
          .select("id, subject, section, category, question, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation")
          .eq("is_active", true)
          .eq("subject", subj)
          .limit(15);

        if (error || !data) return { subject: subj, items: [] };
        return { subject: subj, items: data };
      })
    );

    const sampled: Array<{
      id: string;
      subject: string;
      examContext: string;
      question: string;
      options: Array<{ letter: "A" | "B" | "C" | "D" | "E"; text: string }>;
      correctLetter: "A" | "B" | "C" | "D" | "E";
      explanation: string;
    }> = [];

    for (const batch of subjectBatches) {
      if (!batch.items || batch.items.length === 0) continue;

      const shuffled = [...batch.items].sort(() => 0.5 - Math.random()).slice(0, 5);
      for (const q of shuffled) {
        const options: Array<{ letter: "A" | "B" | "C" | "D" | "E"; text: string }> = [
          { letter: "A", text: q.option_a },
          { letter: "B", text: q.option_b },
          { letter: "C", text: q.option_c },
          { letter: "D", text: q.option_d },
        ];
        if (q.option_e?.trim()) options.push({ letter: "E", text: q.option_e.trim() });

        sampled.push({
          id: `db-${q.id}`,
          subject: q.subject,
          examContext: `JAMB UTME / WAEC ${q.category || q.subject}`,
          question: q.question,
          options,
          correctLetter: (q.correct_answer?.trim()?.toUpperCase() as "A" | "B" | "C" | "D" | "E") || "A",
          explanation: q.explanation || `Option (${q.correct_answer}) is the verified correct answer under standard curriculum guidelines.`,
        });
      }
    }

    if (sampled.length === 0) {
      return NextResponse.json({ ok: false, fallback: true });
    }

    // This endpoint is public. Never serialize answer keys or explanations from the
    // service-role-backed query; candidates should receive those only after an
    // assessment permits review.
    const publicQuestions = sampled.map((question) => ({
      id: question.id,
      subject: question.subject,
      examContext: question.examContext,
      question: question.question,
      options: question.options,
    }));

    return NextResponse.json({ ok: true, questions: publicQuestions });
  } catch {
    return NextResponse.json({ ok: false, fallback: true });
  }
}
