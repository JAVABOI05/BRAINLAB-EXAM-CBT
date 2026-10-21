import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "../../lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      status = "online",
      customStatus,
      currentClassId,
      isVisible = true,
    } = body;

    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();

    const { error } = await supabase.from("user_presence").upsert({
      user_id: user.id,
      status,
      custom_status: customStatus || null,
      current_class_id: currentClassId || null,
      last_heartbeat_at: now,
      is_visible: isVisible,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, timestamp: now });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    // Consider active if heartbeat within last 3 minutes (180 seconds)
    const threshold = new Date(Date.now() - 180 * 1000).toISOString();

    const { data: presences, error } = await supabase
      .from("user_presence")
      .select("user_id, status, last_heartbeat_at, is_visible")
      .eq("is_visible", true)
      .gte("last_heartbeat_at", threshold);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const onlineCount = (presences ?? []).length;
    const inClassCount = (presences ?? []).filter((p) => p.status === "in_class").length;

    return NextResponse.json({
      success: true,
      onlineCount,
      inClassCount,
      activeUsers: presences ?? [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
