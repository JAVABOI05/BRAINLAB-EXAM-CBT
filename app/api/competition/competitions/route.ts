import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  CompetitionActor,
  getCompetitionActor,
  hasPermissionInScope,
  logCompetitionAuditEvent,
} from "@/app/lib/competitionRbac";

export async function GET(req: NextRequest) {
  try {
    const actor = await getCompetitionActor(req);
    const supabase = getSupabaseServerClient();
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const sourceMode = searchParams.get("sourceMode");

    let query = supabase
      .from("competitions")
      .select("*, competition_question_banks(name, subject)")
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (sourceMode && sourceMode !== "all") query = query.eq("question_source_mode", sourceMode);

    // If unauthenticated or student/guest, only show public or open_link competitions that are scheduled/published/active/concluded
    if (!actor || actor.role === "student" || actor.role === "guest") {
      query = query.in("visibility", ["public", "open_link"]).in("status", ["scheduled", "published", "active", "concluded"]);
    }

    const { data: competitions, error } = await query;
    if (error) throw error;

    const compIds = (competitions || []).map((c) => c.id);

    // Aggregate dynamic participant counts
    let countsMap: Record<string, number> = {};
    if (compIds.length > 0) {
      const { data: counts } = await supabase
        .from("competition_participants")
        .select("competition_id")
        .in("competition_id", compIds);
      if (counts) {
        for (const row of counts) {
          countsMap[row.competition_id] = (countsMap[row.competition_id] || 0) + 1;
        }
      }
    }

    // Lookup current user's registration and completion status
    let userParticipantsMap: Record<string, { status: string; score: number | null }> = {};
    if (actor?.id && compIds.length > 0) {
      const { data: userParts } = await supabase
        .from("competition_participants")
        .select("competition_id, status, score")
        .eq("user_id", actor.id)
        .in("competition_id", compIds);
      if (userParts) {
        for (const p of userParts) {
          userParticipantsMap[p.competition_id] = {
            status: p.status,
            score: p.score,
          };
        }
      }
    }

    const enrichedCompetitions = (competitions || []).map((c) => {
      const myPart = userParticipantsMap[c.id];
      return {
        ...c,
        current_participants: countsMap[c.id] || 0,
        is_registered: !!myPart,
        participant_status: myPart?.status || null,
        my_score: myPart?.score ?? null,
      };
    });

    return NextResponse.json({ competitions: enrichedCompetitions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing competitions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getCompetitionActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const perm = hasPermissionInScope(actor, "competition.create");
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      competition_type = "arena",
      question_source_mode = "competition_bank",
      question_bank_id,
      main_bank_filters,
      combined_config,
      rules,
      rewards_config,
      visibility = "public",
      start_time,
      end_time,
      access_mode = "free",
      entry_fee_kobo = 0,
      approval_mode = "automatic",
      registration_opens_at = null,
      registration_closes_at = null,
      max_participants = null,
      allow_spectators = true,
      spectator_mode = "view_only",
      spectator_questions_visible = false,
      spectator_scoreboard_visible = true,
      results_visibility = "after_completion",
      answer_reveal_mode = "after_match",
      scoring_config = {},
      access_config = {},
    } = body;

    if (!["free", "code", "request", "paid"].includes(access_mode)) {
      return NextResponse.json({ error: "Invalid competition access mode." }, { status: 400 });
    }
    const normalizedEntryFee = Math.max(0, Math.round(Number(entry_fee_kobo) || 0));
    if (access_mode === "paid" && normalizedEntryFee < 1) {
      return NextResponse.json({ error: "Paid competitions require an entry fee greater than zero." }, { status: 400 });
    }
    if (!["automatic", "manual"].includes(approval_mode)) {
      return NextResponse.json({ error: "Invalid participant approval mode." }, { status: 400 });
    }
    const normalizedMaxParticipants = max_participants === null || max_participants === "" ? null : Number(max_participants);
    if (normalizedMaxParticipants !== null && (!Number.isInteger(normalizedMaxParticipants) || normalizedMaxParticipants < 1)) {
      return NextResponse.json({ error: "Maximum participants must be a positive whole number." }, { status: 400 });
    }
    const registrationOpen = registration_opens_at ? new Date(registration_opens_at) : null;
    const registrationClose = registration_closes_at ? new Date(registration_closes_at) : null;
    if ((registrationOpen && Number.isNaN(registrationOpen.getTime())) || (registrationClose && Number.isNaN(registrationClose.getTime()))) {
      return NextResponse.json({ error: "Invalid registration date/time." }, { status: 400 });
    }
    if (registrationOpen && registrationClose && registrationClose <= registrationOpen) {
      return NextResponse.json({ error: "Registration closing time must be after opening time." }, { status: 400 });
    }
    if (!["view_only", "reactions", "moderated_chat"].includes(spectator_mode) ||
        !["hidden", "participants", "public", "after_completion"].includes(results_visibility) ||
        !["never", "after_question", "after_round", "after_match", "after_competition"].includes(answer_reveal_mode)) {
      return NextResponse.json({ error: "Invalid spectator, result visibility or answer-reveal setting." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Competition title is required" }, { status: 400 });
    }

    if (question_source_mode === "competition_bank" && !question_bank_id) {
      return NextResponse.json(
        { error: "A dedicated question bank must be selected when source mode is 'competition_bank'." },
        { status: 400 }
      );
    }

    const code = `COMP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const defaultRules = {
      question_count: 10,
      duration_seconds: 300,
      randomize_questions: true,
      randomize_options: true,
      identical_questions_for_all: competition_type === "battle_1v1",
      difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
      topic_coverage: { target_distinct_topics: 3 },
      high_yield_weighting: 1.5,
      attempt_limit: 1,
      ...rules,
    };

    const supabase = getSupabaseServerClient();
    const { data: comp, error: insertErr } = await supabase
      .from("competitions")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        code,
        competition_type,
        question_source_mode,
        question_bank_id: question_bank_id || null,
        main_bank_filters: main_bank_filters || { subject: "General", min_questions: 10 },
        combined_config: combined_config || { competition_bank_ratio: 0.5, main_bank_ratio: 0.5 },
        rules: defaultRules,
        rewards_config: rewards_config || { xp_first_place: 200, xp_participation: 20 },
        status: "draft",
        visibility,
        creator_id: actor.id,
        start_time: start_time || null,
        end_time: end_time || null,
        access_mode,
        entry_fee_kobo: access_mode === "paid" ? normalizedEntryFee : 0,
        approval_mode,
        registration_opens_at: registrationOpen?.toISOString() || null,
        registration_closes_at: registrationClose?.toISOString() || null,
        max_participants: normalizedMaxParticipants,
        allow_spectators: Boolean(allow_spectators),
        spectator_mode,
        spectator_questions_visible: Boolean(spectator_questions_visible),
        spectator_scoreboard_visible: Boolean(spectator_scoreboard_visible),
        results_visibility,
        answer_reveal_mode,
        scoring_config: scoring_config && typeof scoring_config === "object" ? scoring_config : {},
        access_config: access_config && typeof access_config === "object" ? access_config : {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    await logCompetitionAuditEvent({
      action: "competition_created",
      resourceType: "competitions",
      resourceId: comp.id,
      actorId: actor.id,
      actorEmail: actor.email,
      details: {
        title: comp.title,
        code: comp.code,
        question_source_mode: comp.question_source_mode,
        question_bank_id: comp.question_bank_id,
        visibility: comp.visibility,
      },
    });

    return NextResponse.json({ competition: comp }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating competition";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
