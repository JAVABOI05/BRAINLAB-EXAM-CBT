import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { getAcademicStanding } from "@/app/lib/certificatePdfService";

export const dynamic = "force-dynamic";

export interface CandidateExamItem {
  id: string;
  resultId: string;
  type: "mock_cbt" | "topic_test" | "assessment";
  title: string;
  subjects: string[];
  date: string;
  score: number;
  total: number;
  percentage: number;
  grade: string;
  standing: string;
  status: string;
  subjectScores?: Record<string, number>;
  certificate?: {
    id: string;
    certificateNumber: string;
    issuedAt: string;
    verifyUrl: string;
    downloadUrl: string;
  } | null;
  hasCorrections: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const requestedPhone = searchParams.get("phone")?.trim();

    const supabase = getSupabaseServerClient();
    const examItems: CandidateExamItem[] = [];

    // 1. Fetch user's certificates from learning_certificates
    const certMap = new Map<string, { id: string; certificateNumber: string; issuedAt: string }>();

    if (user?.id) {
      const { data: userCerts } = await supabase
        .from("learning_certificates")
        .select("id, certificate_number, issued_at, metadata")
        .eq("user_id", user.id);

      if (userCerts) {
        userCerts.forEach((c) => {
          const resId = c.metadata?.result_id || c.metadata?.session_id;
          if (resId) {
            certMap.set(String(resId), {
              id: c.id,
              certificateNumber: c.certificate_number,
              issuedAt: c.issued_at,
            });
          }
        });
      }
    }

    // 2. Fetch CBT Exam Sessions & Results
    // Query exam_sessions by user_id or phone
    let sessionQuery = supabase
      .from("exam_sessions")
      .select("id, access_code, candidate_name, candidate_phone, subject, status, score, total, created_at, started_at, submitted_at, user_id");

    if (user?.id) {
      sessionQuery = sessionQuery.eq("user_id", user.id);
    } else if (requestedPhone) {
      sessionQuery = sessionQuery.eq("candidate_phone", requestedPhone);
    } else {
      // Return empty list if anonymous and no phone requested
      sessionQuery = sessionQuery.limit(0);
    }

    const { data: sessionRows } = await sessionQuery.order("created_at", { ascending: false }).limit(50);

    if (sessionRows && sessionRows.length > 0) {
      const sessionIds = sessionRows.map((s) => s.id);

      // Fetch corresponding results rows
      const { data: resultRows } = await supabase
        .from("results")
        .select("id, session_id, score, total, subject_scores, created_at")
        .in("session_id", sessionIds);

      const resultMap = new Map<string, any>();
      if (resultRows) {
        resultRows.forEach((r) => resultMap.set(r.session_id, r));
      }

      for (const s of sessionRows) {
        const r = resultMap.get(s.id);
        const rawScore = r ? r.score : (s.score || 0);
        const totalPossible = r ? r.total : (s.total || 400);
        const pct = totalPossible > 0 ? Math.min(100, Math.max(0, Math.round((rawScore / totalPossible) * 100))) : 0;
        const standing = getAcademicStanding(pct);
        const resId = r?.id || s.id;

        const certInfo = certMap.get(String(resId)) || certMap.get(String(s.id));
        const certificate = certInfo
          ? {
              id: certInfo.id,
              certificateNumber: certInfo.certificateNumber,
              issuedAt: certInfo.issuedAt,
              verifyUrl: `/verify/${certInfo.certificateNumber}`,
              downloadUrl: `/api/certificates/download/${certInfo.certificateNumber}`,
            }
          : null;

        const subjectScores = r?.subject_scores || {};
        const subjects = Object.keys(subjectScores).length > 0
          ? Object.keys(subjectScores)
          : s.subject ? [s.subject] : ["English Language", "General CBT"];

        examItems.push({
          id: s.id,
          resultId: resId,
          type: "mock_cbt",
          title: `JAMB UTME National Mock (${s.subject || "Standard Combination"})`,
          subjects,
          date: s.submitted_at || s.created_at,
          score: rawScore,
          total: totalPossible,
          percentage: pct,
          grade: standing.grade,
          standing: standing.standing,
          status: s.status || "submitted",
          subjectScores,
          certificate,
          hasCorrections: true,
        });
      }
    }

    // 3. If authenticated, also fetch topic test attempts from learning_test_attempts
    if (user?.id) {
      try {
        const { data: testAttempts } = await supabase
          .from("learning_test_attempts")
          .select("id, score, total_questions, percentage, passed, started_at, submitted_at, test_id")
          .eq("student_id", user.id)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false })
          .limit(20);

        if (testAttempts) {
          for (const ta of testAttempts) {
            const rawScore = ta.score ?? 0;
            const total = ta.total_questions ?? 10;
            const pct = ta.percentage !== null && ta.percentage !== undefined
              ? Number(ta.percentage)
              : total > 0 ? Math.round((rawScore / total) * 100) : 0;
            const standing = getAcademicStanding(pct);

            examItems.push({
              id: ta.id,
              resultId: ta.id,
              type: "topic_test",
              title: "Topic Mastery Diagnostic Test",
              subjects: ["Learning Hub Topic"],
              date: ta.submitted_at || ta.started_at,
              score: rawScore,
              total,
              percentage: pct,
              grade: standing.grade,
              standing: standing.standing,
              status: "submitted",
              certificate: null,
              hasCorrections: true,
            });
          }
        }
      } catch {
        // Defensive
      }
    }

    // Sort all by date descending
    examItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Compute summary metrics
    const totalExams = examItems.length;
    const certificatesCount = examItems.filter((e) => e.certificate !== null).length;
    const avgScore = totalExams > 0
      ? Math.round(examItems.reduce((acc, curr) => acc + curr.percentage, 0) / totalExams)
      : 0;
    const highestScore = totalExams > 0
      ? Math.max(...examItems.map((e) => e.percentage))
      : 0;
    const passedCount = examItems.filter((e) => e.percentage >= 50).length;
    const passRate = totalExams > 0 ? Math.round((passedCount / totalExams) * 100) : 0;

    return NextResponse.json({
      ok: true,
      data: {
        exams: examItems,
        stats: {
          totalExams,
          certificatesCount,
          averageScore: avgScore,
          highestScore,
          passRate,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch candidate examination history";
    return NextResponse.json(
      { ok: false, error: "server_error", message },
      { status: 500 }
    );
  }
}
