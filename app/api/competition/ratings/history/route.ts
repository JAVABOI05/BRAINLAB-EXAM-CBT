import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to view rating history." }, { status: 401 });
    const requestedUserId = req.nextUrl.searchParams.get("user_id");
    const role = await resolveAdminRole(user.id);
    const isAdmin = ["super_admin", "platform_admin", "competition_admin", "competition_moderator"].includes(role || "");
    if (requestedUserId && requestedUserId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "You may only view your own rating history." }, { status: 403 });
    }
    const targetUserId = requestedUserId || user.id;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("competition_rating_history")
      .select("id, season_id, user_id, team_id, match_id, rating_kind, rating_before, rating_after, rating_delta, reason, created_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ history: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load rating history." }, { status: 500 });
  }
}
