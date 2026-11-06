import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

const ADMIN_ROLES = new Set(["super_admin", "platform_admin", "competition_admin"]);

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const role = user ? await resolveAdminRole(user.id) : null;
    const isAdmin = ADMIN_ROLES.has(role || "");
    const supabase = getSupabaseServerClient();
    let query = supabase.from("competition_seasons").select("*").order("starts_at", { ascending: false }).limit(100);
    if (!isAdmin) query = query.in("status", ["active", "scheduled"]);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ seasons: data || [], can_manage: isAdmin });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load seasons." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const role = await resolveAdminRole(user.id);
    if (!ADMIN_ROLES.has(role || "")) return NextResponse.json({ error: "Arena administrator access is required." }, { status: 403 });

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const startsAt = new Date(body.starts_at);
    const endsAt = new Date(body.ends_at);
    if (name.length < 3 || name.length > 80 || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return NextResponse.json({ error: "Provide a season name and a valid start/end range." }, { status: 400 });
    }
    const carryoverMode = ["full", "partial", "reset", "none"].includes(body.rating_carryover_mode) ? body.rating_carryover_mode : "partial";
    const carryoverPercent = Number(body.rating_carryover_percent ?? 75);
    if (!Number.isFinite(carryoverPercent) || carryoverPercent < 0 || carryoverPercent > 100) {
      return NextResponse.json({ error: "Rating carryover must be between 0 and 100." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: overlaps, error: overlapError } = await supabase
      .from("competition_seasons").select("id, name, status")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .neq("status", "archived")
      .limit(1);
    if (overlapError) throw overlapError;
    if (overlaps?.length) return NextResponse.json({ error: `This season overlaps with ${overlaps[0].name}.` }, { status: 409 });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data, error } = await supabase.from("competition_seasons").insert({
      name, slug, description: typeof body.description === "string" ? body.description.trim().slice(0, 1000) : null,
      starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
      status: startsAt <= new Date() && endsAt > new Date() ? "active" : "scheduled",
      rating_carryover_mode: carryoverMode, rating_carryover_percent: carryoverPercent,
      settings: body.settings && typeof body.settings === "object" ? body.settings : {}, created_by: user.id,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, season: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create season." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const role = await resolveAdminRole(user.id);
    if (!ADMIN_ROLES.has(role || "")) return NextResponse.json({ error: "Arena administrator access is required." }, { status: 403 });

    const body = await req.json();
    const seasonId = typeof body.season_id === "string" ? body.season_id : "";
    if (!seasonId) return NextResponse.json({ error: "Season ID is required." }, { status: 400 });
    const updates: Record<string, unknown> = {};
    if (["active", "completed", "archived"].includes(body.status)) updates.status = body.status;
    if (["full", "partial", "reset", "none"].includes(body.rating_carryover_mode)) updates.rating_carryover_mode = body.rating_carryover_mode;
    if (body.rating_carryover_percent !== undefined) {
      const percent = Number(body.rating_carryover_percent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) return NextResponse.json({ error: "Rating carryover must be between 0 and 100." }, { status: 400 });
      updates.rating_carryover_percent = percent;
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No valid season changes supplied." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    if (updates.status === "active") {
      const { data: current, error: currentError } = await supabase.from("competition_seasons")
        .select("id").eq("status", "active").neq("id", seasonId).maybeSingle();
      if (currentError) throw currentError;
      if (current) return NextResponse.json({ error: "Another season is already active." }, { status: 409 });
    }
    const { data, error } = await supabase.from("competition_seasons")
      .update(updates).eq("id", seasonId).select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Season not found." }, { status: 404 });
    return NextResponse.json({ ok: true, season: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update season." }, { status: 500 });
  }
}
