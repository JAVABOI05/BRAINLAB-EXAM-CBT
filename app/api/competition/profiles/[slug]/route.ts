import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const user = await getUserFromRequest(req);
    const supabase = getSupabaseServerClient();
    const { data: profile, error } = await supabase.from("competition_public_profiles")
      .select("user_id, slug, display_name, avatar_url, bio, visibility, is_available")
      .eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!profile || (profile.visibility !== "public" && profile.user_id !== user?.id)) {
      return NextResponse.json({ error: "This Arena profile is private or does not exist." }, { status: 404 });
    }
    const [{ data: rating }, { data: gamification }] = await Promise.all([
      supabase.from("competition_ratings")
        .select("elo_rating, peak_elo, matches_played, matches_won, matches_drawn, matches_lost, tier")
        .eq("user_id", profile.user_id).maybeSingle(),
      supabase.from("user_gamification_profiles")
        .select("lifetime_xp, current_level, level_name")
        .eq("user_id", profile.user_id).maybeSingle(),
    ]);
    return NextResponse.json({
      profile: {
        slug: profile.slug,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_available: profile.is_available,
      },
      rating,
      gamification,
      is_owner: user?.id === profile.user_id,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Arena profile." }, { status: 500 });
  }
}
