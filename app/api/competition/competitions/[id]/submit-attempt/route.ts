import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { logCompetitionAuditEvent } from "@/app/lib/competitionRbac";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: competitionId } = await params;
    if (!competitionId || !UUID_REGEX.test(competitionId)) {
      return NextResponse.json({ error: "Invalid competition ID format." }, { status: 400 });
    }

    const user = await getUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { sessionId, answers = {}, durationSpentSeconds = 0, guestSessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required to submit attempt." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Check for duplicate submission prevention
    let existingPartQuery = supabase
      .from("competition_participants")
      .select("id, status, score, raw_score, max_score, duration_spent_seconds")
      .eq("competition_id", competitionId);

    if (user) {
      existingPartQuery = existingPartQuery.eq("user_id", user.id);
    } else if (guestSessionId) {
      existingPartQuery = existingPartQuery.eq("guest_session_id", guestSessionId);
    }

    const { data: existingParticipant } = await existingPartQuery.maybeSingle();

    if (existingParticipant && existingParticipant.status === "submitted") {
      return NextResponse.json({
        ok: true,
        score: Number(existingParticipant.score) || 0,
        rawScore: Number(existingParticipant.raw_score) || 0,
        maxScore: Number(existingParticipant.max_score) || 100,
        durationSpentSeconds: Number(existingParticipant.duration_spent_seconds) || 0,
        alreadySubmitted: true,
        message: "This examination attempt was already submitted and verified.",
      });
    }

    // 2. Fetch attempt snapshot
    const { data: snapshot, error: snapErr } = await supabase
      .from("competition_attempt_snapshots")
      .select("*")
      .eq("session_id", sessionId)
      .eq("competition_id", competitionId)
      .maybeSingle();

    if (snapErr || !snapshot) {
      return NextResponse.json(
        { error: "Attempt snapshot not found or invalid for this session." },
        { status: 404 }
      );
    }

    // 3. Verify ownership
    if (user && snapshot.user_id && snapshot.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized attempt snapshot." }, { status: 403 });
    }

    // 4. Fetch competition configuration
    const { data: comp } = await supabase
      .from("competitions")
      .select("*, rewards_config")
      .eq("id", competitionId)
      .maybeSingle();

    // 5. Grade the attempt server-side against the immutable answer key snapshot
    const answerKey = (snapshot.answer_key_snapshot || {}) as Record<string, string>;
    const questions = (snapshot.questions_snapshot || []) as Array<{ id: string; marks?: number }>;

    let correctCount = 0;
    let totalMarksAwarded = 0;
    let totalAvailableMarks = 0;

    for (const q of questions) {
      const qId = q.id;
      const qMark = Number(q.marks) > 0 ? Number(q.marks) : 1;
      totalAvailableMarks += qMark;

      const expected = (answerKey[qId] || "").trim().toUpperCase();
      const candidateChoice = (answers[qId] ? String(answers[qId]) : "").trim().toUpperCase();

      if (candidateChoice && candidateChoice === expected) {
        correctCount++;
        totalMarksAwarded += qMark;
      }
    }

    if (totalAvailableMarks === 0) totalAvailableMarks = Math.max(questions.length, 1);
    const percentage = Math.min(100, Math.max(0, Math.round((totalMarksAwarded / totalAvailableMarks) * 100)));

    // 6. Update competition_participants record with persistence verification
    let participantUpdate = supabase
      .from("competition_participants")
      .update({
        status: "submitted",
        score: percentage,
        raw_score: totalMarksAwarded,
        max_score: totalAvailableMarks,
        duration_spent_seconds: Math.max(0, Number(durationSpentSeconds) || 0),
        finished_at: new Date().toISOString(),
      })
      .eq("competition_id", competitionId);

    if (user) {
      participantUpdate = participantUpdate.eq("user_id", user.id);
    } else if (guestSessionId) {
      participantUpdate = participantUpdate.eq("guest_session_id", guestSessionId);
    }

    const { error: updateErr } = await participantUpdate;
    if (updateErr) {
      return NextResponse.json(
        { error: `Failed to persist final examination score: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // 7. Award participation XP if authenticated
    const participationXp = Number(comp?.rewards_config?.xp_participation) || 25;
    if (user?.id) {
      try {
        await supabase.rpc("increment_user_xp", {
          user_id_param: user.id,
          xp_to_add: participationXp,
        });
      } catch {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("xp")
          .eq("id", user.id)
          .maybeSingle();
        if (prof) {
          await supabase
            .from("user_profiles")
            .update({ xp: (Number(prof.xp) || 0) + participationXp })
            .eq("id", user.id);
        }
      }
    }

    // 8. Audit log submission
    await logCompetitionAuditEvent({
      action: "attempt_submitted",
      resourceType: "competition_participants",
      resourceId: sessionId,
      actorId: user?.id,
      actorEmail: user?.email || `guest_${guestSessionId || sessionId.slice(0, 6)}`,
      details: {
        competitionId,
        score: percentage,
        correctCount,
        totalQuestions: questions.length,
        durationSpentSeconds,
      },
    });

    return NextResponse.json({
      ok: true,
      score: percentage,
      rawScore: totalMarksAwarded,
      maxScore: totalAvailableMarks,
      correctCount,
      totalQuestions: questions.length,
      durationSpentSeconds,
      xpEarned: user ? participationXp : 0,
      message: "Competition attempt submitted and graded successfully!",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error submitting attempt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
