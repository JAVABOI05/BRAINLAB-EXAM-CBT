import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { generateCertificatePdf, getAcademicStanding } from "@/app/lib/certificatePdfService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cleanId = decodeURIComponent(id || "").trim();

    if (!cleanId) {
      return new NextResponse("Certificate identifier required", { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Check learning_certificates table
    let certData: {
      certificate_number: string;
      recipient_name: string;
      title: string;
      issuer_name?: string;
      score: number;
      grade?: string;
      issued_at?: string;
      metadata?: any;
    } | null = null;

    const { data: certRow } = await supabase
      .from("learning_certificates")
      .select("*")
      .or(`certificate_number.ilike.${cleanId},id.eq.${cleanId},metadata->>result_id.eq.${cleanId}`)
      .maybeSingle();

    if (certRow) {
      certData = certRow;
    } else {
      // 2. Fallback check results table
      const { data: resRow } = await supabase
        .from("results")
        .select("id, score, total, subject_scores, created_at, session_id")
        .or(`id.eq.${cleanId},session_id.eq.${cleanId}`)
        .maybeSingle();

      if (resRow) {
        let recipientName = "Verified Candidate";
        let examSubject = "UTME Simulation";

        if (resRow.session_id) {
          const { data: sessionRow } = await supabase
            .from("exam_sessions")
            .select("candidate_name, subject")
            .eq("id", resRow.session_id)
            .maybeSingle();

          if (sessionRow?.candidate_name) recipientName = sessionRow.candidate_name;
          if (sessionRow?.subject) examSubject = sessionRow.subject;
        }

        const totalPossible = resRow.total || 400;
        const pct = Math.min(100, Math.round((resRow.score / totalPossible) * 100));
        const derived = getAcademicStanding(pct);

        certData = {
          certificate_number: `BL-MOCK-2026-${cleanId.substring(0, 8).toUpperCase()}`,
          recipient_name: recipientName,
          title: `JAMB UTME Standardized Milestone Mock (${examSubject})`,
          issuer_name: "BrainLab Academy",
          score: resRow.score,
          grade: derived.grade,
          issued_at: resRow.created_at,
          metadata: {
            total_possible: totalPossible,
            subject_scores: resRow.subject_scores || {},
          },
        };
      }
    }

    if (!certData) {
      return new NextResponse("Certificate not found", { status: 404 });
    }

    const totalPossible = certData.metadata?.total_possible ?? 400;
    const rawScore = certData.metadata?.raw_score ?? certData.score;
    const pct = totalPossible > 0 ? Math.min(100, Math.round((rawScore / totalPossible) * 100)) : certData.score;

    // Generate PDF document using our professional PDF engine
    const doc = generateCertificatePdf({
      certificateNumber: certData.certificate_number,
      recipientName: certData.recipient_name,
      examTitle: certData.title,
      issuerName: certData.issuer_name || "BrainLab Academy",
      issuedDate: certData.issued_at
        ? new Date(certData.issued_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : undefined,
      score: rawScore,
      totalPossible,
      percentage: pct,
      grade: certData.grade,
      subjectScores: certData.metadata?.subject_scores || {},
      verificationUrl: `https://www.brainlabacademy.com.ng/verify/${certData.certificate_number}`,
    });

    const pdfArrayBuffer = doc.output("arraybuffer");
    const safeName = (certData.recipient_name || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `BrainLab_Certificate_${safeName}_${certData.certificate_number}.pdf`;

    return new NextResponse(Buffer.from(pdfArrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error generating certificate PDF";
    return new NextResponse(message, { status: 500 });
  }
}
