import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
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

    if (filter === "in_progress") {
      query = query.eq("status", "in_progress");
    } else if (filter === "completed") {
      query = query.eq("status", "completed");
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

    let items = (sessions || []).map((s) => {
      const timeLeftSec = typeof s.time_left_seconds === "number" ? s.time_left_seconds : 0;
      const hours = Math.floor(timeLeftSec / 3600);
      const minutes = Math.floor((timeLeftSec % 3600) / 60);
      const seconds = timeLeftSec % 60;
      const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

      return {
        id: s.id,
        candidate_name: s.candidate_name || "Unknown Candidate",
        phone: s.phone || "N/A",
        subject: s.subject || "Full UTME Combination",
        access_code: s.access_code || "DIRECT",
        status: s.status || "in_progress",
        tab_switch_count: s.tab_switch_count || 0,
        auto_submitted: Boolean(s.auto_submitted),
        time_left_seconds: timeLeftSec,
        time_left_formatted: formattedTime,
        started_at: s.started_at || s.created_at,
        submitted_at: s.submitted_at || null,
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

    const totalActive = items.filter((i) => i.status === "in_progress").length;
    const totalFlagged = items.filter((i) => i.tab_switch_count > 0).length;
    const totalCompleted = items.filter((i) => i.status === "completed").length;

    return NextResponse.json({
      ok: true,
      sessions: items,
      stats: {
        total: items.length,
        active: totalActive,
        flagged: totalFlagged,
        completed: totalCompleted,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load live session telemetry" },
      { status: 500 }
    );
  }
}
