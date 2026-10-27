import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "../../lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications: notifications ?? [],
      unreadCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll = false } = body;

    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();

    if (markAll) {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .eq("user_id", user.id);
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (notificationId) {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .eq("id", notificationId)
        .eq("user_id", user.id);
      return NextResponse.json({ success: true, message: "Notification marked as read." });
    }

    return NextResponse.json({ error: "Missing parameter" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, type = "billing", link_url = "/pricing" } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    // CHECK constraint on notifications.type: ('class', 'assignment', 'announcement', 'message', 'system', 'billing', 'quiz')
    const validTypes = ["class", "assignment", "announcement", "message", "system", "billing", "quiz"];
    const safeType = validTypes.includes(type) ? type : "billing";

    const supabase = getSupabaseServerClient();
    const { data: newNotification, error } = await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        title: String(title).slice(0, 150),
        message: String(message).slice(0, 1000),
        type: safeType,
        link_url: typeof link_url === "string" ? link_url : "/pricing",
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      notification: newNotification,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
