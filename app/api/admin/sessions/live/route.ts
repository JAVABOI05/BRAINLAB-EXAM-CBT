import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all | in_progress | completed | flagged
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from("exam_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter === "in_progress" || filter === "active") {
      query = query.in("status", ["in_progress", "started"]);
    } else if (filter === "completed") {
      query = query.in("status", ["completed", "submitted", "expired"]);
    } else if (filter === "flagged") {
      query = query.gt("tab_switch_count", 0);
    }

    const { data: sessions, error } = await query;
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "Failed to fetch live sessions" },
        { status: 500 }
      );
    }

    const now = Date.now();

    let items = (sessions || []).map((s) => {
      // 1. Precise time left calculation
      let timeLeftSec = 0;
      if (typeof s.time_left_seconds === "number") {
        timeLeftSec = Math.max(0, s.time_left_seconds);
      } else if (s.deadline_at) {
        timeLeftSec = Math.max(0, Math.floor((new Date(s.deadline_at).getTime() - now) / 1000));
      }

      const hours = Math.floor(timeLeftSec / 3600);
      const minutes = Math.floor((timeLeftSec % 3600) / 60);
      const seconds = timeLeftSec % 60;
      const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

      // 2. Real Telemetry: Calculate answers and progress dynamically
      const draftAnswers = s.draft_answers && typeof s.draft_answers === "object" ? s.draft_answers : {};
      const questionsAnswered = Object.keys(draftAnswers).length;
      const totalQuestions = Array.isArray(s.paper_ids) && s.paper_ids.length > 0 ? s.paper_ids.length : 180;
      const progressPercent = totalQuestions > 0 ? Math.min(100, Math.round((questionsAnswered / totalQuestions) * 100)) : 0;

      // 3. Network & Activity state from heartbeat
      let networkState = "online";
      let networkCarrier = "Edge Telemetry Active";
      if (s.status === "completed" || s.status === "submitted") {
        networkState = "completed";
        networkCarrier = "Exam Submitted";
      } else if (s.status === "expired") {
        networkState = "expired";
        networkCarrier = "Time Expired";
      } else if (s.last_saved_at) {
        const lastSavedMs = now - new Date(s.last_saved_at).getTime();
        if (lastSavedMs > 180_000) {
          networkState = "warning";
          networkCarrier = "Telemetry Idle (>3m)";
        }
      }

      const tabSwitches = typeof s.tab_switch_count === "number" ? s.tab_switch_count : 0;

      return {
        id: s.id,
        candidate_name: s.candidate_name || "Direct Candidate",
        phone: s.phone || "N/A",
        subject: s.subject || "Full CBT Assessment",
        access_code: s.access_code || "DIRECT",
        status: s.status || "started",
        tab_switch_count: tabSwitches,
        is_flagged: tabSwitches > 0,
        auto_submitted: Boolean(s.auto_submitted),
        time_left_seconds: timeLeftSec,
        time_left_formatted: formattedTime,
        questions_answered: questionsAnswered,
        total_questions: totalQuestions,
        progress_percent: progressPercent,
        network_state: networkState,
        network_carrier: networkCarrier,
        started_at: s.started_at || s.created_at,
        submitted_at: s.submitted_at || null,
        last_saved_at: s.last_saved_at || null,
        created_at: s.created_at,
      };
    });

    if (search) {
      items = items.filter(
        (i) =>
          i.candidate_name.toLowerCase().includes(search) ||
          i.subject.toLowerCase().includes(search) ||
          i.access_code.toLowerCase().includes(search) ||
          i.id.toLowerCase().includes(search)
      );
    }

    const totalActive = items.filter((i) => i.status === "in_progress" || i.status === "started").length;
    const totalFlagged = items.filter((i) => i.tab_switch_count > 0).length;
    const totalCompleted = items.filter((i) => i.status === "completed" || i.status === "submitted" || i.status === "expired").length;

    return NextResponse.json({
      ok: true,
      sessions: items,
      stats: {
        total: items.length,
        active: totalActive,
        flagged: totalFlagged,
        completed: totalCompleted,
      },
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load live session telemetry" },
      { status: 500 }
    );
  }
}
