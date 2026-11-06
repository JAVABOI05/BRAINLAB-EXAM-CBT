import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

function defaultDisplayName(user: { id: string; user_metadata?: Record<string, unknown> }) {
  const metadataName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.username;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim().slice(0, 40);
  return `BrainLab Player ${user.id.slice(0, 4).toUpperCase()}`;
}

async function ensureProfile(user: { id: string; user_metadata?: Record<string, unknown> }, supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data: existing, error: readError } = await supabase
    .from("competition_public_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (readError) throw readError;
  if (existing) return existing;

  const displayName = defaultDisplayName(user);
  const slugBase = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "player";
  const profile = {
    user_id: user.id,
    slug: `${slugBase}-${user.id.slice(0, 8).toLowerCase()}`,
    display_name: displayName,
    visibility: "private",
    challenge_availability: "anyone",
    is_available: true,
  };
  const { data, error } = await supabase.from("competition_public_profiles").insert(profile).select("*").single();
  if (error) throw error;
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to manage your Arena profile." }, { status: 401 });
    const supabase = getSupabaseServerClient();
    const profile = await ensureProfile(user, supabase);
    const { data: rating } = await supabase.from("competition_ratings")
      .select("elo_rating, peak_elo, matches_played, matches_won, matches_drawn, matches_lost, tier")
      .eq("user_id", user.id).maybeSingle();
    return NextResponse.json({ profile, rating });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Arena profile." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to update your Arena profile." }, { status: 401 });
    const body = await req.json();
    const supabase = getSupabaseServerClient();
    const existing = await ensureProfile(user, supabase);

    const updates: Record<string, unknown> = {};
    if (body.display_name !== undefined) {
      if (typeof body.display_name !== "string" || body.display_name.trim().length < 2 || body.display_name.trim().length > 40) {
        return NextResponse.json({ error: "Display name must be 2–40 characters." }, { status: 400 });
      }
      updates.display_name = body.display_name.trim();
    }
    if (body.bio !== undefined) {
      if (typeof body.bio !== "string" || body.bio.trim().length > 280) {
        return NextResponse.json({ error: "Bio must be 280 characters or fewer." }, { status: 400 });
      }
      updates.bio = body.bio.trim() || null;
    }
    if (body.avatar_url !== undefined) {
      if (body.avatar_url !== null && (typeof body.avatar_url !== "string" || !body.avatar_url.startsWith("https://"))) {
        return NextResponse.json({ error: "Avatar URL must use HTTPS." }, { status: 400 });
      }
      updates.avatar_url = body.avatar_url;
    }
    if (body.visibility !== undefined) {
      if (!["public", "private"].includes(body.visibility)) return NextResponse.json({ error: "Invalid profile visibility." }, { status: 400 });
      updates.visibility = body.visibility;
    }
    if (body.challenge_availability !== undefined) {
      if (!["anyone", "approved_only", "nobody", "available_only"].includes(body.challenge_availability)) {
        return NextResponse.json({ error: "Invalid challenge availability setting." }, { status: 400 });
      }
      updates.challenge_availability = body.challenge_availability;
    }
    if (body.is_available !== undefined) updates.is_available = body.is_available === true;
    if (!Object.keys(updates).length) return NextResponse.json({ error: "No profile changes were supplied." }, { status: 400 });

    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from("competition_public_profiles")
      .update(updates).eq("user_id", user.id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, profile: data, previous_slug: existing.slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update Arena profile." }, { status: 500 });
  }
}
