import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolved = await params;
    const assessmentId = resolved.id;
    if (!assessmentId) {
      return NextResponse.json({ ok: false, error: "Missing assessment id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: assessment, error } = await supabase
      .from("learning_assessments")
      .select("*")
      .eq("id", assessmentId)
      .maybeSingle();

    if (error || !assessment) {
      return NextResponse.json({ ok: false, error: "Assessment not found" }, { status: 404 });
    }

    // Get attempts summary
    const { data: attempts } = await supabase
      .from("learning_practice_attempts")
      .select("id, user_id, status, score, started_at, submitted_at")
      .eq("assessment_id", assessmentId)
      .order("started_at", { ascending: false })
      .limit(100);

    return NextResponse.json({
      ok: true,
      assessment,
      attempts: attempts || [],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error loading assessment" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolved = await params;
    const assessmentId = resolved.id;
    if (!assessmentId) {
      return NextResponse.json({ ok: false, error: "Missing assessment id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const supabase = getSupabaseServerClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim() || null;
    if (body.instructions !== undefined) updates.instructions = String(body.instructions).trim() || null;
    if (body.question_count !== undefined) updates.question_count = Math.max(1, parseInt(body.question_count, 10));
    if (body.duration_minutes !== undefined) {
      const mins = parseInt(body.duration_minutes, 10);
      updates.duration_seconds = mins > 0 ? mins * 60 : null;
    }
    if (body.duration_seconds !== undefined) updates.duration_seconds = body.duration_seconds;
    if (body.pass_percentage !== undefined) updates.pass_percentage = Math.min(100, Math.max(0, parseInt(body.pass_percentage, 10)));
    if (body.max_attempts !== undefined) updates.max_attempts = Math.max(1, parseInt(body.max_attempts, 10));
    if (body.shuffle_questions !== undefined) updates.shuffle_questions = Boolean(body.shuffle_questions);
    if (body.access_code_required !== undefined) updates.access_code_required = Boolean(body.access_code_required);
    if (body.result_release !== undefined) updates.result_release = String(body.result_release);
    if (body.starts_at !== undefined) updates.starts_at = body.starts_at ? new Date(body.starts_at).toISOString() : null;
    if (body.ends_at !== undefined) updates.ends_at = body.ends_at ? new Date(body.ends_at).toISOString() : null;
    if (body.custom_questions !== undefined) updates.custom_questions = body.custom_questions;

    // Handle status toggle (draft, open, closed)
    if (body.status !== undefined) {
      const status = String(body.status).toLowerCase();
      updates.status = status;
      updates.is_published = status === "open";
    } else if (body.is_published !== undefined) {
      updates.is_published = Boolean(body.is_published);
      updates.status = updates.is_published ? "open" : "draft";
    }

    const { data: updated, error: updateError } = await supabase
      .from("learning_assessments")
      .update(updates)
      .eq("id", assessmentId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("[api/admin/assessments/[id]] Update error:", updateError);
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    try {
      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "learning_assessment",
        entity_id: assessmentId,
        action: "updated",
        new_value: updates,
        change_reason: `Admin updated assessment ${assessmentId}`,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      assessment: updated,
      message: "Assessment updated successfully.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error updating assessment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolved = await params;
    const assessmentId = resolved.id;
    if (!assessmentId) {
      return NextResponse.json({ ok: false, error: "Missing assessment id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { error: delError } = await supabase
      .from("learning_assessments")
      .delete()
      .eq("id", assessmentId);

    if (delError) {
      return NextResponse.json({ ok: false, error: delError.message }, { status: 500 });
    }

    try {
      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "learning_assessment",
        entity_id: assessmentId,
        action: "deleted",
        change_reason: `Admin deleted assessment ${assessmentId}`,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      message: "Assessment deleted successfully.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error deleting assessment" },
      { status: 500 }
    );
  }
}
