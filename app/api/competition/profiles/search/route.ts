import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to search for founding members." }, { status: 401 });
    const query = (req.nextUrl.searchParams.get("q") || "").trim();
    if (query.length < 2 || query.length > 40) return NextResponse.json({ players: [] });
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("competition_public_profiles")
      .select("display_name, slug, avatar_url")
      .eq("visibility", "public")
      .neq("user_id", user.id)
      .ilike("display_name", `%${query}%`)
      .order("display_name", { ascending: true })
      .limit(10);
    if (error) throw error;
    return NextResponse.json({ players: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search players." }, { status: 500 });
  }
}
