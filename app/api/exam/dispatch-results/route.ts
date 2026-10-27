import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { dispatchReleasedResults, DispatchRecipient } from "../../../lib/resultDispatcher";
import { getExamSettings } from "../../../lib/platformConfig";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { resultIds, channels = ["sms", "email", "in_app"] } = body;

    // Check if result notifications are allowed globally
    const settings = await getExamSettings();
    if (settings.result_notifications === false) {
      return NextResponse.json({
        ok: false,
        error: "notifications_disabled",
        message: "Candidate result notifications are currently switched OFF in Examination Settings.",
      });
    }

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from("results")
      .select("id, name, phone, email, subject, score, total, subject_scores, session_id")
      .order("created_at", { ascending: false });

    if (Array.isArray(resultIds) && resultIds.length > 0) {
      query = query.in("id", resultIds);
    } else {
      // By default, dispatch latest 50 results
      query = query.limit(50);
    }

    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json(
        { ok: false, error: "database_error", message: error.message },
        { status: 500 }
      );
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No results matched the dispatch criteria.",
        summary: { total: 0, sent: 0, skipped: 0, failed: 0, notificationsEnabled: true, results: [] },
      });
    }

    const recipients: DispatchRecipient[] = rows.map((r) => ({
      resultId: r.id,
      name: r.name || "Candidate",
      phone: r.phone || "",
      email: r.email,
      score: r.score || 0,
      total: r.total || 400,
      subject: r.subject || "JAMB UTME Simulation",
      subjectScores: (r.subject_scores as Record<string, number>) || {},
    }));

    const summary = await dispatchReleasedResults(recipients, channels);

    return NextResponse.json({
      ok: true,
      message: `Dispatched notifications to ${summary.sent} candidate(s).`,
      summary,
    });
  } catch (err) {
    console.error("[api/exam/dispatch-results] Dispatch failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "dispatch_failed",
        message: err instanceof Error ? err.message : "Result dispatch encountered an error.",
      },
      { status: 500 }
    );
  }
}
