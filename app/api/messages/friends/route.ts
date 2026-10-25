import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { friendId, friendName, action = "add" } = body;

    if (!friendId) {
      return NextResponse.json({ error: "friendId is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const senderName = user.user_metadata?.full_name || user.email?.split("@")[0] || "A classmate";

    if (action === "add" && friendId !== user.id) {
      try {
        await supabase.from("notifications").insert({
          user_id: friendId,
          title: "🤝 New Study Buddy Connection",
          message: `${senderName} connected with you as a study partner on BrainLab!`,
          type: "message",
          link_url: "/messages",
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn("Could not dispatch friend notification:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: action === "add" ? `Connected with ${friendName || "peer"}!` : "Friend removed",
      friendId,
      action,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load friends" }, { status: 500 });
  }
}
