import { NextResponse } from "next/server";
import { OFFICIAL_COMPETITION_CSV_TEMPLATE } from "@/app/lib/competitionQuestionBank";

export async function GET() {
  return new NextResponse(OFFICIAL_COMPETITION_CSV_TEMPLATE, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="brainlab_competition_questions_template.csv"',
    },
  });
}
