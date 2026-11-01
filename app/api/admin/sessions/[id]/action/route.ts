import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Session ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action; // add_time | unlock | force_submit | reset_switches

    const supabase = getSupabaseServerClient();

    // Verify session exists
    const { data: session, error: sessError } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessError || !session) {
      return NextResponse.json({ ok: false, error: "Exam session not found" }, { status: 404 });
    }

    // 1. ADD TIME EXTENSION
    if (action === "add_time") {
      const additionalSeconds = Math.max(60, parseInt(body.seconds || "300", 10)); // default +5 mins
      const currentSeconds = typeof session.time_left_seconds === "number" ? session.time_left_seconds : 0;
      const newSeconds = currentSeconds + additionalSeconds;

      await supabase
        .from("exam_sessions")
        .update({
          time_left_seconds: newSeconds,
        })
        .eq("id", sessionId);

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_session",
        entity_id: sessionId,
        action: "updated",
        new_value: { added_seconds: additionalSeconds, new_total_seconds: newSeconds },
        change_reason: `Admin invigilator extended time by ${Math.round(additionalSeconds / 60)} minutes for candidate ${session.candidate_name || sessionId}`,
      });

      return NextResponse.json({
        ok: true,
        message: `Added +${Math.round(additionalSeconds / 60)} minutes to exam session.`,
        newTimeLeftSeconds: newSeconds,
      });
    }

    // 2. UNLOCK / RESUME CRASHED SESSION
    if (action === "unlock") {
      await supabase
        .from("exam_sessions")
        .update({
          status: "in_progress",
        })
        .eq("id", sessionId);

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_session",
        entity_id: sessionId,
        action: "updated",
        new_value: { status: "in_progress", unlocked: true },
        change_reason: `Admin unlocked stalled session for candidate ${session.candidate_name || sessionId}`,
      });

      return NextResponse.json({
        ok: true,
        message: `Exam session unlocked and resumed for candidate.`,
      });
    }

    // 3. FORCE SUBMIT
    if (action === "force_submit") {
      const submittedAt = new Date().toISOString();

      await supabase
        .from("exam_sessions")
        .update({
          status: "completed",
          submitted_at: submittedAt,
          auto_submitted: true,
          time_left_seconds: 0,
        })
        .eq("id", sessionId);

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_session",
        entity_id: sessionId,
        action: "updated",
        new_value: { status: "completed", forced_by_admin: true, submitted_at: submittedAt },
        change_reason: `Invigilator force-submitted candidate exam for ${session.candidate_name || sessionId}`,
      });

      return NextResponse.json({
        ok: true,
        message: `Candidate examination session successfully force-submitted.`,
      });
    }

    // 4. RESET TAB SWITCH MALPRACTICE COUNTER
    if (action === "reset_switches") {
      await supabase
        .from("exam_sessions")
        .update({
          tab_switch_count: 0,
        })
        .eq("id", sessionId);

      await supabase.from("configuration_audit_logs").insert({
        admin_email: admin.email,
        entity_type: "exam_session",
        entity_id: sessionId,
        action: "updated",
        new_value: { tab_switch_count: 0, cleared: true },
        change_reason: `Admin cleared malpractice tab-switch flags for ${session.candidate_name || sessionId}`,
      });

      return NextResponse.json({
        ok: true,
        message: `Malpractice tab-switch counter cleared for session.`,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid invigilator action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to execute invigilator action" },
      { status: 500 }
    );
  }
}
