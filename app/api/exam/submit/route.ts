import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

async function ensureAccessCodeMarkedUsed(sessionId: string) {
  try {
    const supabase = getSupabaseServerClient();
    const { data: s } = await supabase
      .from("exam_sessions")
      .select("access_code, candidate_name, is_master_code")
      .eq("id", sessionId)
      .maybeSingle();

    if (s?.access_code && s.access_code !== "OPEN-CBT" && !s.is_master_code) {
      const cleanCode = s.access_code.trim().toUpperCase();
      await supabase
        .from("access_codes")
        .update({
          is_used: true,
          used_by: s.candidate_name || "Candidate",
          exam_session_id: sessionId,
        })
        .eq("code", cleanCode);
    }
  } catch {
    // Non-fatal background sync
  }
}

async function recordExamSubmissionGamification(sessionId: string, score: number, total: number) {
  try {
    const supabase = getSupabaseServerClient();
    const { data: session } = await supabase
      .from("exam_sessions")
      .select("candidate_name, phone")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) return;

    const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const name = String(session.candidate_name || "").trim().toLowerCase();
    const phone = String(session.phone || "").trim().replace(/\s+/g, "");

    const matchedUser = (users?.users || []).find((u) => {
      const meta = u.user_metadata || {};
      const uName = String(meta.full_name || meta.name || "").trim().toLowerCase();
      const uPhone = String(meta.phone || u.phone || "").trim().replace(/\s+/g, "");
      return (name && uName === name) || (phone && uPhone && uPhone === phone);
    });

    if (matchedUser) {
      const pct = Math.min(100, Math.max(0, Math.round((score / (total || 400)) * 100)));
      const earnedXp = Math.round(50 + pct * 0.75);
      const todayStr = new Date().toISOString().split("T")[0];

      const { data: currentProfile } = await supabase
        .from("user_gamification_profiles")
        .select("*")
        .eq("user_id", matchedUser.id)
        .maybeSingle();

      const newLifetimeXp = (currentProfile?.lifetime_xp || 0) + earnedXp;
      
      let level = 1;
      let levelName = "Beginner";
      if (newLifetimeXp >= 5000) { level = 10; levelName = "Grandmaster"; }
      else if (newLifetimeXp >= 3500) { level = 9; levelName = "Scholar Supreme"; }
      else if (newLifetimeXp >= 2500) { level = 8; levelName = "Master"; }
      else if (newLifetimeXp >= 1750) { level = 7; levelName = "Expert"; }
      else if (newLifetimeXp >= 1200) { level = 6; levelName = "Adept"; }
      else if (newLifetimeXp >= 800) { level = 5; levelName = "Senior Scholar"; }
      else if (newLifetimeXp >= 500) { level = 4; levelName = "Intermediate"; }
      else if (newLifetimeXp >= 300) { level = 3; levelName = "Junior Scholar"; }
      else if (newLifetimeXp >= 150) { level = 2; levelName = "Apprentice"; }

      let currentStreak = currentProfile?.current_streak_days || 1;
      if (currentProfile?.last_activity_date && currentProfile.last_activity_date !== todayStr) {
        const lastDate = new Date(currentProfile.last_activity_date);
        const today = new Date(todayStr);
        const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) currentStreak += 1;
        else if (diffDays > 1) currentStreak = 1;
      }

      await supabase.from("user_gamification_profiles").upsert(
        {
          user_id: matchedUser.id,
          lifetime_xp: newLifetimeXp,
          current_level: level,
          level_name: levelName,
          current_streak_days: currentStreak,
          longest_streak_days: Math.max(currentProfile?.longest_streak_days || 1, currentStreak),
          last_activity_date: todayStr,
          quizzes_completed_count: (currentProfile?.quizzes_completed_count || 0) + 1,
          perfect_scores_count: pct >= 100 ? (currentProfile?.perfect_scores_count || 0) + 1 : (currentProfile?.perfect_scores_count || 0),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }
  } catch (err) {
    console.warn("[exam/submit] Gamification update warning:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = body.sessionId || body.p_session;
    const token = body.token || body.p_token;
    const answers = body.answers || body.p_answers || {};
    const auto = Boolean(body.auto || body.autoSubmitted || body.p_auto);
    const flagged = body.flagged || body.p_flagged || {};

    if (!sessionId || !token) {
      return NextResponse.json(
        { ok: false, error: "invalid_request", message: "Missing session ID or token." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Invoke the submit_exam RPC via high-speed server connection
    const { data: rpcData, error: rpcError } = await supabase.rpc("submit_exam", {
      p_session: sessionId,
      p_token: token,
      p_answers: answers,
      p_auto: auto,
      p_flagged: flagged,
    });

    if (!rpcError && rpcData && typeof rpcData === "object" && (rpcData as { ok?: boolean }).ok !== false) {
      void ensureAccessCodeMarkedUsed(sessionId);
      const resScore = Number((rpcData as Record<string, unknown>).score) || 0;
      const resTotal = Number((rpcData as Record<string, unknown>).total) || 400;
      void recordExamSubmissionGamification(sessionId, resScore, resTotal);
      return NextResponse.json(rpcData);
    }

    // 2. Resiliency recovery: If the exam was already submitted (e.g. from a prior auto-save or double click)
    // look up the existing result directly to prevent candidate lockout.
    const { data: existingResult } = await supabase
      .from("results")
      .select("id, score, total, subject_scores, created_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingResult) {
      void ensureAccessCodeMarkedUsed(sessionId);
      void recordExamSubmissionGamification(sessionId, Number(existingResult.score) || 0, Number(existingResult.total) || 400);
      return NextResponse.json({
        ok: true,
        finished: true,
        status: "submitted",
        result_id: existingResult.id,
        score: existingResult.score,
        total: existingResult.total,
        subject_scores: existingResult.subject_scores || {},
        show_results: true,
      });
    }

    // Check if session exists and is marked as finished/submitted
    const { data: sessionRow } = await supabase
      .from("exam_sessions")
      .select("id, status, score, total")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionRow && (sessionRow.status === "submitted" || sessionRow.status === "expired")) {
      void ensureAccessCodeMarkedUsed(sessionId);
      void recordExamSubmissionGamification(sessionId, Number(sessionRow.score) || 0, Number(sessionRow.total) || 400);
      return NextResponse.json({
        ok: true,
        finished: true,
        status: sessionRow.status,
        result_id: sessionRow.id,
        score: sessionRow.score || 0,
        total: sessionRow.total || 400,
        subject_scores: {},
        show_results: true,
      });
    }

    const errorMessage = rpcError?.message || (rpcData as { message?: string })?.message || "Could not complete examination submission.";
    return NextResponse.json(
      { ok: false, error: "submit_failed", message: errorMessage },
      { status: 500 }
    );
  } catch (err) {
    console.error("[api/exam/submit] Unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: err instanceof Error ? err.message : "Exam submission failed.",
      },
      { status: 500 }
    );
  }
}
