import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Base32 character set avoiding ambiguous characters (0, O, 1, I, L)
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCodeString(prefix = "BL-2026-", length = 6): string {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `${prefix}${result}`;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Administrator credentials required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(1, parseInt(body.count || "10", 10)), 1000);
    const cohort = String(body.cohort || "BrainLab Apex 2026 Cohort").trim();
    const subject = String(body.subject || "UTME Standard").trim();
    const customPrefix = body.prefix && typeof body.prefix === "string" && /^[A-Z0-9_-]{2,12}$/i.test(body.prefix)
      ? `${body.prefix.toUpperCase().trim()}-`
      : "BL-2026-";

    const supabase = getSupabaseServerClient();

    // Generate unique batch of codes ensuring no duplicates within batch
    const codeSet = new Set<string>();
    while (codeSet.size < count) {
      codeSet.add(generateCodeString(customPrefix, 6));
    }

    const codeList = Array.from(codeSet);

    // Verify collisions against existing database records
    const { data: existingCodes } = await supabase
      .from("access_codes")
      .select("code")
      .in("code", codeList);

    const existingSet = new Set((existingCodes || []).map((c: { code: string }) => c.code));
    const uniqueCodes: string[] = [];

    for (const c of codeList) {
      if (!existingSet.has(c)) {
        uniqueCodes.push(c);
      }
    }

    // Top up if any collisions occurred
    let collisionAttempts = 0;
    while (uniqueCodes.length < count && collisionAttempts < 50) {
      collisionAttempts++;
      const candidate = generateCodeString(customPrefix, 7);
      if (!existingSet.has(candidate) && !uniqueCodes.includes(candidate)) {
        uniqueCodes.push(candidate);
      }
    }

    const now = new Date().toISOString();
    const insertPayload = uniqueCodes.map((code) => ({
      code,
      subject,
      is_used: false,
      is_exported: true,
      created_at: now,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("access_codes")
      .insert(insertPayload)
      .select("id, code, subject, is_used, created_at");

    if (insertError) {
      console.error("[api/admin/codes/generate] Insertion error:", insertError);
      return NextResponse.json(
        { ok: false, error: insertError.message || "Failed to persist access codes into database" },
        { status: 500 }
      );
    }

    // Log to configuration_audit_logs
    try {
      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "access_codes",
        entity_id: `batch-${Date.now()}`,
        action: "created",
        new_value: {
          count: inserted?.length || uniqueCodes.length,
          cohort,
          subject,
          prefix: customPrefix,
        },
        change_reason: `Batch generated and issued ${inserted?.length || uniqueCodes.length} PIN codes for ${cohort} (${subject})`,
      });
    } catch (auditErr) {
      console.warn("[api/admin/codes/generate] Audit log skipped:", auditErr);
    }

    return NextResponse.json({
      ok: true,
      count: inserted?.length || uniqueCodes.length,
      codes: uniqueCodes,
      cohort,
      subject,
      timestamp: now,
      message: `Successfully issued ${inserted?.length || uniqueCodes.length} live CBT examination PINs.`,
    });
  } catch (err) {
    console.error("[api/admin/codes/generate] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error generating codes" },
      { status: 500 }
    );
  }
}
