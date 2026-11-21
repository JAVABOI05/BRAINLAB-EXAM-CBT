import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export interface SubjectHealthItem {
  name: string;
  compulsory: boolean;
  question_count: number;
  blueprint_status: string;
  syllabus_coverage: number;
  high_yield_status: "optimal" | "warning";
  reading_text?: string;
}

export interface LiveFlaggedItem {
  id: string;
  subject: string;
  topic: string;
  question_text: string;
  correct_answer: string;
  flag_reason: string;
  candidate_note: string;
  reported_at: string;
  status: "pending" | "resolved";
  session_id?: string;
  tab_switch_count?: number;
}

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

    // 1. Parallel queries: Sessions, Global Stats, Questions for Subject Health, Duplicate Reviews
    const [sessionsResult, allStatsResult, questionsResult, duplicateReviewsResult] = await Promise.all([
      // A. Proctored sessions query
      (async () => {
        let q = supabase
          .from("exam_sessions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (filter === "in_progress" || filter === "active") {
          q = q.eq("status", "started");
        } else if (filter === "completed") {
          q = q.in("status", ["completed", "submitted", "expired"]);
        } else if (filter === "flagged") {
          q = q.gt("tab_switch_count", 0);
        }
        return q;
      })(),

      // B. Global session summary (unfiltered by view search/filter)
      supabase
        .from("exam_sessions")
        .select("id, status, tab_switch_count")
        .limit(1000),

      // C. Live Question bank count grouped by subject
      supabase
        .from("questions")
        .select("subject"),

      // D. Pedagogical issues from duplicate_question_reviews if any exist
      supabase
        .from("duplicate_question_reviews")
        .select("id, group_hash, duplicate_type, question_ids, status, notes, created_at")
        .eq("status", "pending")
        .limit(20)
    ]);

    if (sessionsResult.error) {
      return NextResponse.json(
        { ok: false, error: sessionsResult.error.message || "Failed to fetch live sessions" },
        { status: 500 }
      );
    }

    const sessions = sessionsResult.data || [];
    const now = Date.now();

    // Format individual session items with real telemetry
    let items = sessions.map((s) => {
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

      const draftAnswers = s.draft_answers && typeof s.draft_answers === "object" ? s.draft_answers : {};
      const questionsAnswered = Object.keys(draftAnswers).length;
      const totalQuestions = Array.isArray(s.paper_ids) && s.paper_ids.length > 0 ? s.paper_ids.length : 180;
      const progressPercent = totalQuestions > 0 ? Math.min(100, Math.round((questionsAnswered / totalQuestions) * 100)) : 0;

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

    // 2. Global statistics calculation across all database rows
    const allSessions = allStatsResult.data || [];
    const globalActive = allSessions.filter((s) => s.status === "started").length;
    const globalFlagged = allSessions.filter((s) => (s.tab_switch_count || 0) > 0).length;
    const globalCompleted = allSessions.filter((s) => s.status === "completed" || s.status === "submitted" || s.status === "expired").length;

    // 3. Dynamic Subject Health derived from actual database records
    const rawQuestions = questionsResult.data || [];
    const countsMap: Record<string, number> = {};
    for (const q of rawQuestions) {
      const subj = (q.subject || "Other").trim();
      countsMap[subj] = (countsMap[subj] || 0) + 1;
    }

    const defaultSubjects = [
      { name: "Use of English", aliases: ["english", "use of english"], compulsory: true, blueprint: "60 Qs • 90 Raw Marks (100 Converted)", readingText: "The Life Changer Active" },
      { name: "General Mathematics", aliases: ["mathematics", "general mathematics", "maths"], compulsory: false, blueprint: "40 Qs • 2.5 Marks/Q (100 Max)" },
      { name: "Physics", aliases: ["physics"], compulsory: false, blueprint: "40 Qs • 2.5 Marks/Q (100 Max)" },
      { name: "Chemistry", aliases: ["chemistry"], compulsory: false, blueprint: "40 Qs • 2.5 Marks/Q (100 Max)" },
      { name: "Biology", aliases: ["biology"], compulsory: false, blueprint: "40 Qs • 2.5 Marks/Q (100 Max)" },
      { name: "Economics", aliases: ["economics"], compulsory: false, blueprint: "40 Qs • 2.5 Marks/Q (100 Max)" },
      { name: "Government", aliases: ["government"], compulsory: false, blueprint: "40 Qs • 2.5 Marks/Q (100 Max)" },
      { name: "Literature in English", aliases: ["literature in english", "literature"], compulsory: false, blueprint: "40 Qs • 2.5 Marks/Q (100 Max)" },
    ];

    const subjectsHealth: SubjectHealthItem[] = [];
    const matchedCanonical = new Set<string>();

    for (const def of defaultSubjects) {
      let count = 0;
      for (const [subj, c] of Object.entries(countsMap)) {
        if (def.aliases.some((a) => subj.toLowerCase() === a.toLowerCase())) {
          count += c;
          matchedCanonical.add(subj);
        }
      }

      // Calculate syllabus coverage percentage (estimate based on target 50 topics)
      const syllabusCoverage = Math.min(100, Math.max(10, Math.round((count / (def.compulsory ? 60 : 40)) * 25)));

      subjectsHealth.push({
        name: def.name,
        compulsory: def.compulsory,
        question_count: count,
        blueprint_status: def.blueprint,
        syllabus_coverage: count > 0 ? syllabusCoverage : 0,
        high_yield_status: count >= (def.compulsory ? 60 : 40) ? "optimal" : "warning",
        reading_text: def.readingText,
      });
    }

    // Add any additional subjects found in the database that weren't in default list
    for (const [subj, count] of Object.entries(countsMap)) {
      if (!matchedCanonical.has(subj)) {
        subjectsHealth.push({
          name: subj,
          compulsory: false,
          question_count: count,
          blueprint_status: "40 Qs • 2.5 Marks/Q (100 Max)",
          syllabus_coverage: Math.min(100, Math.round((count / 40) * 25)),
          high_yield_status: count >= 40 ? "optimal" : "warning",
        });
      }
    }

    // 4. Real flagged malpractice queue from actual sessions
    const flaggedItems: LiveFlaggedItem[] = [];

    // Real tab switch violations from sessions
    const flaggedSessions = allSessions.filter((s) => (s.tab_switch_count || 0) > 0).slice(0, 20);
    for (const fs of flaggedSessions) {
      // Find full session details if available
      const fullS = sessions.find((s) => s.id === fs.id);
      const name = fullS?.candidate_name || "Candidate";
      const subject = fullS?.subject || "UTME Examination";
      const switches = fs.tab_switch_count || 1;
      const reportedAt = fullS?.last_saved_at || fullS?.created_at
        ? new Date(fullS.last_saved_at || fullS.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Live";

      flaggedItems.push({
        id: fs.id,
        session_id: fs.id,
        subject: subject,
        topic: "Anti-Cheating Integrity Monitor",
        question_text: `Live malpractice flag: ${name} triggered ${switches} unauthorized browser tab/window switch event${switches > 1 ? "s" : ""}.`,
        correct_answer: "N/A",
        flag_reason: `Tab Switch Malpractice (${switches} violation${switches > 1 ? "s" : ""})`,
        candidate_note: `Candidate: ${name} (${fullS?.phone || "No phone"}). Session: ${fs.id}. Time Left: ${fullS?.time_left_seconds ?? "Active"}.`,
        reported_at: reportedAt,
        status: "pending",
        tab_switch_count: switches,
      });
    }

    // Add any pending duplicate/pedagogical review items
    const duplicateReviews = duplicateReviewsResult.data || [];
    for (const dr of duplicateReviews) {
      flaggedItems.push({
        id: dr.id,
        subject: "Question Bank Audit",
        topic: `Duplicate Review: ${dr.duplicate_type || "Potential Match"}`,
        question_text: `Group ${dr.group_hash?.slice(0, 8)}: Questions [${(dr.question_ids || []).join(", ")}] flagged for editorial review.`,
        correct_answer: "Review Required",
        flag_reason: `${(dr.duplicate_type || "Duplicate").toUpperCase()} Question Hash Collision`,
        candidate_note: dr.notes || "Algorithm identified near-identical question stem or answer options.",
        reported_at: dr.created_at ? new Date(dr.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
        status: "pending",
      });
    }

    return NextResponse.json({
      ok: true,
      sessions: items,
      stats: {
        total: allSessions.length || items.length,
        active: globalActive,
        flagged: globalFlagged,
        completed: globalCompleted,
      },
      subjects_health: subjectsHealth,
      flagged_items: flaggedItems,
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/admin/sessions/live] Error loading live operations:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load live session telemetry" },
      { status: 500 }
    );
  }
}
