import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let cleanQuery = decodeURIComponent(id || "").trim();

    // If query is a full URL, extract the certificate identifier segment
    if (cleanQuery.includes("/verify/")) {
      const segments = cleanQuery.split("/verify/");
      cleanQuery = segments[segments.length - 1].replace(/\/+$/, "").trim();
    }

    if (!cleanQuery) {
      return NextResponse.json(
        { ok: false, error: "invalid_query", message: "Certificate identifier is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Primary: Query via authoritative verify_certificate RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("verify_certificate", {
        p_query: cleanQuery,
      });

      if (!rpcError && rpcData && rpcData.ok) {
        return NextResponse.json(rpcData, {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        });
      }
    } catch {
      // Fallback to direct query below
    }

    // 2. Fallback: Direct query on learning_certificates table
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQuery);
    let certRow: any = null;

    if (isUuid) {
      const { data } = await supabase
        .from("learning_certificates")
        .select("*")
        .or(`id.eq.${cleanQuery},metadata->>result_id.eq.${cleanQuery},metadata->>session_id.eq.${cleanQuery}`)
        .maybeSingle();
      certRow = data;
    } else {
      const { data } = await supabase
        .from("learning_certificates")
        .select("*")
        .or(`certificate_number.ilike.${cleanQuery},metadata->>result_id.eq.${cleanQuery},metadata->>session_id.eq.${cleanQuery}`)
        .maybeSingle();
      certRow = data;
    }

    if (certRow) {
      let status = "valid";
      if (certRow.revoked_at) {
        status = "revoked";
      } else if (certRow.expires_at && new Date(certRow.expires_at) <= new Date()) {
        status = "expired";
      }

      return NextResponse.json(
        {
          ok: true,
          status,
          certificate: {
            id: certRow.id,
            certificate_number: certRow.certificate_number,
            recipient_name: certRow.recipient_name,
            title: certRow.title,
            issuer_name: certRow.issuer_name || "BrainLab Academy",
            score: certRow.score,
            grade: certRow.grade,
            issued_at: certRow.issued_at,
            expires_at: certRow.expires_at,
            revoked_at: certRow.revoked_at,
            revocation_reason: status === "revoked" ? certRow.revocation_reason : null,
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    // 3. Fallback: Check if matching result exists in results table
    if (isUuid) {
      const { data: resRow } = await supabase
        .from("results")
        .select("id, score, total, created_at, session_id")
        .or(`id.eq.${cleanQuery},session_id.eq.${cleanQuery}`)
        .maybeSingle();

      if (resRow) {
        let recipientName = "Verified Candidate";
        let examSubject = "Science Combination";

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
        const pct = Math.min(100, Math.round(((resRow.score || 0) / totalPossible) * 100));
        let grade = "Pass";
        if (pct >= 75) grade = "Distinction";
        else if (pct >= 60) grade = "Very Good";
        else if (pct >= 50) grade = "Credit";
        else if (pct >= 40) grade = "Pass";
        else grade = "Revision Pass";

        const certNum = `BL-MOCK-2026-${cleanQuery.substring(0, 8).toUpperCase()}`;

        return NextResponse.json(
          {
            ok: true,
            status: "valid",
            certificate: {
              id: resRow.id,
              certificate_number: certNum,
              recipient_name: recipientName,
              title: `JAMB UTME Standardized Milestone Mock Examination (${examSubject})`,
              issuer_name: "BrainLab Academy",
              score: pct,
              grade,
              issued_at: resRow.created_at,
              expires_at: null,
              revoked_at: null,
              revocation_reason: null,
            },
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
          }
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "not_found",
        message: "No certificate was found matching this identifier.",
      },
      { status: 404 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error verifying certificate";
    return NextResponse.json({ ok: false, error: "server_error", message }, { status: 500 });
  }
}
