import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      status = "online",
      customStatus,
      currentClassId,
      isVisible = true,
      activityContext,
    } = body;

    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();

    // Determine user role (admin, tutor, or student)
    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: tutorMembership } = await supabase
      .from("learning_subject_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("membership_role", "tutor")
      .limit(1)
      .maybeSingle();

    const role = adminRecord?.role
      ? ["super_admin", "platform_admin"].includes(adminRecord.role)
        ? "admin"
        : "tutor"
      : tutorMembership
      ? "tutor"
      : "student";

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Learner";

    const metadata = {
      display_name: displayName,
      role,
      avatar_url: user.user_metadata?.avatar_url || null,
      activity_context: activityContext || (currentClassId ? "In Live Classroom" : "Exploring BrainLab"),
    };

    const { error } = await supabase.from("user_presence").upsert({
      user_id: user.id,
      status,
      custom_status: customStatus || null,
      current_class_id: currentClassId || null,
      last_heartbeat_at: now,
      is_visible: isVisible,
      metadata,
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
    // Consider active if heartbeat was within last 3 minutes (180 seconds)
    const threshold = new Date(Date.now() - 180 * 1000).toISOString();

    const { data: presences, error } = await supabase
      .from("user_presence")
      .select("user_id, status, custom_status, current_class_id, last_heartbeat_at, is_visible, metadata")
      .eq("is_visible", true)
      .gte("last_heartbeat_at", threshold)
      .order("last_heartbeat_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const activeList = (presences ?? []).map((p: any) => ({
      user_id: p.user_id,
      status: p.status,
      custom_status: p.custom_status,
      current_class_id: p.current_class_id,
      last_heartbeat_at: p.last_heartbeat_at,
      display_name: p.metadata?.display_name || "BrainLab Member",
      role: p.metadata?.role || "student",
      avatar_url: p.metadata?.avatar_url || null,
      activity_context: p.metadata?.activity_context || (p.current_class_id ? "In Live Class" : "Online"),
    }));

    const onlineCount = activeList.length;
    const inClassCount = activeList.filter((p) => p.status === "in_class" || Boolean(p.current_class_id)).length;
    const tutorCount = activeList.filter((p) => p.role === "tutor" || p.role === "admin").length;

    return NextResponse.json({
      success: true,
      onlineCount,
      inClassCount,
      tutorCount,
      activeUsers: activeList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
