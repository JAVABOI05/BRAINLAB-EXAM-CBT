import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Administrator credentials required" }, { status: 401 });
    }

    const { id: assessmentId } = await params;
    if (!assessmentId) {
      return NextResponse.json({ ok: false, error: "Missing assessment id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify assessment exists
    const { data: assessment, error: aErr } = await supabase
      .from("learning_assessments")
      .select("id, title, access_code_required, starts_at, ends_at, organisation_id, is_published, created_by")
      .eq("id", assessmentId)
      .maybeSingle();

    if (aErr || !assessment) {
      return NextResponse.json({ ok: false, error: "Assessment not found" }, { status: 404 });
    }

    // Call manage_assessment_code RPC or query directly
    const { data: codeRow, error: cErr } = await supabase
      .from("learning_access_codes")
      .select("id, code_hint, scope_type, max_redemptions, redemption_count, permanent, expires_at, revoked_at, created_at")
      .eq("scope_type", "assessment")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cErr || !codeRow) {
      return NextResponse.json({
        ok: true,
        has_code: false,
        access_code_required: assessment.access_code_required,
        assessment_id: assessmentId,
        title: assessment.title,
      });
    }

    const isActive = !codeRow.revoked_at &&
      (codeRow.permanent || !codeRow.expires_at || new Date(codeRow.expires_at) > new Date()) &&
      codeRow.redemption_count < codeRow.max_redemptions;

    return NextResponse.json({
      ok: true,
      has_code: true,
      code_id: codeRow.id,
      code_hint: codeRow.code_hint,
      max_redemptions: codeRow.max_redemptions,
      redemption_count: codeRow.redemption_count,
      permanent: codeRow.permanent,
      expires_at: codeRow.expires_at,
      revoked_at: codeRow.revoked_at,
      is_active: isActive,
      access_code_required: assessment.access_code_required,
      assessment_id: assessmentId,
      title: assessment.title,
    });
  } catch (err) {
    console.error("[api/admin/assessments/[id]/code] GET exception:", err);
    return NextResponse.json({ ok: false, error: "Internal error loading assessment code." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Administrator credentials required" }, { status: 401 });
    }

    const { id: assessmentId } = await params;
    if (!assessmentId) {
      return NextResponse.json({ ok: false, error: "Missing assessment id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "generate").toLowerCase(); // 'generate' | 'set'
    const customCode = body.custom_code ? String(body.custom_code).trim().toUpperCase() : null;
    const maxRedemptions = Math.min(100000, Math.max(1, parseInt(body.max_redemptions || "500", 10)));
    const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : null;

    const supabase = getSupabaseServerClient();

    // Verify assessment exists
    const { data: assessment, error: aErr } = await supabase
      .from("learning_assessments")
      .select("id, title, question_count, ends_at, organisation_id")
      .eq("id", assessmentId)
      .maybeSingle();

    if (aErr || !assessment) {
      return NextResponse.json({ ok: false, error: "Assessment not found" }, { status: 404 });
    }

    let finalPlainCode = "";
    if (action === "set") {
      if (!customCode || customCode.length < 4 || customCode.length > 64) {
        return NextResponse.json({ ok: false, error: "Custom code must be between 4 and 64 characters." }, { status: 400 });
      }
      finalPlainCode = customCode;
    } else {
      // Auto-generate clean, readable PIN e.g. BLT-8X4W9M
      const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
      finalPlainCode = `BLT-${randomHex}`;
    }

    const codeHash = crypto.createHash("sha256").update(finalPlainCode).digest("hex");
    const codeHint = finalPlainCode.slice(-4);

    // Revoke any existing active code for this assessment
    await supabase
      .from("learning_access_codes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("scope_type", "assessment")
      .eq("assessment_id", assessmentId)
      .is("revoked_at", null);

    // Insert new code
    const expiryDate = expiresAt || assessment.ends_at || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inserted, error: insErr } = await supabase
      .from("learning_access_codes")
      .insert({
        code_hash: codeHash,
        code_hint: codeHint,
        scope_type: "assessment",
        assessment_id: assessmentId,
        organisation_id: assessment.organisation_id || null,
        max_questions: assessment.question_count || 50,
        permanent: false,
        expires_at: expiryDate,
        max_redemptions: maxRedemptions,
        redemption_count: 0,
        created_by: admin.id || null,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      console.error("[api/admin/assessments/[id]/code] Insert error:", insErr);
      return NextResponse.json({ ok: false, error: insErr?.message || "Failed to save examination code." }, { status: 500 });
    }

    // Enable access_code_required on assessment
    await supabase
      .from("learning_assessments")
      .update({ access_code_required: true, updated_at: new Date().toISOString() })
      .eq("id", assessmentId);

    // Log configuration audit
    try {
      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "learning_access_code",
        entity_id: inserted.id,
        action: "created",
        new_value: {
          assessment_id: assessmentId,
          code_hint: codeHint,
          max_redemptions: maxRedemptions,
          expires_at: expiryDate,
        },
        change_reason: `Admin configured examination code for "${assessment.title}"`,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      code: finalPlainCode,
      code_hint: codeHint,
      max_redemptions: maxRedemptions,
      expires_at: expiryDate,
      message: `Examination code "${finalPlainCode}" is active and ready to share!`,
    });
  } catch (err) {
    console.error("[api/admin/assessments/[id]/code] POST exception:", err);
    return NextResponse.json({ ok: false, error: "Internal error creating examination code." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Administrator credentials required" }, { status: 401 });
    }

    const { id: assessmentId } = await params;
    if (!assessmentId) {
      return NextResponse.json({ ok: false, error: "Missing assessment id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Revoke all active codes for this assessment
    const { error: revErr } = await supabase
      .from("learning_access_codes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("scope_type", "assessment")
      .eq("assessment_id", assessmentId)
      .is("revoked_at", null);

    if (revErr) {
      return NextResponse.json({ ok: false, error: revErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Examination access code revoked successfully.",
    });
  } catch (err) {
    console.error("[api/admin/assessments/[id]/code] DELETE exception:", err);
    return NextResponse.json({ ok: false, error: "Internal error revoking examination code." }, { status: 500 });
  }
}
