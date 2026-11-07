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
    } = body;

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
